/**
 * Builds the importable n8n workflow:
 *   Pinterest Publisher (WF-04)
 *
 * Run:  node n8n/build-pinterest-publisher.js
 * Out:  n8n/workflows/pinterest-publisher.json
 *
 * What it does
 * ============
 * Daily cron at 09:00 UTC. Reads `data/pinterest-pins.json`, skips any pin
 * whose `id` is in `data/pinterest-published.json`, throttles to N pins/day
 * (default 5), and POSTs each one to Pinterest's /v5/pins endpoint.
 *
 * It looks up boards live from Pinterest by name on every run, matches each
 * pin's `boardSuggestion` against the user's actual boards, and falls back to
 * a default board if no match is found. After a successful publish, it appends
 * the pin id (plus the Pinterest-assigned id) to the published log via the
 * site's ingest endpoint so re-runs are idempotent.
 *
 * The workflow uses the `sourceImage` already in each pin record (Amazon CDN
 * URL or category hero image) as the initial pin media. The Canva-rendered
 * version can replace those URLs later by editing pinterest-pins.json — the
 * publisher will pick up the new URLs on the next run for any pin whose id
 * isn't in the published log yet. (Once published, a pin's image is locked
 * by Pinterest unless you delete and re-create.)
 *
 * Architecture
 * ============
 *   Schedule (09:00 UTC) | Manual Trigger
 *     -> Load Config              (Code: throttle, default board, batch id)
 *     -> Fetch Pins               (HTTP GET EXISTING_PINS_JSON_URL)
 *     -> Fetch Published Log      (HTTP GET PUBLISHED_LOG_URL, optional)
 *     -> List Pinterest Boards    (HTTP GET pinterest /v5/boards)
 *     -> Build Publish Queue      (Code: filter unpublished, throttle, map boards)
 *     -> Loop Over Pins           (SplitInBatches, batchSize=1)
 *          body branch (main[1]):
 *            -> Pinterest Create Pin       (HTTP POST /v5/pins, retry x3)
 *            -> Append to Published Log    (HTTP POST PUBLISHED_LOG_URL)
 *            -> back to Loop
 *          done branch (main[0]):
 *            -> Limit 1
 *            -> Aggregate Results
 *
 * Env vars (set in n8n Settings -> Variables)
 *   PINTEREST_ACCESS_TOKEN      (required) Bearer token with boards:read pins:write
 *   PINTEREST_DEFAULT_BOARD_ID  (optional) Fallback board for unmatched pins
 *   EXISTING_PINS_JSON_URL      (required) URL serving data/pinterest-pins.json
 *   PUBLISHED_LOG_URL           (optional) GET endpoint returning published pin ids
 *   PUBLISHED_INGEST_URL        (required) POST endpoint to append to the log
 *   PUBLISHED_INGEST_TOKEN      (required) Bearer token for the above
 *   PINS_PER_RUN                (optional, default 5) throttle for fresh accounts
 *   PIN_LINK_OVERRIDE_HOST      (optional) replace the host on every pin link,
 *                               useful if pins were generated against a staging URL
 */

const fs = require("fs");
const path = require("path");

// =============================================================================
// Code node bodies
// =============================================================================

const loadConfigCode = `// LOAD CONFIG
// ===========
// Centralises every tunable. Anything you'd want to tweak per-run lives here.

const pinsPerRun = Math.max(1, Math.min(50, Number($env.PINS_PER_RUN || 5)));
const batchId = 'publish-' + new Date().toISOString().slice(0, 10);

return [{
  json: {
    pinsPerRun,
    batchId,
    pinterestToken: $env.PINTEREST_ACCESS_TOKEN || '',
    defaultBoardId: $env.PINTEREST_DEFAULT_BOARD_ID || '',
    pinsUrl: $env.EXISTING_PINS_JSON_URL || '',
    publishedLogUrl: $env.PUBLISHED_LOG_URL || '',
    publishedIngestUrl: $env.PUBLISHED_INGEST_URL || '',
    linkHostOverride: $env.PIN_LINK_OVERRIDE_HOST || '',
    started_at: new Date().toISOString()
  }
}];`;

