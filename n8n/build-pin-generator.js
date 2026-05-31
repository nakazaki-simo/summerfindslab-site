/**
 * Builds the importable n8n workflow:
 *   Pinterest Pin Variant Generator (WF-02)
 *
 * Run:  node n8n/build-pin-generator.js
 * Out:  n8n/workflows/pinterest-pin-generator.json
 *
 * What it does
 * ============
 * For each product in `data/products.json`, asks Claude to generate one pin
 * variant per Pinterest *formula* (the visual templates registered in
 * `lib/pin-pipeline/templates.js`). The generated records are shaped to drop
 * directly into `data/pinterest-pins.json` — same fields, same vocabulary
 * (`formulaId`, `formulaLabel`, `aspectRatio`, `boardSuggestion`, `link`,
 *  `sourceImage`, `textOverlay`, `secondaryStickers`, `layout`, `palette`,
 *  `canvaPrompt`, `imagePrompt`, `lifestylePrompt`, `description`, `hashtags`,
 *  `cta`, `ctrLevers`, `id`, `batch`).
 *
 * Architecture
 * ============
 *   Manual / Schedule Trigger
 *     -> Load Config              (Code: formulas + site URL + batch id)
 *     -> Fetch Products           (HTTP GET ${PRODUCTS_JSON_URL})
 *     -> Filter Unpinned          (Code: skip products that already have pins)
 *     -> Loop Over Products       (SplitInBatches, batchSize=1)
 *          body branch (main[1]):
 *            -> Build Pin Prompt          (Code: list all formulas + product)
 *            -> Call Claude API           (HTTP, retry x3, neverError)
 *            -> Parse Pin Variants        (Code: tolerant JSON, defaults)
 *            -> Structure Pin Records     (Code: shape -> pinterest-pins.json)
 *            -> Insert Pins               (HTTP POST, retry x3, neverError)
 *            -> back to Loop
 *          done branch (main[0]):
 *            -> Limit 1
 *            -> Aggregate Results         (Code: read static-data accumulator)
 *
 * Env vars (set in n8n Settings -> Variables)
 *   ANTHROPIC_API_KEY         (required)
 *   CLAUDE_MODEL              (optional, default claude-opus-4-20250514)
 *   PRODUCTS_JSON_URL         (required) e.g. https://raw.githubusercontent.com/<you>/<repo>/main/data/products.json
 *                                          or  https://summerfindslab.com/data/products.json
 *   EXISTING_PINS_JSON_URL    (optional) lets us skip already-pinned products
 *   SITE_URL                  (required) e.g. https://summerfindslab.com  (used to build pin links)
 *   PINS_INGEST_URL           (required) endpoint that accepts new pins
 *   PINS_INGEST_TOKEN         (required) bearer token
 *   PINS_BATCH_ID             (optional) override batch label, default summer-2026-batch-XX
 *   FORMULAS_PER_PRODUCT      (optional, integer, default 3) how many formulas to generate per product
 */

const fs = require("fs");
const path = require("path");

