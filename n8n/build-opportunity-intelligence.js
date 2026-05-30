/**
 * Builds the importable n8n workflow:
 *   Opportunity Intelligence System (WF-06)
 *
 * Run:  node n8n/build-opportunity-intelligence.js
 * Out:  n8n/workflows/opportunity-intelligence.json
 *
 * What it does
 * ============
 * Daily, finds opportunities before competitors do.
 *
 *   1. Discovers trending Pinterest keywords      (Firecrawl /v2/scrape -> JSON)
 *   2. Discovers trending Amazon categories       (Firecrawl /v2/scrape -> JSON)
 *   3. Loads our product catalog + pin coverage   (data/products.json, data/pinterest-pins.json)
 *   4. Loads yesterday's report                   (data/opportunities/latest.json)
 *   5. Scores every product 0-100 on two axes     (Pinterest potential + affiliate potential)
 *   6. Picks top opportunities for each axis      (deterministic, explainable)
 *   7. Asks Claude for an executive brief         (one call, bounded prompt)
 *   8. Builds a daily report (JSON + markdown)    (with day-over-day deltas)
 *   9. POSTs the report to /api/opportunities/ingest so the site persists it
 *
 * Architecture
 * ============
 *   Schedule Trigger (daily 06:00 UTC)
 *     -> Load Config                      (Code: weights, today's date, sources)
 *     -> Fetch Pinterest Trends           (HTTP POST Firecrawl /v2/scrape, neverError)
 *     -> Fetch Amazon Movers & Shakers    (HTTP POST Firecrawl /v2/scrape, neverError)
 *     -> Fetch Products                   (HTTP GET PRODUCTS_JSON_URL)
 *     -> Fetch Existing Pins              (HTTP GET EXISTING_PINS_JSON_URL, neverError)
 *     -> Fetch Yesterday's Report         (HTTP GET OPPORTUNITY_HISTORY_URL, neverError)
 *     -> Score & Rank                     (Code: deterministic per-product scoring)
 *     -> Build Brief Prompt               (Code: top 20 only, kept under 4k tokens)
 *     -> Call Claude API                  (HTTP POST, retry x3)
 *     -> Parse Brief                      (Code: tolerant JSON parse with defaults)
 *     -> Build Daily Report               (Code: merges scores + AI brief + deltas)
 *     -> Insert Report                    (HTTP POST OPPORTUNITY_INGEST_URL)
 *     -> Aggregate Results                (Code: returns the run summary)
 *
 * Env vars (set in n8n -> Settings -> Variables)
 *   ANTHROPIC_API_KEY            (required) Anthropic API key
 *   CLAUDE_MODEL                 (optional) default claude-opus-4-20250514
 *   FIRECRAWL_API_KEY            (required) Firecrawl API key
 *   PRODUCTS_JSON_URL            (required) URL serving data/products.json
 *   EXISTING_PINS_JSON_URL       (optional) URL serving data/pinterest-pins.json
 *   OPPORTUNITY_HISTORY_URL      (optional) URL serving data/opportunities/latest.json
 *   OPPORTUNITY_INGEST_URL       (required) endpoint that accepts the daily report
 *   OPPORTUNITY_INGEST_TOKEN     (required) bearer token for the above
 *   OPPORTUNITY_TOP_N            (optional) integer 5-50, default 10
 */

const fs = require("fs");
const path = require("path");