const buildQueueCode = `// BUILD PUBLISH QUEUE
// ===================
// Inputs:
//   - $('Fetch Pins').first().json             = array of all pins
//   - $('Fetch Published Log').first().json    = array of already-published pin ids (or {pins: [...]})
//   - $('List Pinterest Boards').first().json  = Pinterest /v5/boards response
//   - $('Load Config').first().json            = config
//
// Output: one item per pin to publish, with board_id resolved.

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.body)) return payload.body;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.pins)) return payload.pins;
  return [];
}

function normaliseBoardName(s) {
  return String(s || '').toLowerCase().replace(/\\s+/g, ' ').trim();
}

const cfg = $('Load Config').first().json;
const pins = asArray($('Fetch Pins').first().json);
const publishedRaw = asArray($('Fetch Published Log').first().json);
const boardsResp = $('List Pinterest Boards').first().json || {};
const boards = asArray(boardsResp.items) // Pinterest returns { items: [...], bookmark }
  .concat(asArray(boardsResp));

// Index boards by normalised name.
const boardByName = new Map();
for (const b of boards) {
  if (b && b.id && b.name) boardByName.set(normaliseBoardName(b.name), b.id);
}

// Index published log by pin id.
const publishedIds = new Set();
for (const p of publishedRaw) {
  if (typeof p === 'string') publishedIds.add(p);
  else if (p && p.pinId) publishedIds.add(p.pinId);
}

// Reset cross-iteration accumulators.
const staticData = $getWorkflowStaticData('global');
staticData.processed = [];
staticData.failed = [];
staticData.skipped = [];
staticData.batchId = cfg.batchId;
staticData.started_at = cfg.started_at;
staticData.boardsAvailable = boards.map(b => ({ id: b.id, name: b.name }));

const queue = [];
let throttled = 0;

for (let i = 0; i < pins.length; i++) {
  const pin = pins[i];
  if (!pin || !pin.id || !pin.title || !pin.sourceImage || !pin.link) {
    staticData.skipped.push({ index: i, id: pin && pin.id, reason: 'missing_required_fields' });
    continue;
  }
  if (publishedIds.has(pin.id)) {
    staticData.skipped.push({ index: i, id: pin.id, reason: 'already_published' });
    continue;
  }
  if (queue.length >= cfg.pinsPerRun) {
    throttled++;
    continue;
  }

  const boardId = boardByName.get(normaliseBoardName(pin.boardSuggestion)) || cfg.defaultBoardId;
  if (!boardId) {
    staticData.skipped.push({ index: i, id: pin.id, reason: 'no_board_match', boardSuggestion: pin.boardSuggestion });
    continue;
  }

  // Optional host swap (e.g. moving from a staging URL to production without
  // regenerating every pin record).
  let link = pin.link;
  if (cfg.linkHostOverride) {
    try {
      const u = new URL(link);
      const override = new URL(cfg.linkHostOverride);
      u.protocol = override.protocol;
      u.host = override.host;
      link = u.toString();
    } catch (_) { /* leave link as-is on parse error */ }
  }

  // Pinterest pin description ceiling is 800 chars; trim safely.
  const description = String(pin.description || pin.textOverlay || pin.title).slice(0, 800);
  const altText = String(pin.textOverlay || pin.title).slice(0, 500);
  const title = String(pin.title).slice(0, 100);

  queue.push({
    json: {
      pinId: pin.id,
      boardId,
      payload: {
        link,
        title,
        description,
        alt_text: altText,
        board_id: boardId,
        media_source: { source_type: 'image_url', url: pin.sourceImage }
      }
    },
    pairedItem: { item: i }
  });
}

staticData.throttled = throttled;

if (queue.length === 0) {
  // Soft success — emit a single sentinel item so Aggregate runs.
  return [{ json: { __empty: true } }];
}

return queue;`;

