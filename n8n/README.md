# n8n — Affiliate Automation Stack

This folder is the source of truth for every n8n workflow that powers the
Summer Finds Lab affiliate ecosystem. Each workflow is generated from a
small Node builder script, exported as JSON, and committed alongside the
site repo so it stays version-controlled and reviewable.

## Architecture overview

```
CSV / Sheet
    │
    ▼
┌───────────────────────────────┐
│  WF-01  Product Enrichment    │  affiliate-product-pipeline.json
│  Read products → Claude →     │  (existing)
│  category / SEO / payloads    │
└───────────────────────────────┘
            │  data/products.json
            ▼
┌───────────────────────────────┐
│  WF-02  Pin Variant Generator │  pinterest-pin-generator.json
│  Read products → Claude       │  (new — built today)
│  → N pin variants / product   │
└───────────────────────────────┘
            │  data/pinterest-pins.json
            ▼
┌───────────────────────────────┐
│  WF-03  Canva Materializer    │  (planned)
│  Trigger /api/canva/webhook   │
└───────────────────────────────┘
            │  data/canva/exports.json
            ▼
┌───────────────────────────────┐
│  WF-04  Pinterest Publisher   │  (future)
│  Push pins to Pinterest API   │
└───────────────────────────────┘
            │
            ▼
┌───────────────────────────────┐
│  WF-05  Analytics Loop        │  (future)
│  Pinterest + GSC + Vercel →   │
│  score pins → feed WF-02      │
└───────────────────────────────┘
```

Every workflow:
- Has one trigger, one job, one well-defined I/O contract
- Uses `retryOnFail: 3` + 3s backoff + `neverError: true` on every HTTP node
- Uses `SplitInBatches` + `$getWorkflowStaticData('global')` for any iteration
- Reads every secret from `$env` — nothing hardcoded
- Is idempotent (re-running a batch with the same input is safe)

---

## Workflows

| File | Trigger | Inputs | Outputs |
|------|---------|--------|---------|
| `workflows/affiliate-product-pipeline.json` | manual | sample products (or upstream sheet/CSV) | `WEBSITE_INSERT_URL` POST per product |
| `workflows/pinterest-pin-generator.json` | manual | `PRODUCTS_JSON_URL`, `EXISTING_PINS_JSON_URL` | `PINS_INGEST_URL` POST per product, N pin records each |
| `workflows/opportunity-intelligence.json` | schedule (06:00 UTC) + manual | Pinterest Trends + Amazon Movers & Shakers (Firecrawl), `PRODUCTS_JSON_URL`, `EXISTING_PINS_JSON_URL`, `OPPORTUNITY_HISTORY_URL` | `OPPORTUNITY_INGEST_URL` daily report POST |
| `workflows/pinterest-publisher.json` | schedule (09:00 UTC) + manual | `EXISTING_PINS_JSON_URL`, `PUBLISHED_LOG_URL`, Pinterest /v5/boards | Pinterest /v5/pins POST per pin, `PUBLISHED_INGEST_URL` log POST |
| `workflows/pinterest-publish-pin.json` | webhook (POST `/webhook/pinterest-publish-pin`) | one pin payload (imageUrl, title, description, link, boardId) | Pinterest /v5/pins POST, `PUBLISHED_INGEST_URL` log POST, JSON webhook response |
| `workflows/pinterest-boards-helper.json` | manual + webhook (POST `/webhook/pinterest-boards-helper`) | Pinterest /v5/user_account, paginated /v5/boards | `BOARDS_CACHE_INGEST_URL` POST + diagnostic report (token validity, board list, suggested default) |

### WF-01 — Affiliate Product Processing Pipeline

```
Manual Trigger
   -> Load Products            (Code: 3 sample products)
   -> Validate & Prepare       (Code)
   -> Loop Over Products       (SplitInBatches, batchSize=1)
        body branch:
          -> Build Claude Prompt
          -> Call Claude API           (HTTP, retry x3)
          -> Parse Claude Output       (Code)
          -> Structure Affiliate Output (Code: website + pinterest + canva payloads)
          -> Insert to Website         (HTTP POST)
        done branch:
          -> Limit 1
          -> Aggregate Results
```

