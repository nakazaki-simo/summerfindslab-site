/**
 * Builds the importable n8n workflow:
 *   Browser Agent (WF-07)
 *
 * Run:  node n8n/build-browser-agent.js
 * Out:  n8n/workflows/browser-agent.json
 *
 * What it does
 * ============
 * Webhook-triggered "browse a page, then reason about it" agent. It pairs a
 * real headless browser (Browserless / any Playwright-compatible render API)
 * with Claude as the decision brain. Give it a URL + a plain-English goal and
 * it returns a structured result: an answer, the data it extracted, and the
 * next browser actions an automation could take.
 *
 * Request shape (POST /webhook/browser-agent):
 *
 *   {
 *     "url":    "https://www.example.com/product/123",   // required, http(s)
 *     "goal":   "Get the price and whether it's in stock", // required
 *     "secret": "<BROWSER_AGENT_WEBHOOK_SECRET>"          // or x-browser-agent-secret header
 *   }
 *
 * The caller must send the secret in either:
 *   - header `x-browser-agent-secret: <BROWSER_AGENT_WEBHOOK_SECRET>`, or
 *   - body field `"secret": "<BROWSER_AGENT_WEBHOOK_SECRET>"`
 *
 * Response (200 on success, 400/401/502 on failure):
 *
 *   {
 *     "ok": true,
 *     "status": 200,
 *     "url": "https://www.example.com/product/123",
 *     "goal": "Get the price and whether it's in stock",
 *     "answer": "The product is $24.99 and currently in stock.",
 *     "data": { "price": "$24.99", "inStock": true },
 *     "actions": [ { "type": "click", "target": "Add to cart" } ],
 *     "confidence": "high",
 *     "pageTitle": "Example Product 123",
 *     "finishedAt": "2026-05-31T10:00:01.234Z"
 *   }
 *
 * Architecture
 * ============
 *   Webhook (POST)
 *     -> Authenticate          (Code: shared-secret check)
 *     -> Validate Payload      (Code: url + goal sanity)
 *     -> Render Page           (HTTP POST Browserless /content, retry x3, neverError)
 *     -> Build Agent Prompt    (Code: HTML -> text, bounded, builds Claude prompt)
 *     -> Call Claude API       (HTTP POST Anthropic, retry x3, neverError)
 *     -> Build Response        (Code: tolerant JSON parse, shape success/error)
 *     -> Respond to Webhook    (Webhook response, status from Build Response)
 *
 * Why a render step + an LLM step instead of one "browser node"?
 *   - The render call is what actually drives the browser (navigate + execute
 *     JS + return the live DOM), so the agent reasons over the *rendered* page,
 *     not the raw server HTML. Works on JS-heavy sites.
 *   - Keeping observe (render) and reason (Claude) as separate, idempotent
 *     nodes matches the rest of this stack: one trigger, one job, retry/backoff
 *     + neverError on every HTTP node, every secret read from $env.
 *
 * Env vars (set in n8n -> Settings -> Variables)
 *   BROWSER_AGENT_WEBHOOK_SECRET  (required)  Shared secret the caller must send.
 *   BROWSERLESS_URL               (required)  Base URL of a Browserless / render
 *                                             service, e.g. https://chrome.browserless.io
 *                                             or self-hosted http://localhost:3000
 *   BROWSERLESS_TOKEN             (optional)  Token appended as ?token= to the render call.
 *   ANTHROPIC_API_KEY            (required)  Anthropic API key.
 *   CLAUDE_MODEL                 (optional)  Default claude-opus-4-20250514.
 *   BROWSER_AGENT_MAX_CHARS      (optional)  Max page text chars sent to Claude (default 12000).
 */

const fs = require("fs");
const path = require("path");

// =============================================================================
// Code node bodies
// =============================================================================

const authenticateCode = `// AUTHENTICATE
// ============
// Single gate for the webhook. Caller sends the secret in the
// x-browser-agent-secret header, or as "secret" in the JSON body
// (header takes priority).

const expected = $env.BROWSER_AGENT_WEBHOOK_SECRET || '';
if (!expected) {
  throw new Error('BROWSER_AGENT_WEBHOOK_SECRET is not configured on the n8n instance.');
}

const incoming = $input.first().json;
const headers = (incoming && incoming.headers) || {};
const body = (incoming && incoming.body) || incoming || {};

const headerSecret = headers['x-browser-agent-secret'] || headers['X-Browser-Agent-Secret'] || '';
const bodySecret = body.secret || '';
const provided = String(headerSecret || bodySecret || '');

if (provided !== expected) {
  return [{
    json: {
      __auth_failed: true,
      status: 401,
      error: 'unauthorized',
      message: 'Invalid or missing browser agent secret.'
    }
  }];
}

const sanitised = { ...body };
delete sanitised.secret;

return [{ json: { __auth_ok: true, payload: sanitised, receivedAt: new Date().toISOString() } }];`;

