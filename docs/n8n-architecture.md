# n8n Automation Architecture — Summer Finds Lab

> **Goal**: A modular, scalable n8n control plane that drives the existing
> Next.js + CSV + Canva + Pinterest stack end-to-end, from product import to
> Pinterest publishing and analytics.
>
> Everything below maps to code that already exists in this repo:
> `scripts/import-products.mjs`, `scripts/extract-amazon-images.mjs`,
> `lib/pin-pipeline/`, `lib/canva/`, `app/api/canva/webhook/route.js`,
> `app/api/canva/status/route.js`, and `data/csv/`.

---

## 0. Mental model

```
                           ┌──────────────────────────────────────────────┐
                           │                  n8n CONTROL PLANE            │
                           │  (orchestration, retries, scheduling, AI)     │
                           └──────────────────────────────────────────────┘
                                          │ HTTPS + secrets
        ┌─────────────┬─────────────┬─────┴──────┬─────────────┬──────────────┐
        ▼             ▼             ▼            ▼             ▼              ▼
   GitHub repo   Next.js app     Canva API   OpenAI /     Pinterest API   Analytics
   (CSV + JSON   (webhooks +     (Connect)   Anthropic    (later phase)   (Plausible /
    + commits)   read endpoints)             (LLM tasks)                    GA4 / Vercel)
```

n8n is the **conductor**. It never owns business data — JSON in `/data/*.json`
and CSVs in `/data/csv/` remain the source of truth, committed via PR to git.
The Next.js site stays statically generated on Vercel; n8n triggers
regenerations through your existing `/api/canva/webhook` and a few new
read-only endpoints described below.

---

## 1. Workflow inventory (modular, one job each)

Seven workflows. Each is independently runnable, independently versioned, and
calls the next via webhook so you can swap implementations without rewiring
everything.

| # | Workflow | Pattern | Trigger | Owns |
|---|---|---|---|---|
| W1 | `product-import` | Scheduled + Webhook | Cron daily 06:00 UTC + manual | Read CSV, extract Amazon metadata + images, write `data/products.json` |
| W2 | `ai-content-generator` | Batch + AI Agent | After W1 done | Descriptions, Pinterest titles, SEO meta, blog ideas, collection copy |
| W3 | `canva-pin-batch` | Batch + HTTP API | After W2 done OR cron | Calls `/api/canva/webhook`, monitors export jobs, persists URLs |
| W4 | `site-publisher` | HTTP API | After W2 + W3 done | Commits regenerated JSON, triggers Vercel deploy hook |
| W5 | `pinterest-scheduler` | Scheduled + Batch | Cron every 30 min | Picks N pins from queue, publishes via Pinterest API (later) |
| W6 | `analytics-collector` | Scheduled | Cron daily 02:00 UTC | Pulls Plausible / GA4 / Pinterest metrics, writes `data/analytics.json` |
| W7 | `error-watchdog` | Error Trigger | n8n error workflow | Captures any failure, posts to Slack/Discord, retries, opens GitHub issue |

Each workflow follows the **Plan → Validate → Deploy** loop from
`.kiro/skills/n8n-workflow-patterns/SKILL.md`.

---

## 2. Triggers & webhook contract

### 2.1 Inbound webhooks (n8n exposes)

Use a single shared header `x-pipeline-secret` per workflow (different secret
per workflow, kept in n8n credentials, not in URLs).

| Path | Workflow | Body |
|---|---|---|
| `POST /webhook/product-import` | W1 | `{ "csvPath": "data/csv/products-2026-05-28.csv", "limit": 100 }` |
| `POST /webhook/ai-content` | W2 | `{ "productIds": ["..."], "tasks": ["description","pinTitle","seo"] }` |
| `POST /webhook/canva-batch` | W3 | `{ "formulaId": "price-tag-find", "limit": 10 }` |
| `POST /webhook/publish-site` | W4 | `{ "branch": "auto/site-update-2026-05-29" }` |
| `POST /webhook/pinterest-publish` | W5 | `{ "boardId": "...", "limit": 5 }` |

### 2.2 Outbound webhooks (Next.js exposes)

You already have one. Add three small siblings — all read-mostly, all
guarded by the same `x-pipeline-secret` pattern as `/api/canva/webhook`.

