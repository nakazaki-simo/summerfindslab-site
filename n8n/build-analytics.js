/**
 * Builds the importable n8n workflow:
 *   Analytics Collector (WF-05)
 *
 * Run:  node n8n/build-analytics.js
 * Out:  n8n/workflows/analytics-collector.json
 *
 * What it does
 * ============
 * Daily cron at 02:00 UTC. Pulls performance metrics for our own pins /
 * articles, normalises them into a SCHEMA-MetricSnapshot, and POSTs that to
 * the site's POST /api/analytics/ingest. The ingest route persists the
 * snapshot AND closes the learning loop (winners -> data/memory/learnings.jsonl
 * + data/training/examples.jsonl).
 *
 * This is a SKETCH (not activated). The "Fetch Metrics" node is a placeholder
 * HTTP request to a metrics source (Pinterest /v5 analytics, GA4, or Plausible)
 * — wire it to the real source + credentials before activating. The Build
 * Snapshot Code node already emits the canonical SCHEMA-MetricSnapshot shape so
 * the downstream ingest contract is satisfied regardless of source.
 *
 * Architecture
 * ============
 *   Schedule (02:00 UTC) | Manual Trigger
 *     -> Load Config        (Code: ingest url/token, source, lookback)
 *     -> Fetch Metrics      (HTTP GET <metrics source>, neverError)
 *     -> Build Snapshot     (Code: normalise -> SCHEMA-MetricSnapshot, our content only)
 *     -> Post to Ingest     (HTTP POST /api/analytics/ingest, bearer)
 *     -> Summarize          (Code: surface counts from the ingest response)
 *
 * Env vars (set in n8n Settings -> Variables)
 *   ANALYTICS_INGEST_URL    (required) e.g. https://<site>/api/analytics/ingest
 *   ANALYTICS_INGEST_TOKEN  (required) bearer; must match the site env
 *   ANALYTICS_SOURCE        (optional) "pinterest" | "ga4" | "plausible" (label)
 *   ANALYTICS_METRICS_URL   (optional) metrics API endpoint to GET
 *   ANALYTICS_METRICS_TOKEN (optional) bearer for the metrics API
 */

const fs = require("fs");
const path = require("path");

const loadConfigCode = `// LOAD CONFIG
// ===========
const date = new Date().toISOString().slice(0, 10);
return [{
  json: {
    date,
    ingestUrl: $env.ANALYTICS_INGEST_URL || '',
    ingestToken: $env.ANALYTICS_INGEST_TOKEN || '',
    source: $env.ANALYTICS_SOURCE || 'pinterest',
    metricsUrl: $env.ANALYTICS_METRICS_URL || '',
    started_at: new Date().toISOString()
  }
}];`;

const buildSnapshotCode = `// BUILD SNAPSHOT
// ==============
// Normalises whatever the metrics source returned into a SCHEMA-MetricSnapshot.
// Only OUR content is referenced (pin ids / article slugs / product ids) — no
// third-party data, no PII. If the fetch failed (neverError carried an error
// through), we still emit a valid empty snapshot so the loop is a clean no-op.

const cfg = $('Load Config').first().json;
const raw = $('Fetch Metrics').first().json || {};

// The shape of 'raw' depends on the source you wire up. This sketch supports a
// simple { items: [...] } passthrough and otherwise emits an empty snapshot.
const srcItems = Array.isArray(raw.items) ? raw.items
  : Array.isArray(raw.data) ? raw.data
  : [];

const items = srcItems.map((r) => ({
  refType: r.refType || (r.pinId ? 'pin' : 'article'),
  refId: r.refId || r.pinId || r.slug || '',
  productId: r.productId || null,
  formulaId: r.formulaId || null,
  url: r.url || null,
  impressions: Number(r.impressions || 0),
  saves: Number(r.saves || r.repins || 0),
  outboundClicks: Number(r.outboundClicks || r.clicks || 0),
  ctr: typeof r.ctr === 'number' ? r.ctr : undefined
})).filter((x) => x.refId);

return [{
  json: {
    date: cfg.date,
    source: cfg.source,
    generatedAt: new Date().toISOString(),
    items
  }
}];`;