const validatePayloadCode = `// VALIDATE PAYLOAD
// ================
// Short-circuits on auth failure. Otherwise normalises url + goal and a few
// optional knobs (waitFor, fullText).

const item = $input.first().json;

if (item && item.__auth_failed) {
  return [{ json: item }];
}

const payload = (item && item.payload) || {};
const errors = [];

const url = String(payload.url || payload.link || '').trim();
const goal = String(payload.goal || payload.instructions || payload.task || '').trim();
const waitFor = Number(payload.waitFor || payload.wait || 0) || 0; // ms to wait after load

if (!url) errors.push('url is required');
if (!goal) errors.push('goal is required');

function looksLikeUrl(s) {
  return /^https?:\\/\\//i.test(s);
}
if (url && !looksLikeUrl(url)) errors.push('url must be http(s)');
if (waitFor && (waitFor < 0 || waitFor > 15000)) errors.push('waitFor must be 0-15000 ms');

if (errors.length) {
  return [{
    json: {
      __validation_failed: true,
      status: 400,
      error: 'invalid_payload',
      message: errors.join('; ')
    }
  }];
}

return [{
  json: {
    __validated: true,
    url,
    goal,
    waitFor: Math.min(Math.max(waitFor, 0), 15000),
    receivedAt: item.receivedAt || new Date().toISOString()
  }
}];`;

const buildPromptCode = `// BUILD AGENT PROMPT
// ==================
// Turns the rendered HTML (from Browserless /content) into bounded plain text
// and assembles the Claude prompt. Tolerant: if the render failed (neverError
// carried an error/4xx through), it flags the failure and skips the LLM call
// by emitting an empty prompt the next node guards against.

const upstream = $('Validate Payload').first().json;

// Pass auth/validation failures straight through.
if (upstream && (upstream.__auth_failed || upstream.__validation_failed)) {
  return [{ json: upstream }];
}

const MAX_CHARS = Number($env.BROWSER_AGENT_MAX_CHARS || 12000);
const rendered = $input.first().json || {};

// Browserless /content returns the raw rendered HTML as a string (n8n usually
// places it under .data or .body, or the whole item is the string).
let html = '';
if (typeof rendered === 'string') html = rendered;
else if (typeof rendered.data === 'string') html = rendered.data;
else if (typeof rendered.body === 'string') html = rendered.body;
else if (typeof rendered.content === 'string') html = rendered.content;

// Detect a render-layer failure (4xx/5xx surfaced by neverError).
const renderError =
  rendered && (rendered.error || (rendered.statusCode && rendered.statusCode >= 400) || (rendered.status && Number(rendered.status) >= 400));

if (renderError || !html) {
  return [{
    json: {
      __render_failed: true,
      status: 502,
      error: 'render_failed',
      message: renderError ? ('Render service error: ' + (rendered.error || rendered.message || ('status ' + (rendered.statusCode || rendered.status)))) : 'Render returned no HTML.',
      url: upstream.url,
      goal: upstream.goal
    }
  }];
}

// Pull the <title>, then strip scripts/styles and tags to readable text.
const titleMatch = html.match(/<title[^>]*>([^<]*)<\\/title>/i);
const pageTitle = titleMatch ? titleMatch[1].trim() : '';

let text = html
  .replace(/<script[\\s\\S]*?<\\/script>/gi, ' ')
  .replace(/<style[\\s\\S]*?<\\/style>/gi, ' ')
  .replace(/<noscript[\\s\\S]*?<\\/noscript>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\\s+/g, ' ')
  .trim();

const truncated = text.length > MAX_CHARS;
if (truncated) text = text.slice(0, MAX_CHARS);

const userPrompt = [
  'You are a browser agent. You were given a goal and the readable text of a web page that was just rendered in a real headless browser.',
  '',
  'Return STRICT JSON only (no prose, no markdown fences) with this exact shape:',
  '{',
  '  "answer": "<concise natural-language answer to the goal, or why it could not be met>",',
  '  "data": { },',
  '  "actions": [ { "type": "<navigate|click|type|scroll|extract|done>", "target": "<selector or visible label>", "value": "<optional>" } ],',
  '  "confidence": "<high|medium|low>"',
  '}',
  '',
  'Rules:',
  '- "data" holds any structured facts you extracted that are relevant to the goal (prices, names, stock, dates, links).',
  '- "actions" is the ordered list of next browser steps an automation should take to make progress on the goal. Use an empty array if the goal is fully answered from this page.',
  '- Base every claim ONLY on the page text provided. If something is not present, say so in "answer" and lower "confidence".',
  '- Return ONLY the JSON object.',
  '',
  'GOAL:',
  upstream.goal,
  '',
  'PAGE URL: ' + upstream.url,
  'PAGE TITLE: ' + (pageTitle || '(none)'),
  truncated ? '(NOTE: page text truncated to ' + MAX_CHARS + ' chars)' : '',
  '',
  'PAGE TEXT:',
  text
].join('\\n');

return [{
  json: {
    __ready: true,
    url: upstream.url,
    goal: upstream.goal,
    pageTitle,
    truncated,
    receivedAt: upstream.receivedAt,
    user_prompt: userPrompt
  }
}];`;