| Endpoint | Status | Purpose |
|---|---|---|
| `POST /api/canva/webhook` | ✅ exists | Trigger Canva pin batch (used by W3) |
| `GET /api/canva/status` | ✅ exists | Health probe (used by W7) |
| `POST /api/products/import` *(new)* | 🔨 add | Wraps `scripts/import-products.mjs` so n8n can run it without SSH |
| `POST /api/products/upsert` *(new)* | 🔨 add | Accepts `{ products: [...] }` from n8n W2, writes `data/products.json`, opens a PR |
| `GET /api/health` *(new)* | 🔨 add | Aggregated health: Canva token, last commit, last deploy |

> Implementation note: each new endpoint mirrors the auth pattern in
> `app/api/canva/webhook/route.js` — one shared secret per route, validated
> against an env var, no Canva token leakage.

### 2.3 Scheduled triggers

```
W1  product-import       cron: 0 6 * * *
W3  canva-pin-batch      cron: 0 7 * * *   (after W1 finishes)
W5  pinterest-scheduler  cron: */30 * * * *
W6  analytics-collector  cron: 0 2 * * *
```

---

## 3. Workflow-by-workflow design

The recommended n8n nodes cite skill names from `.kiro/skills/` so you (or
Kiro) can activate them on demand for deeper detail.

### W1 — `product-import`

**Pattern**: Scheduled Tasks + Batch Processing
**Skills to consult**: `n8n-workflow-patterns`, `n8n-code-javascript`, `n8n-node-configuration`

```
Schedule Trigger (06:00 UTC)
  └─► Read Binary File (data/csv/products-YYYY-MM-DD.csv)
  └─► Spreadsheet File (parse CSV → JSON rows)
  └─► Code (normalize: trim, lowercase tags, parse price as float, sanitize ASINs)
  └─► IF (row.amazonUrl exists?)
        ├─ true  ► HTTP Request (Amazon scrape worker OR keepa proxy) → image URLs
        └─ false ► Set { image: row.fallbackImage }
  └─► Code (categorize: rule-based first, fallback to AI Categorizer in W2)
  └─► Aggregate (collect all enriched rows)
  └─► HTTP Request POST {NEXT_SITE}/api/products/upsert
        body: { products: [...], source: "w1-import" }
  └─► IF (response.ok)
        ├─ true  ► HTTP Request POST n8n://webhook/ai-content { productIds }
        └─ false ► Stop and Error → routes to W7
```

**Why these nodes** (per `n8n-workflow-patterns/database_operations.md`):
- `Spreadsheet File` over `Code` for CSV — built-in error tolerance, encoding, headers.
- `Aggregate` before the upsert call so the API call is one bulk write, not N
  per-row writes (avoids the “Google Sheets per-item execution trap”
  documented in the workflow-patterns skill).

### W2 — `ai-content-generator`

**Pattern**: AI Agent + Batch Processing
**Skills**: `n8n-workflow-patterns/ai_agent_workflow.md`, `copywriting`, `programmatic-seo`, `ai-seo`

```
Webhook Trigger (POST /webhook/ai-content)
  └─► Code (load product context from /data/products.json via HTTP GET)
  └─► Split In Batches (size: 10)        ← respects OpenAI rate limits
       │ main[1] (each batch)
       └─► AI Agent
             ├─ Chat Model: OpenAI gpt-4o-mini  (cheap, fast)
             ├─ System Prompt: "You are the Summer Finds Lab content
             │   generator. Voice: aspirational, concise, beach-aesthetic.
             │   Always end with one specific CTA."
             ├─ Tools:
             │   • HTTP Request Tool → /api/products/{id}  (fetch full product)
             │   • Workflow Tool     → calls W2-sub: SEO meta builder
             ├─ Output Parser: structured JSON
             │   { description, pinTitle, pinDescription, h1, metaTitle,
             │     metaDescription, faqs[], internalLinkAnchors[] }
             └─ Memory: Window Buffer (last 3 products → consistent voice)
       └─► Merge per batch
       │ main[0] (done)
       └─► Limit 1
           └─► Aggregate
               └─► HTTP Request POST /api/products/upsert
                                                  (now with AI fields filled)
               └─► HTTP Request POST n8n://webhook/canva-batch
```

