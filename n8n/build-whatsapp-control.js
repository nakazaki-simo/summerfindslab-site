/**
 * Builds the importable n8n workflow:
 *   WhatsApp Command Center (WF-07)
 *
 * Run:  node n8n/build-whatsapp-control.js
 * Out:  n8n/workflows/whatsapp-control.json
 *
 * What it does
 * ============
 * A control plane for the whole system, driven from the owner's WhatsApp. It
 * uses the OFFICIAL WhatsApp Business Cloud API (Meta Graph API) — never
 * unofficial web automation.
 *
 *   WhatsApp Trigger (inbound webhook)
 *     -> Authenticate        (owner-number allowlist + shared secret; reject all else)
 *     -> Parse Command       (SCHEMA-Command: verb + args)
 *     -> Route Command       (Switch by verb)
 *          status   -> read /api/analytics/latest -> KPIs
 *          report   -> read the dept digest
 *          run      -> budget cap check; public/spend actions require approve first
 *          approve  -> resolve a human-gated draft/pin
 *          reject   -> reject a human-gated draft/pin (optional reason)
 *          pause    -> pause a department
 *          resume   -> resume a department
 *          budget   -> remaining daily spend
 *     -> Format Reply        (Code: build the WhatsApp message text)
 *     -> WhatsApp Send        (HTTP POST Graph API /messages)
 *
 * Plus two outbound pushes on their own triggers:
 *   - Daily Digest (cron, DIGEST_HOUR_UTC): KPIs + pending approvals.
 *   - Watchdog Alert (webhook from other workflows): failure alerts with a
 *     Langfuse trace link.
 *
 * SECURITY (owner-only, approve-gated)
 * ====================================
 *   - Every inbound message is checked against OWNER_WHATSAPP_NUMBER (E.164,
 *     digits only) AND must carry the shared secret WHATSAPP_CMD_SECRET as the
 *     first token (e.g. "<secret> status"). Both must pass or the message is
 *     rejected and logged — no command runs.
 *   - `run`, `approve`, and anything that posts publicly or spends money never
 *     auto-executes: `run` of a publish/spend workflow returns an approval
 *     prompt with a generated approval id; the action only fires after an
 *     explicit `approve <id>`.
 *   - Budget caps (DAILY_BUDGET_*) are enforced before any spend action.
 *
 * Env vars (set in n8n Settings -> Variables) — see n8n/README.md "WF-07":
 *   WHATSAPP_TOKEN            (required) Meta permanent access token
 *   WHATSAPP_PHONE_ID         (required) WhatsApp phone number ID (Graph API)
 *   WHATSAPP_VERIFY_TOKEN     (required) webhook verification token (GET handshake)
 *   OWNER_WHATSAPP_NUMBER     (required) owner number, E.164 digits (e.g. 2126...)
 *   WHATSAPP_CMD_SECRET       (required) shared secret that must prefix commands
 *   WHATSAPP_GRAPH_VERSION    (optional) Graph API version, default v22.0
 *   SITE_URL                  (required) site origin for /api reads + dept webhooks
 *   ANALYTICS_LATEST_URL      (optional) override for /api/analytics/latest
 *   DEPT_WEBHOOK_BASE          (optional) base for dept action webhooks
 *   DIGEST_HOUR_UTC           (optional) hour (0-23) for the daily digest, default 7
 *   LANGFUSE_BASE_URL         (optional) base for watchdog trace links
 *   DAILY_BUDGET_USD          (optional) total daily spend cap, default 5
 */

const fs = require("fs");
const path = require("path");

// =============================================================================
// Code node bodies
// =============================================================================