const buildResponseCode = `// BUILD RESPONSE
// ==============
// The Claude HTTP node has neverError:true, so we always land here. Preserve
// any auth/validation/render failure flagged upstream; otherwise parse the
// model's JSON tolerantly.

const upstream = $('Build Agent Prompt').first().json;

if (upstream && (upstream.__auth_failed || upstream.__validation_failed || upstream.__render_failed)) {
  return [{
    json: {
      ok: false,
      status: upstream.status || 400,
      error: upstream.error,
      message: upstream.message,
      url: upstream.url || null,
      goal: upstream.goal || null,
      answer: null,
      data: {},
      actions: [],
      confidence: 'low',
      finishedAt: new Date().toISOString()
    }
  }];
}

const apiResponse = $input.first().json || {};

// Detect an Anthropic-level error surfaced by neverError.
const looksLikeError =
  apiResponse.error != null ||
  (apiResponse.statusCode && apiResponse.statusCode >= 400) ||
  (apiResponse.status && Number(apiResponse.status) >= 400 && !Array.isArray(apiResponse.content));

if (looksLikeError) {
  const detail = (apiResponse.error && apiResponse.error.message) || apiResponse.message || ('status ' + (apiResponse.statusCode || apiResponse.status));
  return [{
    json: {
      ok: false,
      status: 502,
      error: 'llm_api_error',
      message: String(detail),
      url: upstream.url,
      goal: upstream.goal,
      answer: null,
      data: {},
      actions: [],
      confidence: 'low',
      finishedAt: new Date().toISOString()
    }
  }];
}

// Extract assistant text from the Messages API shape.
let rawText = '';
if (Array.isArray(apiResponse.content) && apiResponse.content[0] && typeof apiResponse.content[0].text === 'string') {
  rawText = apiResponse.content[0].text;
} else if (typeof apiResponse.text === 'string') {
  rawText = apiResponse.text;
} else {
  rawText = JSON.stringify(apiResponse);
}

// Strip fences and isolate the first {...} block.
let cleaned = rawText.trim()
  .replace(/^\`\`\`(?:json)?\\s*/i, '')
  .replace(/\\s*\`\`\`$/i, '')
  .trim();
const firstBrace = cleaned.indexOf('{');
const lastBrace = cleaned.lastIndexOf('}');
if (firstBrace !== -1 && lastBrace > firstBrace) {
  cleaned = cleaned.slice(firstBrace, lastBrace + 1);
}

let parsed;
try {
  parsed = JSON.parse(cleaned);
} catch (e) {
  return [{
    json: {
      ok: false,
      status: 502,
      error: 'invalid_model_json',
      message: e.message,
      url: upstream.url,
      goal: upstream.goal,
      answer: rawText.slice(0, 500),
      data: {},
      actions: [],
      confidence: 'low',
      finishedAt: new Date().toISOString()
    }
  }];
}

const allowed = ['navigate', 'click', 'type', 'scroll', 'extract', 'done'];
const actions = Array.isArray(parsed.actions)
  ? parsed.actions
      .filter(a => a && allowed.includes(String(a.type)))
      .slice(0, 20)
      .map(a => ({ type: String(a.type), target: a.target != null ? String(a.target) : null, value: a.value != null ? String(a.value) : null }))
  : [];

const confidence = ['high', 'medium', 'low'].includes(String(parsed.confidence)) ? String(parsed.confidence) : 'medium';

return [{
  json: {
    ok: true,
    status: 200,
    url: upstream.url,
    goal: upstream.goal,
    pageTitle: upstream.pageTitle || null,
    truncated: upstream.truncated === true,
    answer: parsed.answer != null ? String(parsed.answer) : '',
    data: (parsed.data && typeof parsed.data === 'object') ? parsed.data : {},
    actions,
    confidence,
    receivedAt: upstream.receivedAt || null,
    finishedAt: new Date().toISOString()
  }
}];`;

// =============================================================================
// Workflow definition
// =============================================================================