Source: [`build-workflow.js`](./build-workflow.js)
Output: [`workflows/affiliate-product-pipeline.json`](./workflows/affiliate-product-pipeline.json)

### WF-02 — Pinterest Pin Variant Generator

For each product in `data/products.json`, asks Claude for N pin variants
(one per Canva formula) and writes them as records that match the existing
`data/pinterest-pins.json` schema (`formulaId`, `formulaLabel`, `aspectRatio`,
`boardSuggestion`, `link`, `sourceImage`, `textOverlay`, `secondaryStickers`,
`canvaPrompt`, `imagePrompt`, `lifestylePrompt`, `description`, `hashtags`,
`cta`, `ctrLevers`, `id`, `batch`).

```
Manual Trigger
   -> Load Config              (Code: 10 formulas + batch id + site URL)
   -> Fetch Products           (HTTP GET PRODUCTS_JSON_URL)
   -> Fetch Existing Pins      (HTTP GET EXISTING_PINS_JSON_URL, optional)
   -> Filter Unpinned          (Code: skip products already in pins file)
   -> Loop Over Products       (SplitInBatches, batchSize=1)
        body branch:
          -> Build Pin Prompt              (Code)
          -> Call Claude API               (HTTP, retry x3, 90s timeout)
          -> Parse Pin Variants            (Code, tolerant JSON)
          -> Structure Pin Records         (Code: shape -> pins schema)
          -> Insert Pins                   (HTTP POST PINS_INGEST_URL)
        done branch:
          -> Limit 1
          -> Aggregate Results
```

Source: [`build-pin-generator.js`](./build-pin-generator.js)
Output: [`workflows/pinterest-pin-generator.json`](./workflows/pinterest-pin-generator.json)

The 10 formulas mirror `lib/pin-pipeline/templates.js` in the Next.js app, so
generated pins map cleanly onto a Canva brand template once you populate
`CANVA_TPL_*` env vars on the website.

### WF-04 — Pinterest Publisher

Daily at 09:00 UTC. Reads `data/pinterest-pins.json`, skips pin ids already
in `data/pinterest-published.json`, throttles to `PINS_PER_RUN` per run
(default 5 — safe pace for a brand-new business account), and publishes each
pin to Pinterest's `/v5/pins` endpoint. Looks up your boards live and matches
each pin's `boardSuggestion` field against the board name; falls back to
`PINTEREST_DEFAULT_BOARD_ID` if no name matches.

```
Schedule (09:00 UTC) | Manual Trigger
   -> Load Config              (Code: throttle, default board, batch id)
   -> Fetch Pins               (HTTP GET EXISTING_PINS_JSON_URL)       \
   -> Fetch Published Log      (HTTP GET PUBLISHED_LOG_URL, optional)   } parallel
   -> List Pinterest Boards    (HTTP GET /v5/boards)                    /
   -> Build Publish Queue      (Code: filter unpublished, throttle, map boards)
   -> Loop Over Pins           (SplitInBatches, batchSize=1)
        body branch:
          -> Pinterest Create Pin       (HTTP POST /v5/pins, retry x3)
          -> Record Result              (Code: tolerant error handling)
          -> Append to Published Log    (HTTP POST PUBLISHED_INGEST_URL)
        done branch:
          -> Limit 1
          -> Aggregate Results
```

Site-side endpoints (added in this repo):

- `GET  /api/pinterest/published` — public read of the log used by `Fetch Published Log`.
- `POST /api/pinterest/published` — bearer-auth'd, appends one record. Idempotent on `pinId`.

Ramp guidance for a fresh Pinterest account:

| Phase | Window | `PINS_PER_RUN` |
|-------|--------|----------------|
| Cold start | Days 1-7 | 5 |
| Warming | Days 8-21 | 10 |
| Cruise | Day 22+ | 15-25 |

Source: [`build-pinterest-publisher.js`](./build-pinterest-publisher.js)
Output: [`workflows/pinterest-publisher.json`](./workflows/pinterest-publisher.json)

### WF-04b — Pinterest Publish Pin (single-pin webhook)