// ---------- Code node: Load Config ------------------------------------------
const loadConfigCode = `// LOAD CONFIG
// ===========
// Centralises every tunable. The downstream Code nodes read \`config\` from
// this single item, so changing one weight or the daily Top-N is a one-line
// edit here — no other node has hard-coded numbers.

const today = new Date().toISOString().slice(0, 10);

// Scoring weights. Numbers must sum to 100 inside each axis.
const WEIGHTS = {
  pinterest: {
    trendingTagMatch: 35,    // product tags match today's Pinterest trending keywords
    categorySignal:   20,    // product category appears in Pinterest trend list
    pinGap:           20,    // product has 0 pins yet -> full opportunity
    visualBand:       15,    // has image + price in the Pinterest sweet spot ($15-$50)
    novelty:          10     // imported in last 14 days
  },
  affiliate: {
    amazonCategoryHeat: 30,  // category appears in Amazon Movers & Shakers / Best Sellers
    ratingSignal:       25,  // rating.value * normalised review count
    priceBand:          20,  // under-25 + tag match scores highest
    tagBoost:           15,  // trending / tiktok / viral tags
    asinPresence:       10   // has asin -> trackable, full attribution
  }
};

const TOP_N = Math.max(5, Math.min(50, Number($env.OPPORTUNITY_TOP_N || 10)));

// Pinterest Trends page Firecrawl will scrape with JSON extraction.
const PINTEREST_TRENDS_URL = 'https://trends.pinterest.com/?country=US';

// Amazon Movers & Shakers — daily-updated category-level momentum signal.
const AMAZON_TRENDS_URL = 'https://www.amazon.com/gp/movers-and-shakers/';

return [{
  json: {
    today,
    weights: WEIGHTS,
    topN: TOP_N,
    pinterestTrendsUrl: PINTEREST_TRENDS_URL,
    amazonTrendsUrl: AMAZON_TRENDS_URL,
    productsUrl: $env.PRODUCTS_JSON_URL || '',
    existingPinsUrl: $env.EXISTING_PINS_JSON_URL || '',
    historyUrl: $env.OPPORTUNITY_HISTORY_URL || '',
    started_at: new Date().toISOString()
  }
}];`;

