/**
 * Builds the importable n8n workflow:
 *   Affiliate Product Processing Pipeline
 *
 * Run:  node n8n/build-workflow.js
 * Out:  n8n/workflows/affiliate-product-pipeline.json
 *
 * Why a builder?  Embedding multi-line JavaScript inside JSON requires
 * manual \n / \" escaping. Template literals in JS keep the source readable,
 * and JSON.stringify produces a clean, valid n8n export.
 */

const fs = require("fs");
const path = require("path");

// ---------- Code node: Load Products ----------------------------------------
const loadProductsCode = `// LOAD PRODUCTS
// =============
// Default returns 3 sample products so the workflow runs out of the box.
// To use real data, replace this code with the output of an upstream node:
//   const items = $('Read Google Sheet').all();
//   const items = $('Postgres - Query').all();
//   const items = $('Read CSV').all();
// (Just make sure the upstream node is connected before this one and that
//  each item has the same fields shown below.)

const sampleProducts = [
  {
    sku: 'SUM-001',
    title: 'Linen Beach Cover-Up Dress',
    brand: 'CoastalCo',
    price: 39.99,
    currency: 'USD',
    affiliate_url: 'https://example.com/aff/sum-001',
    image_url: 'https://example.com/img/sum-001.jpg',
    raw_description: 'Breezy linen cover-up perfect for beach days. Adjustable straps, side pockets, mid-thigh length.'
  },
  {
    sku: 'SUM-002',
    title: 'Mini Portable Blender',
    brand: 'BlendGo',
    price: 24.5,
    currency: 'USD',
    affiliate_url: 'https://example.com/aff/sum-002',
    image_url: 'https://example.com/img/sum-002.jpg',
    raw_description: 'USB-rechargeable mini blender for smoothies on the go. 6 blades, 350ml.'
  },
  {
    sku: 'SUM-003',
    title: 'UV-Protective Beach Tote',
    brand: 'SunShield',
    price: 18,
    currency: 'USD',
    affiliate_url: 'https://example.com/aff/sum-003',
    image_url: 'https://example.com/img/sum-003.jpg',
    raw_description: 'Waterproof beach tote with insulated cooler pocket and UV-blocking fabric.'
  }
];

return sampleProducts.map(p => ({ json: p }));`;

// ---------- Code node: Validate & Prepare -----------------------------------
const validateCode = `// VALIDATE & PREPARE PRODUCTS
// ===========================
// Drops invalid rows, normalises fields, and resets the cross-iteration
// accumulator that Aggregate Results will read at the end.

const REQUIRED_FIELDS = ['sku', 'title', 'affiliate_url'];

const items = $input.all();
const valid = [];
const skipped = [];

for (let i = 0; i < items.length; i++) {
  const p = items[i].json || {};
  const missing = REQUIRED_FIELDS.filter(f => !p[f] || String(p[f]).trim() === '');

  if (missing.length > 0) {
    skipped.push({ index: i, sku: p.sku || null, missing });
    continue;
  }

  valid.push({
    json: {
      sku: String(p.sku).trim(),
      title: String(p.title).trim(),
      brand: p.brand ? String(p.brand).trim() : null,
      price: p.price != null && p.price !== '' ? Number(p.price) : null,
      currency: p.currency ? String(p.currency).trim().toUpperCase() : 'USD',
      affiliate_url: String(p.affiliate_url).trim(),
      image_url: p.image_url ? String(p.image_url).trim() : null,
      raw_description: p.raw_description ? String(p.raw_description).trim() : ''
    },
    pairedItem: { item: i }
  });
}

if (valid.length === 0) {
  throw new Error('No valid products. Skipped ' + skipped.length + ': ' + JSON.stringify(skipped));
}

// Reset cross-iteration accumulator before the loop starts.
const staticData = $getWorkflowStaticData('global');
staticData.processed = [];
staticData.failed = [];
staticData.skipped = skipped;
staticData.started_at = new Date().toISOString();

return valid;`;