const aggregateCode = `// AGGREGATE RESULTS
// =================

const staticData = $getWorkflowStaticData('global');
const processed = staticData.processed || [];
const failed = staticData.failed || [];
const skipped = staticData.skipped || [];

return [{
  json: {
    summary: {
      pins_published: processed.length,
      failed: failed.length,
      skipped_already_published: skipped.filter(s => s.reason === 'already_published').length,
      skipped_no_board: skipped.filter(s => s.reason === 'no_board_match').length,
      skipped_invalid: skipped.filter(s => s.reason === 'missing_required_fields').length,
      throttled: staticData.throttled || 0,
      boards_available: (staticData.boardsAvailable || []).length
    },
    batchId: staticData.batchId,
    boards_available: staticData.boardsAvailable || [],
    processed,
    failed,
    skipped,
    started_at: staticData.started_at || null,
    finished_at: new Date().toISOString()
  }
}];`;

const recordPublishCode = `// RECORD PUBLISHED PIN
// ====================
// Runs immediately after Pinterest Create Pin. Picks up either a successful
// pin response (has id, board_id) or an error (status >= 400 or .code).

const item = $input.first().json;
const queueItem = $('Loop Over Pins').first().json;
const pinId = queueItem.pinId;
const staticData = $getWorkflowStaticData('global');

const failed = item && (item.code || item.error || (item.status && item.status >= 400));

if (failed) {
  staticData.failed.push({
    pinId,
    reason: 'pinterest_api_error',
    detail: item.message || item.error || JSON.stringify(item).slice(0, 500)
  });
  return [{
    json: { pinId, published: false, error: item.message || 'pinterest_error' },
    pairedItem: { item: 0 }
  }];
}

const pinterestId = item.id || null;
staticData.processed.push({
  pinId,
  pinterestPinId: pinterestId,
  boardId: queueItem.boardId,
  publishedAt: new Date().toISOString()
});

return [{
  json: {
    pinId,
    pinterestPinId: pinterestId,
    boardId: queueItem.boardId,
    publishedAt: new Date().toISOString(),
    published: true
  },
  pairedItem: { item: 0 }
}];`;

// =============================================================================
// Workflow definition
// =============================================================================

