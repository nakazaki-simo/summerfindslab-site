/**
 * Builds the importable n8n workflow:
 *   Pinterest Publish Pin (WF-04b)
 *
 * Run:  node n8n/build-pinterest-publish-pin.js
 * Out:  n8n/workflows/pinterest-publish-pin.json
 *
 * What it does
 * ============
 * Webhook-triggered single-pin publisher. Accepts a JSON body with:
 *
 *   {
 *     "imageUrl":    "https://...png",         // required
 *     "title":       "Pin title",              // required (<= 100 chars)
 *     "description": "Long-form description",  // required (<= 800 chars)
 *     "link":        "https://...?tag=...",    // required, the destination URL
 *     "boardId":     "1234567890123456789",    // required
 *     "altText":     "Optional alt text",      // optional (<= 500 chars)
 *     "pinId":       "internal-pin-id"         // optional, your own id for logging
 *   }
 *
 * The workflow:
 *   1. Authenticates the caller via PIN_PUBLISH_WEBHOOK_SECRET (header or body).
 *   2. Validates and trims the payload.
 *   3. POSTs to Pinterest /v5/pins with retry x3 / 5s backoff.
 *   4. Logs the result to PUBLISHED_INGEST_URL (best-effort, never blocks).
 *   5. Responds to the webhook with the Pinterest pin id (or error detail).
 *
 * Architecture
 * ============
 *   Webhook (POST)
 *     -> Authenticate             (Code: shared-secret check)
 *     -> Validate Payload         (Code)
 *     -> Pinterest Create Pin     (HTTP POST /v5/pins, retry x3)
 *     -> Build Response           (Code: shape success / error)
 *     -> Append to Published Log  (HTTP POST PUBLISHED_INGEST_URL, best-effort)
 *     -> Respond to Webhook       (Webhook response)
 *
 * Designed to be called from the existing Pin Factory workflow once a pin's
 * Canva render is ready. The bulk batch publisher (WF-04) keeps reading
 * data/pinterest-pins.json on its own cron; this webhook publisher is the
 * "publish one pin right now" path.
 *
 * Env vars
 *   PINTEREST_ACCESS_TOKEN        (required)  Bearer token, scopes:
 *                                             boards:read pins:read pins:write
 *   PIN_PUBLISH_WEBHOOK_SECRET    (required)  Shared secret the caller must send
 *                                             in the `x-pin-publish-secret` header
 *                                             (or `secret` field in the body).
 *   PUBLISHED_INGEST_URL          (optional)  POST endpoint for the published log.
 *   PUBLISHED_INGEST_TOKEN        (optional)  Bearer token for the above.
 */

const fs = require("fs");
const path = require("path");

// =============================================================================
// Code node bodies
// =============================================================================

const authenticateCode = `// AUTHENTICATE
// ============
// Single-source-of-truth gate for the webhook. The Pin Factory caller must
// either send the secret in the x-pin-publish-secret header, or include
// "secret" in the JSON body (header takes priority).

const expected = $env.PIN_PUBLISH_WEBHOOK_SECRET || '';
if (!expected) {
  throw new Error('PIN_PUBLISH_WEBHOOK_SECRET is not configured on the n8n instance.');
}

const incoming = $input.first().json;
const headers = (incoming && incoming.headers) || {};
const body = (incoming && incoming.body) || incoming || {};

const headerSecret = headers['x-pin-publish-secret'] || headers['X-Pin-Publish-Secret'] || '';
const bodySecret = body.secret || '';
const provided = String(headerSecret || bodySecret || '');

if (provided !== expected) {
  return [{
    json: {
      __auth_failed: true,
      status: 401,
      error: 'unauthorized',
      message: 'Invalid or missing pin publish secret.'
    }
  }];
}

// Pass the body through to the next node, stripping the secret on the way.
const sanitised = { ...body };
delete sanitised.secret;

return [{ json: { __auth_ok: true, payload: sanitised, receivedAt: new Date().toISOString() } }];`;

const validatePayloadCode = `// VALIDATE PAYLOAD
// ================
// Short-circuits on auth failure (just passes the auth error through).
// Otherwise, normalises and trims to Pinterest's hard limits.

const item = $input.first().json;

if (item && item.__auth_failed) {
  return [{ json: item }];
}

const payload = (item && item.payload) || {};
const errors = [];

const imageUrl = String(payload.imageUrl || payload.image_url || '').trim();
const title = String(payload.title || '').trim();
const description = String(payload.description || '').trim();
const link = String(payload.link || payload.affiliateUrl || payload.affiliate_url || '').trim();
const boardId = String(payload.boardId || payload.board_id || '').trim();
const altText = String(payload.altText || payload.alt_text || payload.title || '').trim();
const pinId = String(payload.pinId || payload.pin_id || '').trim() || null;

if (!imageUrl) errors.push('imageUrl is required');
if (!title) errors.push('title is required');
if (!description) errors.push('description is required');
if (!link) errors.push('link is required');
if (!boardId) errors.push('boardId is required');

// Cheap URL sanity check.
function looksLikeUrl(s) {
  return /^https?:\\/\\//i.test(s);
}
if (imageUrl && !looksLikeUrl(imageUrl)) errors.push('imageUrl must be http(s)');
if (link && !looksLikeUrl(link)) errors.push('link must be http(s)');

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
    pinId,
    boardId,
    receivedAt: item.receivedAt || new Date().toISOString(),
    pinterestPayload: {
      link,
      title: title.slice(0, 100),
      description: description.slice(0, 800),
      alt_text: altText.slice(0, 500),
      board_id: boardId,
      media_source: { source_type: 'image_url', url: imageUrl }
    }
  }
}];`;