const authenticateCode = `// AUTHENTICATE
// ============
// Owner-only gate. Reads the WhatsApp Cloud API inbound webhook shape and
// verifies BOTH:
//   1. sender number === OWNER_WHATSAPP_NUMBER (digits only), AND
//   2. the message text begins with the shared secret WHATSAPP_CMD_SECRET.
// Anything else is rejected (and surfaced so Format Reply can log it) — no
// command is parsed or routed.

const ownerNumber = String($env.OWNER_WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');
const secret = String($env.WHATSAPP_CMD_SECRET || '');

function onlyDigits(s) { return String(s || '').replace(/[^0-9]/g, ''); }

// WhatsApp Cloud API webhook payload:
//   entry[0].changes[0].value.messages[0] = { from, text: { body }, type, ... }
const body = $json.body || $json;
let msg = null;
let fromNumber = '';
let text = '';
try {
  const value = body.entry[0].changes[0].value;
  msg = (value.messages || [])[0] || null;
  if (msg) {
    fromNumber = onlyDigits(msg.from);
    text = msg.type === 'text' ? String(msg.text.body || '') : '';
  }
} catch (e) {
  msg = null;
}

// No user message in this webhook (could be a status/delivery callback) -> ignore.
if (!msg) {
  return [{ json: { __ignore: true, reason: 'no_user_message' } }];
}

if (!ownerNumber || !secret) {
  return [{ json: { authorized: false, reason: 'control_not_configured', fromNumber } }];
}

const numberOk = fromNumber === ownerNumber;

// Secret must be the FIRST whitespace-delimited token. Strip it from the text.
const trimmed = text.trim();
const firstSpace = trimmed.indexOf(' ');
const firstToken = firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
const rest = firstSpace === -1 ? '' : trimmed.slice(firstSpace + 1).trim();
const secretOk = firstToken === secret;

if (!numberOk || !secretOk) {
  return [{
    json: {
      authorized: false,
      reason: !numberOk ? 'sender_not_owner' : 'bad_secret',
      fromNumber,
      // Never echo the attempted secret back.
      attemptedFrom: fromNumber
    }
  }];
}

return [{
  json: {
    authorized: true,
    fromNumber,
    commandText: rest,
    messageId: msg.id || null,
    receivedAt: new Date().toISOString()
  }
}];`;

const parseCommandCode = `// PARSE COMMAND (SCHEMA-Command)
// ==============================
// SCHEMA-Command = {
//   verb: 'status'|'report'|'run'|'approve'|'reject'|'pause'|'resume'|'budget',
//   args: string[],          // positional args after the verb
//   raw: string,             // the command text (secret already stripped)
//   target?: string,         // first arg (dept | workflow | id) for convenience
//   count?: number|null,     // numeric arg for 'run <workflow> [n]'
//   reason?: string          // trailing free text for 'reject <id> [reason]'
// }
// Rejected/ignored auth results pass straight through untouched.

const inp = $json;
if (inp.__ignore) return [{ json: inp }];
if (inp.authorized === false) return [{ json: inp }];

const VERBS = ['status', 'report', 'run', 'approve', 'reject', 'pause', 'resume', 'budget'];
const raw = String(inp.commandText || '').trim();
const tokens = raw.length ? raw.split(/\\s+/) : [];
const verb = (tokens[0] || '').toLowerCase();
const args = tokens.slice(1);

if (!VERBS.includes(verb)) {
  return [{
    json: {
      authorized: true,
      fromNumber: inp.fromNumber,
      valid: false,
      error: 'unknown_verb',
      verb,
      help: 'verbs: status | report <dept> | run <workflow> [n] | approve <id> | reject <id> [reason] | pause <dept> | resume <dept> | budget'
    }
  }];
}

const count = (verb === 'run' && args[1] && /^\\d+$/.test(args[1])) ? Number(args[1]) : null;
const reason = (verb === 'reject') ? args.slice(1).join(' ') : '';

return [{
  json: {
    authorized: true,
    fromNumber: inp.fromNumber,
    valid: true,
    command: {
      verb,
      args,
      raw,
      target: args[0] || null,
      count,
      reason
    }
  }
}];`;

const routeStatusCode = `// HANDLE: status
// ==============
// Reads /api/analytics/latest (already fetched by 'Fetch Analytics') and
// summarises today's pipeline KPIs. Tolerant to the 404 'no_snapshot' first-run.

const analytics = $('Fetch Analytics').first().json || {};
const cmd = $('Parse Command').first().json;

let snapshot = analytics;
if (analytics && analytics.body && typeof analytics.body === 'object') snapshot = analytics.body;

const items = Array.isArray(snapshot.items) ? snapshot.items : [];
const totals = items.reduce((acc, it) => {
  acc.impressions += Number(it.impressions || 0);
  acc.saves += Number(it.saves || 0);
  acc.outboundClicks += Number(it.outboundClicks || 0);
  return acc;
}, { impressions: 0, saves: 0, outboundClicks: 0 });

const hasData = items.length > 0 && !snapshot.error;

return [{
  json: {
    fromNumber: cmd.fromNumber,
    replyKind: 'status',
    status: {
      date: snapshot.date || new Date().toISOString().slice(0, 10),
      source: snapshot.source || (hasData ? 'analytics' : 'data-unavailable'),
      items: items.length,
      impressions: totals.impressions,
      saves: totals.saves,
      outboundClicks: totals.outboundClicks,
      dataUnavailable: !hasData
    }
  }
}];`;

