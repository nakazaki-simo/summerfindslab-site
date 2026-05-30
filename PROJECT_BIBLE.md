# PROJECT BIBLE — Summer Finds Lab Daily

> **Document version:** v1.0
> **Last updated:** 2026-05-30
> **Maintainer:** nakazaki-simo
> **Repo:** `nakazaki-simo/summerfindslab-site`
>
> ⚠️ This file is the single source of truth for *intent, state, and conventions*.
> If the code and this file disagree, trust the code, then **update this file**.
> The code is the territory; this document is the map.

---

## SECTION 0 — AI BOOTSTRAP PROMPT (READ AND EXECUTE FIRST)

> 🤖 **TO ANY AI READING THIS FILE:**
> You are not a generic assistant right now. You are the dedicated engineer of
> this project. Before you act on any user message, run this boot sequence.

### Boot sequence (mandatory, in order)
1. **Identity load** — Adopt the persona in §0.1.
2. **Context absorption** — Read §1 → §16 in order. Do not skip.
3. **State sync** — Treat §8 (Current State) as your starting reality.
4. **Behavioral lock-in** — Commit to the contract in §0.2.
5. **Active recall** — Answer the quiz in §16 mentally. If you miss one, re-read.
6. **Continuation** — Pick the top unblocked task in §9 (Task Queue).
7. **Acknowledge** — Reply to the user with:
   `✅ Project Bible loaded. Milestone: <X>. Next task: <Y>. Ready.`
   (Reply in the user's language — they often write Moroccan Darija.)

### §0.1 — Your persona
You are the **Lead Full-Stack + Automation Engineer for Summer Finds Lab Daily**.
- **Traits:** pragmatic, ship-oriented, GEO/SEO-literate, allergic to fake
  authority and dark patterns (this project must stay FTC-clean).
- **Communication:** concise; code/answer first, then a short "what changed + why".
  Mirror the user's language — Moroccan Darija + English are both expected in chat.
  All code, comments, commits, docs, and JSON-LD stay in **English**.
- **Decision authority:** autopilot on reversible edits; ask first on anything
  that spends money, deploys, publishes publicly, or changes the stack (see §0.2).

### §0.2 — Behavioral contract (hard rules — never violate)
- ❌ Never push directly to `main`. Always branch + open a PR. (Repo git-safety rule;
  even the n8n `site-publisher` opens a PR.)
- ❌ Never commit real secrets. Only `.env.example` templates belong in git.
- ❌ Never install an npm dependency without asking.
- ❌ Never delete a file or a block > 10 lines without confirmation.
- ❌ Never edit files under `.kiro/skills/<skill>/` — skills are **read-only**
  (see `.kiro/steering/skills-policy.md`). If you need a change, fork under a new name.
- ❌ Never re-introduce fake authority (the "As seen in Vogue/TechRadar" strip,
  invented review counts). FTC § 5 risk + Amazon Associates risk.
- ❌ Never publish real pins to a live Pinterest account without explicit go-ahead.
- ✅ Always run a paid-API batch (Claude / Firecrawl / Canva) as a capped dry-run first.
- ✅ Always keep routes SSR/SSG — no client-only rendering (load-bearing for AI crawlers).
- ✅ Always keep JSON-LD intact — it is the schema strategy, not optional weight.
- ✅ Always update §8 (Current State) and §11 (Failure Log) at the end of a work session.

---

## SECTION 1 — PROJECT IDENTITY

- **Name:** Summer Finds Lab Daily
- **Domain:** `https://summerfindslab.com` (configured in `lib/site.js`; **not yet deployed**)
- **Tagline:** "Daily drops of trending summer must-haves."
- **Elevator pitch:** A Pinterest-style Amazon-affiliate publisher for trending
  summer products — gadgets, beach gear, viral TikTok finds, aesthetic-room items,
  and travel accessories. An AI pipeline discovers opportunities, turns products
  into GEO-optimized pages and high-CTR Pinterest pins, and (eventually) publishes
  them on autopilot.
- **Business model:** Amazon Associates commissions on outbound clicks. Pinterest
  is the top-of-funnel distribution engine; GEO/AI-citability is the organic moat.
- **Target user (the "Operator"):** a non-designer solo operator who runs the site
  + pin production with heavy AI assistance.
- **Primary success metric:** monthly **outbound clicks to Amazon** (Associates dashboard).
- **Secondary metrics:** pins published/week + Pinterest outbound clicks; AI-citation
  count (how often the brand is cited by ChatGPT / Perplexity / Google AI Overviews).
- **Non-goals:** not a store (no cart/checkout — every product opens on Amazon);
  not multi-season in v1 (summer only); not a database-backed CMS yet (file-based JSON).

---

## SECTION 2 — VISION & ROADMAP

- **Long-term vision:** a self-feeding affiliate engine where discovery → content →
  distribution → analytics is a closed automated loop, with the human operator only
  curating and approving.
- **Milestones:**
  - **MVP (done):** static Next.js site with products, categories, blog, guides, full schema.
  - **v1 launch (current):** GEO upgrade + automation plumbing built; deploy to Vercel
    with real credentials; first real end-to-end pin run.
  - **v1.1:** Pinterest publishing live (WF-04) once API access is approved.
  - **v2 (later):** analytics feedback loop (WF-05), DB-backed ingest if/when JSON
    becomes the bottleneck, possible sister brand for other seasons on a separate subdomain.
- **Active milestone:** *Pre-launch GEO upgrade + automation wiring* (two parallel tracks).

---

## SECTION 3 — TECH STACK (with rationale)

| Layer | Choice | Version | Why |
|---|---|---|---|
| Framework | Next.js (App Router) | 14.2.35 | SSR/SSG = AI-crawler-readable; instant Vercel deploys; file-based routing |
| UI runtime | React | 18.3.1 | Next.js peer |
| Language | JavaScript (ESM) | — | Ship speed; `tsconfig.json` + `lib/types.ts` give ambient types only |
| Styling | Tailwind CSS | 3.4.6 | Utility-first; brand tokens centralized in `tailwind.config.js` |
| Animation | `motion` (Framer Motion) | 11.11.17 | Cinematic hero, reveals; respects `prefers-reduced-motion` |
| Smooth scroll | `lenis` | 1.1.20 | Premium scroll feel |
| Data layer | Flat JSON files | — | Zero infra, git-tracked history, regenerable from CSV |
| Image automation | Canva Connect API | — | Product → Pinterest pin rendering (`lib/canva/*`) |
| Orchestration | n8n | — | Scheduling/retries/AI; **conductor only**, never owns data |
| AI (content/intel) | Anthropic Claude | `claude-opus-4-20250514` default | Used inside n8n WF-01, WF-02, WF-06 |
| Trend discovery | Firecrawl | v2 `/scrape` | Pinterest Trends + Amazon Movers & Shakers (WF-06) |
| Distribution | Pinterest API v5 | — | `/v5/pins`, `/v5/boards` (WF-04 family) — **approval-gated** |
| Hosting | Vercel | — | Target deploy platform (not yet deployed) |
| Runtime | Node.js | ≥ 18.17 | `package.json#engines` |

**Locked decisions (don't change without an ADR in §7):** file-based JSON data layer;
no TS rewrite of existing `.js`; SSR/SSG only; n8n as the only orchestrator;
all secrets via env; never push to `main`.

---

## SECTION 4 — ARCHITECTURE  [ANCHOR:architecture]

### 4.1 The big picture
```
                 ┌───────────────────────── n8n CONTROL PLANE ─────────────────────────┐
                 │  schedules · retries · AI calls · never owns data                    │
                 └──────────────────────────────────────────────────────────────────────┘
   CSV / Sheets         │ Claude            │ Firecrawl         │ Pinterest API     │ GitHub/Vercel
        │               ▼                   ▼                   ▼                   ▼
   WF-01 enrich → data/products.json   WF-06 opportunity   WF-04 publisher    site-publisher (PR)
        │                               intelligence            │
        ▼                                   │                   ▼
   WF-02 pin variants → data/pinterest-pins.json        data/pinterest-published.json
        │
        ▼
   Canva pipeline (lib/canva + lib/pin-pipeline) → data/canva/exports.json
        │
        ▼
   Next.js site (SSG on Vercel)  ── renders products, pins, GEO pages, JSON-LD, llms.txt
```
n8n is the **conductor**. JSON in `data/*.json` is the **source of truth**, committed
via PR. The site stays statically generated; n8n triggers regeneration through the
HTTP API routes below.

### 4.2 Folder map (what lives where)
```
app/                         Next.js App Router
  page.js                    Homepage
  layout.js                  Root layout, fonts, global metadata
  globals.css                Tailwind + custom styles
  sitemap.js robots.js manifest.js opengraph-image.js   Generated SEO surfaces
  llms.txt/route.js          AI-crawler hint file (GEO)
  humans.txt/route.js        Human credits file
  trending|under-25|tiktok-finds|categories|about|disclosure|privacy|guides|blog/   Static + list pages
  category/[slug]/           SSG category pages (ItemList)
  blog/[slug]/  guides/[slug]/   SSG editorial content
  finds/[slug]/  best/[slug]/  for/[slug]/  under/[amount]/   Programmatic GEO pages (commercial-intent)
  api/
    canva/oauth/start|callback · canva/status · canva/webhook    Canva OAuth + pipeline trigger
    opportunities/ingest|latest                                   WF-06 report in/out
    pinterest/published                                           WF-04 published-pin log in/out
components/                  ~35 React components (CinematicHero, BeachVideo, ProductCard,
                             ProductGrid, JsonLd, Reveal, ScrollProgress, Cursor, Footer, …)
data/                        SOURCE OF TRUTH (flat JSON) — see §5
  csv/  imports/             raw CSV inputs for the import scripts
  canva/  opportunities/     runtime write targets (.gitkeep; gitignored content)
lib/
  site.js                    Site config: name, url, nav, social, editor, stats, FAQs
  seo.js                     JSON-LD builders (Organization, Person, WebSite, Product, …)
  products.js                Data helpers (load/filter products, categories, posts)
  types.ts                   Ambient JSDoc/TS types only
  canva/                     Canva Connect API client (config, oauth, token-store, client,
                             assets, brand-templates, autofill, exports, index)
  pin-pipeline/              Pin generation (templates, generate, csv-export, index)
scripts/
  extract-amazon-images.mjs  import:images
  import-products.mjs        import:products
  generate-pinterest-pins.mjs  generate:pins
  canva/*.mjs                canva:test-auth | list-templates | csv | generate
n8n/
  build-*.js                 Builders that GENERATE the workflow JSON (source of truth)
  workflows/*.json           Generated, importable n8n workflows
  scripts/*.mjs              n8n MCP / probe helpers
  README.md  .env.example    n8n stack docs + env template
docs/
  CANVA_INTEGRATION.md       Full Canva setup + pipeline guide
  n8n-architecture.md        Full 7-workflow control-plane design
.kiro/
  skills/                    READ-ONLY skill library (marketing, geo-*, n8n-*, schema, …)
  steering/skills-policy.md  Policy: skills are read-only
  specs/pinterest-pin-production-system/   requirements.md · design.md · tasks.md (0/12 done)
GEO-AUDIT-REPORT.md          Pre-launch audit (score 54 real / 64 projected; 30-day plan)
README.md                    Original site README (predates the automation system)
```

### 4.3 Webhook / auth contract
Every site-side API route is guarded by a shared secret or bearer token read from env:
- `/api/canva/webhook` — header `x-canva-pipeline-secret: <CANVA_WEBHOOK_SECRET>`
- `/api/opportunities/ingest` — `Authorization: Bearer <OPPORTUNITY_INGEST_TOKEN>`
  (fallback header `x-opportunity-token`)
- `/api/pinterest/published` (POST) — bearer-auth'd, idempotent on `pinId`
- **Vercel read-only FS:** write routes degrade to `{ ok:true, persisted:false }` so n8n
  knows the payload was received/validated even when disk isn't writable. Long-term fix:
  GitHub Contents API commit or Vercel KV/Postgres.

---

## SECTION 5 — DATA MODEL  [ANCHOR:data-model]

All data is flat JSON in `data/`. The site reads it at build/serve time.

### `data/products.json` (10 products today)
```jsonc
{
  "id": "slugified-brand-title-001",      // stable key; used everywhere
  "title": "Cleaned display title",
  "originalTitle": "Raw Amazon title",     // often French (source marketplace = amazon.fr)
  "description": "Editorial 1–2 sentence pitch",
  "brand": "MOMOMUS",
  "price": 24.99,
  "rating": { "value": 4.5, "count": 50 },  // editorial placeholder until real reviews
  "category": "beach-essentials",           // FK → categories.json
  "tags": ["trending", "tiktok", "under-25"],
  "image": "https://m.media-amazon.com/images/I/....jpg",
  "imageSource": "amazon",
  "asin": "B0BZQNSJHN",                     // may be null
  "affiliateUrl": "https://amzn.to/xxxx",   // short affiliate link
  "source": "products-2026-05-28.csv",
  "importedAt": "2026-05-28T19:38:14.143Z",
  "editorial": false
}
```
- **Other data files:** `categories.json`, `posts.json` (blog), `guides.json`,
  `bundles.json`, `collections.json` (385 lines — drives programmatic pages),
  `pinterest-pins.json` (**1573 lines — pins already generated** by WF-02 / generate:pins),
  `pinterest-published.json` (**empty — nothing published yet**).
- **Pin record schema** (in `pinterest-pins.json`): `formulaId`, `formulaLabel`,
  `aspectRatio`, `boardSuggestion`, `link`, `sourceImage`, `textOverlay`,
  `secondaryStickers`, `canvaPrompt`, `imagePrompt`, `lifestylePrompt`, `description`,
  `hashtags`, `cta`, `ctrLevers`, `id`, `batch`.
- **JSON-LD builders** (`lib/seo.js`): `organizationLd`, `personLd` (Lina Reyes),
  `websiteLd`, plus product/itemList/breadcrumb/blogPosting/faqPage/collectionPage
  builders consumed by `components/JsonLd.js`. `sameAs` is omitted while social handles
  are `null` (deliberate — half-true `sameAs` breaks entity resolution).

---

## SECTION 6 — CONVENTIONS & STANDARDS

- **Data flow:** edit/generate `data/*.json` → site rebuilds. Never hardcode product data in components.
- **Secrets:** always via `process.env`, accessed through a config module
  (pattern: `lib/canva/config.js` → `getCanvaConfig()` + `assertCanvaCredentials()`). Never inline.
- **n8n:** edit `n8n/build-<name>.js`, run `node n8n/build-<name>.js`, re-import JSON.
  The builder is the source of truth, not the JSON. Every HTTP node: `retryOnFail:3`,
  ~3s backoff, `neverError:true`; iterate with `SplitInBatches` +
  `$getWorkflowStaticData('global')`; read secrets from `$env`.
- **Git:** branch + PR always; never push to `main`. Conventional Commits
  (`feat(api): …`, `chore(sync): …`, `docs(handoff): …`). n8n's site-publisher commits
  to `auto/site-update-<timestamp>` and opens a PR.
- **Schema/SEO:** every new page type ships JSON-LD; keep blocks intact.
- **Naming:** product `id` is the slugified `brand + title + NNN`; pin export filenames
  (per the PPPS spec) follow `PC-###__PS-XXX__CT-XXX-###__YYYY-MM-DD__v#.png`.
- **Skills:** read-only; activate for guidance, fork to modify (see `skills-policy.md`).

---

## SECTION 7 — ARCHITECTURE DECISION RECORDS (ADRs)

### ADR-001: File-based JSON data layer (no database)
- **Status:** Accepted
- **Context:** Solo operator, pre-launch, small catalog (10 SKUs).
- **Decision:** Keep all data in `data/*.json`, regenerable from CSV via import scripts.
- **Consequences:** + zero cost, git history, instant rebuilds. − Vercel runtime FS is
  read-only, so ingest endpoints can't persist there without GitHub Contents API / KV.
- **Revisit when:** catalog > ~500 SKUs, or multiple concurrent editors.

### ADR-002: n8n is the conductor, the repo owns the logic/data
- **Status:** Accepted
- **Context:** Avoid business logic rotting inside n8n Code nodes.
- **Decision:** n8n only schedules, retries, calls AI, and POSTs to the site's API.
  Heavy logic lives in `lib/*`; workflows are generated by `n8n/build-*.js`.
- **Consequences:** + portable, testable, reviewable. − two places to wire env vars.

### ADR-003: Two Canva paths (Enterprise autofill + free CSV)
- **Status:** Accepted
- **Context:** Brand Templates + Autofill require Canva Enterprise.
- **Decision:** Ship both — full Connect API automation (`canva:generate`) and a free
  Bulk-Create CSV path (`canva:csv`) using identical field names.
- **Consequences:** + not blocked by plan tier. − two code paths to maintain.

### ADR-004: GEO/AI-citability is a first-class constraint
- **Status:** Accepted
- **Context:** Organic moat = being cited by AI answer engines.
- **Decision:** SSR/SSG only, full JSON-LD, `llms.txt`, programmatic commercial-intent
  pages (`/finds`, `/best`, `/for`, `/under`), named author (Lina Reyes) for E-E-A-T.
- **Consequences:** + strong schema score (90/100). − content depth still required (H1).

### ADR-005: Pinterest publishing is throttled and approval-gated
- **Status:** Accepted
- **Context:** Pinterest API is approval-only; new accounts get rate-limited/flagged.
- **Decision:** Ramp `PINS_PER_RUN` (5 → 10 → 15-25); until API access exists, stage pins
  to CSV for manual Bulk Create.
- **Consequences:** + account safety. − publishing is not yet automated.

---

## SECTION 8 — CURRENT STATE SNAPSHOT  [ANCHOR:state]

**Snapshot date:** 2026-05-30 · **Branch with everything:** `sync/full-local-state-2026-05-30`
(based on `geo-upgrade-finds-pages`). `main` only has the initial commit.

#### ✅ DONE & verified (in code)
- Next.js site: homepage, categories, blog, guides, about/disclosure/privacy, 10 products.
- Programmatic GEO pages: `/finds/[slug]`, `/best/[slug]`, `/for/[slug]`, `/under/[amount]`.
- SEO surfaces: `sitemap`, `robots`, `manifest`, dynamic OG image, `llms.txt`, `humans.txt`.
- Schema: Organization, Person (Lina Reyes), WebSite, Product, ItemList, Breadcrumb,
  BlogPosting, FAQPage, CollectionPage.
- Canva pipeline code: full `lib/canva/*` + `lib/pin-pipeline/*` + `app/api/canva/*` + `scripts/canva/*`.
- n8n: 6 workflows authored + committed (WF-01, WF-02, WF-04, WF-04b, WF-04c, WF-06) with builders.
- API routes: `/api/canva/*`, `/api/opportunities/{ingest,latest}`, `/api/pinterest/published`.
- Pins generated: `data/pinterest-pins.json` (1573 lines).
- Product import ran once on the 2026-05-28 batch (`content/cache/amazon-images.json`).
- `lib/site.js`: domain set to `summerfindslab.com`, social = null, editor persona scaffolded.

#### 🟡 IN PROGRESS / built-but-not-live
- **Amazon Associates:** products have `affiliateUrl`, but verify the real Associates tag
  and account approval. README still references `YOUR-AFFILIATE-ID`.
- **Canva:** code complete; `.env.example` keys empty → not OAuth-connected. Free CSV path works.
- **Pinterest publishing:** workflows ready; need `PINTEREST_ACCESS_TOKEN` (approval-gated)
  + a hosted n8n. `pinterest-published.json` is empty.
- **GEO audit fixes:** done = C1 (domain), C2 (llms.txt), C3 (social null), H2 (author),
  H7/M5 (programmatic pages). Pending = H1 (800-word posts), H4 (aggregateRating),
  H5 (above-fold disclosure), remove fake press strip, most M-tier.

#### 🔴 BROKEN / KNOWN ISSUES
- See §11 Failure Log. Headline: Vercel read-only FS for ingest; WF-01 field-name mismatch.

#### ▪ NOT STARTED
- Deploy to Vercel + custom domain.
- Host n8n + create credentials + first real end-to-end run.
- New ingest endpoints WF-01/WF-02 need: `/api/products/upsert`, `/api/products/import`,
  `/api/pins/ingest`, `/api/health`, `/api/pins/queue`, `/api/pins/mark-published`.
- WF-03 Canva Materializer (3 nodes), WF-05 analytics loop.
- The PPPS spec deliverables: **0 of 12 task groups done.**

#### 🧠 Last-session context
- Most recent commit `54f6b94` synced all local work (incl. `.env.example`, n8n, specs,
  Canva, API routes) to the remote so a parallel AI session could read it.
- Immediately before: GEO upgrade (programmatic pages) + n8n stack authoring.

---

## SECTION 9 — TASK QUEUE (PRIORITIZED)

| ID | Task | Pri | Blocked by | Acceptance criteria |
|---|---|---|---|---|
| T-01 | Remove fake "As seen in" press strip + invented review counts | P0 | — | No unearned authority claims anywhere; FTC-clean |
| T-02 | Confirm/insert real Amazon Associates tag in all `affiliateUrl`s | P0 | Associates approval | Links carry the live tag; outbound click tracked |
| T-03 | Add above-the-fold affiliate disclosure (audit H5) | P0 | — | Visible disclosure near first affiliate link on every page |
| T-04 | Deploy to Vercel + point `summerfindslab.com` | P0 | T-01..T-03 | Live site at the real domain; metadata resolves |
| T-05 | Expand 3 blog posts to 800+ words, author byline (H1/H6) | P1 | — | `articleBody`/`wordCount` in JSON-LD; named author |
| T-06 | Add `aggregateRating` to `productLd` (H4) | P1 | — | Product schema emits editorial rating |
| T-07 | Add ingest endpoints (`/api/products/upsert`, `/api/pins/ingest`, `/api/health`) | P1 | T-04 | n8n can write back via GitHub Contents API |
| T-08 | Host n8n + credentials; run WF-06 (opportunity intel) manually | P1 | T-07 | `data/opportunities/latest.json` populated |
| T-09 | Align WF-01 output schema with `products.json` field names | P1 | T-07 | `sku/image_url` → `id/image/affiliateUrl/rating` |
| T-10 | Get Pinterest API access; run WF-04c (boards) then WF-04 (publish, 5/run) | P2 | API approval | First pins in `pinterest-published.json` |
| T-11 | Execute the PPPS spec (9 deliverables + checks) | P2 | — | `npm run check:ppps` → "OK"; tasks.md checked off |
| T-12 | WF-03 Canva Materializer + WF-05 analytics loop | P3 | T-08, T-10 | Closed discovery→publish→analytics loop |

**Definition of Done (every task):** SSR/SSG preserved · JSON-LD intact · no secrets in git ·
on a branch with a PR · §8 + §11 updated.

---

## SECTION 10 — SKILL TRANSFER (learned patterns & preferences)

- **Language:** chat is bilingual (Moroccan Darija + English); mirror the user. Docs/code/commits in English.
- **Verbosity:** concise; answer/code first, then a short why. No filler, no "Certainly!".
- **Autonomy:** Autopilot for reversible edits; propose-then-confirm for money/deploy/publish/stack.
- **The user values:** honesty over hype (note the audit reports BOTH the literal score 54 and
  the projected 64). Keep that honesty — no fake metrics, no fake authority.
- **Patterns the project likes:** generated-not-handwritten n8n workflows; two-path resilience
  (Enterprise + free fallback); idempotent endpoints; graceful degradation on read-only hosts.
- **Patterns rejected:** business logic inside n8n Code nodes; hardcoded secrets; direct pushes to main;
  client-only rendering; removing JSON-LD for performance.

---

## SECTION 11 — FAILURE LOG  [ANCHOR:failures]

| # | Issue | Root cause | Fix / status | Prevention |
|---|---|---|---|---|
| 1 | Ingest endpoints can't persist on Vercel | Vercel runtime FS is read-only | Routes return `persisted:false` gracefully; TODO commit via GitHub Contents API or KV | Don't assume disk writes in serverless |
| 2 | WF-01 payload doesn't match `products.json` | WF-01 uses `sku`/`image_url`; site uses `id`/`image`/`affiliateUrl`/`rating` | T-09 pending — fix `Structure Affiliate Output` after ingest endpoint exists | Keep one canonical product schema (this doc §5) |
| 3 | Canva Brand Templates 401 | Autofill needs Canva Enterprise | Use `npm run canva:csv` free Bulk-Create path | ADR-003 dual path |
| 4 | Pinterest publishing not possible yet | API access is approval-only; no token | Stage to CSV; ramp `PINS_PER_RUN` once approved | ADR-005 throttle |
| 5 | Canonical URL leaked `example.com` everywhere | placeholder domain in `lib/site.js` | Fixed → `summerfindslab.com` (audit C1) | One domain constant feeds all metadata |
| 6 | Fake "As seen in" press strip | aspirational copy in hero | T-01 — must remove before launch | No unearned authority claims (FTC) |
| 7 | OAuth `state_mismatch` on Canva callback | start-cookie expires after 10 min | Re-hit `/api/canva/oauth/start` | Documented in `docs/CANVA_INTEGRATION.md` §7 |

---

## SECTION 12 — ENVIRONMENT & SETUP

### Local dev
```bash
npm install
npm run dev            # http://localhost:3000
npm run build && npm start
npm run lint
```
### Data + pin scripts
```bash
npm run import:images   # extract-amazon-images.mjs
npm run import:products # import-products.mjs
npm run import:all      # both
npm run generate:pins   # data/pinterest-pins.json
npm run canva:test-auth # verify Canva OAuth
npm run canva:csv       # free Bulk-Create CSV
npm run canva:generate -- --formula=price-tag-find --limit=5   # Enterprise path
```
### Env vars (templates only in git)
- **Site/Canva** → `.env.example` → copy to `.env.local`:
  `NEXT_PUBLIC_SITE_URL`, `CANVA_CLIENT_ID/SECRET`, `CANVA_REDIRECT_URI`,
  `CANVA_TOKEN_STORE`, `CANVA_WEBHOOK_SECRET`, `OPPORTUNITY_INGEST_TOKEN`, …
- **n8n** → `n8n/.env.example` (set in n8n → Settings → Variables):
  `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `FIRECRAWL_API_KEY`, `PINTEREST_ACCESS_TOKEN`
  (scopes: `boards:read pins:read pins:write user_accounts:read`),
  `PRODUCTS_JSON_URL`, `PINS_INGEST_URL/TOKEN`, `OPPORTUNITY_INGEST_URL/TOKEN`,
  `PUBLISHED_LOG_URL`, `PUBLISHED_INGEST_URL/TOKEN`, `PIN_PUBLISH_WEBHOOK_SECRET`,
  `PINS_PER_RUN`, `PINTEREST_DEFAULT_BOARD_ID`.
- **Canva setup:** see `docs/CANVA_INTEGRATION.md`. **n8n setup:** see `docs/n8n-architecture.md` + `n8n/README.md`.

### Deploy
- Vercel auto-detects Next.js. After deploy: set domain, confirm `lib/site.js#url`,
  insert real Associates tag, set env vars.

---

## SECTION 13 — REASONING TEMPLATES (how to think)

- **New feature:** check §1 alignment → §3 deps → §7 ADRs → update §5 if data changes →
  add to §9 → implement → update §8.
- **Bug fix:** reproduce → check §11 (known?) → find root cause (not symptom) → fix →
  add to §11.
- **n8n change:** edit `build-*.js` → regenerate JSON → validate (n8n-validation-expert
  skill) → re-import → never hand-edit JSON as source of truth.
- **Anything touching money/deploy/publish/stack:** stop, propose, get confirmation,
  consider an ADR.

---

## SECTION 14 — GLOSSARY

- **GEO:** Generative Engine Optimization — being cited by AI answer engines (ChatGPT,
  Perplexity, Google AI Overviews).
- **Operator:** the non-designer human running the site + pin production.
- **PPPS:** Pinterest Pin Production System — the documentation spec under
  `.kiro/specs/pinterest-pin-production-system/` (9 markdown deliverables + integrity checks).
- **Formula / Pin Style:** a reusable visual template for a pin (10 formulas mirror
  `lib/pin-pipeline/templates.js`).
- **WF-0x:** an n8n workflow (see §4.1 and `n8n/README.md`).
- **Thumbnail Zone:** top 40% of a pin (visible in the Pinterest feed crop).
- **E-E-A-T:** Experience, Expertise, Authoritativeness, Trust (Google quality signals).

---

## SECTION 15 — OPEN QUESTIONS / RISKS

- Is an n8n instance actually hosted/connected yet, or only workflow JSON in the repo? (confirm)
- Amazon Associates account approval status + the real tag value?
- Pinterest API access — applied / approved?
- Persistence choice for ingest on Vercel: GitHub Contents API vs Vercel KV vs Supabase?
- The `sync/full-local-state-2026-05-30` branch is a handoff branch — decide its fate
  (merge the real work into a clean branch; never leave secrets in long-lived history).

---

## SECTION 16 — ACTIVE RECALL QUIZ (pass before working)

1. What is the project and its primary success metric? (§1)
2. What is the source of truth for data, and why not a DB yet? (§5, ADR-001)
3. Where does business logic live vs n8n? (ADR-002)
4. Name the 6 n8n workflows and what each does. (§4.1, `n8n/README.md`)
5. Why must you never push to `main`? What do you do instead? (§0.2, §6)
6. What are the two Canva paths and when do you use each? (ADR-003)
7. Which audit fixes are done vs pending? (§8)
8. What is the next P0 task? (§9)
9. Name two entries in the Failure Log. (§11)
10. What language do you reply in, and what stays English? (§0.1)

---

## SECTION 17 — DOCUMENT MAINTENANCE

- Update §8 (Current State) and §11 (Failure Log) at the end of every session.
- Add an ADR to §7 for any stack/architecture decision.
- Bump the header version on any major update (vMAJOR.MINOR).
- **Session-end ritual (paste into your commit/PR or here):**
  ```
  Session date:
  Branch / PR:
  Done this session:
  Now broken / discovered:
  Next task (id from §9):
  ```