const workflow = {
    name: "Browser Agent",
    nodes: [
        {
            parameters: {
                httpMethod: "POST",
                path: "browser-agent",
                responseMode: "responseNode",
                options: { rawBody: false }
            },
            id: "n01-webhook",
            name: "Webhook (POST)",
            type: "n8n-nodes-base.webhook",
            typeVersion: 2,
            position: [240, 400],
            webhookId: "browser-agent"
        },
        {
            parameters: { language: "javaScript", jsCode: authenticateCode },
            id: "n02-auth",
            name: "Authenticate",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [460, 400]
        },
        {
            parameters: { language: "javaScript", jsCode: validatePayloadCode },
            id: "n03-validate",
            name: "Validate Payload",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [680, 400]
        },
        {
            parameters: {
                method: "POST",
                url: "={{ ($env.BROWSERLESS_URL || 'http://localhost:3000').replace(/\\/$/, '') + '/content' + ($env.BROWSERLESS_TOKEN ? ('?token=' + $env.BROWSERLESS_TOKEN) : '') }}",
                sendHeaders: true,
                headerParameters: {
                    parameters: [{ name: "Content-Type", value: "application/json" }]
                },
                sendBody: true,
                specifyBody: "json",
                jsonBody:
                    "={{ JSON.stringify({ url: $json.url, gotoOptions: { waitUntil: 'networkidle2', timeout: 30000 }, waitForTimeout: $json.waitFor || 0 }) }}",
                options: {
                    timeout: 60000,
                    response: { response: { neverError: true, responseFormat: "text" } }
                }
            },
            id: "n04-render",
            name: "Render Page",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [900, 400],
            retryOnFail: true,
            maxTries: 3,
            waitBetweenTries: 3000,
            onError: "continueRegularOutput"
        },
        {
            parameters: { language: "javaScript", jsCode: buildPromptCode },
            id: "n05-build-prompt",
            name: "Build Agent Prompt",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1120, 400]
        },
        {
            parameters: {
                method: "POST",
                url: "https://api.anthropic.com/v1/messages",
                sendHeaders: true,
                headerParameters: {
                    parameters: [
                        { name: "x-api-key", value: "={{$env.ANTHROPIC_API_KEY}}" },
                        { name: "anthropic-version", value: "2023-06-01" },
                        { name: "content-type", value: "application/json" }
                    ]
                },
                sendBody: true,
                specifyBody: "json",
                jsonBody:
                    "={{ JSON.stringify({ model: $env.CLAUDE_MODEL || 'claude-opus-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: $json.user_prompt || 'Return {\\\"answer\\\":\\\"no page text\\\",\\\"data\\\":{},\\\"actions\\\":[],\\\"confidence\\\":\\\"low\\\"}' }] }) }}",
                options: {
                    timeout: 90000,
                    response: { response: { neverError: true } }
                }
            },
            id: "n06-claude-api",
            name: "Call Claude API",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [1340, 400],
            retryOnFail: true,
            maxTries: 3,
            waitBetweenTries: 3000,
            onError: "continueRegularOutput"
        },
        {
            parameters: { language: "javaScript", jsCode: buildResponseCode },
            id: "n07-response",
            name: "Build Response",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1560, 400]
        },
        {
            parameters: {
                respondWith: "json",
                responseBody: "={{ JSON.stringify($('Build Response').first().json) }}",
                options: {
                    responseCode: "={{ $('Build Response').first().json.status || 200 }}"
                }
            },
            id: "n08-respond",
            name: "Respond to Webhook",
            type: "n8n-nodes-base.respondToWebhook",
            typeVersion: 1.1,
            position: [1780, 400]
        }
    ],

    connections: {
        "Webhook (POST)": {
            main: [[{ node: "Authenticate", type: "main", index: 0 }]]
        },
        Authenticate: {
            main: [[{ node: "Validate Payload", type: "main", index: 0 }]]
        },
        "Validate Payload": {
            main: [[{ node: "Render Page", type: "main", index: 0 }]]
        },
        "Render Page": {
            main: [[{ node: "Build Agent Prompt", type: "main", index: 0 }]]
        },
        "Build Agent Prompt": {
            main: [[{ node: "Call Claude API", type: "main", index: 0 }]]
        },
        "Call Claude API": {
            main: [[{ node: "Build Response", type: "main", index: 0 }]]
        },
        "Build Response": {
            main: [[{ node: "Respond to Webhook", type: "main", index: 0 }]]
        }
    },

    settings: { executionOrder: "v1" },
    active: false,
    pinData: {},
    versionId: "1",
    meta: { templateCredsSetupCompleted: false },
    tags: []
};

const outDir = path.join(__dirname, "workflows");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "browser-agent.json");
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2) + "\n", "utf8");
console.log("Wrote " + outPath);