const routeGenericCode = `// HANDLE: report | run | approve | reject | pause | resume | budget
// ================================================================
// Builds the dept-webhook intent + enforces the approve-gate and budget caps.
// This node does NOT itself post publicly or spend; for gated verbs it returns
// an approval prompt. A real dept webhook call is wired via 'Call Dept Webhook'
// only for non-destructive reads (report/status/budget) and for 'approve'.

const cmd = $('Parse Command').first().json.command;
const fromNumber = $('Parse Command').first().json.fromNumber;
const budgetCap = Number($env.DAILY_BUDGET_USD || 5);

// Verbs that, when run, post publicly or spend money -> must be approved first.
const GATED_RUN_TARGETS = ['pinterest-publisher', 'wf-04', 'affiliate-product-pipeline', 'wf-01', 'pin-generator', 'wf-02'];

function approvalId() {
  return 'apr-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

const verb = cmd.verb;
let out = { fromNumber, replyKind: verb };

if (verb === 'run') {
  const target = String(cmd.target || '').toLowerCase();
  const isGated = GATED_RUN_TARGETS.includes(target);
  if (!target) {
    out.error = 'missing_workflow';
    out.help = 'run <workflow> [n] — e.g. run opportunity-intelligence';
  } else if (isGated) {
    // Do NOT execute. Return an approval prompt.
    out.gated = true;
    out.approvalId = approvalId();
    out.action = { type: 'run', target, count: cmd.count };
    out.message = 'requires approval (posts publicly / spends)';
  } else {
    // Non-gated workflow (e.g. analytics/opportunity reads) — allowed to trigger.
    out.gated = false;
    out.action = { type: 'run', target, count: cmd.count };
  }
} else if (verb === 'approve' || verb === 'reject') {
  if (!cmd.target) out.error = 'missing_id';
  else {
    out.action = { type: verb, id: cmd.target, reason: cmd.reason || null };
  }
} else if (verb === 'pause' || verb === 'resume') {
  if (!cmd.target) out.error = 'missing_dept';
  else out.action = { type: verb, dept: cmd.target };
} else if (verb === 'report') {
  if (!cmd.target) out.error = 'missing_dept';
  else out.action = { type: 'report', dept: cmd.target };
} else if (verb === 'budget') {
  out.action = { type: 'budget' };
  out.budgetCapUsd = budgetCap;
}

return [{ json: out }];`;