// ---------- Code node: Build Claude Prompt ----------------------------------
const buildPromptCode = `// BUILD CLAUDE PROMPT
// ===================
// Loop runs with batchSize=1, so this node sees exactly one product per call.

const product = $input.first().json;

const userPrompt = [
  'You are an expert affiliate-marketing copywriter for a summer-finds website.',
  '',
  'Given this product, return STRICT JSON only (no prose, no markdown fences) with this exact shape:',
  '',
  '{',
  '  "category": "<one of: fashion, beauty, home, tech, beach, fitness, travel, kitchen, other>",',
  '  "subcategory": "<short subcategory>",',
  '  "tags": ["tag1","tag2","tag3","tag4","tag5"],',
  '  "pinterest_titles": ["<title under 100 chars>","<title under 100 chars>","<title under 100 chars>"],',
  '  "seo_description": "<120-160 char meta description>",',
  '  "viral_hooks": ["<hook 1>","<hook 2>","<hook 3>"],',
  '  "long_description": "<3-4 sentence product write-up for the site>"',
  '}',
  '',
  'Product:',
  '- SKU: ' + product.sku,
  '- Title: ' + product.title,
  '- Brand: ' + (product.brand || 'unknown'),
  '- Price: ' + (product.price != null ? product.price + ' ' + product.currency : 'unknown'),
  '- Raw description: ' + (product.raw_description || '(none)'),
  '',
  'Return ONLY the JSON object. Do not wrap it in code fences.'
].join('\\n');

return [{
  json: {
    sku: product.sku,
    product,
    user_prompt: userPrompt
  }
}];`;

// ---------- Code node: Parse Claude Output ----------------------------------
const parseClaudeCode = `// PARSE CLAUDE OUTPUT
// ===================
// Tolerant to: HTTP errors flowing through (when retries run out and onError
// is set to continueRegularOutput), markdown fences, prose around the JSON.

const item = $input.first().json;
const product = $('Build Claude Prompt').first().json.product;
const sku = product.sku;
const staticData = $getWorkflowStaticData('global');

// 1. Detect HTTP-level failure carried through by the HTTP Request node.
const looksLikeError = item && (item.error || (item.statusCode && item.statusCode >= 400));
if (looksLikeError) {
  const detail = item.error || item.message || ('status ' + item.statusCode);
  staticData.failed.push({ sku, reason: 'claude_api_error', detail });
  return [{
    json: { sku, product, claude_failed: true, claude_error: String(detail) },
    pairedItem: { item: 0 }
  }];
}

// 2. Extract the assistant text from the Anthropic Messages API response.
//    Shape: { content: [{ type: 'text', text: '...' }], ... }
let rawText = '';
if (Array.isArray(item.content) && item.content[0] && typeof item.content[0].text === 'string') {
  rawText = item.content[0].text;
} else if (typeof item.text === 'string') {
  rawText = item.text;
} else {
  rawText = JSON.stringify(item);
}

// 3. Strip code fences and pull out the first {...} block.
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
  staticData.failed.push({
    sku,
    reason: 'invalid_json',
    detail: e.message,
    raw: rawText.slice(0, 500)
  });
  return [{
    json: {
      sku,
      product,
      claude_failed: true,
      claude_error: 'invalid_json',
      raw_response: rawText.slice(0, 500)
    },
    pairedItem: { item: 0 }
  }];
}

// 4. Defensive defaults so downstream nodes never crash on missing keys.
const safe = {
  category: parsed.category || 'other',
  subcategory: parsed.subcategory || '',
  tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : [],
  pinterest_titles: Array.isArray(parsed.pinterest_titles) ? parsed.pinterest_titles.slice(0, 5) : [],
  seo_description: parsed.seo_description || '',
  viral_hooks: Array.isArray(parsed.viral_hooks) ? parsed.viral_hooks.slice(0, 5) : [],
  long_description: parsed.long_description || ''
};

return [{
  json: { sku, product, ai: safe, claude_failed: false },
  pairedItem: { item: 0 }
}];`;