// ---------- Code node: Score & Rank -----------------------------------------
const scoreAndRankCode = `// SCORE & RANK
// ============
// Deterministic, explainable scoring. Every product gets two scores 0-100
// and a per-axis breakdown, so the daily report can show *why* something
// ranked. No AI here — keeps the scores reproducible across days.
//
// Inputs (all are upstream HTTP nodes):
//   $('Fetch Pinterest Trends').first().json.data.json  -> { keywords:[], categories:[] }
//   $('Fetch Amazon Movers & Shakers').first().json.data.json -> { categories:[], items:[] }
//   $('Fetch Products').first().json                    -> [...products]
//   $('Fetch Existing Pins').first().json               -> [...pins]   (may be empty / 404)
//   $('Fetch Yesterday\\'s Report').first().json         -> previous report (may be empty)
//   $('Load Config').first().json                       -> config bundle

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.body)) return payload.body;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

function pickFirecrawlJson(payload) {
  // Firecrawl /v2/scrape returns { success, data: { json: {...}, markdown, ... } }.
  // Be tolerant of every shape this might arrive in.
  if (!payload) return null;
  if (payload.data && payload.data.json) return payload.data.json;
  if (payload.json) return payload.json;
  if (payload.body && payload.body.data && payload.body.data.json) return payload.body.data.json;
  return null;
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\\s+/g, ' ').trim();
}

const cfg = $('Load Config').first().json;
const w = cfg.weights;

// --- 1. Trend signals ---
const pinterestRaw = pickFirecrawlJson($('Fetch Pinterest Trends').first().json) || {};
const amazonRaw    = pickFirecrawlJson($('Fetch Amazon Movers & Shakers').first().json) || {};

const pinterestKeywords = (pinterestRaw.keywords || []).map(norm).filter(Boolean);
const pinterestCategories = (pinterestRaw.categories || []).map(norm).filter(Boolean);
const amazonCategories = (amazonRaw.categories || []).map(norm).filter(Boolean);
const amazonItems = Array.isArray(amazonRaw.items) ? amazonRaw.items : [];

// --- 2. Catalog + coverage ---
const products = asArray($('Fetch Products').first().json);
const pins = asArray($('Fetch Existing Pins').first().json);

const pinCountByProduct = {};
for (const pin of pins) {
  if (pin && pin.productId) {
    pinCountByProduct[pin.productId] = (pinCountByProduct[pin.productId] || 0) + 1;
  }
}

// --- 3. Yesterday for deltas ---
const history = $('Fetch Yesterday\\'s Report').first().json || {};
const yesterdayBody = history.body || history.data || history;
const yesterdayScoreById = {};
if (yesterdayBody && Array.isArray(yesterdayBody.scored)) {
  for (const row of yesterdayBody.scored) {
    if (row && row.id) yesterdayScoreById[row.id] = row;
  }
}

// --- 4. Helpers ---
const VIRAL_TAGS = new Set(['trending', 'tiktok', 'viral', 'aesthetic']);
const fourteenDaysMs = 14 * 24 * 3600 * 1000;
const nowMs = Date.now();

function pinterestSubScores(p) {
  const haystack = norm([p.title, p.description, (p.tags || []).join(' '), p.category].join(' '));
  const tagHits = (p.tags || []).filter(t => pinterestKeywords.includes(norm(t))).length;
  const titleHits = pinterestKeywords.filter(k => k && haystack.includes(k)).length;
  const trendingTagMatch = Math.min(1, (tagHits * 0.4) + (titleHits * 0.15));

  const catNorm = norm(p.category || '');
  const categorySignal = pinterestCategories.some(c => c && (catNorm.includes(c) || c.includes(catNorm))) ? 1 : 0;

  const pinGap = (pinCountByProduct[p.id] || 0) === 0 ? 1 : 0;

  // Pinterest visual sweet spot: $15-$50, image present.
  let visualBand = 0;
  if (p.image) visualBand += 0.5;
  const price = Number(p.price);
  if (Number.isFinite(price) && price >= 15 && price <= 50) visualBand += 0.5;

  let novelty = 0;
  if (p.importedAt) {
    const importedMs = new Date(p.importedAt).getTime();
    if (Number.isFinite(importedMs) && (nowMs - importedMs) < fourteenDaysMs) novelty = 1;
  }

  return { trendingTagMatch, categorySignal, pinGap, visualBand, novelty };
}

function affiliateSubScores(p) {
  const catNorm = norm(p.category || '');
  const titleNorm = norm(p.title || '');
  const amazonCategoryHeat = amazonCategories.some(c => c && (catNorm.includes(c) || c.includes(catNorm))) ||
    amazonItems.some(it => norm(it && it.title).split(' ').some(w => w.length > 4 && titleNorm.includes(w)))
      ? 1 : 0;

  const rv = Number(p.rating && p.rating.value) || 0;
  const rc = Number(p.rating && p.rating.count) || 0;
  // Normalise so a 4.5/200 product scores ~1, a 4.5/50 product scores ~0.4.
  const ratingSignal = Math.min(1, (rv / 5) * Math.min(1, rc / 250));

  const price = Number(p.price);
  let priceBand = 0;
  if (Number.isFinite(price)) {
    if (price <= 25) priceBand = 1;
    else if (price <= 50) priceBand = 0.7;
    else if (price <= 100) priceBand = 0.45;
    else priceBand = 0.2;
  }
  if ((p.tags || []).includes('under-25') && priceBand >= 0.7) priceBand = 1;

  const tagBoost = (p.tags || []).reduce((acc, t) => acc + (VIRAL_TAGS.has(norm(t)) ? 0.5 : 0), 0);

  const asinPresence = p.asin ? 1 : 0;

  return {
    amazonCategoryHeat,
    ratingSignal,
    priceBand,
    tagBoost: Math.min(1, tagBoost),
    asinPresence
  };
}

const scored = [];
for (const p of products) {
  if (!p || !p.id) continue;

  const pin = pinterestSubScores(p);
  const aff = affiliateSubScores(p);

  const pinterestScore = Math.round(
    pin.trendingTagMatch * w.pinterest.trendingTagMatch +
    pin.categorySignal   * w.pinterest.categorySignal +
    pin.pinGap           * w.pinterest.pinGap +
    pin.visualBand       * w.pinterest.visualBand +
    pin.novelty          * w.pinterest.novelty
  );

  const affiliateScore = Math.round(
    aff.amazonCategoryHeat * w.affiliate.amazonCategoryHeat +
    aff.ratingSignal       * w.affiliate.ratingSignal +
    aff.priceBand          * w.affiliate.priceBand +
    aff.tagBoost           * w.affiliate.tagBoost +
    aff.asinPresence       * w.affiliate.asinPresence
  );

  const compositeScore = Math.max(pinterestScore, affiliateScore);

  // Day-over-day delta (positive = product is climbing).
  const yest = yesterdayScoreById[p.id];
  const delta = yest ? {
    pinterest: pinterestScore - (yest.pinterestScore || 0),
    affiliate: affiliateScore - (yest.affiliateScore || 0)
  } : null;

  scored.push({
    id: p.id,
    title: p.title,
    brand: p.brand || null,
    category: p.category || null,
    price: p.price ?? null,
    image: p.image || null,
    affiliateUrl: p.affiliateUrl || null,
    asin: p.asin || null,
    tags: Array.isArray(p.tags) ? p.tags : [],
    pinCount: pinCountByProduct[p.id] || 0,
    pinterestScore,
    affiliateScore,
    compositeScore,
    pinterestBreakdown: pin,
    affiliateBreakdown: aff,
    delta
  });
}

scored.sort((a, b) => b.compositeScore - a.compositeScore);

const topPinterest = [...scored].sort((a, b) => b.pinterestScore - a.pinterestScore).slice(0, cfg.topN);
const topAffiliate = [...scored].sort((a, b) => b.affiliateScore - a.affiliateScore).slice(0, cfg.topN);
const doubleWinners = scored.filter(p => p.pinterestScore >= 70 && p.affiliateScore >= 70).slice(0, 5);

return [{
  json: {
    config: cfg,
    trends: {
      pinterest: { keywords: pinterestKeywords, categories: pinterestCategories },
      amazon: { categories: amazonCategories, items: amazonItems.slice(0, 25) }
    },
    catalogStats: {
      productCount: products.length,
      pinCount: pins.length,
      productsWithoutPins: products.filter(p => p && p.id && !(pinCountByProduct[p.id])).length
    },
    scored,
    topPinterest,
    topAffiliate,
    doubleWinners,
    yesterdaySeen: Object.keys(yesterdayScoreById).length
  }
}];`;