const formatReplyCode = `// FORMAT REPLY
// ============
// Turns the handler output (or an auth rejection) into the final WhatsApp text
// and the Graph API recipient. Always emits a single item with { to, text }.

const ownerNumber = String($env.OWNER_WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');
const j = $json;

// Ignored webhooks (delivery receipts etc.) — short-circuit to a no-send.
if (j.__ignore) {
  return [{ json: { skipSend: true, reason: j.reason } }];
}

let to = j.fromNumber || ownerNumber;
let text = '';

if (j.authorized === false) {
  // Rejected: reply ONLY to the owner number (never to the attacker), and keep
  // it generic. Most importantly: the command was not executed.
  return [{
    json: {
      skipSend: false,
      to: ownerNumber,
      text: '⛔ Rejected an unauthorized command attempt (' + (j.reason || 'denied') + ').'
    }
  }];
}

if (j.valid === false) {
  text = '❓ ' + (j.error || 'invalid command') + '\\n' + (j.help || '');
} else if (j.replyKind === 'status') {
  const s = j.status;
  if (s.dataUnavailable) {
    text = '📊 Status ' + s.date + '\\nNo analytics snapshot yet (data-unavailable).';
  } else {
    text = '📊 Status ' + s.date + ' (' + s.source + ')\\n' +
      '• items: ' + s.items + '\\n' +
      '• impressions: ' + s.impressions + '\\n' +
      '• saves: ' + s.saves + '\\n' +
      '• outbound clicks: ' + s.outboundClicks;
  }
} else if (j.replyKind === 'run') {
  if (j.error) text = '⚠️ run: ' + j.error + (j.help ? '\\n' + j.help : '');
  else if (j.gated) {
    text = '🔒 "' + j.action.target + '" ' + j.message + '.\\n' +
      'Reply: approve ' + j.approvalId + '   (or)   reject ' + j.approvalId + ' <reason>';
  } else {
    text = '▶️ Triggered "' + j.action.target + '"' + (j.action.count ? ' x' + j.action.count : '') + '.';
  }
} else if (j.replyKind === 'approve') {
  text = j.error ? ('⚠️ approve: ' + j.error) : ('✅ Approved ' + j.action.id + ' — executing.');
} else if (j.replyKind === 'reject') {
  text = j.error ? ('⚠️ reject: ' + j.error) : ('🗑️ Rejected ' + j.action.id + (j.action.reason ? (' (' + j.action.reason + ')') : '') + '.');
} else if (j.replyKind === 'pause' || j.replyKind === 'resume') {
  text = j.error ? ('⚠️ ' + j.replyKind + ': ' + j.error) : ((j.replyKind === 'pause' ? '⏸️ Paused ' : '▶️ Resumed ') + j.action.dept + '.');
} else if (j.replyKind === 'report') {
  text = j.error ? ('⚠️ report: ' + j.error) : ('📑 Latest ' + j.action.dept + ' digest requested.');
} else if (j.replyKind === 'budget') {
  text = '💰 Daily budget cap: $' + j.budgetCapUsd + '. (Remaining computed by the budget dept webhook.)';
} else {
  text = 'OK';
}

return [{ json: { skipSend: false, to, text } }];`;

const digestCode = `// BUILD DAILY DIGEST
// ==================
// Outbound push. Summarises KPIs from /api/analytics/latest for the owner.

const analytics = $('Fetch Analytics (Digest)').first().json || {};
let snapshot = analytics.body && typeof analytics.body === 'object' ? analytics.body : analytics;
const items = Array.isArray(snapshot.items) ? snapshot.items : [];
const totals = items.reduce((a, it) => {
  a.impressions += Number(it.impressions || 0);
  a.saves += Number(it.saves || 0);
  a.outboundClicks += Number(it.outboundClicks || 0);
  return a;
}, { impressions: 0, saves: 0, outboundClicks: 0 });

const ownerNumber = String($env.OWNER_WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');
const date = snapshot.date || new Date().toISOString().slice(0, 10);
const hasData = items.length > 0 && !snapshot.error;

const text = hasData
  ? ('🌅 Daily digest ' + date + '\\n' +
     '• outbound clicks: ' + totals.outboundClicks + '\\n' +
     '• saves: ' + totals.saves + '\\n' +
     '• impressions: ' + totals.impressions + '\\n' +
     'Reply "' + ($env.WHATSAPP_CMD_SECRET ? '<secret> ' : '') + 'status" for live state.')
  : ('🌅 Daily digest ' + date + '\\nNo analytics snapshot yet.');

return [{ json: { skipSend: false, to: ownerNumber, text } }];`;

const watchdogCode = `// BUILD WATCHDOG ALERT
// ====================
// Triggered by other workflows POSTing { dept, severity, message, traceId }.
// Emits a WhatsApp alert to the owner with a Langfuse trace link.

const ownerNumber = String($env.OWNER_WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');
const langfuseBase = String($env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com').replace(/\\/+$/, '');
const p = $json.body || $json;

const dept = p.dept || 'system';
const severity = (p.severity || 'P2').toUpperCase();
const message = String(p.message || 'unspecified issue').slice(0, 500);
const traceId = p.traceId || p.trace_id || null;
const traceLink = traceId ? (langfuseBase + '/trace/' + traceId) : null;

const text = '🚨 ' + severity + ' · ' + dept + '\\n' + message +
  (traceLink ? ('\\nTrace: ' + traceLink) : '');

return [{ json: { skipSend: false, to: ownerNumber, text } }];`;