const workflow = {
    name: "Pinterest Publisher",
    nodes: [
        {
            parameters: {
                rule: {
                    interval: [{ field: "cronExpression", expression: "0 9 * * *" }]
                }
            },
            id: "n01-cron",
            name: "Schedule (09:00 UTC)",
            type: "n8n-nodes-base.scheduleTrigger",
            typeVersion: 1.2,
            position: [240, 320]
        },
        {
            parameters: {},
            id: "n01b-manual",
            name: "Manual Trigger",
            type: "n8n-nodes-base.manualTrigger",
            typeVersion: 1,
            position: [240, 480]
        },
        {
            parameters: {
                language: "javaScript",
                jsCode: loadConfigCode
            },
            id: "n02-config",
            name: "Load Config",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [460, 400]
        },
        {
            parameters: {
                method: "GET",
                url: "={{$env.EXISTING_PINS_JSON_URL}}",
                options: {
                    timeout: 30000,
                    response: { response: { neverError: true } }
                }
            },
            id: "n03-fetch-pins",
            name: "Fetch Pins",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [680, 240],
            retryOnFail: true,
            maxTries: 3,
            waitBetweenTries: 3000,
            onError: "continueRegularOutput"
        },
        {
            parameters: {
                method: "GET",
                url: "={{$env.PUBLISHED_LOG_URL || 'https://example.invalid/empty.json'}}",
                options: {
                    timeout: 30000,
                    response: { response: { neverError: true } }
                }
            },
            id: "n04-fetch-log",
            name: "Fetch Published Log",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [680, 400],
            retryOnFail: true,
            maxTries: 2,
            waitBetweenTries: 2000,
            onError: "continueRegularOutput"
        },
        {
            parameters: {
                method: "GET",
                url: "https://api.pinterest.com/v5/boards?page_size=100",
                sendHeaders: true,
                headerParameters: {
                    parameters: [
                        {
                            name: "Authorization",
                            value: "=Bearer {{$env.PINTEREST_ACCESS_TOKEN}}"
                        }
                    ]
                },
                options: {
                    timeout: 30000,
                    response: { response: { neverError: true } }
                }
            },
            id: "n05-list-boards",
            name: "List Pinterest Boards",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [680, 560],
            retryOnFail: true,
            maxTries: 3,
            waitBetweenTries: 3000,
            onError: "continueRegularOutput"
        },
        {
            parameters: {
                language: "javaScript",
                jsCode: buildQueueCode
            },
            id: "n06-queue",
            name: "Build Publish Queue",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [920, 400]
        },
        {
            parameters: {
                batchSize: 1,
                options: {}
            },
            id: "n07-loop",
            name: "Loop Over Pins",
            type: "n8n-nodes-base.splitInBatches",
            typeVersion: 3,
            position: [1140, 400]
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
                jsonBody: "={{ JSON.stringify($json.payload) }}",
                options: {
                    timeout: 60000,
                    response: { response: { neverError: true } }
                }
            },
            id: "n08-create-pin",
            name: "Pinterest Create Pin",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [1360, 240],
            retryOnFail: true,
            maxTries: 3,
            waitBetweenTries: 5000,
            onError: "continueRegularOutput"
        },
        {
            parameters: {
                language: "javaScript",
                jsCode: recordPublishCode
            },
            id: "n09-record",
            name: "Record Result",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1580, 240]
        },
        {
            parameters: {
                method: "POST",
                url: "={{$env.PUBLISHED_INGEST_URL}}",
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
                    "={{ JSON.stringify({ pinId: $json.pinId, pinterestPinId: $json.pinterestPinId, boardId: $json.boardId, publishedAt: $json.publishedAt, published: $json.published, error: $json.error || null }) }}",
                options: {
                    timeout: 30000,
                    response: { response: { neverError: true } }
                }
            },
            id: "n10-append-log",
            name: "Append to Published Log",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [1800, 240],
            retryOnFail: true,
            maxTries: 3,
            waitBetweenTries: 3000,
            onError: "continueRegularOutput"
        },
        {
            parameters: { maxItems: 1 },
            id: "n11-limit-done",
            name: "Limit (Done Branch)",
            type: "n8n-nodes-base.limit",
            typeVersion: 1,
            position: [1360, 560]
        },
        {
            parameters: {
                language: "javaScript",
                jsCode: aggregateCode
            },
            id: "n12-aggregate",
            name: "Aggregate Results",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1580, 560]
        }
    ],
    connections: {
        "Schedule (09:00 UTC)": {
            main: [[{ node: "Load Config", type: "main", index: 0 }]]
        },
        "Manual Trigger": {
            main: [[{ node: "Load Config", type: "main", index: 0 }]]
        },
        "Load Config": {
            main: [
                [
                    { node: "Fetch Pins", type: "main", index: 0 },
                    { node: "Fetch Published Log", type: "main", index: 0 },
                    { node: "List Pinterest Boards", type: "main", index: 0 }
                ]
            ]
        },
        "Fetch Pins": {
            main: [[{ node: "Build Publish Queue", type: "main", index: 0 }]]
        },
        "Fetch Published Log": {
            main: [[{ node: "Build Publish Queue", type: "main", index: 0 }]]
        },
        "List Pinterest Boards": {
            main: [[{ node: "Build Publish Queue", type: "main", index: 0 }]]
        },
        "Build Publish Queue": {
            main: [[{ node: "Loop Over Pins", type: "main", index: 0 }]]
        },
        "Loop Over Pins": {
            main: [
                [{ node: "Limit (Done Branch)", type: "main", index: 0 }],
                [{ node: "Pinterest Create Pin", type: "main", index: 0 }]
            ]
        },
        "Pinterest Create Pin": {
            main: [[{ node: "Record Result", type: "main", index: 0 }]]
        },
        "Record Result": {
            main: [[{ node: "Append to Published Log", type: "main", index: 0 }]]
        },
        "Append to Published Log": {
            main: [[{ node: "Loop Over Pins", type: "main", index: 0 }]]
        },
        "Limit (Done Branch)": {
            main: [[{ node: "Aggregate Results", type: "main", index: 0 }]]
        }
    },
    settings: { executionOrder: "v1" },
    active: false,
    pinData: {},
    versionId: "1",
    meta: { templateCredsSetupCompleted: false },
    tags: []
};

const outPath = path.join(__dirname, "workflows", "pinterest-publisher.json");
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2));
console.log("wrote " + outPath);
