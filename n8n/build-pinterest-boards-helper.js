/**
 * Builds the importable n8n workflow:
 *   Pinterest Boards Helper (WF-04c)
 *
 * Run:  node n8n/build-pinterest-boards-helper.js
 * Out:  n8n/workflows/pinterest-boards-helper.json
 *
 * What it does
 * ============
 * On-demand helper used to:
 *   1. Validate the Pinterest access token and the scopes attached to it.
 *   2. Page through every board the token can see (/v5/boards), gathering
 *      id / name / privacy / pin_count / cover.
 *   3. Persist the resolved board list to BOARDS_CACHE_INGEST_URL so the
 *      site (or other workflows) can read it without re-hitting Pinterest.
 *   4. Suggest a default board id (the user's most-pinned board) for the
 *      Publisher workflow's PINTEREST_DEFAULT_BOARD_ID setting.
 *
 * Run this once after generating the access token, then again whenever you
 * create a new board on Pinterest.
 *
 * Architecture
 * ============
 *   Manual Trigger | Webhook (POST)
 *     -> Validate Token              (HTTP GET /v5/user_account, retry x3)
 *     -> Check Token Scopes          (Code: parse status + diagnose)
 *     -> Fetch Boards Page 1         (HTTP GET /v5/boards?page_size=100, retry x3)
 *     -> Fetch Boards Page 2         (HTTP GET /v5/boards?bookmark=..., retry x3)
 *     -> Fetch Boards Page 3         (HTTP GET /v5/boards?bookmark=..., retry x3)
 *     -> Aggregate Boards            (Code: dedupe, sort, pick default)
 *     -> Persist Boards Cache        (HTTP POST BOARDS_CACHE_INGEST_URL, optional)
 *     -> Build Diagnostic Report     (Code: scopes + boards + recommendations)
 *
 * Three pages of 100 boards covers up to 300 boards. If you have more, raise
 * the page count by editing this file.
 *
 * Env vars
 *   PINTEREST_ACCESS_TOKEN       (required) Bearer token. Required scopes:
 *                                           boards:read pins:read pins:write
 *                                           user_accounts:read
 *   BOARDS_CACHE_INGEST_URL      (optional) POST endpoint that persists the
 *                                           resolved board list. If unset,
 *                                           the persist step is skipped.
 *   BOARDS_CACHE_INGEST_TOKEN    (optional) Bearer token for the above.
 */

const fs = require("fs");
const path = require("path");

// =============================================================================
// Code node bodies
// =============================================================================

const checkTokenCode = `// CHECK TOKEN SCOPES
// ==================
// /v5/user_account returns 200 only if the token is valid and has at least
// user_accounts:read. We use it as a cheap liveness probe and report the
// shape of the response so the user can confirm scopes from the diagnostic.

const resp = $input.first().json || {};
const status = Number(resp.status || resp.statusCode || (resp.code ? 401 : 200));

const looksLikeError =
  resp.code != null ||
  resp.error != null ||
  (resp.status && Number(resp.status) >= 400);

if (looksLikeError) {
  // We still continue so the diagnostic report can surface the failure.
  return [{
    json: {
      tokenValid: false,
      status,
      error: resp.message || resp.error || resp.code || 'token_check_failed',
      raw: resp
    }
  }];
}

return [{
  json: {
    tokenValid: true,
    status: 200,
    account: {
      username: resp.username || null,
      account_type: resp.account_type || null,
      profile_image: resp.profile_image || null,
      website_url: resp.website_url || null,
      id: resp.id || null
    },
    raw: resp
  }
}];`;

const aggregateBoardsCode = `// AGGREGATE BOARDS
// ================
// Pinterest's /v5/boards is paginated via the \`bookmark\` query string.
// We made up to 3 calls (covering up to 300 boards). Concatenate, dedupe by
// id, sort by pin_count desc, and pick a sensible default board.

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  return [];
}

function safeFirst(nodeName) {
  try {
    const item = $(nodeName).first();
    return item ? item.json || {} : {};
  } catch (_) {
    return {};
  }
}

const p1 = safeFirst('Fetch Boards Page 1');
const p2 = safeFirst('Fetch Boards Page 2');
const p3 = safeFirst('Fetch Boards Page 3');

const all = []
  .concat(asArray(p1.items))
  .concat(asArray(p2.items))
  .concat(asArray(p3.items));

const byId = new Map();
for (const b of all) {
  if (!b || !b.id) continue;
  byId.set(b.id, {
    id: b.id,
    name: b.name || null,
    privacy: b.privacy || null,
    description: b.description || null,
    pin_count: typeof b.pin_count === 'number' ? b.pin_count : null,
    follower_count: typeof b.follower_count === 'number' ? b.follower_count : null,
    cover_pin_image: (b.media && b.media.image_cover_url) || null,
    created_at: b.created_at || null
  });
}

const boards = Array.from(byId.values()).sort((a, b) => {
  // Prefer most pin_count, fallback alphabetical.
  const pa = a.pin_count || 0;
  const pb = b.pin_count || 0;
  if (pb !== pa) return pb - pa;
  return String(a.name || '').localeCompare(String(b.name || ''));
});

// Suggest a default board: most pinned. If everything is empty, take the first.
const defaultBoard = boards[0] || null;

return [{
  json: {
    fetchedAt: new Date().toISOString(),
    boardCount: boards.length,
    boards,
    suggestedDefaultBoard: defaultBoard ? { id: defaultBoard.id, name: defaultBoard.name } : null,
    pages: {
      page1Count: asArray(p1.items).length,
      page2Count: asArray(p2.items).length,
      page3Count: asArray(p3.items).length,
      page1Bookmark: p1.bookmark || null,
      page2Bookmark: p2.bookmark || null,
      page3Bookmark: p3.bookmark || null
    }
  }
}];`;