Webhook-triggered companion to WF-04. Designed to be called by the existing
Pin Factory the moment a Canva render is ready, instead of waiting for the
daily batch. Accepts a single pin payload, posts it to Pinterest, and logs
the result.

Request shape (POST `/webhook/pinterest-publish-pin`):

```json
{
  "imageUrl":    "https://cdn.example.com/pin-final.png",
  "title":       "Linen Coverup Picks Under $40",
  "description": "Five lightweight linen coverups perfect for beach days...",
  "link":        "https://www.amazon.com/dp/B0XXXXXXX?tag=youraffiliate-20",
  "boardId":     "1234567890123456789",
  "altText":     "Three linen coverups laid flat on white sand",
  "pinId":       "internal-pin-id-123"
}
```

The caller must send the secret in either:

- header `x-pin-publish-secret: <PIN_PUBLISH_WEBHOOK_SECRET>`, **or**
- body field `"secret": "<PIN_PUBLISH_WEBHOOK_SECRET>"`

Response (200 on success, 400/401/502 on failure):

```json
{
  "ok": true,
  "status": 200,
  "pinId": "internal-pin-id-123",
  "boardId": "1234567890123456789",
  "pinterestPinId": "987654321987654321",
  "pinterestPin": {
    "id": "987654321987654321",
    "board_id": "1234567890123456789",
    "created_at": "2026-05-30T10:00:00Z",
    "link": "https://www.amazon.com/dp/B0XXXXXXX?tag=youraffiliate-20",
    "title": "Linen Coverup Picks Under $40"
  },
  "publishedAt": "2026-05-30T10:00:01.234Z"
}
```

Flow:

```
Webhook (POST)
   -> Authenticate             (Code: shared-secret check)
   -> Validate Payload         (Code: trim + URL sanity check)
   -> Pinterest Create Pin     (HTTP POST /v5/pins, retry x3, 5s backoff)
   -> Build Response           (Code: shape success / error)
   -> Append to Published Log  (HTTP POST PUBLISHED_INGEST_URL, best-effort)
   -> Respond to Webhook       (JSON response, status code from Build Response)
```

Source: [`build-pinterest-publish-pin.js`](./build-pinterest-publish-pin.js)
Output: [`workflows/pinterest-publish-pin.json`](./workflows/pinterest-publish-pin.json)

### WF-04c — Pinterest Boards Helper

On-demand helper used to bootstrap the Publisher: validates the Pinterest
access token, lists every board the token can see (paginated, up to 300),
and persists the resolved list so the site (or other workflows) can look up
board ids without re-hitting Pinterest.

```
Manual Trigger | Webhook (POST)
   -> Validate Token              (HTTP GET /v5/user_account, retry x3)
   -> Check Token Scopes          (Code: parse + diagnose)
   -> Fetch Boards Page 1         (HTTP GET /v5/boards?page_size=100)
   -> Fetch Boards Page 2         (HTTP GET ?bookmark=...)
   -> Fetch Boards Page 3         (HTTP GET ?bookmark=...)
   -> Aggregate Boards            (Code: dedupe, sort by pin_count, pick default)
   -> Persist Boards Cache        (HTTP POST BOARDS_CACHE_INGEST_URL, optional)
   -> Build Diagnostic Report     (Code: token validity + boards + recommendations)
```

Final node output includes `boardNameToId` (a flat map you can paste into
your `boardSuggestion` -> `boardId` reference) and a `recommendations` array
with the exact env var to set for the Publisher's default board.

Run this:

- Once after generating the Pinterest access token.
- Whenever you create a new board on Pinterest.
- As a debugging step if the Publisher is reporting `skipped_no_board`.

Source: [`build-pinterest-boards-helper.js`](./build-pinterest-boards-helper.js)
Output: [`workflows/pinterest-boards-helper.json`](./workflows/pinterest-boards-helper.json)

### WF-06 — Opportunity Intelligence System

Daily at 06:00 UTC. Finds product opportunities before competitors do.