// ---------- Code node: Structure Affiliate Output ---------------------------
const structureCode = `// STRUCTURE AFFILIATE OUTPUT
// ==========================
// Builds three downstream-ready payloads from one product + AI bundle:
//   - website_payload   -> for site insertion / CMS
//   - pinterest_payload -> for Pinterest pin generation
//   - canva_payload     -> for Canva template fill

const item = $input.first().json;
const { sku, product, ai, claude_failed, claude_error } = item;
const staticData = $getWorkflowStaticData('global');

const slug = String(product.title)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80);

if (claude_failed) {
  staticData.processed.push({ sku, status: 'needs_review', error: claude_error });
  return [{
    json: {
      sku,
      slug,
      status: 'needs_review',
      error: claude_error,
      website_payload: null,
      pinterest_payload: null,
      canva_payload: null
    },
    pairedItem: { item: 0 }
  }];
}

const website_payload = {
  sku,
  slug,
  title: product.title,
  brand: product.brand,
  price: product.price,
  currency: product.currency,
  affiliate_url: product.affiliate_url,
  image_url: product.image_url,
  category: ai.category,
  subcategory: ai.subcategory,
  tags: ai.tags,
  description: ai.long_description,
  seo: { title: product.title, description: ai.seo_description }
};

const pinterest_payload = {
  sku,
  image_url: product.image_url,
  affiliate_url: product.affiliate_url,
  pin_titles: ai.pinterest_titles,
  pin_description: ai.seo_description,
  hashtags: ai.tags
    .map(t => '#' + String(t).replace(/[^a-zA-Z0-9]/g, ''))
    .filter(h => h.length > 1)
};

const canva_payload = {
  sku,
  template_kind: 'product_card',
  fields: {
    headline: ai.viral_hooks[0] || product.title,
    subheadline: ai.viral_hooks[1] || ai.subcategory,
    price: product.price != null ? product.currency + ' ' + product.price : '',
    image_url: product.image_url,
    cta_url: product.affiliate_url
  }
};

staticData.processed.push({ sku, status: 'ok', category: ai.category });

return [{
  json: { sku, slug, status: 'ok', website_payload, pinterest_payload, canva_payload },
  pairedItem: { item: 0 }
}];`;

// ---------- Code node: Aggregate Results ------------------------------------
const aggregateCode = `// AGGREGATE RESULTS
// =================
// Reads the cross-iteration accumulator written inside the loop.
// (After SplitInBatches finishes, $('Node Inside Loop').all() only returns the
//  LAST batch, so we read from $getWorkflowStaticData instead.)

const staticData = $getWorkflowStaticData('global');
const processed = staticData.processed || [];
const failed = staticData.failed || [];
const skipped = staticData.skipped || [];

const ok = processed.filter(p => p.status === 'ok');
const needsReview = processed.filter(p => p.status === 'needs_review');

return [{
  json: {
    summary: {
      total_in: processed.length + skipped.length,
      processed_ok: ok.length,
      needs_review: needsReview.length,
      failed: failed.length,
      skipped: skipped.length
    },
    processed,
    failed,
    skipped,
    started_at: staticData.started_at || null,
    finished_at: new Date().toISOString()
  }
}];`;