const buildReportCode = `// BUILD DIAGNOSTIC REPORT
// =======================
// Combines token check + boards aggregation + persistence outcome into a
// single human-friendly report. Use this output as the source of truth for
// updating PINTEREST_DEFAULT_BOARD_ID and pin boardSuggestion mappings.

const tokenInfo = $('Check Token Scopes').first().json || {};
const boardsInfo = $('Aggregate Boards').first().json || {};

let persistInfo = null;
try {
  const persistJson = $('Persist Boards Cache').first().json;
  if (persistJson && Object.keys(persistJson).length) {
    const looksLikeError =
      persistJson.code != null ||
      persistJson.error != null ||
      (persistJson.status && Number(persistJson.status) >= 400);
    persistInfo = {
      attempted: true,
      ok: !looksLikeError,
      status: persistJson.status || (looksLikeError ? 500 : 200),
      detail: looksLikeError ? (persistJson.message || persistJson.error || 'persist_failed') : null
    };
  }
} catch (_) {
  persistInfo = { attempted: false, ok: null, reason: 'persist_node_skipped_or_unset' };
}

// Heuristics for the recommendations block.
const recommendations = [];
if (!tokenInfo.tokenValid) {
  recommendations.push('Pinterest token failed validation. Re-issue PINTEREST_ACCESS_TOKEN with scopes: boards:read pins:read pins:write user_accounts:read.');
}
if (!boardsInfo.boardCount) {
  recommendations.push('No boards found. Create at least one board on Pinterest, then run this workflow again.');
}
if (boardsInfo.suggestedDefaultBoard && boardsInfo.suggestedDefaultBoard.id) {
  recommendations.push('Set PINTEREST_DEFAULT_BOARD_ID=' + boardsInfo.suggestedDefaultBoard.id + ' (' + boardsInfo.suggestedDefaultBoard.name + ') for the Publisher workflow.');
}
if (!persistInfo || !persistInfo.attempted) {
  recommendations.push('BOARDS_CACHE_INGEST_URL is unset. Boards were not persisted; downstream workflows must call Pinterest live each run.');
} else if (!persistInfo.ok) {
  recommendations.push('Persist step failed (' + (persistInfo.detail || 'unknown') + '). Boards were resolved but not cached.');
}

return [{
  json: {
    ok: tokenInfo.tokenValid === true && boardsInfo.boardCount > 0,
    generatedAt: new Date().toISOString(),
    token: {
      valid: tokenInfo.tokenValid === true,
      account: tokenInfo.account || null,
      error: tokenInfo.tokenValid ? null : (tokenInfo.error || 'token_check_failed')
    },
    boards: {
      count: boardsInfo.boardCount || 0,
      list: boardsInfo.boards || [],
      suggestedDefault: boardsInfo.suggestedDefaultBoard || null,
      pages: boardsInfo.pages || null
    },
    persist: persistInfo,
    recommendations,
    boardNameToId: (boardsInfo.boards || []).reduce((acc, b) => {
      if (b && b.name && b.id) acc[b.name] = b.id;
      return acc;
    }, {})
  }
}];`;

// =============================================================================
// Workflow definition
// =============================================================================