```
Schedule (06:00 UTC) | Manual Trigger
   -> Load Config                       (Code: weights, today, sources)
   -> Fetch Pinterest Trends            (HTTP POST Firecrawl /v2/scrape)
   -> Fetch Amazon Movers & Shakers     (HTTP POST Firecrawl /v2/scrape)
   -> Fetch Products                    (HTTP GET PRODUCTS_JSON_URL)
   -> Fetch Existing Pins               (HTTP GET EXISTING_PINS_JSON_URL)
   -> Fetch Yesterday's Report          (HTTP GET OPPORTUNITY_HISTORY_URL)
   -> Score & Rank                      (Code: deterministic 0-100 per axis)
   -> Build Brief Prompt                (Code: top 20 only, < 4k tokens)
   -> Call Claude API                   (HTTP, retry x3)
   -> Parse Brief                       (Code: tolerant JSON)
   -> Build Daily Report                (Code: scores + brief + markdown digest)
   -> Insert Report                     (HTTP POST OPPORTUNITY_INGEST_URL)
   -> Aggregate Results
```

What it does, day to day:

1. Discovers trending Pinterest keywords + categories (Firecrawl JSON extraction).
2. Discovers trending Amazon Movers & Shakers categories + items.
3. Scores every product in `data/products.json` on two axes (Pinterest potential
   + affiliate potential), 0-100, with a per-axis breakdown explaining the score.
4. Recommends the Top-N products with highest Pinterest potential (default 10).
5. Recommends the Top-N products with highest affiliate potential.
6. Calls Claude once for a bounded executive brief (summary, per-product
   reasoning, watch list, missing-coverage callout).
7. Builds a JSON report + markdown digest, writes it via the website ingest
   endpoint, and the next day's run reads it back to compute deltas
   (climber/faller signals).

Source: [`build-opportunity-intelligence.js`](./build-opportunity-intelligence.js)
Output: [`workflows/opportunity-intelligence.json`](./workflows/opportunity-intelligence.json)

Site-side endpoints (already added in this repo):

- `POST /api/opportunities/ingest` — Bearer-auth'd, persists today's report
  under `data/opportunities/{date}.json` and `latest.json`.
- `GET /api/opportunities/latest` — public read of the most recent report.

The ingest route writes to disk where the filesystem is writable (local
dev, self-hosted) and degrades to a 200 with `persisted: false` on
read-only hosts (Vercel) so you can wire it up to GitHub Contents API or
Vercel KV later without changing the workflow.

---

## Environment variables

See [`.env.example`](./.env.example). All variables go in **n8n → Settings →
Variables** (or the n8n container env). Quick summary:

| Variable | Used by | Required | Notes |
|----------|---------|----------|-------|
| `ANTHROPIC_API_KEY` | WF-01, WF-02 | yes | Anthropic API key. |
| `CLAUDE_MODEL` | WF-01, WF-02 | no | Default `claude-opus-4-20250514`. |
| `WEBSITE_INSERT_URL` | WF-01 | yes | Endpoint that accepts product payloads. |
| `WEBSITE_API_TOKEN` | WF-01 | yes | Bearer token for the above. |
| `PRODUCTS_JSON_URL` | WF-02 | yes | URL serving `data/products.json`. |
| `EXISTING_PINS_JSON_URL` | WF-02 | no | URL serving `data/pinterest-pins.json`. |
| `SITE_URL` | WF-02 | yes | Site origin for pin links. |
| `PINS_INGEST_URL` | WF-02 | yes | Endpoint that accepts pin records. |
| `PINS_INGEST_TOKEN` | WF-02 | yes | Bearer token for the above. |
| `PINS_BATCH_ID` | WF-02 | no | Override auto batch label. |
| `FORMULAS_PER_PRODUCT` | WF-02 | no | 1-10, default 3. |
| `CANVA_WEBHOOK_URL` | WF-03 | future | The site's `/api/canva/webhook`. |
| `CANVA_WEBHOOK_SECRET` | WF-03 | future | Same secret as the website env. |
| `FIRECRAWL_API_KEY` | WF-06 | yes | Firecrawl key for trend discovery. |
| `OPPORTUNITY_INGEST_URL` | WF-06 | yes | `/api/opportunities/ingest` URL. |
| `OPPORTUNITY_INGEST_TOKEN` | WF-06 | yes | Bearer token. Must match `OPPORTUNITY_INGEST_TOKEN` on the website. |
| `OPPORTUNITY_HISTORY_URL` | WF-06 | no | `/api/opportunities/latest` URL (or raw GitHub URL). |
| `OPPORTUNITY_TOP_N` | WF-06 | no | 5-50, default 10. |
| `PINTEREST_ACCESS_TOKEN` | WF-04, WF-04b, WF-04c | yes | Pinterest API token. Scopes: `boards:read pins:read pins:write user_accounts:read`. |
| `PINTEREST_DEFAULT_BOARD_ID` | WF-04 | no | Fallback board id for unmatched `boardSuggestion`. |
| `PINS_PER_RUN` | WF-04 | no | Daily throttle (default 5). |
| `PIN_LINK_OVERRIDE_HOST` | WF-04 | no | Host swap for staged pin records. |
| `PUBLISHED_LOG_URL` | WF-04 | yes | Public GET endpoint listing published pin ids. |
| `PUBLISHED_INGEST_URL` | WF-04, WF-04b | yes | POST endpoint that appends to the published log. |
| `PUBLISHED_INGEST_TOKEN` | WF-04, WF-04b | yes | Bearer token for the above. |
| `PIN_PUBLISH_WEBHOOK_SECRET` | WF-04b | yes | Shared secret for the single-pin webhook caller. |
| `BOARDS_CACHE_INGEST_URL` | WF-04c | no | POST endpoint that persists the resolved board list. |
| `BOARDS_CACHE_INGEST_TOKEN` | WF-04c | no | Bearer token for the above. |