**Notes from skills**:
- The skill `n8n-workflow-patterns` warns: after a SplitInBatches loop,
  `$('NodeInLoop').all()` returns **only the last batch**. Use
  `$getWorkflowStaticData('global')` in a Code node inside the loop to
  accumulate, or rely on the explicit Aggregate after `done[0]` as shown.
- For SEO copy, layer the steering rules from the existing `programmatic-seo`,
  `copywriting`, and `ai-seo` skills already installed.

### W3 — `canva-pin-batch`

**Pattern**: HTTP API Integration + Batch
**Skills**: `n8n-workflow-patterns/http_api_integration.md`, `n8n-validation-expert`

```
Trigger:  Webhook (after W2) OR Schedule (07:00 UTC)
  └─► HTTP Request GET {NEXT_SITE}/api/canva/status   ← gates the run
  └─► IF (connected && !expired)
        ├─ false ► Slack: "Canva token expired" → STOP
        └─ true  ► continue
  └─► Set { formulaId, limit, kind }
  └─► HTTP Request POST {NEXT_SITE}/api/canva/webhook
        headers: x-canva-pipeline-secret = {{ $credentials.canvaWebhook }}
        body:    { filter: { formulaId, kind, limit } }
        retries: 3, backoff: exponential, continue-on-fail: true
  └─► IF (response.ok)
        ├─ true  ► Set { exports: response.results.filter(r => r.exportUrl) }
        │         └─► HTTP Request POST /api/products/upsert
        │              body: { products: exports.map(r => ({ id, pinExportUrl })) }
        │         └─► HTTP Request POST n8n://webhook/publish-site
        └─ false ► Stop and Error → W7
```

**Why this fits your code**: `app/api/canva/webhook/route.js` already returns
`{ attempted, succeeded, skipped, errored, results }` — n8n consumes that
shape directly. No code change needed in the Next.js app.

### W4 — `site-publisher`

**Pattern**: HTTP API Integration
**Skills**: `n8n-workflow-patterns/http_api_integration.md`

```
Webhook Trigger
  └─► GitHub node (clone or use the GitHub API)
       ├─ Action: createOrUpdateFile  (data/products.json, etc.)
       └─ Branch: auto/site-update-{{ $now.format("YYYY-MM-DD-HHmm") }}
  └─► GitHub node (createPullRequest)  → optional: auto-merge if green
  └─► HTTP Request POST {VERCEL_DEPLOY_HOOK_URL}
  └─► Wait (60s) → HTTP Request GET {NEXT_SITE}/api/health
  └─► IF (deployment.state === "READY")
        ├─ true  ► Slack: "🌴 Site deployed: {N} new products"
        └─ false ► W7
```

> Keep your existing rule: **never push direct to `main`**. n8n always
> commits to `auto/site-update-*` and a PR is opened — exactly matching the
> `git_safety` policy in this repo's steering.

### W5 — `pinterest-scheduler`

**Pattern**: Scheduled Tasks + Batch
**Skills**: `n8n-workflow-patterns/scheduled_tasks.md`, `social`

```
Schedule Trigger (every 30 min, Mon-Sun, 06:00 → 22:00 site TZ)
  └─► HTTP Request GET {NEXT_SITE}/api/pins/queue?status=ready&limit=3
       (new endpoint, reads data/pinterest-pins.json, filters by exportUrl present + lastPublishedAt null)
  └─► IF (items.length === 0) → STOP
  └─► Split In Batches (size: 1)
       └─► HTTP Request POST https://api.pinterest.com/v5/pins
            body:  { board_id, title, description, link: product.affiliateUrl,
                     media_source: { source_type: "image_url", url: pin.exportUrl } }
            retries: 5, exponential backoff, continue-on-fail: true
       └─► IF (ok)
            ├─ true  ► HTTP Request POST /api/pins/mark-published { pinId, pinterestId }
            └─ false ► Wait (random 30-90s) → retry once → fail to W7
       └─► Wait (rate-limit-friendly, 60-120s)
  └─► Loop back via main[1] until done[0]
  └─► Aggregate → Slack summary
```