const buildResponseCode = `// BUILD RESPONSE
// ==============
// The HTTP node has neverError:true, so we always reach this node.
// The previous node may also have flagged auth/validation failures;
// preserve those. Otherwise inspect the Pinterest response.

const upstream = $('Validate Payload').first().json;

// Auth or validation gate failed earlier.
if (upstream && (upstream.__auth_failed || upstream.__validation_failed)) {
  return [{
    json: {
      ok: false,
      status: upstream.status || 400,
      error: upstream.error,
      message: upstream.message,
      pinId: null,
      pinterestPinId: null
    }
  }];
}

const apiResponse = $input.first().json || {};
const looksLikeError =
  apiResponse.code != null ||
  apiResponse.error != null ||
  (apiResponse.status && Number(apiResponse.status) >= 400);

if (looksLikeError) {
  return [{
    json: {
      ok: false,
      status: Number(apiResponse.status) || 502,
      error: 'pinterest_api_error',
      message: apiResponse.message || apiResponse.error || 'Unknown Pinterest API error',
      detail: apiResponse,
      pinId: upstream.pinId || null,
      boardId: upstream.boardId || null,
      pinterestPinId: null,
      receivedAt: upstream.receivedAt || null,
      publishedAt: null
    }
  }];
}

return [{
  json: {
    ok: true,
    status: 200,
    pinId: upstream.pinId || null,
    boardId: upstream.boardId || apiResponse.board_id || null,
    pinterestPinId: apiResponse.id || null,
    pinterestPin: {
      id: apiResponse.id || null,
      board_id: apiResponse.board_id || null,
      board_section_id: apiResponse.board_section_id || null,
      created_at: apiResponse.created_at || null,
      link: apiResponse.link || null,
      title: apiResponse.title || null
    },
    receivedAt: upstream.receivedAt || null,
    publishedAt: new Date().toISOString()
  }
}];`;

// =============================================================================
// Workflow definition
// =============================================================================

const workflow = {
    name: "Pinterest Publish Pin",
    nodes: [
        {
            parameters: {
                httpMethod: "POST",
                path: "pinterest-publish-pin",
                responseMode: "responseNode",
                options: { rawBody: false }
            },
            id: "n01-webhook",
            name: "Webhook (POST)",
            type: "n8n-nodes-base.webhook",
            typeVersion: 2,
            position: [240, 400],
            webhookId: "pinterest-publish-pin"
        },
        {
            parameters: {
                language: "javaScript",
                jsCode: authenticateCode
            },
            id: "n02-auth",
            name: "Authenticate",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [460, 400]
        },
        {
            parameters: {
                language: "javaScript",
                jsCode: validatePayloadCode
            },
            id: "n03-validate",
            name: "Validate Payload",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [680, 400]
        },
        {
            parameters: {
                method: "POST",
                url: "https://api.pinterest.com/v5/pins",
                sendHeaders: true,
                headerParameters: {
                    parameters: [
                        {
                            name: "Authorization",
                            value: "=Bearer {{$env.PINTEREST_ACCESS_TOKEN}}"
                        },
                        { name: "Content-Type", value: "application/json" }
                    ]
                },
                sendBody: true,
                specifyBody: "json",
                jsonBody: "={{ JSON.stringify($json.pinterestPayload || {}) }}",
                options: {
                    timeout: 60000,
                    response: { response: { neverError: true } }
                }
            },
            id: "n04-create-pin",
            name: "Pinterest Create Pin",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [900, 400],
            retryOnFail: true,
            maxTries: 3,
            waitBetweenTries: 5000,
            onError: "continueRegularOutput"
        },
        {
            parameters: {
                language: "javaScript",
                jsCode: buildResponseCode
            },
            id: "n05-response",
            name: "Build Response",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1120, 400]
        },
        {
            parameters: {
                method: "POST",
                url: "={{$env.PUBLISHED_INGEST_URL || 'https://example.invalid/skip'}}",
                sendHeaders: true,
                headerParameters: {
                    parameters: [
                        {
                            name: "Authorization",
                            value: "=Bearer {{$env.PUBLISHED_INGEST_TOKEN}}"
                        },
                        { name: "Content-Type", value: "application/json" }
                    ]
                },
                sendBody: true,
                specifyBody: "json",
                jsonBody:
                    "={{ JSON.stringify({ pinId: $json.pinId, pinterestPinId: $json.pinterestPinId, boardId: $json.boardId, publishedAt: $json.publishedAt, published: $json.ok === true, error: $json.ok === true ? null : ($json.message || $json.error || 'unknown') }) }}",
                options: {
                    timeout: 30000,
                    response: { response: { neverError: true } }
                }
            },
            id: "n06-log",
            name: "Append to Published Log",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [1340, 400],
            retryOnFail: true,
            maxTries: 2,
            waitBetweenTries: 2000,
            onError: "continueRegularOutput"
        },
        {
            parameters: {
                respondWith: "json",
                responseBody: "={{ JSON.stringify($('Build Response').first().json) }}",
                options: {
                    responseCode: "={{ $('Build Response').first().json.status || 200 }}"
                }
            },
            id: "n07-respond",
            name: "Respond to Webhook",
            type: "n8n-nodes-base.respondToWebhook",
            typeVersion: 1.1,
            position: [1560, 400]
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
            main: [[{ node: "Pinterest Create Pin", type: "main", index: 0 }]]
        },
        "Pinterest Create Pin": {
            main: [[{ node: "Build Response", type: "main", index: 0 }]]
        },
        "Build Response": {
            main: [[{ node: "Append to Published Log", type: "main", index: 0 }]]
        },
        "Append to Published Log": {
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

const outPath = path.join(__dirname, "workflows", "pinterest-publish-pin.json");
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2));
console.log("wrote " + outPath);