// ---------- Workflow definition ---------------------------------------------
const workflow = {
    name: "Affiliate Product Processing Pipeline",
    nodes: [
        {
            parameters: {},
            id: "n01-manual-trigger",
            name: "Start - Manual Trigger",
            type: "n8n-nodes-base.manualTrigger",
            typeVersion: 1,
            position: [240, 400],
        },
        {
            parameters: { language: "javaScript", jsCode: loadProductsCode },
            id: "n02-load-products",
            name: "Load Products",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [440, 400],
        },
        {
            parameters: { language: "javaScript", jsCode: validateCode },
            id: "n03-validate",
            name: "Validate & Prepare",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [640, 400],
        },
        {
            parameters: {
                batchSize: 1,
                options: {},
            },
            id: "n04-loop",
            name: "Loop Over Products",
            type: "n8n-nodes-base.splitInBatches",
            typeVersion: 3,
            position: [860, 400],
        },
        {
            parameters: { language: "javaScript", jsCode: buildPromptCode },
            id: "n05-build-prompt",
            name: "Build Claude Prompt",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1080, 240],
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
                        { name: "content-type", value: "application/json" },
                    ],
                },
                sendBody: true,
                specifyBody: "json",
                jsonBody:
                    "={{ JSON.stringify({ model: $env.CLAUDE_MODEL || 'claude-opus-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: $json.user_prompt }] }) }}",
                options: {
                    timeout: 60000,
                    response: { response: { neverError: true } },
                },
            },
            id: "n06-claude-api",
            name: "Call Claude API",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [1300, 240],
            retryOnFail: true,
            maxTries: 3,
            waitBetweenTries: 3000,
            onError: "continueRegularOutput",
        },
        {
            parameters: { language: "javaScript", jsCode: parseClaudeCode },
            id: "n07-parse-claude",
            name: "Parse Claude Output",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1520, 240],
        },
        {
            parameters: { language: "javaScript", jsCode: structureCode },
            id: "n08-structure",
            name: "Structure Affiliate Output",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1740, 240],
        },
        {
            parameters: {
                method: "POST",
                url: "={{$env.WEBSITE_INSERT_URL}}",
                sendHeaders: true,
                headerParameters: {
                    parameters: [
                        { name: "Authorization", value: "=Bearer {{$env.WEBSITE_API_TOKEN}}" },
                        { name: "Content-Type", value: "application/json" },
                    ],
                },
                sendBody: true,
                specifyBody: "json",
                jsonBody:
                    "={{ JSON.stringify({ sku: $json.sku, slug: $json.slug, status: $json.status, website: $json.website_payload, pinterest: $json.pinterest_payload, canva: $json.canva_payload }) }}",
                options: {
                    timeout: 30000,
                    response: { response: { neverError: true } },
                },
            },
            id: "n09-insert-website",
            name: "Insert to Website",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [1960, 240],
            retryOnFail: true,
            maxTries: 3,
            waitBetweenTries: 3000,
            onError: "continueRegularOutput",
        },
        {
            parameters: { maxItems: 1 },
            id: "n10-limit-done",
            name: "Limit (Done Branch)",
            type: "n8n-nodes-base.limit",
            typeVersion: 1,
            position: [1080, 560],
        },
        {
            parameters: { language: "javaScript", jsCode: aggregateCode },
            id: "n11-aggregate",
            name: "Aggregate Results",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1300, 560],
        },
    ],

    connections: {
        "Start - Manual Trigger": {
            main: [[{ node: "Load Products", type: "main", index: 0 }]],
        },
        "Load Products": {
            main: [[{ node: "Validate & Prepare", type: "main", index: 0 }]],
        },
        "Validate & Prepare": {
            main: [[{ node: "Loop Over Products", type: "main", index: 0 }]],
        },
        // SplitInBatches v3 wiring:
        //   main[0] = "done" branch (fires once, after all batches)
        //   main[1] = "loop" branch (fires per batch — this is the body)
        "Loop Over Products": {
            main: [
                [{ node: "Limit (Done Branch)", type: "main", index: 0 }],
                [{ node: "Build Claude Prompt", type: "main", index: 0 }],
            ],
        },
        "Build Claude Prompt": {
            main: [[{ node: "Call Claude API", type: "main", index: 0 }]],
        },
        "Call Claude API": {
            main: [[{ node: "Parse Claude Output", type: "main", index: 0 }]],
        },
        "Parse Claude Output": {
            main: [[{ node: "Structure Affiliate Output", type: "main", index: 0 }]],
        },
        "Structure Affiliate Output": {
            main: [[{ node: "Insert to Website", type: "main", index: 0 }]],
        },
        // Loop body returns to the SplitInBatches node:
        "Insert to Website": {
            main: [[{ node: "Loop Over Products", type: "main", index: 0 }]],
        },
        "Limit (Done Branch)": {
            main: [[{ node: "Aggregate Results", type: "main", index: 0 }]],
        },
    },

    settings: { executionOrder: "v1" },
    active: false,
    pinData: {},
    versionId: "1",
    meta: { templateCredsSetupCompleted: false },
    tags: [],
};

// ---------- Write the file ---------------------------------------------------
const outDir = path.join(__dirname, "workflows");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "affiliate-product-pipeline.json");
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2) + "\n", "utf8");
console.log("Wrote " + outPath);