// ---------- Code node: Build Brief Prompt -----------------------------------
const buildBriefPromptCode = `// BUILD BRIEF PROMPT
// ==================
// One Claude call. We pass the deterministic scoring already done so Claude
// only has to write *human-readable reasoning*, not invent numbers. Bounded
// to top 20 products + 25 trend keywords -> well under 4k tokens.

const item = $input.first().json;
const { trends, topPinterest, topAffiliate, doubleWinners, catalogStats, config } = item;

function compactProduct(p) {
  return {
    id: p.id,
    title: p.title,
    category: p.category,
    price: p.price,
    pinCount: p.pinCount,
    pinterestScore: p.pinterestScore,
    affiliateScore: p.affiliateScore,
    delta: p.delta,
    tags: p.tags
  };
}

const userPrompt = [
  'You are a growth analyst running a daily Opportunity Intelligence System for a summer-finds affiliate site.',
  '',
  'Today is ' + config.today + '. We want to find product opportunities BEFORE competitors do.',
  '',
  'You will receive: today\\'s trending signals, top-scored products, and yesterday\\'s deltas.',
  'Return STRICT JSON only (no prose, no markdown fences) with this exact shape:',
  '',
  '{',
  '  "executiveSummary": "<3-4 sentence brief: what is hot today, what to act on first>",',
  '  "trendNarrative": "<1-2 sentence summary of today\\'s Pinterest + Amazon signal>",',
  '  "pinterestPlay": [',
  '    { "id": "<product id>", "reason": "<1 sentence: why this is a Pinterest opportunity TODAY>", "action": "<short action: pin formula, content angle>" }',
  '  ],',
  '  "affiliatePlay": [',
  '    { "id": "<product id>", "reason": "<1 sentence: why this is converting>", "action": "<short action: bundle, comparison post, restock alert>" }',
  '  ],',
  '  "watchList": ["<id1>","<id2>"],',
  '  "missingCoverage": "<one sentence: what trending keyword or category we don\\'t have a product for yet>"',
  '}',
  '',
  'Rules:',
  '  - pinterestPlay must include ONE entry per product in topPinterest (in order).',
  '  - affiliatePlay must include ONE entry per product in topAffiliate (in order).',
  '  - Keep every "reason" and "action" under 25 words. No emoji. No hashtags.',
  '  - "missingCoverage" should name a Pinterest or Amazon trend our catalog does NOT cover.',
  '',
  'Catalog stats:',
  JSON.stringify(catalogStats),
  '',
  'Pinterest trending keywords (sample):',
  JSON.stringify((trends.pinterest.keywords || []).slice(0, 25)),
  '',
  'Pinterest trending categories:',
  JSON.stringify((trends.pinterest.categories || []).slice(0, 15)),
  '',
  'Amazon Movers & Shakers categories:',
  JSON.stringify((trends.amazon.categories || []).slice(0, 15)),
  '',
  'Amazon Movers & Shakers items (sample):',
  JSON.stringify((trends.amazon.items || []).slice(0, 10)),
  '',
  'topPinterest (top ' + topPinterest.length + '):',
  JSON.stringify(topPinterest.map(compactProduct)),
  '',
  'topAffiliate (top ' + topAffiliate.length + '):',
  JSON.stringify(topAffiliate.map(compactProduct)),
  '',
  'doubleWinners:',
  JSON.stringify(doubleWinners.map(compactProduct)),
  '',
  'Return ONLY the JSON object. Do not wrap it in code fences.'
].join('\\n');

return [{
  json: { ...item, user_prompt: userPrompt }
}];`;