const summarizeCode = `// SUMMARIZE
// =========
const resp = $input.first().json || {};
return [{
  json: {
    ok: resp.ok === true,
    date: resp.date || null,
    persisted: resp.persisted,
    via: resp.via || null,
    counts: resp.counts || null,
    written: resp.written || null,
    finished_at: new Date().toISOString()
  }
}];`;

const workflow = {
    name: "Analytics Collector",
    nodes: [
        {
            parameters: {
                rule: {
                    interval: [{ field: "cronExpression", expression: "0 2 * * *" }]
                }
            },
            id: "n01-cron",
            name: "Schedule (02:00 UTC)",
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
            parameters: { language: "javaScript", jsCode: loadConfigCode },
            id: "n02-config",
            name: "Load Config",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [460, 400]
        },
        {
            parameters: {
                method: "GET",
                url: "={{$env.ANALYTICS_METRICS_URL || 'https://example.invalid/metrics.json'}}",
                sendHeaders: true,
                headerParameters: {
                    parameters: [
                        {
                            name: "Authorization",
                            value: "=Bearer {{$env.ANALYTICS_METRICS_TOKEN}}"
                        }
                    ]
                },
                options: {
                    timeout: 30000,
                    response: { response: { neverError: true } }
                }
            },
            id: "n03-fetch-metrics",
            name: "Fetch Metrics",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [680, 400],
            retryOnFail: true,
            maxTries: 3,
            waitBetweenTries: 3000,
            onError: "continueRegularOutput"
        },
        {
            parameters: { language: "javaScript", jsCode: buildSnapshotCode },
            id: "n04-build-snapshot",
            name: "Build Snapshot",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [900, 400]
        },
        {
            parameters: {
                method: "POST",
                url: "={{$env.ANALYTICS_INGEST_URL}}",
                sendHeaders: true,
                headerParameters: {
                    parameters: [
                        {
                            name: "Authorization",
                            value: "=Bearer {{$env.ANALYTICS_INGEST_TOKEN}}"
                        },
                        { name: "Content-Type", value: "application/json" }
                    ]
                },
                sendBody: true,
                specifyBody: "json",
                jsonBody: "={{ JSON.stringify($json) }}",
                options: {
                    timeout: 30000,
                    response: { response: { neverError: true } }
                }
            },
            id: "n05-post-ingest",
            name: "Post to Ingest",
            type: "n8n-nodes-base.httpRequest",
            typeVersion: 4.2,
            position: [1120, 400],
            retryOnFail: true,
            maxTries: 3,
            waitBetweenTries: 3000,
            onError: "continueRegularOutput"
        },
        {
            parameters: { language: "javaScript", jsCode: summarizeCode },
            id: "n06-summarize",
            name: "Summarize",
            type: "n8n-nodes-base.code",
            typeVersion: 2,
            position: [1340, 400]
        }
    ],
    connections: {
        "Schedule (02:00 UTC)": {
            main: [[{ node: "Load Config", type: "main", index: 0 }]]
        },
        "Manual Trigger": {
            main: [[{ node: "Load Config", type: "main", index: 0 }]]
        },
        "Load Config": {
            main: [[{ node: "Fetch Metrics", type: "main", index: 0 }]]
        },
        "Fetch Metrics": {
            main: [[{ node: "Build Snapshot", type: "main", index: 0 }]]
        },
        "Build Snapshot": {
            main: [[{ node: "Post to Ingest", type: "main", index: 0 }]]
        },
        "Post to Ingest": {
            main: [[{ node: "Summarize", type: "main", index: 0 }]]
        }
    },
    settings: { executionOrder: "v1" },
    active: false,
    pinData: {},
    versionId: "1",
    meta: { templateCredsSetupCompleted: false },
    tags: []
};

const outPath = path.join(__dirname, "workflows", "analytics-collector.json");
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2) + "\n");
console.log("wrote " + outPath);
