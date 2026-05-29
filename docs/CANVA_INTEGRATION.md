# Canva Connect Integration

This integration turns the affiliate catalog (`data/products.json`) into
Pinterest-ready PNG pins by piping product data through the
[Canva Connect API](https://www.canva.dev/docs/connect/). The same pipeline
plugs into n8n / cron when you're ready to schedule.

> Reference architecture inspired by
> [`canva-sdks/canva-connect-api-starter-kit`](https://github.com/canva-sdks/canva-connect-api-starter-kit).

---

## 1. How Canva's API actually works

The Canva Connect API is OAuth-based. You build an "integration" in your
Canva developer account, point it at a redirect URL on this site, and a
user (you) clicks "Connect". Canva returns an `access_token` valid for
about 4 hours plus a `refresh_token`. From that point you can:

| Capability                   | Endpoint family            | Plan required        |
| ---------------------------- | -------------------------- | -------------------- |
| Upload product images        | `/asset-uploads`           | Any                  |
| List user's designs          | `/designs`                 | Any                  |
| **List Brand Templates**     | `/brand-templates`         | **Canva Enterprise** |
| **Autofill from Brand Tpl.** | `/autofills`               | **Canva Enterprise** |
| Export to PNG / JPG / PDF    | `/exports`                 | Any                  |

The "magic" — auto-generating one Canva design per product from a master
template — happens through Brand Templates + Autofill, which is gated
behind the Enterprise plan today. The integration ships **two paths** so
you're not blocked:

- **Path A (Enterprise)** — Full automation via the Connect API.
- **Path B (Free / Pro)** — Generate a Canva-ready CSV; click into Canva
  Bulk Create once per batch. Same data fields, manual final step.

Both paths use the same product data and the same field naming, so when
you upgrade you flip a switch and keep your templates.

---

## 2. One-time setup

### 2.1 Create a Canva developer integration

1. Go to <https://www.canva.com/developers/integrations>.
2. Click **Create an integration** → "This integration will be used by my team".
3. **Authentication** tab → enable **OAuth 2.0**.
4. **Redirect URLs** → add:
   - `http://localhost:3000/api/canva/oauth/callback` (dev)
   - `https://your-domain.com/api/canva/oauth/callback` (prod)
5. **Scopes** tab → enable everything in `lib/canva/config.js > REQUIRED_SCOPES`:
   - `asset:read`, `asset:write`
   - `brandtemplate:meta:read`, `brandtemplate:content:read`
   - `design:meta:read`, `design:content:read`, `design:content:write`
6. Click **Save**, then **Submit for testing** (or "Use as private" if your
   Canva plan allows). Copy the **Client ID** and **Client Secret**.

### 2.2 Configure environment variables

Copy `.env.example` to `.env.local`:

```cmd
copy .env.example .env.local
```

Fill in:

```
CANVA_CLIENT_ID=...
CANVA_CLIENT_SECRET=...
CANVA_REDIRECT_URI=http://localhost:3000/api/canva/oauth/callback
CANVA_WEBHOOK_SECRET=<run: openssl rand -hex 32>
```

### 2.3 Connect your Canva account

```cmd
npm run dev
```

Open <http://localhost:3000/api/canva/oauth/start>. Approve the consent
screen. You'll land on `/api/canva/oauth/callback?ok=true`. Tokens are
written to `data/canva/tokens.json` (gitignored). Verify:

```cmd
npm run canva:test-auth
```

You should see your Canva user profile JSON.

---

## 3. Building the Pinterest templates

Each "visual formula" in `scripts/generate-pinterest-pins.mjs` should
correspond to one Brand Template in Canva. Suggested starter set:

| Formula ID            | When to use                          | Required fields                                  |
| --------------------- | ------------------------------------ | ------------------------------------------------ |
| `bold-number-list`    | Roundup / "5 Amazon finds…"          | `headline`, `big_number`, `product_image`, `cta` |
| `curiosity-gap`       | Single product POV                   | `headline`, `product_image`, `brand`             |
| `price-tag-find`      | Under-$25 hero shot                  | `headline`, `price_tag`, `product_image`, `cta`  |
| `aesthetic-lifestyle` | Pure mood pin                        | `product_image`, `brand`                         |
| `headline-stat`       | "★ 4.5 / 50+ reviews" social proof   | `rating`, `review_count`, `headline`             |
| `neon-sticker-tiktok` | Y2K viral pin                       | `headline`, `sticker_1`, `sticker_2`, `sticker_3`, `product_image` |

How to expose a field for autofill in Canva:

1. Open the design in Canva.
2. Click the text or image element you want to be replaceable.
3. Right click → **Properties** → **Name this element**.
4. Use snake_case names exactly like the table above.
5. Once published as a Brand Template, the field becomes addressable
   from `/autofills` payloads.

After publishing, run:

```cmd
npm run canva:list-templates
```

Copy each template's `id` and add to `.env.local`:

```
CANVA_TPL_BOLD_NUMBER_LIST=DAFxxxxxxxxxx
CANVA_TPL_PRICE_TAG_FIND=DAFxxxxxxxxxx
# ...
```

These env vars feed `lib/pin-pipeline/templates.js > BRAND_TEMPLATE_IDS`.

---

## 4. Generating pins

### 4.1 Dry run (no Canva calls)

```cmd
npm run canva:generate -- --dry
```

Prints which pins are ready to generate based on which templates are
configured.

### 4.2 Real run

```cmd
npm run canva:generate -- --formula=price-tag-find --limit=5
```

For each pin the runner does:

1. Upload `pin.sourceImage` to `/asset-uploads`. Cached per-URL within a run.
2. Build the autofill payload via `lib/pin-pipeline/templates.js`.
3. Create an autofill job → poll until success → get back a `design_id`.
4. Create a PNG export job → poll → collect signed URLs (valid ~24h).
5. Append a row to `data/canva/exports.json`.

Each row in `exports.json` is everything a Pinterest scheduler needs:
`exportUrls`, `link` (already UTM-tagged), `boardSuggestion`,
`description`, `hashtags`, `title`.

### 4.3 Free-tier path (no Enterprise)

```cmd
npm run canva:csv
```

Writes `content/pinterest/canva-bulk-create.csv`. Inside Canva:

1. Open the design that should become your "template".
2. Apps → **Bulk Create**.
3. Upload the CSV → connect each column to its placeholder.
4. **Continue** → Canva generates one variant per row.
5. Multi-select → **Download** as PNG → drop into Pinterest scheduler.

---

## 5. Hooking up automation

### 5.1 Webhook endpoint

`POST /api/canva/webhook` runs the same pipeline triggered remotely.

```http
POST /api/canva/webhook
Content-Type: application/json
x-canva-pipeline-secret: <CANVA_WEBHOOK_SECRET>

{ "filter": { "formulaId": "price-tag-find", "limit": 10 } }
```

Returns `{ attempted, succeeded, skipped, errored, results }`.

### 5.2 n8n workflow (suggested)

```
Cron (daily 06:00)
  └─ Read data/products.json (HTTP / git)
       └─ HTTP Request -> POST /api/canva/webhook
            └─ Set: { exportUrls } from response
                 └─ HTTP Request -> Pinterest API: create pin
                      └─ Slack: "Posted N pins for {date}"
```

The webhook is intentionally idempotent on inputs but additive on outputs
(append-only export log) so you can safely retry.

### 5.3 Future scaling

- **Bulk variants per product** — change `filter.limit` per cron call,
  or partition by `formulaId` across days for variety.
- **AI-generated lifestyle backgrounds** — feed `pin.lifestylePrompt` to
  Midjourney / Ideogram / Flux, upload the result via
  `uploadAssetFromBuffer`, and pass the asset id as the `product_image`
  override. Drop-in replacement, no template changes.
- **Multi-account** — replace `lib/canva/token-store.js` with a Postgres
  table keyed by `user_id` and pass that key into `getAccessToken`.

---

## 6. File map

```
lib/canva/
  config.js          env + scopes
  token-store.js     persisted tokens (file -> swap with DB later)
  oauth.js           PKCE, authorize URL, exchange, refresh
  client.js          fetch wrapper, retry, polling
  assets.js          upload product images
  brand-templates.js list/inspect templates
  autofill.js        autofill jobs
  exports.js         export jobs
  index.js           public surface

lib/pin-pipeline/
  templates.js       formula -> brand template + field map
  generate.js        per-pin & batch orchestration
  csv-export.js      free-tier bulk create CSV writer
  index.js

app/api/canva/
  oauth/start        kick off OAuth (PKCE, sets cookies)
  oauth/callback     handle redirect, save tokens
  status             health check
  webhook            n8n / cron entry point

scripts/canva/
  test-auth.mjs      sanity-check the connection
  list-templates.mjs print every brand template + fields
  export-csv.mjs     bulk-create CSV for Free/Pro plans
  generate-pins.mjs  full Connect API pipeline
```

---

## 7. Troubleshooting

| Symptom                                  | Likely cause / fix                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| `Missing env vars: CANVA_CLIENT_ID...`   | `.env.local` not copied or dev server not restarted after edits.                         |
| `state_mismatch` on callback             | The OAuth start cookie expired (10 min). Just hit `/api/canva/oauth/start` again.        |
| `[canva 401] ... brand-templates`        | Your account isn't on Canva Enterprise. Use `npm run canva:csv` flow instead.            |
| `[canva] No tokens stored`               | Run the OAuth flow once. Check `data/canva/tokens.json` exists.                          |
| `pollJob timeout` on autofill            | Canva is slow today, or the template references a deleted asset. Bump `timeoutMs`.       |
| Pin skipped with `reason: no_template`   | The `formulaId` has no `CANVA_TPL_*` env value set yet.                                  |
| Pinterest links lose UTM                 | We add UTM in `scripts/generate-pinterest-pins.mjs`. Re-run it after editing categories. |