> Pinterest API access is approval-only. Until you have it, this workflow
> stages pins to a CSV that you upload via Pinterest Bulk Create — already
> supported by `lib/pin-pipeline/csv-export.js` and `npm run canva:csv`.

### W6 — `analytics-collector`

**Pattern**: Scheduled + HTTP API
**Skills**: `n8n-workflow-patterns/scheduled_tasks.md`, `analytics`

```
Schedule (02:00 UTC daily)
  └─► HTTP Request GET https://plausible.io/api/v1/stats/aggregate?... 
  └─► HTTP Request GET https://api.pinterest.com/v5/pins/{id}/analytics  (per pin loop)
  └─► HTTP Request GET https://vercel.com/api/v6/deployments/...         (deploy status)
  └─► Code (build day-keyed report:
             { date, topProducts, topPins, ctr, clicksByCategory })
  └─► HTTP Request POST /api/analytics/upsert     (writes data/analytics.json)
  └─► IF (anomaly: ctrDrop > 30% OR errors > 0)
        ├─ true  ► Slack alert + create GitHub issue via gh node
        └─ false ► continue
  └─► HTTP Request POST n8n://webhook/publish-site  (so dashboard page rebuilds)
```

**Bidirectional thresholds**: per the n8n-workflow-patterns skill, check
`Math.abs(diff) > threshold`, not just `diff > threshold`. Big drops are
data-quality signals too.

### W7 — `error-watchdog`

**Pattern**: Error Trigger
**Skills**: `n8n-validation-expert`

```
Error Trigger (catches all other workflows)
  └─► Set { workflow, errorMessage, executionUrl, runAt }
  └─► IF (workflow === "canva-pin-batch" && error matches /token_expired/)
        └─ true  ► Slack: "Canva re-auth needed" + link to /api/canva/oauth/start
  └─► HTTP Request POST https://api.github.com/repos/{owner}/{repo}/issues
        body: title, body (with executionUrl), labels: ["bug","automation"]
  └─► Slack message to #alerts
  └─► Wait 5min → Re-run originating workflow ONCE (idempotent retry)
```

---

## 4. Error handling & retry policy

| Layer | Strategy |
|---|---|
| Per-node | `Continue On Fail` + 3 retries with exponential backoff (1s → 2s → 4s) |
| Per-workflow | Error workflow = W7 (set in workflow Settings → Error workflow) |
| API calls | Always set `timeout: 30000`, never default to infinite |
| Idempotency | Every upsert keyed by stable `product.id` / `pin.id`. W7 retry is safe. |
| Dry-run | Use the “verification tolerance” pattern from `n8n-workflow-patterns` so disabled write nodes still let downstream verifications run |
| Secrets | All in n8n Credentials. No `${...}` interpolation of secrets into URLs/bodies. |

---

## 5. Step-by-step n8n setup (beginner path)