// ---------- Code node: Load Config ------------------------------------------
const loadConfigCode = `// LOAD CONFIG
// ===========
// Centralises every tunable. Anything you'd want to tweak per-run lives here.
//
// FORMULAS mirror lib/pin-pipeline/templates.js in the website repo. Order
// matters — we let Claude pick the top N by 'fit' but always start from this
// canonical list so we never invent a formula the Canva template registry
// can't render.

const FORMULAS = [
  { id: 'price-tag-find',       label: 'Price Tag Find',          aspectRatio: '2:3 (1000x1500)', layout: 'Bold price tag overlay on a clean product cutout. Pin reads in <1s.', palette: 'high-contrast cream + neon sticker', ctrLevers: ['price anchor','urgency','clean product cutout'] },
  { id: 'headline-stat',        label: 'Headline + Social Stat',  aspectRatio: '2:3 (1000x1500)', layout: 'Split: 60% editorial photo, 40% headline + star rating + review count.', palette: 'editorial neutrals', ctrLevers: ['social proof','authority','clear value claim'] },
  { id: 'neon-sticker-tiktok',  label: 'TikTok Neon Sticker Stack',aspectRatio: '2:3 (1000x1500)', layout: 'Lifestyle photo + 2-3 neon-coloured stickers stacked at angles.', palette: 'neon highlight on muted base', ctrLevers: ['scroll-stop','viral language','playful'] },
  { id: 'aesthetic-lifestyle',  label: 'Aesthetic Lifestyle Scene',aspectRatio: '2:3 (1000x1500)', layout: 'Full-bleed cinematic lifestyle scene. Tiny watermark only.', palette: 'natural film palette - bias warm', ctrLevers: ['aspiration','no-text save','scene completeness'] },
  { id: 'bold-number-list',     label: 'Bold Number List',         aspectRatio: '2:3 (1000x1500)', layout: 'Oversized number + listicle headline + product moodboard.', palette: 'editorial pastel', ctrLevers: ['list curiosity','save signal'] },
  { id: 'curiosity-gap',        label: 'Curiosity Gap',            aspectRatio: '2:3 (1000x1500)', layout: 'Half-hidden product + intrigue headline.', palette: 'moody warm', ctrLevers: ['mystery','open loop'] },
  { id: 'this-vs-that',         label: 'This vs That',             aspectRatio: '2:3 (1000x1500)', layout: 'Side-by-side comparison split.', palette: 'clean editorial', ctrLevers: ['comparison','decision-making'] },
  { id: 'moodboard-grid',       label: 'Moodboard Grid',           aspectRatio: '2:3 (1000x1500)', layout: '2x3 product grid with single italic headline.', palette: 'soft pastel', ctrLevers: ['edit/curation','save signal'] },
  { id: 'tutorial-stepper',     label: 'Tutorial Stepper',         aspectRatio: '2:3 (1000x1500)', layout: 'Numbered 3-step explainer.', palette: 'clean white', ctrLevers: ['utility','save for later'] },
  { id: 'secret-roundup',       label: 'Secret Roundup',           aspectRatio: '2:3 (1000x1500)', layout: 'Lifestyle photo + GATEKEPT/SECRET sticker tag.', palette: 'moody warm', ctrLevers: ['exclusivity','curiosity'] }
];

const formulasPerProduct = Math.max(1, Math.min(FORMULAS.length,
  Number($env.FORMULAS_PER_PRODUCT || 3)
));

const batchId = $env.PINS_BATCH_ID || ('summer-2026-batch-' +
  new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(2, 8));

return [{
  json: {
    formulas: FORMULAS,
    formulasPerProduct,
    batchId,
    siteUrl: ($env.SITE_URL || 'https://summerfindslab.com').replace(/\\/+$/, ''),
    productsUrl: $env.PRODUCTS_JSON_URL || '',
    existingPinsUrl: $env.EXISTING_PINS_JSON_URL || '',
    started_at: new Date().toISOString()
  }
}];`;