// ---------- Code node: Parse Brief ------------------------------------------
const parseBriefCode = `// PARSE BRIEF
// ===========
// Tolerant to: HTTP errors flowing through, markdown fences, prose around JSON.
// On any failure we degrade gracefully — the deterministic scoring is still
// the core of the report; the AI brief is the icing.

const item = $input.first().json;
const upstream = $('Build Brief Prompt').first().json;

function emptyBrief() {
  return {
    executiveSummary: '(AI brief unavailable — deterministic scores below.)',
    trendNarrative: '',
    pinterestPlay: [],
    affiliatePlay: [],
    watchList: [],
    missingCoverage: ''
  };
}

const looksLikeError = item && (item.error || (item.statusCode && item.statusCode >= 400));
if (looksLikeError) {
  return [{ json: { ...upstream, brief: emptyBrief(), brief_error: 'claude_api_error' } }];
}

let rawText = '';
if (Array.isArray(item.content) && item.content[0] && typeof item.content[0].text === 'string') {
  rawText = item.content[0].text;
} else if (typeof item.text === 'string') {
  rawText = item.text;
} else {
  rawText = JSON.stringify(item);
}

let cleaned = rawText.trim()
  .replace(/^\`\`\`(?:json)?\\s*/i, '')
  .replace(/\\s*\`\`\`$/i, '')
  .trim();

const firstBrace = cleaned.indexOf('{');
const lastBrace = cleaned.lastIndexOf('}');
if (firstBrace !== -1 && lastBrace > firstBrace) cleaned = cleaned.slice(firstBrace, lastBrace + 1);

let parsed;
try { parsed = JSON.parse(cleaned); }
catch (e) {
  return [{ json: { ...upstream, brief: emptyBrief(), brief_error: 'invalid_json' } }];
}

const safeBrief = {
  executiveSummary: parsed.executiveSummary || '',
  trendNarrative: parsed.trendNarrative || '',
  pinterestPlay: Array.isArray(parsed.pinterestPlay) ? parsed.pinterestPlay : [],
  affiliatePlay: Array.isArray(parsed.affiliatePlay) ? parsed.affiliatePlay : [],
  watchList: Array.isArray(parsed.watchList) ? parsed.watchList : [],
  missingCoverage: parsed.missingCoverage || ''
};

return [{ json: { ...upstream, brief: safeBrief, brief_error: null } }];`;