const workflow = {
    name: "Pinterest Boards Helper",
    nodes: [
        {
            parameters: {},
            id: "n01-manual",
            name: "Manual Trigger",
            type: "n8n-nodes-base.manualTrigger",
            typeVersion: 1,
            position: [240, 320]
        },
        {
            parameters: {
                httpMethod: "POST",
                path: "pinterest-boards-helper",
                responseMode: "lastNode",
                options: {}
            },
            id: "n01b-webhook",
            name: "Webhook (POST)",
            type: "n8n-nodes-base.webhook",
            typeVersion: 2,
            position: [240, 480],
            webhookId: "pinterest-boards-helper"
        },
        {
            parameters: {
                method: "GET",
                url: "https://api.pinterest.com/v5/user_account",
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
            id: "n02-validate-token",
            name: "Validate Token",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [460, 400],
            retryOnFail: true,
            maxTries: 3,
            waitBetweenTries: 3000,
            onError: "continueRegularOutput"
        },
        {
            parameters: {
                language: "javaScript",
                jsCode: checkTokenCode
            },
            id: "n03-check-token",
            name: "Check Token Scopes",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [680, 400]
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
            id: "n04-boards-p1",
            name: "Fetch Boards Page 1",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [900, 240],
            retryOnFail: true,
            maxTries: 3,
            waitBetweenTries: 3000,
            onError: "continueRegularOutput"
        },
        {
            parameters: {
                method: "GET",
                url:
                    "=https://api.pinterest.com/v5/boards?page_size=100{{ $('Fetch Boards Page 1').first().json.bookmark ? '&bookmark=' + encodeURIComponent($('Fetch Boards Page 1').first().json.bookmark) : '' }}",
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
            id: "n05-boards-p2",
            name: "Fetch Boards Page 2",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [900, 400],
            retryOnFail: true,
            maxTries: 3,
            waitBetweenTries: 3000,
            onError: "continueRegularOutput"
        },
        {
            parameters: {
                method: "GET",
                url:
                    "=https://api.pinterest.com/v5/boards?page_size=100{{ $('Fetch Boards Page 2').first().json.bookmark ? '&bookmark=' + encodeURIComponent($('Fetch Boards Page 2').first().json.bookmark) : '' }}",
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
            id: "n06-boards-p3",
            name: "Fetch Boards Page 3",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [900, 560],
            retryOnFail: true,
            maxTries: 3,
            waitBetweenTries: 3000,
            onError: "continueRegularOutput"
        },
        {
            parameters: {
                language: "javaScript",
                jsCode: aggregateBoardsCode
            },
            id: "n07-aggregate",
            name: "Aggregate Boards",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1140, 400]
        },
        {
            parameters: {
                method: "POST",
                url:
                    "={{$env.BOARDS_CACHE_INGEST_URL || 'https://example.invalid/skip'}}",
                sendHeaders: true,
                headerParameters: {
                    parameters: [
                        {
                            name: "Authorization",
                            value:
                                "=Bearer {{$env.BOARDS_CACHE_INGEST_TOKEN}}"
                        },
                        { name: "Content-Type", value: "application/json" }
                    ]
                },
                sendBody: true,
                specifyBody: "json",
                jsonBody:
                    "={{ JSON.stringify({ fetchedAt: $json.fetchedAt, boards: $json.boards, suggestedDefaultBoard: $json.suggestedDefaultBoard }) }}",
                options: {
                    timeout: 30000,
                    response: { response: { neverError: true } }
                }
            },
            id: "n08-persist",
            name: "Persist Boards Cache",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [1360, 400],
            retryOnFail: true,
            maxTries: 2,
            waitBetweenTries: 2000,
            onError: "continueRegularOutput"
        },
        {
            parameters: {
                language: "javaScript",
                jsCode: buildReportCode
            },
            id: "n09-report",
            name: "Build Diagnostic Report",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1580, 400]
        }
    ],
    connections: {
        "Manual Trigger": {
            main: [[{ node: "Validate Token", type: "main", index: 0 }]]
        },
        "Webhook (POST)": {
            main: [[{ node: "Validate Token", type: "main", index: 0 }]]
        },
        "Validate Token": {
            main: [[{ node: "Check Token Scopes", type: "main", index: 0 }]]
        },
        "Check Token Scopes": {
            main: [[{ node: "Fetch Boards Page 1", type: "main", index: 0 }]]
        },
        "Fetch Boards Page 1": {
            main: [[{ node: "Fetch Boards Page 2", type: "main", index: 0 }]]
        },
        "Fetch Boards Page 2": {
            main: [[{ node: "Fetch Boards Page 3", type: "main", index: 0 }]]
        },
        "Fetch Boards Page 3": {
            main: [[{ node: "Aggregate Boards", type: "main", index: 0 }]]
        },
        "Aggregate Boards": {
            main: [[{ node: "Persist Boards Cache", type: "main", index: 0 }]]
        },
        "Persist Boards Cache": {
            main: [[{ node: "Build Diagnostic Report", type: "main", index: 0 }]]
        }
    },
    settings: { executionOrder: "v1" },
    active: false,
    pinData: {},
    versionId: "1",
    meta: { templateCredsSetupCompleted: false },
    tags: []
};

const outPath = path.join(__dirname, "workflows", "pinterest-boards-helper.json");
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2));
console.log("wrote " + outPath);