// ---------- Code node: Filter Unpinned --------------------------------------
const filterUnpinnedCode = `// FILTER UNPINNED
// ===============
// Inputs:
//   - $('Fetch Products').first().json      = array of products (or {body:[...]})
//   - $('Fetch Existing Pins').first().json = optional array of existing pins
//   - $('Load Config').first().json         = config bundle
//
// Output: one item per product still needing pins, with config attached.

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.body)) return payload.body;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

const cfg = $('Load Config').first().json;
const products = asArray($('Fetch Products').first().json);
const existingPins = asArray($('Fetch Existing Pins').first().json);

// Index existing pins by product id (matches data/pinterest-pins.json shape).
const pinnedProductIds = new Set();
for (const pin of existingPins) {
  if (pin && pin.productId) pinnedProductIds.add(pin.productId);
  // Some pins reference category instead of a product — skip those.
}

// Reset cross-iteration accumulator before the loop runs.
const staticData = $getWorkflowStaticData('global');
staticData.processed = [];
staticData.failed = [];
staticData.skipped = [];
staticData.batchId = cfg.batchId;
staticData.started_at = cfg.started_at;
staticData.formulas = cfg.formulas;

const out = [];
let pinSequence = (existingPins.length || 0) + 1;

for (let i = 0; i < products.length; i++) {
  const p = products[i] || {};
  const id = p.id;

  // Required fields. We won't try to pin anything missing core data.
  if (!id || !p.title || !p.image) {
    staticData.skipped.push({ index: i, id: id || null, reason: 'missing_required_fields' });
    continue;
  }
  if (pinnedProductIds.has(id)) {
    staticData.skipped.push({ index: i, id, reason: 'already_pinned' });
    continue;
  }

  out.push({
    json: {
      product: {
        id,
        title: p.title,
        description: p.description || '',
        brand: p.brand || '',
        price: p.price ?? null,
        category: p.category || 'summer-gadgets',
        tags: Array.isArray(p.tags) ? p.tags : [],
        image: p.image,
        affiliateUrl: p.affiliateUrl || '',
        rating: p.rating || null
      },
      config: cfg,
      pinSequenceStart: pinSequence
    },
    pairedItem: { item: i }
  });
  pinSequence += cfg.formulasPerProduct;
}

if (out.length === 0) {
  throw new Error('No products to pin. Skipped ' + staticData.skipped.length +
    '. Check PRODUCTS_JSON_URL and EXISTING_PINS_JSON_URL.');
}

return out;`;

// ---------- Code node: Build Pin Prompt -------------------------------------
const buildPromptCode = `// BUILD PIN PROMPT
// ================
// Asks Claude for N pin variants (one per chosen formula) in strict JSON.
// We pass the formulas the site actually supports so Claude can't invent one.

const item = $input.first().json;
const { product, config } = item;

const formulasShortlist = config.formulas
  .slice(0, config.formulasPerProduct)
  .map(f => '- ' + f.id + ' (' + f.label + '): ' + f.layout)
  .join('\\n');

const formulaIds = config.formulas
  .slice(0, config.formulasPerProduct)
  .map(f => f.id);

const userPrompt = [
  'You are a Pinterest growth strategist for a summer-finds affiliate site.',
  '',
  'Generate ONE pin variant for EACH of these visual formulas:',
  formulasShortlist,
  '',
  'Return STRICT JSON only (no prose, no markdown fences) with this exact shape:',
  '',
  '{',
  '  "variants": [',
  '    {',
  '      "formulaId": "<one of: ' + formulaIds.join(', ') + '>",',
  '      "title": "<pin title under 100 chars, hook-first, lower-case Pinterest voice>",',
  '      "textOverlay": "<text that goes ON the pin, max 6 words, punchy>",',
  '      "secondaryStickers": ["<sticker 1>","<sticker 2>"],',
  '      "description": "<150-300 char Pinterest description with 4-6 hashtags inline>",',
  '      "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5"],',
  '      "cta": "<short CTA, 2-4 words>",',
  '      "boardSuggestion": "<board name | Summer Finds Lab>",',
  '      "canvaPrompt": "<exact instructions for the Canva designer in 1-2 sentences>",',
  '      "imagePrompt": "<photoreal AI image prompt, vertical 2:3, --ar 2:3 --style raw>",',
  '      "lifestylePrompt": "<cinematic lifestyle scene prompt, vertical 2:3>"',
  '    }',
  '  ]',
  '}',
  '',
  'You MUST return exactly ' + config.formulasPerProduct + ' variants, one per formulaId in the order listed.',
  '',
  'Product:',
  '- ID: ' + product.id,
  '- Title: ' + product.title,
  '- Brand: ' + (product.brand || 'unknown'),
  '- Price: ' + (product.price != null ? '$' + product.price : 'unknown'),
  '- Category: ' + product.category,
  '- Tags: ' + (product.tags.join(', ') || 'none'),
  '- Description: ' + (product.description || '(none)'),
  '- Image URL: ' + product.image,
  '',
  'Return ONLY the JSON object. Do not wrap it in code fences.'
].join('\\n');

return [{
  json: {
    productId: product.id,
    product,
    config,
    pinSequenceStart: item.pinSequenceStart,
    user_prompt: userPrompt
  }
}];`;