// ---------- Code node: Build Daily Report -----------------------------------
const buildReportCode = `// BUILD DAILY REPORT
// ==================
// Merges deterministic scoring + the AI brief into the report payload that
// will be POSTed to the site. We also build a markdown digest so the
// downstream consumer (email, Slack, blog post) can render it cheaply.

const item = $input.first().json;
const { config, trends, scored, topPinterest, topAffiliate, doubleWinners, brief, catalogStats, brief_error } = item;

function indexBy(arr, key) {
  const m = {};
  for (const x of arr || []) if (x && x[key]) m[x[key]] = x;
  return m;
}

const pinReasonsById = indexBy(brief.pinterestPlay, 'id');
const affReasonsById = indexBy(brief.affiliatePlay, 'id');

function mergeReason(list, reasons) {
  return list.map(p => ({
    ...p,
    aiReason: reasons[p.id] ? reasons[p.id].reason : '',
    aiAction: reasons[p.id] ? reasons[p.id].action : ''
  }));
}

const topPinterestEnriched = mergeReason(topPinterest, pinReasonsById);
const topAffiliateEnriched = mergeReason(topAffiliate, affReasonsById);

// --- Markdown digest ---
function moneyOrNa(p) { return p.price != null ? '$' + p.price : 'n/a'; }

const lines = [];
lines.push('# Opportunity Intelligence — ' + config.today);
lines.push('');
lines.push('> ' + (brief.executiveSummary || '(no AI summary today)'));
lines.push('');
lines.push('## Today at a glance');
lines.push('- Catalog: ' + catalogStats.productCount + ' products, ' + catalogStats.pinCount + ' pins, ' + catalogStats.productsWithoutPins + ' products without pins');
lines.push('- Trending Pinterest keywords: ' + (trends.pinterest.keywords.slice(0, 8).join(', ') || '—'));
lines.push('- Hot Amazon categories: ' + (trends.amazon.categories.slice(0, 8).join(', ') || '—'));
if (brief.missingCoverage) lines.push('- Coverage gap: ' + brief.missingCoverage);
lines.push('');
lines.push('## Top Pinterest opportunities');
lines.push('');
topPinterestEnriched.forEach((p, i) => {
  lines.push((i + 1) + '. **' + p.title + '** — score ' + p.pinterestScore + (p.delta && p.delta.pinterest ? ' (' + (p.delta.pinterest >= 0 ? '+' : '') + p.delta.pinterest + ' vs yesterday)' : ''));
  lines.push('   - ' + moneyOrNa(p) + ' · ' + (p.category || '') + ' · pins: ' + p.pinCount);
  if (p.aiReason) lines.push('   - Why: ' + p.aiReason);
  if (p.aiAction) lines.push('   - Do: ' + p.aiAction);
});
lines.push('');
lines.push('## Top affiliate opportunities');
lines.push('');
topAffiliateEnriched.forEach((p, i) => {
  lines.push((i + 1) + '. **' + p.title + '** — score ' + p.affiliateScore + (p.delta && p.delta.affiliate ? ' (' + (p.delta.affiliate >= 0 ? '+' : '') + p.delta.affiliate + ' vs yesterday)' : ''));
  lines.push('   - ' + moneyOrNa(p) + ' · ' + (p.category || '') + ' · rating ' + JSON.stringify(p.affiliateBreakdown.ratingSignal));
  if (p.aiReason) lines.push('   - Why: ' + p.aiReason);
  if (p.aiAction) lines.push('   - Do: ' + p.aiAction);
});
lines.push('');
if (doubleWinners.length) {
  lines.push('## Double winners (Pinterest >= 70 AND Affiliate >= 70)');
  lines.push('');
  doubleWinners.forEach(p => {
    lines.push('- **' + p.title + '** — Pinterest ' + p.pinterestScore + ' · Affiliate ' + p.affiliateScore);
  });
}

const markdown = lines.join('\\n');

// --- Final report ---
const report = {
  date: config.today,
  generatedAt: new Date().toISOString(),
  source: 'wf-06-opportunity-intelligence',
  briefError: brief_error || null,
  executiveSummary: brief.executiveSummary,
  trendNarrative: brief.trendNarrative,
  trends,
  catalogStats,
  topPinterest: topPinterestEnriched,
  topAffiliate: topAffiliateEnriched,
  doubleWinners,
  watchList: brief.watchList,
  missingCoverage: brief.missingCoverage,
  // Full scored list — kept compact for next-day delta lookups.
  scored: scored.map(s => ({
    id: s.id,
    pinterestScore: s.pinterestScore,
    affiliateScore: s.affiliateScore,
    compositeScore: s.compositeScore
  })),
  markdown
};

return [{ json: { report } }];`;

// ---------- Code node: Aggregate Results ------------------------------------
const aggregateCode = `// AGGREGATE RESULTS
// =================

const upstream = $('Build Daily Report').first().json.report;
const ingest = $input.first().json;

const ingestStatus = ingest && ingest.statusCode ? ingest.statusCode : 'ok';
const ingestError = ingest && ingest.error ? String(ingest.error) : null;

return [{
  json: {
    summary: {
      date: upstream.date,
      productsScored: upstream.scored.length,
      topPinterest: upstream.topPinterest.length,
      topAffiliate: upstream.topAffiliate.length,
      doubleWinners: upstream.doubleWinners.length,
      pinterestKeywords: upstream.trends.pinterest.keywords.length,
      amazonCategories: upstream.trends.amazon.categories.length,
      ingestStatus,
      ingestError,
      briefError: upstream.briefError
    },
    report: upstream
  }
}];`;

// ---------- Firecrawl payloads (built as strings for the jsonBody field) ----
// Pinterest Trends extraction prompt + schema
const firecrawlPinterestBody = JSON.stringify({
    url: "https://trends.pinterest.com/?country=US",
    formats: [
        {
            type: "json",
            prompt:
                "Extract the trending Pinterest searches and categories visible on this page. Return up to 30 trending keywords (single words or short phrases) and up to 15 trending category labels. Only include real trending items shown on the page.",
            schema: {
                type: "object",
                properties: {
                    keywords: { type: "array", items: { type: "string" } },
                    categories: { type: "array", items: { type: "string" } },
                },
                required: ["keywords"],
            },
        },
    ],
    onlyMainContent: true,
    proxy: "auto",
    waitFor: 4000,
    maxAge: 21600000, // 6h cache — Pinterest Trends moves slowly enough
});