---

## Importing workflows into n8n

1. Open n8n → **Workflows** → **Import from File**.
2. Select the JSON file under `workflows/`.
3. Add the env variables above in **Settings → Variables**.
4. Open the **Manual Trigger** and click **Test workflow**.
5. The final **Aggregate Results** node shows a run summary.

### Testing without writing to your site

For both workflows, point the ingest URLs (`WEBSITE_INSERT_URL`,
`PINS_INGEST_URL`) at a `https://webhook.site/...` URL first. You can
inspect the exact payload there before wiring up the real endpoint.

---

## Building / regenerating

Workflows are generated. To edit:

1. Edit `n8n/build-<name>.js`.
2. Run `node n8n/build-<name>.js`.
3. Re-import the updated JSON in n8n.

Editing the JSON directly works for one-offs, but the builder is the source
of truth.

---

## Known gaps (the next things to build)

These are the highest-leverage next steps, roughly in order:

1. **Site-side ingest endpoints.** Vercel's filesystem is read-only at runtime,
   so `WEBSITE_INSERT_URL` and `PINS_INGEST_URL` need either:
   - a small `/api/affiliate/ingest` + `/api/pins/ingest` handler that commits
     back to GitHub via the contents API, or
   - a database (Vercel Postgres / Supabase / KV) the site reads from at
     build/serve time.
2. **WF-01 schema alignment.** WF-01's `website_payload` uses `sku`, `image_url`
   etc., but `data/products.json` uses `id`, `image`, `affiliateUrl`,
   `rating: { value, count }`, `imageSource`, `editorial`. Update WF-01's
   `Structure Affiliate Output` once the ingest endpoint exists.
3. **WF-03 Canva Materializer.** Tiny — three nodes:
   `Schedule → POST CANVA_WEBHOOK_URL with x-canva-pipeline-secret → Aggregate`.
   The site already does the heavy lifting in `lib/pin-pipeline/generate.js`.
4. **n8n MCP server in `.kiro/mcp.json`.** Lets Kiro create / validate /
   activate workflows directly. Add this block:
   ```json
   "n8n": {
     "command": "npx",
     "args": ["-y", "n8n-mcp"],
     "env": {
       "N8N_API_URL": "https://your-n8n-host/api/v1",
       "N8N_API_KEY": "your-n8n-api-key"
     },
     "disabled": false,
     "autoApprove": []
   }
   ```
5. **WF-04 Pinterest Publisher** once you have a Pinterest API token.
6. **WF-05 Analytics loop** to feed pin performance back into WF-02 prompts.