// ---------- Code node: Parse Pin Variants -----------------------------------
const parseVariantsCode = `// PARSE PIN VARIANTS
// ==================
// Tolerant to: HTTP errors flowing through, markdown fences, prose around JSON.

const item = $input.first().json;
const upstream = $('Build Pin Prompt').first().json;
const { product, config, pinSequenceStart } = upstream;
const productId = product.id;
const staticData = $getWorkflowStaticData('global');

// 1. Detect HTTP-level failure carried through by the HTTP Request node.
const looksLikeError = item && (item.error || (item.statusCode && item.statusCode >= 400));
if (looksLikeError) {
  const detail = item.error || item.message || ('status ' + item.statusCode);
  staticData.failed.push({ productId, reason: 'claude_api_error', detail });
  return [{
    json: { productId, product, config, pinSequenceStart, claude_failed: true, claude_error: String(detail) },
    pairedItem: { item: 0 }
  }];
}

// 2. Extract the assistant text from the Anthropic Messages API response.
let rawText = '';
if (Array.isArray(item.content) && item.content[0] && typeof item.content[0].text === 'string') {
  rawText = item.content[0].text;
} else if (typeof item.text === 'string') {
  rawText = item.text;
} else {
  rawText = JSON.stringify(item);
}

// 3. Strip code fences and extract the first {...} block.
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
    productId,
    reason: 'invalid_json',
    detail: e.message,
    raw: rawText.slice(0, 500)
  });
  return [{
    json: {
      productId, product, config, pinSequenceStart,
      claude_failed: true, claude_error: 'invalid_json',
      raw_response: rawText.slice(0, 500)
    },
    pairedItem: { item: 0 }
  }];
}

// 4. Defensive shape: ensure we always emit an array of variants.
const variants = Array.isArray(parsed.variants) ? parsed.variants : [];
if (variants.length === 0) {
  staticData.failed.push({ productId, reason: 'no_variants' });
  return [{
    json: { productId, product, config, pinSequenceStart, claude_failed: true, claude_error: 'no_variants' },
    pairedItem: { item: 0 }
  }];
}

return [{
  json: { productId, product, config, pinSequenceStart, variants, claude_failed: false },
  pairedItem: { item: 0 }
}];`;