// Amazon Movers & Shakers extraction prompt + schema
const firecrawlAmazonBody = JSON.stringify({
    url: "https://www.amazon.com/gp/movers-and-shakers/",
    formats: [
        {
            type: "json",
            prompt:
                "Extract Amazon Movers & Shakers signals from this page. Return up to 15 category labels visible on the page and up to 25 top items, each with title, asin (if visible) and rank.",
            schema: {
                type: "object",
                properties: {
                    categories: { type: "array", items: { type: "string" } },
                    items: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                asin: { type: "string" },
                                rank: { type: "integer" },
                            },
                            required: ["title"],
                        },
                    },
                },
                required: ["items"],
            },
        },
    ],
    onlyMainContent: true,
    proxy: "auto",
    waitFor: 4000,
    maxAge: 21600000,
});

// ---------- Workflow definition ---------------------------------------------
const workflow = {
    name: "Opportunity Intelligence System",
    nodes: [
        {
            parameters: {
                rule: {
                    interval: [{ field: "cronExpression", expression: "0 6 * * *" }],
                },
            },
            id: "n01-schedule",
            name: "Daily 06:00 UTC",
            type: "n8n-nodes-base.scheduleTrigger",
            typeVersion: 1.2,
            position: [240, 400],
        },
        {
            parameters: {},
            id: "n01b-manual",
            name: "Manual Test Trigger",
            type: "n8n-nodes-base.manualTrigger",
            typeVersion: 1,
            position: [240, 560],
        },
        {
            parameters: { language: "javaScript", jsCode: loadConfigCode },
            id: "n02-load-config",
            name: "Load Config",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [460, 480],
        },
        // Pinterest Trends via Firecrawl /v2/scrape
        {
            parameters: {
                method: "POST",
                url: "https://api.firecrawl.dev/v2/scrape",
                sendHeaders: true,
                headerParameters: {
                    parameters: [
                        { name: "Authorization", value: "=Bearer {{$env.FIRECRAWL_API_KEY}}" },
                        { name: "Content-Type", value: "application/json" },
                    ],
                },
                sendBody: true,
                specifyBody: "json",
                jsonBody: firecrawlPinterestBody,
                options: {
                    timeout: 90000,
                    response: { response: { neverError: true } },
                },
            },
            id: "n03-fetch-pinterest-trends",
            name: "Fetch Pinterest Trends",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [680, 200],
            retryOnFail: true,
            maxTries: 3,
            waitBetweenTries: 5000,
            onError: "continueRegularOutput",
        },
        // Amazon Movers & Shakers via Firecrawl /v2/scrape
        {
            parameters: {
                method: "POST",
                url: "https://api.firecrawl.dev/v2/scrape",
                sendHeaders: true,
                headerParameters: {
                    parameters: [
                        { name: "Authorization", value: "=Bearer {{$env.FIRECRAWL_API_KEY}}" },
                        { name: "Content-Type", value: "application/json" },
                    ],
                },
                sendBody: true,
                specifyBody: "json",
                jsonBody: firecrawlAmazonBody,
                options: {
                    timeout: 90000,
                    response: { response: { neverError: true } },
                },
            },
            id: "n04-fetch-amazon-trends",
            name: "Fetch Amazon Movers & Shakers",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [680, 360],
            retryOnFail: true,
            maxTries: 3,
            waitBetweenTries: 5000,
            onError: "continueRegularOutput",
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
            id: "n05-fetch-products",
            name: "Fetch Products",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [680, 520],
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
            id: "n06-fetch-pins",
            name: "Fetch Existing Pins",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [680, 680],
            retryOnFail: true,
            maxTries: 2,
            waitBetweenTries: 2000,
            onError: "continueRegularOutput",
        },
        {
            parameters: {
                method: "GET",
                url: "={{$env.OPPORTUNITY_HISTORY_URL || 'https://example.invalid/empty.json'}}",
                options: {
                    timeout: 30000,
                    response: { response: { neverError: true } },
                },
            },
            id: "n07-fetch-history",
            name: "Fetch Yesterday's Report",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [680, 840],
            retryOnFail: true,
            maxTries: 2,
            waitBetweenTries: 2000,
            onError: "continueRegularOutput",
        },
        {
            parameters: { language: "javaScript", jsCode: scoreAndRankCode },
            id: "n08-score",
            name: "Score & Rank",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [940, 480],
        },
        {
            parameters: { language: "javaScript", jsCode: buildBriefPromptCode },
            id: "n09-build-brief-prompt",
            name: "Build Brief Prompt",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1160, 480],
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
                    "={{ JSON.stringify({ model: $env.CLAUDE_MODEL || 'claude-opus-4-20250514', max_tokens: 3000, messages: [{ role: 'user', content: $json.user_prompt }] }) }}",
                options: {
                    timeout: 90000,
                    response: { response: { neverError: true } },
                },
            },
            id: "n10-claude",
            name: "Call Claude API",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [1380, 480],
            retryOnFail: true,
            maxTries: 3,
            waitBetweenTries: 3000,
            onError: "continueRegularOutput",
        },
        {
            parameters: { language: "javaScript", jsCode: parseBriefCode },
            id: "n11-parse-brief",
            name: "Parse Brief",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1600, 480],
        },
        {
            parameters: { language: "javaScript", jsCode: buildReportCode },
            id: "n12-build-report",
            name: "Build Daily Report",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1820, 480],
        },
        {
            parameters: {
                method: "POST",
                url: "={{$env.OPPORTUNITY_INGEST_URL}}",
                sendHeaders: true,
                headerParameters: {
                    parameters: [
                        { name: "Authorization", value: "=Bearer {{$env.OPPORTUNITY_INGEST_TOKEN}}" },
                        { name: "Content-Type", value: "application/json" },
                    ],
                },
                sendBody: true,
                specifyBody: "json",
                jsonBody: "={{ JSON.stringify($json.report) }}",
                options: {
                    timeout: 30000,
                    response: { response: { neverError: true } },
                },
            },
            id: "n13-insert-report",
            name: "Insert Report",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [2040, 480],
            retryOnFail: true,
            maxTries: 3,
            waitBetweenTries: 3000,
            onError: "continueRegularOutput",
        },
        {
            parameters: { language: "javaScript", jsCode: aggregateCode },
            id: "n14-aggregate",
            name: "Aggregate Results",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [2260, 480],
        },
    ],

    // Dual triggers (schedule + manual) both fan out into the four parallel
    // fetches, then the Score node merges everything.
    connections: {
        "Daily 06:00 UTC": {
            main: [[{ node: "Load Config", type: "main", index: 0 }]],
        },
        "Manual Test Trigger": {
            main: [[{ node: "Load Config", type: "main", index: 0 }]],
        },
        // Serialise the four fetches so the Score Code node only fires once
        // (multiple incoming connections to a Code node fire it once per pulse).
        "Load Config": {
            main: [[{ node: "Fetch Pinterest Trends", type: "main", index: 0 }]],
        },
        "Fetch Pinterest Trends": {
            main: [[{ node: "Fetch Amazon Movers & Shakers", type: "main", index: 0 }]],
        },
        "Fetch Amazon Movers & Shakers": {
            main: [[{ node: "Fetch Products", type: "main", index: 0 }]],
        },
        "Fetch Products": {
            main: [[{ node: "Fetch Existing Pins", type: "main", index: 0 }]],
        },
        "Fetch Existing Pins": {
            main: [[{ node: "Fetch Yesterday's Report", type: "main", index: 0 }]],
        },
        "Fetch Yesterday's Report": {
            main: [[{ node: "Score & Rank", type: "main", index: 0 }]],
        },
        "Score & Rank": {
            main: [[{ node: "Build Brief Prompt", type: "main", index: 0 }]],
        },
        "Build Brief Prompt": {
            main: [[{ node: "Call Claude API", type: "main", index: 0 }]],
        },
        "Call Claude API": {
            main: [[{ node: "Parse Brief", type: "main", index: 0 }]],
        },
        "Parse Brief": {
            main: [[{ node: "Build Daily Report", type: "main", index: 0 }]],
        },
        "Build Daily Report": {
            main: [[{ node: "Insert Report", type: "main", index: 0 }]],
        },
        "Insert Report": {
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
const outPath = path.join(outDir, "opportunity-intelligence.json");
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2) + "\n", "utf8");
console.log("Wrote " + outPath);