1. **Pick a host.** Start free with [n8n Cloud](https://n8n.io) or self-host
   via Docker:
   ```
   docker run -d --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
   ```

2. **Install the n8n-MCP server** (used by the `n8n-mcp-tools-expert` skill).
   This lets Kiro create/validate workflows directly:
   ```
   npx -y n8n-mcp@latest
   ```
   Then add an entry to `.kiro/settings/mcp.json`:
   ```json
   {
     "mcpServers": {
       "n8n": {
         "command": "npx",
         "args": ["-y", "n8n-mcp@latest"],
         "env": { "N8N_BASE_URL": "https://YOUR-N8N", "N8N_API_KEY": "..." },
         "disabled": false,
         "autoApprove": ["search_nodes", "validate_node", "validate_workflow"]
       }
     }
   }
   ```

3. **Create credentials** in n8n (Settings → Credentials):
   - HTTP Header Auth: `next-site-auth` → `x-canva-pipeline-secret: ${CANVA_WEBHOOK_SECRET}`
   - GitHub: PAT with `repo` scope
   - OpenAI / Anthropic
   - Slack webhook
   - Vercel deploy hook (no auth, just URL)
   - (later) Pinterest OAuth, Plausible API key

4. **Create the 7 workflows** in this order: W1 → W2 → W3 → W4 → W7 → W5 → W6.
   Build each one with the **Plan → Validate → Deploy** checklist. Validate
   every node with the `n8n-validation-expert` skill before activation.

5. **Wire the chain** by setting the “next webhook” in each workflow's final
   HTTP Request node. Use n8n's internal webhook URLs (`/webhook/...`).

6. **Activate one at a time**, run manually first, then turn on schedules.

---

## 6. Recommended nodes (cheat sheet)

| Need | Node | Notes |
|---|---|---|
| Read CSV | Spreadsheet File | Auto-detects headers, encoding |
| Parse JSON / map fields | Set | Cheap, declarative |
| Custom logic | Code (JavaScript) | Use `$input`, `$json`, `$node`. See `n8n-code-javascript` skill |
| Conditional path | IF / Switch | Switch for >2 branches |
| Combine streams | Merge | Append, Combine, Multiplex |
| Loop large data | Split In Batches | `main[1]` = each batch, `main[0]` = done |
| Wait between calls | Wait | For rate limits |
| External API | HTTP Request | Always set timeout + retries |
| AI tasks | AI Agent (LangChain) | With Chat Model + Tools + Memory sub-nodes |
| Site repo | GitHub | createOrUpdateFile + createPullRequest |
| Cron | Schedule | Use UTC, document the TZ in node note |
| Catch failures | Error Trigger | One per workflow, points to W7 |
| Health probe | HTTP Request + IF | Gate downstream work |

---

## 7. Where the AI lives

| Job | Model recommendation | Where |
|---|---|---|
| Description / pin title / pin description | gpt-4o-mini or claude-haiku | W2 main agent |
| SEO meta titles + descriptions | gpt-4o-mini, schema-constrained | W2 sub-tool |
| Categorization fallback | gpt-4o-mini classifier | W1 (only when rule-based fails) |
| Blog / collection page outlines | claude-sonnet-4 | W2, weekly cadence |
| Anomaly summaries | gpt-4o-mini | W6 |
| FAQ generation | gpt-4o-mini | W2 |

Use a single **Output Parser** with a strict JSON schema per task — the
existing `programmatic-seo` and `copywriting` skills already define the
voice and the structure for the site, so the prompt should reference them
verbatim rather than re-inventing tone.

---

## 8. Scaling rails

- **Throughput**: every workflow uses `Split In Batches`. Increase batch size
  before adding parallelism — n8n's queue mode is for >10k jobs/day, you'll
  not need it until volume crosses that.
- **Cost**: gpt-4o-mini at the volumes here (~hundreds of products/day) is
  pennies. Pin-only batch caps usage automatically.
- **Reliability**: idempotent upserts + W7 watchdog mean any workflow can be
  re-run safely.
- **Observability**: `/api/health` aggregates Canva token state, last deploy,
  last commit. Wire it to a status page later.

---

## 9. What to build first (1-2 day MVP)

1. Add `POST /api/products/upsert` and `POST /api/products/import` (mirror
   the auth pattern in `app/api/canva/webhook/route.js`).
2. Stand up n8n + create credentials.
3. Build **W1 (product-import)** end-to-end with manual trigger only.
4. Build **W2 (ai-content)** for `description + pinTitle + metaTitle` only.
5. Build **W3 (canva-pin-batch)** — it's already a 1-node call, basically.
6. Build **W7 (error-watchdog)** so the rest can fail safely.
7. Then layer **W4 → W5 → W6** as Pinterest API access and analytics
   credentials come online.

That's the first useful slice: CSV in → enriched JSON + Canva pins out →
PR opened → site deploys.

---

## 10. Skill activation cheatsheet

When working on these workflows, ask Kiro to activate:

- `n8n-workflow-patterns` — overall design, gotchas, batch loop wiring
- `n8n-mcp-tools-expert` — `search_nodes`, `validate_node`, templates
- `n8n-node-configuration` — operation-specific field requirements
- `n8n-expression-syntax` — `{{ $json.body.field }}`, `$now`, `$node[...]`
- `n8n-code-javascript` — Code node `$input`/`$json`, batch helpers
- `n8n-validation-expert` — fix validator errors, true vs false positives
- `programmatic-seo`, `copywriting`, `ai-seo`, `analytics`, `social`,
  `schema` — for the content side of the workflows