// ---------- Code node: Structure Pin Records --------------------------------
const structureCode = `// STRUCTURE PIN RECORDS
// =====================
// Shapes Claude's output into records that drop straight into
// data/pinterest-pins.json (matches the existing schema).

const item = $input.first().json;
const { productId, product, config, pinSequenceStart, variants, claude_failed, claude_error } = item;
const staticData = $getWorkflowStaticData('global');

if (claude_failed) {
  staticData.processed.push({ productId, status: 'needs_review', error: claude_error });
  return [{
    json: { productId, status: 'needs_review', error: claude_error, pins: [] },
    pairedItem: { item: 0 }
  }];
}

const formulaById = Object.fromEntries(config.formulas.map(f => [f.id, f]));
const utm = '?utm_source=pinterest&utm_medium=social&utm_campaign=' + config.batchId;
const productLink = config.siteUrl + '/finds/' + productId + utm;

const pins = [];
for (let i = 0; i < variants.length; i++) {
  const v = variants[i] || {};
  const formula = formulaById[v.formulaId] || config.formulas[i] || config.formulas[0];
  const seq = String(pinSequenceStart + i).padStart(3, '0');

  pins.push({
    kind: 'product',
    productId,
    formulaId: formula.id,
    formulaLabel: formula.label,
    aspectRatio: formula.aspectRatio,
    title: String(v.title || product.title).slice(0, 100),
    boardSuggestion: v.boardSuggestion || (product.category.replace(/-/g, ' ') + ' | Summer Finds Lab'),
    link: productLink,
    sourceImage: product.image,
    textOverlay: v.textOverlay || product.title,
    secondaryStickers: Array.isArray(v.secondaryStickers) ? v.secondaryStickers.slice(0, 3) : [],
    layout: formula.layout,
    palette: formula.palette,
    fonts: 'See Canva template (' + formula.id + ').',
    canvaPrompt: v.canvaPrompt || '',
    imagePrompt: v.imagePrompt || '',
    lifestylePrompt: v.lifestylePrompt || '',
    description: v.description || '',
    hashtags: Array.isArray(v.hashtags) ? v.hashtags.slice(0, 8) : [],
    cta: v.cta || 'Tap to shop',
    ctrLevers: formula.ctrLevers,
    id: 'pin-' + seq + '-' + formula.id,
    batch: config.batchId
  });
}

staticData.processed.push({ productId, status: 'ok', count: pins.length });

return [{
  json: { productId, status: 'ok', pins },
  pairedItem: { item: 0 }
}];`;

// ---------- Code node: Aggregate Results ------------------------------------
const aggregateCode = `// AGGREGATE RESULTS
// =================

const staticData = $getWorkflowStaticData('global');
const processed = staticData.processed || [];
const failed = staticData.failed || [];
const skipped = staticData.skipped || [];

const ok = processed.filter(p => p.status === 'ok');
const needsReview = processed.filter(p => p.status === 'needs_review');
const totalPins = ok.reduce((sum, p) => sum + (p.count || 0), 0);

return [{
  json: {
    summary: {
      products_in: processed.length + skipped.length,
      products_ok: ok.length,
      pins_generated: totalPins,
      needs_review: needsReview.length,
      failed: failed.length,
      skipped: skipped.length
    },
    batchId: staticData.batchId,
    processed,
    failed,
    skipped,
    started_at: staticData.started_at || null,
    finished_at: new Date().toISOString()
  }
}];`;