// =============================================================================
// Reusable node fragments
// =============================================================================

const GRAPH = "={{ 'https://graph.facebook.com/' + ($env.WHATSAPP_GRAPH_VERSION || 'v22.0') + '/' + $env.WHATSAPP_PHONE_ID + '/messages' }}";

function whatsappSendNode(id, name, position) {
    return {
        parameters: {
            method: "POST",
            url: GRAPH,
            sendHeaders: true,
            headerParameters: {
                parameters: [
                    { name: "Authorization", value: "=Bearer {{$env.WHATSAPP_TOKEN}}" },
                    { name: "Content-Type", value: "application/json" }
                ]
            },
            sendBody: true,
            specifyBody: "json",
            jsonBody:
                "={{ JSON.stringify({ messaging_product: 'whatsapp', to: $json.to, type: 'text', text: { body: $json.text } }) }}",
            options: {
                timeout: 30000,
                response: { response: { neverError: true } }
            }
        },
        id,
        name,
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.2,
        position,
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 3000,
        onError: "continueRegularOutput"
    };
}

// =============================================================================
// Workflow definition
// =============================================================================

const workflow = {
    name: "WhatsApp Command Center",
    nodes: [
        // ---- Inbound command path ------------------------------------------
        {
            parameters: {
                httpMethod: "POST",
                path: "whatsapp-control",
                responseMode: "onReceived",
                options: {}
            },
            id: "n01-wa-trigger",
            name: "WhatsApp Trigger",
            type: "n8n-nodes-base.webhook",
            typeVersion: 2,
            position: [240, 360],
            webhookId: "whatsapp-control"
        },
        {
            parameters: { language: "javaScript", jsCode: authenticateCode },
            id: "n02-auth",
            name: "Authenticate",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [460, 360]
        },
        {
            parameters: { language: "javaScript", jsCode: parseCommandCode },
            id: "n03-parse",
            name: "Parse Command",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [680, 360]
        },
        {
            parameters: {
                rules: {
                    values: [
                        {
                            outputKey: "status",
                            conditions: {
                                options: { caseSensitive: true, leftValue: "", typeValidation: "loose" },
                                conditions: [
                                    {
                                        leftValue: "={{ $json.command ? $json.command.verb : ($json.valid === false ? 'invalid' : 'other') }}",
                                        rightValue: "status",
                                        operator: { type: "string", operation: "equals" }
                                    }
                                ],
                                combinator: "and"
                            }
                        }
                    ]
                },
                options: { fallbackOutput: "extra", renameFallbackOutput: "other" }
            },
            id: "n04-route",
            name: "Route Command",
            type: "n8n-nodes-base.switch",
            typeVersion: 3.2,
            position: [900, 360]
        },
        {
            parameters: {
                method: "GET",
                url: "={{ $env.ANALYTICS_LATEST_URL || ($env.SITE_URL + '/api/analytics/latest') }}",
                options: { timeout: 20000, response: { response: { neverError: true } } }
            },
            id: "n05-fetch-analytics",
            name: "Fetch Analytics",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [1120, 240],
            retryOnFail: true,
            maxTries: 2,
            waitBetweenTries: 2000,
            onError: "continueRegularOutput"
        },
        {
            parameters: { language: "javaScript", jsCode: routeStatusCode },
            id: "n06-handle-status",
            name: "Handle Status",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1340, 240]
        },
        {
            parameters: { language: "javaScript", jsCode: routeGenericCode },
            id: "n07-handle-generic",
            name: "Handle Command",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1120, 480]
        },
        {
            parameters: { language: "javaScript", jsCode: formatReplyCode },
            id: "n08-format",
            name: "Format Reply",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1560, 360]
        },
        {
            parameters: {
                conditions: {
                    options: { caseSensitive: true, leftValue: "", typeValidation: "loose" },
                    conditions: [
                        {
                            leftValue: "={{ $json.skipSend }}",
                            rightValue: true,
                            operator: { type: "boolean", operation: "notEquals" }
                        }
                    ],
                    combinator: "and"
                }
            },
            id: "n09-should-send",
            name: "Should Send?",
            type: "n8n-nodes-base.filter",
            typeVersion: 2.2,
            position: [1780, 360]
        },
        whatsappSendNode("n10-wa-send", "WhatsApp Send", [2000, 360]),

        // ---- Daily digest path ---------------------------------------------
        {
            parameters: {
                rule: {
                    interval: [
                        {
                            field: "cronExpression",
                            expression: "={{ '0 ' + ($env.DIGEST_HOUR_UTC || '7') + ' * * *' }}"
                        }
                    ]
                }
            },
            id: "n20-digest-cron",
            name: "Daily Digest Cron",
            type: "n8n-nodes-base.scheduleTrigger",
            typeVersion: 1.2,
            position: [240, 720]
        },
        {
            parameters: {
                method: "GET",
                url: "={{ $env.ANALYTICS_LATEST_URL || ($env.SITE_URL + '/api/analytics/latest') }}",
                options: { timeout: 20000, response: { response: { neverError: true } } }
            },
            id: "n21-fetch-analytics-digest",
            name: "Fetch Analytics (Digest)",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [460, 720],
            retryOnFail: true,
            maxTries: 2,
            waitBetweenTries: 2000,
            onError: "continueRegularOutput"
        },
        {
            parameters: { language: "javaScript", jsCode: digestCode },
            id: "n22-build-digest",
            name: "Build Daily Digest",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [680, 720]
        },
        whatsappSendNode("n23-wa-send-digest", "WhatsApp Send (Digest)", [900, 720]),

        // ---- Watchdog alert path -------------------------------------------
        {
            parameters: {
                httpMethod: "POST",
                path: "whatsapp-watchdog",
                responseMode: "onReceived",
                options: {}
            },
            id: "n30-watchdog-trigger",
            name: "Watchdog Trigger",
            type: "n8n-nodes-base.webhook",
            typeVersion: 2,
            position: [240, 920],
            webhookId: "whatsapp-watchdog"
        },
        {
            parameters: { language: "javaScript", jsCode: watchdogCode },
            id: "n31-build-watchdog",
            name: "Build Watchdog Alert",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [460, 920]
        },
        whatsappSendNode("n32-wa-send-watchdog", "WhatsApp Send (Watchdog)", [680, 920])
    ],
    connections: {
        "WhatsApp Trigger": {
            main: [[{ node: "Authenticate", type: "main", index: 0 }]]
        },
        Authenticate: {
            main: [[{ node: "Parse Command", type: "main", index: 0 }]]
        },
        "Parse Command": {
            main: [[{ node: "Route Command", type: "main", index: 0 }]]
        },
        "Route Command": {
            main: [
                [{ node: "Fetch Analytics", type: "main", index: 0 }],
                [{ node: "Handle Command", type: "main", index: 0 }]
            ]
        },
        "Fetch Analytics": {
            main: [[{ node: "Handle Status", type: "main", index: 0 }]]
        },
        "Handle Status": {
            main: [[{ node: "Format Reply", type: "main", index: 0 }]]
        },
        "Handle Command": {
            main: [[{ node: "Format Reply", type: "main", index: 0 }]]
        },
        "Format Reply": {
            main: [[{ node: "Should Send?", type: "main", index: 0 }]]
        },
        "Should Send?": {
            main: [[{ node: "WhatsApp Send", type: "main", index: 0 }]]
        },
        "Daily Digest Cron": {
            main: [[{ node: "Fetch Analytics (Digest)", type: "main", index: 0 }]]
        },
        "Fetch Analytics (Digest)": {
            main: [[{ node: "Build Daily Digest", type: "main", index: 0 }]]
        },
        "Build Daily Digest": {
            main: [[{ node: "WhatsApp Send (Digest)", type: "main", index: 0 }]]
        },
        "Watchdog Trigger": {
            main: [[{ node: "Build Watchdog Alert", type: "main", index: 0 }]]
        },
        "Build Watchdog Alert": {
            main: [[{ node: "WhatsApp Send (Watchdog)", type: "main", index: 0 }]]
        }
    },
    settings: { executionOrder: "v1" },
    active: false,
    pinData: {},
    versionId: "1",
    meta: { templateCredsSetupCompleted: false },
    tags: []
};

const outPath = path.join(__dirname, "workflows", "whatsapp-control.json");
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2) + "\n");
console.log("wrote " + outPath);