// ---------- Workflow definition ---------------------------------------------
const workflow = {
  name: "Pinterest Pin Variant Generator",
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
      parameters: { language: "javaScript", jsCode: loadConfigCode },
      id: "n02-load-config",
      name: "Load Config",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [440, 400],
    },
    {
      parameters: {
        method: "GET",
        url: "={{$env.PRODUCTS_JSON_URL}}",
        options: {
          timeout: 30000,
          response: { response: { neverError: true } },
        },
      },
      id: "n03-fetch-products",
      name: "Fetch Products",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [640, 320],
      retryOnFail: true,
      maxTries: 3,
      waitBetweenTries: 3000,
      onError: "continueRegularOutput",
    },
    {
      parameters: {
        method: "GET",
        url: "={{$env.EXISTING_PINS_JSON_URL || 'https://example.invalid/empty.json'}}",
        options: {
          timeout: 30000,
          response: { response: { neverError: true } },
        },
      },
      id: "n04-fetch-existing-pins",
      name: "Fetch Existing Pins",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [640, 480],
      retryOnFail: true,
      maxTries: 2,
      waitBetweenTries: 2000,
      onError: "continueRegularOutput",
    },
    {
      parameters: { language: "javaScript", jsCode: filterUnpinnedCode },
      id: "n05-filter-unpinned",
      name: "Filter Unpinned",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [860, 400],
    },
    {
      parameters: { batchSize: 1, options: {} },
      id: "n06-loop",
      name: "Loop Over Products",
      type: "n8n-nodes-base.splitInBatches",
      typeVersion: 3,
      position: [1080, 400],
    },
    {
      parameters: { language: "javaScript", jsCode: buildPromptCode },
      id: "n07-build-prompt",
      name: "Build Pin Prompt",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1300, 240],
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
          "={{ JSON.stringify({ model: $env.CLAUDE_MODEL || 'claude-opus-4-20250514', max_tokens: 2500, messages: [{ role: 'user', content: $json.user_prompt }] }) }}",
        options: {
          timeout: 90000,
          response: { response: { neverError: true } },
        },
      },
      id: "n08-claude-api",
      name: "Call Claude API",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1520, 240],
      retryOnFail: true,
      maxTries: 3,
      waitBetweenTries: 3000,
      onError: "continueRegularOutput",
    },
    {
      parameters: { language: "javaScript", jsCode: parseVariantsCode },
      id: "n09-parse-variants",
      name: "Parse Pin Variants",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1740, 240],
    },
    {
      parameters: { language: "javaScript", jsCode: structureCode },
      id: "n10-structure",
      name: "Structure Pin Records",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1960, 240],
    },
    {
      parameters: {
        method: "POST",
        url: "={{$env.PINS_INGEST_URL}}",
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: "Authorization", value: "=Bearer {{$env.PINS_INGEST_TOKEN}}" },
            { name: "Content-Type", value: "application/json" },
          ],
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody:
          "={{ JSON.stringify({ productId: $json.productId, status: $json.status, pins: $json.pins }) }}",
        options: {
          timeout: 30000,
          response: { response: { neverError: true } },
        },
      },
      id: "n11-insert-pins",
      name: "Insert Pins",
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [2180, 240],
      retryOnFail: true,
      maxTries: 3,
      waitBetweenTries: 3000,
      onError: "continueRegularOutput",
    },
    {
      parameters: { maxItems: 1 },
      id: "n12-limit-done",
      name: "Limit (Done Branch)",
      type: "n8n-nodes-base.limit",
      typeVersion: 1,
      position: [1300, 560],
    },
    {
      parameters: { language: "javaScript", jsCode: aggregateCode },
      id: "n13-aggregate",
      name: "Aggregate Results",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [1520, 560],
    },
  ],

  connections: {
    "Start - Manual Trigger": {
      main: [[{ node: "Load Config", type: "main", index: 0 }]],
    },
    // Serialise the two fetches: Load Config -> Fetch Products ->
    // Fetch Existing Pins -> Filter Unpinned. This avoids the n8n
    // gotcha where a Code node with multiple incoming connections can
    // execute once per incoming pulse instead of once total.
    "Load Config": {
      main: [[{ node: "Fetch Products", type: "main", index: 0 }]],
    },
    "Fetch Products": {
      main: [[{ node: "Fetch Existing Pins", type: "main", index: 0 }]],
    },
    "Fetch Existing Pins": {
      main: [[{ node: "Filter Unpinned", type: "main", index: 0 }]],
    },
    "Filter Unpinned": {
      main: [[{ node: "Loop Over Products", type: "main", index: 0 }]],
    },
    // SplitInBatches v3:
    //   main[0] = "done" branch (fires once after all batches)
    //   main[1] = "loop" branch (fires per batch — body of the loop)
    "Loop Over Products": {
      main: [
        [{ node: "Limit (Done Branch)", type: "main", index: 0 }],
        [{ node: "Build Pin Prompt", type: "main", index: 0 }],
      ],
    },
    "Build Pin Prompt": {
      main: [[{ node: "Call Claude API", type: "main", index: 0 }]],
    },
    "Call Claude API": {
      main: [[{ node: "Parse Pin Variants", type: "main", index: 0 }]],
    },
    "Parse Pin Variants": {
      main: [[{ node: "Structure Pin Records", type: "main", index: 0 }]],
    },
    "Structure Pin Records": {
      main: [[{ node: "Insert Pins", type: "main", index: 0 }]],
    },
    "Insert Pins": {
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
const outPath = path.join(outDir, "pinterest-pin-generator.json");
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2) + "\n", "utf8");
console.log("Wrote " + outPath);
