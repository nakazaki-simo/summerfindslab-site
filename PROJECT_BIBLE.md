# PROJECT BIBLE — Summer Finds Lab Daily

> Last updated: 2026-05-31 | Document version: v1.6 | Maintainer: Project owner (solo operator)
>
> Canonical source of truth for any AI or human continuing this project. If this
> document and the code ever disagree, the **code wins** — then update this file.

---

## 0. AI HANDOFF PROTOCOL (READ THIS FIRST)

**Mission (one paragraph).** Summer Finds Lab Daily is a self-feeding affiliate
engine. An AI pipeline (n8n + Claude + Firecrawl) discovers trending summer
products, turns each into GEO-optimized site pages and high-CTR Pinterest pins,
and publishes them on near-autopilot, so the site earns Amazon Associates
commissions and AI-citation visibility with minimal manual work. The website is
a statically-generated Next.js 14 app on Vercel; all business data lives in
git-tracked `data/*.json` files; n8n is the conductor that never owns data.

**If you are an AI reading this for the first time, do these 5 steps:**

1. Read this entire file, then read `README.md`, `docs/n8n-architecture.md`,
   `n8n/README.md`, and `GEO-AUDIT-REPORT.md`. Skim `lib/types.ts` (canonical
   data schema), `lib/site.js` (site config), and `lib/products.js` (data helpers).
2. Run `git branch -a` and `git log --oneline -12`. Understand that **`main` is
   stale** and the entire upgrade lives on `geo-upgrade-finds-pages`. See
   `[ANCHOR:branch-state]`.
3. Read the Current State Snapshot (§8) and the Task Queue (§9). Pick the
   highest-priority unblocked task.
4. Confirm communication + autonomy rules (§0 below and §10) before acting.
5. Before any credential, deploy, paid-API, or Pinterest-publish action, STOP
   and confirm with the owner (see autonomy rules).

**Communication style the owner prefers.**
- **Docs / code / commits / this file:** English only.
- **Chat:** bilingual — Moroccan Darija + English. Mirror whatever language the
  owner uses in their message.
- **Tone:** concise and direct. Code/answer first, then a short "what changed + why".
  Reasoning only when proposing a structural or irreversible change.

**What the owner expects (autonomy level).**
- Runs Kiro in **Autopilot**. Default to **act-first-then-report** for: editing
  existing files, content, JSON data, Tailwind, JSON-LD, GEO fixes, generating
  pins, running build scripts, authoring spec deliverables.
- Switch to **propose-then-confirm** for: anything touching live credentials,
  deploying, calling a paid API for real (Claude/Firecrawl/Canva at volume),
  publishing real pins to Pinterest, changing the tech stack, or editing
  `lib/site.js` / `next.config.mjs` metadata.
- **Hard "ask first" rules:** before installing any npm dependency; before
  pushing to `main` (always branch + PR); before publishing real pins to a live
  Pinterest account; before any real paid-API batch run (cap max items, dry-run
  first); before deleting files or blocks > 10 lines; before editing
  `.kiro/skills/<skill>/` (skills are read-only — fork under a new name instead);
  never commit real secrets to a long-lived branch.

---

## 1. PROJECT IDENTITY

- **Name:** Summer Finds Lab Daily
- **Package name:** `summer-finds-lab-daily`
- **Tagline:** "Daily drops of trending summer must-haves."
- **Elevator pitch:** A Pinterest-style Amazon affiliate site that curates
  trending summer products (gadgets, beach gear, viral TikTok finds, aesthetic
  room upgrades, travel accessories). An AI automation layer discovers products,
  writes the pages and pins, and distributes them — turning Pinterest reach and
  AI-citation visibility into affiliate clicks.

**Problem it solves.** Most affiliate sites publish seasonal lists once and let
them rot. This project keeps a tightly-scoped summer catalog fresh daily and
engineers every artifact (page + pin) for two things: Pinterest distribution and
AI citability — the two channels that drive qualified outbound clicks to Amazon.

**Target users / personas.**
- **End audience:** mobile-first Pinterest browsers shopping for summer products
  on impulse and intent ("beach essentials," "TikTok finds under $25").
- **Operator (internal persona):** a non-designer producing Pinterest pins in
  Canva using the PPPS documentation (see Glossary).
- **AI crawlers** (Anthropic, OpenAI, Perplexity, Google AI Overviews) as a
  first-class "reader" — the site is built to be cited by them (GEO).

**Success metrics.**
- **Primary:** monthly **outbound clicks to Amazon** (Amazon Associates
  dashboard). Closest leading indicator to revenue.
- **Secondary:** **pins published per week + Pinterest outbound clicks**
  (top-of-funnel that feeds the primary). Tracked via
  `data/pinterest-published.json` + Pinterest analytics (WF-04 / future WF-05).
- **Deliberately NOT** optimizing for raw pageviews. Distribution (Pinterest)
  and citability (GEO) drive qualified outbound clicks.

**Non-goals (what this project is explicitly NOT).** See §5 for full detail.
- Not multi-season. **Strictly summer for v1.**
- Not a store. Every product opens on Amazon; we hold no inventory.
- Not a database app (v1). File-based JSON only.
- Not a TypeScript rewrite of existing `.js`.
- Not client-rendered. SSR/SSG only (GEO constraint).

---

## 2. VISION & ROADMAP

**Long-term vision.** A largely autonomous content engine: discover → enrich →
generate pages + pins → publish → measure → feed insights back into discovery,
with the human only approving, curating, and handling credential-gated steps.

**Milestones.**
- **MVP (now → launch):** GEO-upgraded site live on a real domain; 10–50
  products; pins generated; first manual Pinterest publishing via CSV bulk upload.
- **v1 (automation wired):** n8n workflows live in Cloud; GitHub Contents API
  write-back working; opportunity intelligence running daily; Pinterest API
  publishing (WF-04) once approved.
- **v2 (scale + feedback loop):** analytics loop (WF-05) feeding pin/product
  scoring; catalog > ~500 SKUs triggers a DB decision; possible sister brand for
  other seasons on a separate subdomain.

**Current milestone:** **"Pre-launch GEO upgrade + automation wiring."** Two
parallel tracks: (1) GEO upgrade (programmatic pages, llms.txt, editor persona,
collections); (2) Automation (n8n stack + Canva pipeline built, now hosting +
secrets + first end-to-end run).

**Out-of-scope items (v2-only or later):** other seasons; a database; Canva
Enterprise Autofill at launch; paid analytics SaaS; any SaaS > ~$20/mo/service
without an explicit decision.

---

## 3. TECH STACK (with rationale per choice)

| Layer | Choice | Version | Why (over alternatives) |
|---|---|---|---|
| Framework | Next.js (App Router) | 14.2.35 | SSR/SSG for AI-crawler readability (load-bearing GEO constraint); file-based routing; first-class Vercel deploy. Chosen over CRA/Vite (no SSR) and Astro (team already fluent in React/Next). |
| UI runtime | React | 18.3.1 | Next 14 peer; stable. |
| Styling | Tailwind CSS | 3.4.6 | Utility-first, fast iteration, tiny runtime. Brand tokens (`cream`, `peach`, `sand`, `ink`) in `tailwind.config.js`. |
| Animation | `motion` (Framer Motion successor) | 11.11.17 | Cinematic hero, reveals; respects `prefers-reduced-motion`. |
| Smooth scroll | `lenis` | 1.1.20 | Premium scroll feel; gated by reduced-motion. |
| Fonts | `next/font/google` — Inter + Playfair Display | — | Self-hosted at build; Inter = body, Playfair = display. Zero layout shift. |
| Language | JavaScript (`.js` / `.mjs`) | ES2022+ | Ship velocity. `tsconfig.json` + `lib/types.ts` are **ambient types only** — no TS rewrite (ADR-005). |
| Data store | Flat JSON in `data/*.json` (+ CSV imports) | — | Zero infra cost, git-tracked history, instant Vercel rebuilds, pipelines already treat JSON as source of truth (ADR-001). |
| Hosting | Vercel | — | Auto-deploy on git push; edge OG images; free tier. Production branch = `main`. |
| Automation | n8n **Cloud** (`summerfindslabdaily.app.n8n.cloud`) | — | Managed, zero ops, reachable by Kiro via MCP (ADR-007, supersedes earlier Docker plan). |
| AI (content) | Anthropic Claude (`claude-opus-4-20250514` default) | — | Quality for content gen; cheaper model for high-volume tasks is an open ADR-006 decision. |
| Trend discovery | Firecrawl (`/v2/scrape`) | — | Pinterest Trends + Amazon Movers & Shakers have no affordable official API (ADR-008). |
| Pin design | Canva — **free CSV path** for v1 | — | Brand Templates/Autofill need Canva Enterprise (no budget). OAuth/Autofill code exists as future-proofing (ADR-003). |
| Image hosting | Amazon CDN (`m.media-amazon.com`) + Unsplash/Pexels/Picsum | — | Configured in `next.config.mjs > images.remotePatterns`. |
| Lint | ESLint + `eslint-config-next` | 8.57.0 | Next defaults. |
| Tests | None yet | — | PPPS spec will add `vitest` + `fast-check` (optional tasks). No test framework installed today. |
| CI/CD | Vercel git-push auto-deploy | — | No `vercel.json`, no deploy hook wired (ADR-002). |

**Dependency philosophy:** minimal. Production deps are only `lenis`, `motion`,
`next`, `react`, `react-dom`. Do not add dependencies without owner approval.

---

## 4. ARCHITECTURE

### 4.1 High-level diagram

```
                         ┌────────────────────────────────────────────┐
                         │            n8n CLOUD (conductor)             │
                         │  WF-01 import · WF-02 pins · WF-06 oppty ·   │
                         │  WF-04/04b/04c Pinterest publish/boards      │
                         └───────────────┬──────────────────────────────┘
            HTTPS + bearer/secret        │            ┌─ Firecrawl (trends)
        ┌────────────┬───────────────────┼────────────┼─ Anthropic Claude (copy)
        ▼            ▼                    ▼            └─ Pinterest /v5 (publish)
   GitHub repo   Next.js site        Canva API
   data/*.json   (Vercel, SSG)       (Connect, future)
   (PR-based      ▲   │
    write-back)   │   └─ /api/* ingest + webhook endpoints (bearer/secret auth)
        └─────────┘      └─ writes degrade to persisted:false on Vercel (read-only FS)
```

### 4.2 Folder / module structure

```
summerfindslab-site/
├─ app/                         # Next.js App Router
│  ├─ layout.js                 # Root: fonts, metadata, Org+WebSite JSON-LD, chrome
│  ├─ page.js                   # Homepage (hero, comparison, bundles, feeds, FAQ)
│  ├─ globals.css               # Tailwind + custom styles
│  ├─ sitemap.js · robots.js · manifest.js · opengraph-image.js · not-found.js
│  ├─ llms.txt/route.js         # GEO: AI-crawler site summary (C2 fix)
│  ├─ humans.txt/route.js       # GEO: humans.txt signal
│  ├─ trending/ under-25/ tiktok-finds/ categories/ about/ disclosure/ privacy/
│  ├─ category/[slug]/          # SSG category pages
│  ├─ blog/ + blog/[slug]/      # Blog index + posts
│  ├─ guides/ + guides/[slug]/  # Editor-tested buying guides
│  ├─ finds/[slug]/             # NEW: programmatic product detail pages (id = slug)
│  ├─ best/[slug]/  for/[slug]/  under/[amount]/   # NEW: programmatic GEO roundups
│  └─ api/                      # Route handlers (Node runtime, force-dynamic)
│     ├─ canva/oauth/{start,callback}/  canva/status/  canva/webhook/
│     ├─ opportunities/{ingest,latest}/
│     └─ pinterest/published/
├─ components/                  # ~30 PascalCase React components
├─ data/                        # SOURCE OF TRUTH (flat JSON)
│  ├─ products.json (10) · categories.json (7) · bundles.json · collections.json
│  ├─ guides.json · posts.json · pinterest-pins.json (generated) ·
│  ├─ pinterest-published.json (empty) · canva/ · csv/ · opportunities/
├─ lib/
│  ├─ site.js                   # siteConfig (name, url, nav, editor, faqs, stats)
│  ├─ products.js               # ALL data access helpers (getX / getXBySlug)
│  ├─ seo.js                    # JSON-LD builders (organizationLd, productLd, …)
│  ├─ types.ts                  # CANONICAL schema (ambient types only)
│  ├─ canva/                    # Canva Connect config + OAuth + export pipeline
│  └─ pin-pipeline/             # Pin generation (templates, generate.js, csv-export)
├─ scripts/                     # *.mjs: extract-amazon-images, import-products, generate-pins, canva/*
├─ n8n/                         # Workflow builders + exported JSON (see §4.5)
├─ docs/                        # CANVA_INTEGRATION.md, n8n-architecture.md
├─ .kiro/                       # specs/ steering/ skills/ settings/ (Kiro config)
├─ GEO-AUDIT-REPORT.md          # Pre-launch GEO audit (score 54 literal / 64 projected)
└─ next.config.mjs              # images.remotePatterns + security headers()
```

### 4.3 Data flow (request → response lifecycle)

- **Reads (site):** `data/*.json` is imported at build time by `lib/products.js`
  helpers → consumed by server components → SSG/SSR HTML + JSON-LD. No client
  data fetching for product data.
- **Writes (automation):** n8n → `POST /api/*/ingest` (bearer/secret auth) →
  endpoint attempts `fs.writeFile`. On Vercel the FS is read-only, so it returns
  `{ ok:true, persisted:false }`. **Durable write-back is not yet implemented**
  (see `[ANCHOR:write-back]` / ADR-001 resolution).
- **Pin generation:** `POST /api/canva/webhook` (`x-canva-pipeline-secret`) →
  `lib/pin-pipeline/generate.js` over `data/pinterest-pins.json` + `products.json`.

### 4.4 External integrations / APIs

| Integration | Used for | Auth | Status |
|---|---|---|---|
| Amazon Associates | Affiliate links (`amzn.to` shortlinks in products) | tag in URL | Links present; approval status `[TO BE FILLED BY USER]` |
| Pinterest API v5 | Programmatic pin publishing | `PINTEREST_ACCESS_TOKEN` (approval-only) | Not live |
| Canva Connect | Pin autofill/export | OAuth PKCE (`lib/canva`) | Built, not connected; CSV path used for v1 |
| Anthropic Claude | Content + pin-copy generation | `ANTHROPIC_API_KEY` | Used by n8n WF-01/02/06 |
| Firecrawl | Trend scraping (Pinterest/Amazon) | `FIRECRAWL_API_KEY` | Wired in WF-06 |
| GitHub Contents API | Future write-back of `data/*.json` | PAT (`repo`) | Decided (ADR-001), not implemented |
| Vercel | Hosting/deploy | git push | Live (stale `main`) |

### 4.5 n8n workflow inventory (authored, committed as JSON)

| ID | File | Trigger | Job |
|---|---|---|---|
| WF-01 | `affiliate-product-pipeline.json` | manual | Product enrichment via Claude → website ingest. **Schema mismatch bug** (see §11). |
| WF-02 | `pinterest-pin-generator.json` | manual | N pin variants/product → `pinterest-pins.json` schema. |
| WF-06 | `opportunity-intelligence.json` | schedule 06:00 UTC + manual | Firecrawl trends + score products 0–100 → daily report → `/api/opportunities/ingest`. |
| WF-04 | `pinterest-publisher.json` | schedule 09:00 UTC + manual | Publish queued pins to Pinterest /v5, throttled (5/day cold start). |
| WF-04b | `pinterest-publish-pin.json` | webhook | Single-pin publish (called when a render is ready). |
| WF-04c | `pinterest-boards-helper.json` | manual + webhook | Validate token, list boards, persist board map. |

Builders (`n8n/build-*.js`) are the **source of truth**; edit the builder, run
it, re-import JSON. Never hand-edit the JSON as the canonical change.

### 4.6 Authentication & authorization model

- **Site API routes:** each route validates one shared secret. Two patterns in
  use, both canonical:
  - **Bearer token:** `Authorization: Bearer <TOKEN>` (with `x-*-token`
    fallback). Example: `/api/opportunities/ingest` → `OPPORTUNITY_INGEST_TOKEN`.
  - **Custom header secret:** `x-canva-pipeline-secret: <SECRET>`. Example:
    `/api/canva/webhook` → `CANVA_WEBHOOK_SECRET`.
- **Canva:** OAuth (PKCE) tokens belong to the studio user, stored at
  `data/canva/tokens.json` (gitignored). The webhook secret authorizes
  automation to *use* that connection; they rotate independently.
- **No user accounts.** The site is read-only public content; there is no
  end-user auth surface.
- **Secrets:** all read from `process.env` (see `lib/canva/config.js` pattern).
  Never hardcode. Every webhook is shared-secret authed.

### 4.7 Dependency graph (module level)

```
app/* (pages)
  └─ lib/products.js ── data/*.json
  └─ lib/seo.js ─────── lib/site.js
  └─ components/* ───── lib/site.js, lib/products.js
app/api/canva/* ─────── lib/canva/config.js ── lib/pin-pipeline/generate.js
app/api/opportunities/* ─ node:fs (degrades on Vercel)
n8n/build-*.js → n8n/workflows/*.json → (HTTP) → app/api/* + external APIs
scripts/*.mjs → data/*.json (+ content/cache, content/imports)
```

---

## 5. DATA MODEL

Canonical schema lives in **`lib/types.ts`** (ambient types; `products.json`
conforms exactly). `[ANCHOR:data-schema]`

### 5.1 Product (canonical)

```ts
interface Product {
  id: string;              // also the /finds/[slug] slug — stable across re-imports
  title: string;
  originalTitle?: string;
  description: string;
  editorNote?: string;
  brand: string;
  price: number;
  rating?: { value: number; count: number };
  category: CategorySlug;  // see enum below
  tags: ProductTag[];      // "trending" | "tiktok" | "under-25" | "viral"
  image: string;
  imageSource: "amazon" | "curated" | "manual";
  asin?: string | null;
  affiliateUrl: string;    // amzn.to shortlink or full ?tag= URL
  source?: string;
  importedAt?: string;
  editorial: boolean;      // when true, re-imports will NOT overwrite this row
}
```

### 5.2 Category taxonomy — FINAL (not aspirational)

`CategorySlug` is fixed and matches `data/categories.json` one-to-one. All
workflows + content MUST use these exact slugs:

```
summer-gadgets · beach-essentials · tiktok-finds · aesthetic-room ·
travel · skincare-summer · pet-summer
```

**Coverage caveat (verified 2026-05-30):** 10 products populate 6 categories
(`beach-essentials, travel, summer-gadgets, skincare-summer, aesthetic-room,
pet-summer`). **`tiktok-finds` currently has 0 products** despite being a nav
item and a homepage section — fill it or the section renders empty.
Tags in use: `trending, tiktok, under-25` (`viral` is defined but unused).

### 5.3 Other entities (in `lib/types.ts`)

- **Category** — `{ slug, name, tagline, image }`
- **Post** (blog) — `{ slug, title, excerpt, cover, date, dateModified?, readTime, category, keywords?, wordCount?, content }`
- **Guide** — `{ slug, title, intro, intent, category, productIds[], lastUpdated, keywords[], faq[] }`
- **Bundle** — `{ slug, …, productIds[] }` (resolved by `getProductsForBundle`)
- **Collection** — `{ slug, type, filter }` where `filter` supports
  `{ category | categories[] | tag | maxPrice | minRating | onePerCategory }`
  (resolved by `getProductsForCollection`).
- **Pinterest pin** (`data/pinterest-pins.json`) — `{ id, formulaId, formulaLabel,
  aspectRatio, boardSuggestion, link, sourceImage, textOverlay,
  secondaryStickers, canvaPrompt, imagePrompt, lifestylePrompt, description,
  hashtags, cta, ctrLevers, batch }`.

### 5.4 Validation rules

- `id` is URL-safe and stable (used as the `/finds/[slug]` slug).
- `category` MUST be one of the 7 slugs. `tags` MUST be from the 4-value enum.
- `editorial: true` protects a row from automated overwrite on re-import.
- Bundles/guides reference products by `id`; unmatched ids are filtered out
  silently by the helpers.

### 5.5 Sample product (shape reference)

```json
{
  "id": "portable-mini-beach-fan",
  "title": "Portable Mini Beach Fan",
  "description": "Pocket-size fan that survives sand and sun.",
  "brand": "Generic",
  "price": 18.99,
  "rating": { "value": 4.6, "count": 1240 },
  "category": "beach-essentials",
  "tags": ["trending", "under-25"],
  "image": "https://m.media-amazon.com/images/I/....jpg",
  "imageSource": "amazon",
  "asin": "B0XXXXXXX",
  "affiliateUrl": "https://amzn.to/3RRh0vX",
  "editorial": false
}
```

---

## 6. CONVENTIONS & STANDARDS

**Naming.**
- Files: routes/data are kebab-case; React components are PascalCase
  (`ProductCard.js`); scripts are `.mjs`; lib modules are lowercase.
- Variables/functions: camelCase. Data accessors follow `getX` / `getXBySlug` /
  `getProductsForX`.
- Path alias: `@/` → repo root (e.g., `import { siteConfig } from "@/lib/site"`).

**Code style.** 4-space indent, ES modules, named exports, double-quoted strings,
JSDoc block comments on `lib/` helpers and API routes explaining purpose +
request/response shape. Match the surrounding file.

**API route conventions** `[ANCHOR:api-pattern]` — use as THE template for new endpoints:
- `export const runtime = "nodejs";` and `export const dynamic = "force-dynamic";`
  (add `export const maxDuration = 300;` for long jobs like pin generation).
- Validate a single shared secret (Bearer or `x-*-secret` header) before work.
- Response envelope: `{ ok: boolean, ... }`. Status codes: `401` unauthorized,
  `400` bad/empty/invalid JSON, `500` not-configured/internal,
  `200` success (including `persisted:false` graceful degradation).
- Never leak Canva tokens or secrets in responses.

**Commit messages.** Freeform, descriptive prose is the working norm
(`"GEO upgrade: programmatic /finds/[slug] product pages + Canva pipeline"`).
Conventional-Commit prefixes (`chore(sync): …`) are acceptable. Recommendation:
adopt Conventional Commits going forward, but it is not yet enforced. `[TO BE FILLED BY USER: confirm if mandatory]`

**Branching strategy.** `[ANCHOR:branch-state]`
- `main` = production (Vercel auto-deploys it). **Never push directly to `main`** —
  always branch + PR.
- Human feature branches: descriptive (`geo-upgrade-finds-pages`, `add-skills-*`).
  Recommended going forward: `feat/*`, `fix/*`.
- n8n automated commits: reserved `auto/site-update-*` prefix → always opens a PR.
- `sync/*` branches are temporary handoff branches and may contain secrets;
  delete + rotate keys after use.

**Error handling.** API routes: try/catch around JSON parse and around the work;
return typed `{ ok:false, error }`. n8n: every HTTP node uses `retryOnFail: 3` +
~3s backoff + `neverError/continue-on-fail`; one Error Trigger (W7) per workflow;
idempotent upserts keyed by stable `id`.

**Logging.** Lightweight. API routes return structured JSON rather than logging;
n8n surfaces run summaries via final Aggregate nodes.

**Comment style.** File-top JSDoc banner describing purpose + request/response;
inline comments only where intent is non-obvious. Keep TODOs tagged
(`TODO(launch)`, `TODO(domain)`, `TODO(brand)`, `TODO(team)`).

---

## 7. ARCHITECTURE DECISION RECORDS (ADRs)

### ADR-001: Persist `data/*.json` via GitHub Contents API (not a database)
- **Status:** Accepted — **implemented** 2026-05-31 (`feat/analytics-memory`, PR #4) `[ANCHOR:write-back]`
- **Context:** Vercel's runtime filesystem is read-only, so ingest endpoints
  (`/api/opportunities/ingest`, `/api/analytics/ingest`, planned
  `/api/products/upsert`, `/api/pins/ingest`)
  degrade to `persisted:false`. Durable write-back is required for the self-feeding loop.
- **Decision:** Write back by committing JSON to a branch via the GitHub Contents
  API and opening a PR (merge → Vercel rebuild). The GitHub token may live in the
  site endpoint or in n8n (implementation detail).
- **Implementation:** `lib/persist/githubCommit.js` commits to branch
  `auto/data-<date>` and opens/reuses a PR (idempotent: reuses the daily branch,
  updates files in place by blob SHA, never opens duplicate PRs). `lib/persist/
  writeData.js` wraps it: try local FS → fall back to GitHub write-back → else
  `persisted:false`. Wired into `/api/opportunities/ingest` and
  `/api/analytics/ingest`. Env: `GITHUB_DATA_TOKEN` (Contents:RW + PRs:RW; classic
  `repo`), `GITHUB_DATA_REPO` (or Vercel `VERCEL_GIT_REPO_OWNER/SLUG`),
  `GITHUB_DATA_BASE_BRANCH` (default `main`). Still requires the token to be set
  in Vercel env to be durable in production.
- **Consequences:** Keeps file-based JSON as single source of truth; free;
  git-tracked history; honors "never push to main, always PR." Adds commit
  latency before data is live; requires a PAT with `repo` scope.
- **Alternatives considered:** Vercel KV / Postgres / Supabase — rejected for v1
  on cost + complexity. Revisit when catalog > ~500 SKUs or concurrent editors appear.

### ADR-002: Deploy via plain git-push → Vercel (no deploy hook, no vercel.json)
- **Status:** Accepted
- **Context:** Need automatic deploys on content change.
- **Decision:** Rely on Vercel's native git integration on `main`. No
  `vercel.json`; `VERCEL_DEPLOY_HOOK_URL` is future intent inside the unbuilt W4 only.
- **Consequences:** Simple. But `main` must be kept current — and today it is
  **stale** (the upgrade lives on `geo-upgrade-finds-pages`). Merging that branch
  to `main` is the act that ships the system.
- **Alternatives considered:** explicit deploy hooks — deferred until n8n W4 exists.

### ADR-003: Canva free CSV path for v1 (OAuth/Autofill is future-proofing)
- **Status:** Accepted
- **Context:** Brand Templates + Autofill require Canva Enterprise; no budget.
- **Decision:** v1 uses `npm run canva:csv` → Pinterest Bulk Create. Keep the
  OAuth/Autofill Connect-API code (`lib/canva/*`, `app/api/canva/*`) unused but
  ready; field names are identical so flipping it on is a switch, not a rewrite.
- **Consequences:** No paid Canva at launch; manual-ish pin export. OAuth code is
  dormant (do not assume it is load-bearing).
- **Alternatives considered:** pay for Enterprise now — rejected (budget).

### ADR-004: SSR/SSG only — no client-only rendering
- **Status:** Accepted
- **Context:** AI crawlers must read fully-rendered content (GEO is the strategy).
- **Decision:** All product/content rendering is server-side. No client-only data
  fetching for core content. JSON-LD is emitted server-side and must not be removed.
- **Consequences:** Strong citability/SEO; constrains use of client-only patterns.
- **Alternatives considered:** SPA/CSR — rejected (breaks GEO).

### ADR-005: Keep JavaScript; no TypeScript rewrite
- **Status:** Accepted
- **Context:** Ship velocity for a solo operator.
- **Decision:** App code stays `.js`/`.mjs`. `tsconfig.json` + `lib/types.ts` are
  ambient types only. New `.ts` files may import types but JS files are unaffected.
- **Consequences:** Less compile-time safety; `lib/types.ts` is the schema contract.
- **Alternatives considered:** full TS migration — rejected (cost, no payoff at this size).

### ADR-006: AI model strategy (DISCREPANCY — needs explicit call)
- **Status:** Proposed (open)
- **Context:** `docs/n8n-architecture.md` recommends cheap `gpt-4o-mini`, but the
  built workflows use `ANTHROPIC_API_KEY` with `CLAUDE_MODEL=claude-opus-4-20250514`.
- **Decision (recommended, pending owner confirm):** keep Claude Opus for
  weekly long-form (blog/collection); use a cheaper model (Haiku / 4o-mini) for
  high-volume per-product description + pin-title tasks.
- **Consequences:** Balances quality vs per-call cost. Until confirmed, Opus is
  the de-facto default and the cost ceiling applies.
- **Alternatives considered:** all-Opus (quality, costly) or all-cheap (cheap, weaker long-form).

### ADR-007: n8n Cloud over self-hosted Docker (CHANGED)
- **Status:** Accepted (supersedes earlier "Docker preferred" note in docs)
- **Context:** Earlier docs suggested Docker self-host. Reality: a Cloud instance
  `summerfindslabdaily.app.n8n.cloud` is provisioned and connected to Kiro via MCP.
- **Decision:** Use n8n Cloud. Reason: managed, zero ops, IDE-reachable.
- **Consequences:** No server to maintain; subject to n8n Cloud plan limits. Do
  not "revert to Docker" assuming it is the plan — it is not.
- **Alternatives considered:** Docker self-host — rejected (ops burden).

### ADR-008: Firecrawl for trend discovery
- **Status:** Accepted
- **Context:** Pinterest Trends and Amazon Movers & Shakers expose no affordable official API.
- **Decision:** Scrape both via Firecrawl `/v2/scrape` in WF-06.
- **Consequences:** Works now; subject to Firecrawl cost + scrape fragility.
  Revisit if an official API appears.
- **Alternatives considered:** official APIs (none affordable), manual research (not scalable).

### ADR-009: n8n is the conductor, not the data owner
- **Status:** Accepted
- **Context:** Risk of business logic drifting into n8n Code nodes.
- **Decision:** Business logic stays in the repo (`n8n/build-*.js`, `lib/*`).
  n8n orchestrates (schedule, retry, fan-out) and calls repo endpoints; it never
  owns canonical data. `data/*.json` + git remain source of truth.
- **Consequences:** Logic stays testable and version-controlled; n8n stays swappable.
- **Alternatives considered:** logic-in-n8n — rejected (lock-in, untestable).

### ADR-010: Strictly summer for v1 / no fake authority
- **Status:** Accepted
- **Context:** Tight topical focus maximizes AI-citability; FTC compliance is non-negotiable.
- **Decision:** Brand, palette, hero, taxonomy stay summer-only. Other seasons =
  v2 sister brand on a separate subdomain. Remove the aspirational
  "As seen in Vogue/TechRadar" press strip and any fake review counts before any real traffic.
- **Consequences:** Narrow but deep; legally clean. Cross-season content is out of scope.
- **Alternatives considered:** multi-season hub — rejected (dilutes citability).

---

## 8. CURRENT STATE SNAPSHOT

**Headline:** the *plumbing* is built and committed (Canva pipeline, 6 n8n
workflows, API routes, pin data, GEO pages, PPPS spec). What's missing:
deployment of the upgrade, real credentials/approvals, durable write-back, the
first real end-to-end run, and the PPPS deliverable docs.

**✓ DONE and verified working**
- Next.js 14 site builds and renders; ~30 components; homepage, categories,
  blog, guides, programmatic `/finds`, `/best`, `/for`, `/under` pages.
- Flat-JSON data layer + `lib/products.js` helpers (products, categories,
  bundles, collections, guides, posts).
- SEO/GEO foundation: metadata API, OG image at edge, sitemap, robots,
  `llms.txt`, `humans.txt`, 7 JSON-LD types, security headers in `next.config.mjs`.
- API routes exist and are auth-guarded: `/api/canva/{oauth,status,webhook}`,
  `/api/opportunities/{ingest,latest}`, `/api/pinterest/published`.
- 6 n8n workflows authored + committed as JSON (+ builder scripts).
- `data/pinterest-pins.json` generated (~1573 lines of pins).
- Affiliate links present as real `amzn.to` shortlinks in `data/products.json`.
- n8n Cloud instance provisioned + connected to Kiro via MCP.
- 63 skills installed under `.kiro/skills/` governed by `skills-policy.md`.

**🟡 IN PROGRESS / built-but-not-connected**
- **Amazon Associates:** links live; tag approval status `[TO BE FILLED BY USER]`.
- **Canva:** full OAuth/export code; `.env` `CANVA_CLIENT_ID/SECRET` empty; v1 uses CSV path.
- **Pinterest publishing:** WF-04/04b/04c authored; `pinterest-published.json`
  empty; needs `PINTEREST_ACCESS_TOKEN` (approval-only) + hosted run.
- **GEO audit fixes:** Done — C1 (domain→Vercel URL placeholder), C2 (llms.txt),
  C3 (social null), H2 (editor persona Lina Reyes), H7/M5 (programmatic pages +
  collections), humans.txt. Pending — H1 (800-word posts), H4 (aggregateRating),
  H5 (above-fold disclosure), remove fake "As seen in" strip, most M-tier items.
  Literal score ~54; projected ~64 after Week-1 fixes.

**● BROKEN / KNOWN-ISSUE**
- **`main` is stale** → live site is pre-upgrade: `/finds/*`, `/best/*` return
  404, sitemap has only 23 URLs, no `/api` routes live. Fix = merge
  `geo-upgrade-finds-pages` → `main`.
- **Read-only FS write-back** → **resolved (code)** on `feat/analytics-memory`
  (PR #4): ingest routes commit to `auto/data-<date>` + open a PR via the GitHub
  Contents API (ADR-001). Durable in production once `GITHUB_DATA_TOKEN` is set
  in Vercel env and the chain is merged.
- **WF-01 schema mismatch** → emits `sku`/`image_url` instead of canonical
  `id`/`image`/`affiliateUrl`; must be conformed to `lib/types.ts`.
- **`tiktok-finds` category has 0 products** → homepage TikTok section + nav link
  render empty.
- **Leaked secrets** → `.kiro/mcp.json`, `.kiro/settings/mcp.json`,
  `.cursor/mcp.json` were force-committed (with plaintext keys + n8n Cloud JWT)
  onto `sync/full-local-state-2026-05-30` for handoff. These files are normally
  gitignored. Rotate all keys + delete the branch after handoff.

**▪ NOT STARTED but planned**
- Importing + activating the 6 workflows inside n8n Cloud; filling secrets.
- PPPS deliverable docs (spec is 0/12 tasks).
- WF-03 Canva Materializer, `/api/products/upsert`, `/api/pins/ingest`,
  `/api/health`, `/api/pins/queue`.
- Real custom domain purchase + Vercel connection.

**Last commands / state seen (2026-05-30):**
- Current branch: `sync/full-local-state-2026-05-30` (HEAD `54f6b94`).
- `git log`: `54f6b94` sync(secrets) → `5229016` GEO upgrade → `5da132b` n8n
  skills → `443e21d` (origin/main) → `fd42029` initial.
- `node -e` over `data/products.json`: 10 products, 6/7 categories populated.

---

## 9. TASK QUEUE (PRIORITIZED)

| ID | Task | Priority | Blocked by | Acceptance criteria |
|----|------|----------|------------|---------------------|
| T-001 | Merge `geo-upgrade-finds-pages` → `main` via PR | P0 | — | PR merged; Vercel deploys; `/finds/*`, `/best/*`, `/api/*` resolve live; sitemap > 23 URLs |
| T-002 | Rotate ALL leaked keys (Firecrawl, Exa, Context7, 21st-Magic, n8n Cloud JWT) + delete `sync/*` branch | P0 | T-001 (preserve work first) | New keys issued; old keys revoked; sync branch deleted from origin; mcp.json re-gitignored |
| T-003 | Confirm real Amazon Associates tag in `data/products.json` + record approval status | P1 | — | Every `affiliateUrl` carries the approved tag; README placeholder removed; approval state documented here |
| T-004 | ✅ DONE (code, PR #4 `feat/analytics-memory`) — GitHub Contents API write-back in ingest endpoints (ADR-001) | P1 | T-001 | Ingest commits JSON to `auto/data-<date>` branch + opens PR; `lib/persist/{githubCommit,writeData}.js`; wired into opportunities + analytics ingest. **Remaining:** set `GITHUB_DATA_TOKEN`/`GITHUB_DATA_REPO` in Vercel env + merge chain to make it durable in prod |
| T-005 | Import + activate the 6 n8n workflows in Cloud; fill secrets; first manual dry-run | P1 | T-001, T-004 | Each workflow imports clean; manual run succeeds against a webhook.site sink; secrets in n8n Variables |
| T-006 | Fix WF-01 schema → conform to `lib/types.ts` (`id`/`image`/`affiliateUrl`/`rating`) | P1 | T-005 | WF-01 output validates against `types.ts`; no `sku`/`image_url` |
| T-007 | Populate `tiktok-finds` category (≥3 products) | P2 | — | Homepage TikTok section + nav render non-empty |
| T-008 | GEO Week-1/2 fixes: remove fake press strip, above-fold disclosure (H5), 800-word posts (H1), aggregateRating (H4) | P2 | T-001 | Fake authority gone; disclosure visible above first product; posts ≥800 words w/ Person author; products show ratings |
| T-009 | Execute PPPS spec (`pinterest-pin-production-system`, 0/12 tasks) | P2 | — | 9 deliverables authored under `.kiro/deliverables/...`; integrity check passes |
| T-010 | Obtain Pinterest API token; first real publish via WF-04 (5/day cold start) | P3 | T-005, owner approval | Token w/ required scopes; ≥1 pin published; `pinterest-published.json` updated |
| T-011 | Resolve AI model strategy (ADR-006) | P3 | — | Documented model per task tier; `CLAUDE_MODEL` + cheap-model split wired |
| T-012 | Select + wire analytics (Plausible / GA4 / Vercel) | P3 | T-001 | One tool chosen + recorded as ADR; events firing; outbound-click tracking live |
| T-013 | Purchase + connect custom domain; revert `siteConfig.url` to `https://summerfindslab.com` | P3 | budget | Domain live in Vercel; metadata/OG/sitemap/JSON-LD resolve to real domain |

**True #1 is T-001 (merge to main)** — it preserves and ships the work; T-002
(rotation) immediately follows so secrets aren't live longer than necessary.

---

## 10. SKILL TRANSFER (LEARNED PATTERNS)

**Patterns the owner likes**
- File-based JSON as the one source of truth; pipelines read/write that, not a DB.
- Endpoints that **degrade gracefully** (return `200 { persisted:false }` instead
  of crashing on read-only FS) so upstream callers decide what to do.
- Idempotent, re-runnable automation keyed by stable `id`.
- Secrets only from env; one shared secret per webhook; tokens rotate independently.
- Honest GEO/marketing: real numbers, no fake authority, FTC-clean disclosures.
- Builders generate artifacts (`n8n/build-*.js` → workflow JSON); edit the
  builder, not the output.
- Tight topical scope (summer-only) as a deliberate citability lever.

**Patterns the owner explicitly rejected**
- A database for v1 (cost/complexity) — JSON until > ~500 SKUs.
- TypeScript rewrite of existing JS.
- Client-only rendering (breaks GEO).
- Removing JSON-LD for perf.
- Moving business logic into n8n Code nodes (n8n conducts; repo owns logic).
- Pushing directly to `main`; hardcoded secrets; paid SaaS > ~$20/mo/service
  without an explicit decision.
- Fake "As seen in" endorsements / fake review counts.

**Communication / language preferences**
- Bilingual chat (Moroccan Darija + English); mirror the owner's language.
- Docs/code/commits in English.
- Concise, answer-first; reason only for structural/irreversible changes.
- Autopilot for safe edits; confirm before credentials/deploy/paid-API/Pinterest-publish.

**Skills system (read-only).** 63 skills under `.kiro/skills/` (GEO, marketing,
n8n) governed by `.kiro/steering/skills-policy.md`. Discover + activate matching
skills via `disclose_context`. **Never hand-edit a `<skill>/` folder** — fork
under a new name if a project tweak is needed. Sources: `zubair-trabzada/geo-seo-claude`,
`coreyhaines31/marketingskills`, `czlonkowski/n8n-skills`.

---

## 11. FAILURE LOG

| Bug | Root cause | Fix | Prevention |
|-----|-----------|-----|------------|
| Ingest endpoints silently lose data on Vercel | Vercel runtime FS is read-only; `fs.writeFile` throws | **Fixed (PR #4):** `lib/persist/writeData.js` tries local FS then commits to `auto/data-<date>` via GitHub Contents API (`lib/persist/githubCommit.js`); still returns `200 { persisted:false }` if no token. ADR-001 implemented. | Treat any "write to disk" on Vercel as non-durable; route writes through git/PR; set `GITHUB_DATA_TOKEN` in Vercel env |
| WF-01 payload doesn't match site schema | WF-01 emits `sku`/`image_url`; canonical schema is `id`/`image`/`affiliateUrl`/`rating:{value,count}` | Conform WF-01 `Structure Affiliate Output` to `lib/types.ts` (direction: WF-01 → types.ts, never reverse) | `lib/types.ts` is the contract; validate workflow output against it |
| `main` ships a pre-upgrade site | Upgrade work committed to `geo-upgrade-finds-pages`, never merged | Merge branch → `main` (T-001) | Keep `main` current; PR-merge feature branches promptly |
| Secrets committed to git | `sync/*` branch force-added gitignored mcp.json files for handoff | Rotate keys + delete branch (T-002); files are normally gitignored | Never commit real mcp.json; keep `mcp.example.json`; honor `.gitignore` |
| Empty TikTok section | `tiktok-finds` category has 0 products though it's in nav + homepage | Add ≥3 products tagged/categorized for TikTok (T-007) | When adding nav/section, ensure backing data exists |
| Canonical domain leaked `example.com` (GEO C1) | Placeholder `siteConfig.url` propagated to ~25 metadata/OG/sitemap/JSON-LD refs | Set `siteConfig.url` to live Vercel URL; revert to real domain at T-013 | Single source (`lib/site.js`) for URL; never ship placeholder domains |

*Add new entries here as bugs are fixed so the next AI does not re-trigger them.*

---

## 12. ENVIRONMENT & SETUP

**Prerequisites:** Node.js ≥ 18.17 (engines field). npm.

**Local setup**
```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build (run before declaring success)
npm run lint
```

**Data / pipeline scripts**
```bash
npm run import:images     # scripts/extract-amazon-images.mjs
npm run import:products   # scripts/import-products.mjs
npm run import:all        # both, in order
npm run generate:pins     # scripts/generate-pinterest-pins.mjs
npm run canva:csv         # CSV export → Pinterest Bulk Create (v1 path)
npm run canva:test-auth   # Canva OAuth check (future path)
npm run canva:generate    # Canva Autofill pins (future path)
```

**Environment variables (site — see `.env.example`)**
| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Site origin (local: `http://localhost:3000`) |
| `CANVA_CLIENT_ID` / `CANVA_CLIENT_SECRET` / `CANVA_REDIRECT_URI` | Canva Connect OAuth (future) |
| `CANVA_TOKEN_STORE` / `CANVA_API_BASE` / `CANVA_AUTH_BASE` | Canva paths/storage |
| `CANVA_BATCH_SIZE` / `CANVA_BATCH_DELAY_MS` / `CANVA_EXPORT_LOG` | Pin batch tuning |
| `CANVA_WEBHOOK_SECRET` | Auth for `POST /api/canva/webhook` |
| `OPPORTUNITY_INGEST_TOKEN` | Bearer for `POST /api/opportunities/ingest` (must match n8n) |

**Environment variables (n8n — see `n8n/.env.example`)**
`ANTHROPIC_API_KEY`, `CLAUDE_MODEL`, `WEBSITE_INSERT_URL`/`WEBSITE_API_TOKEN`,
`PRODUCTS_JSON_URL`, `EXISTING_PINS_JSON_URL`, `SITE_URL`,
`PINS_INGEST_URL`/`PINS_INGEST_TOKEN`, `FORMULAS_PER_PRODUCT`,
`CANVA_WEBHOOK_URL`/`CANVA_WEBHOOK_SECRET`, `FIRECRAWL_API_KEY`,
`OPPORTUNITY_INGEST_URL`/`OPPORTUNITY_INGEST_TOKEN`/`OPPORTUNITY_HISTORY_URL`,
`PINTEREST_ACCESS_TOKEN` (scopes: `boards:read pins:read pins:write user_accounts:read`),
`PINTEREST_DEFAULT_BOARD_ID`, `PINS_PER_RUN`, `PUBLISHED_LOG_URL`/`PUBLISHED_INGEST_URL`/`PUBLISHED_INGEST_TOKEN`,
`PIN_PUBLISH_WEBHOOK_SECRET`, `BOARDS_CACHE_INGEST_URL`/`BOARDS_CACHE_INGEST_TOKEN`.

**Build / deploy.** Push to a feature branch → PR → merge to `main` → Vercel
auto-deploys. No `vercel.json`, no deploy hook.

**Secrets management.**
- Site: `.env.local` (gitignored). n8n: Settings → Variables.
- MCP configs (`.kiro/mcp.json`, `.kiro/settings/mcp.json`, `.cursor/mcp.json`)
  are **gitignored** and hold live keys. They currently exist on the `sync/*`
  branch in plaintext — **rotate after handoff** (T-002). Prefer an
  `mcp.example.json` template for the repo.

**MCP servers available to Kiro:** context7, playwright, firecrawl, exa, vercel,
magic (21st), and **n8n** (remote, n8n Cloud) — n8n only in `.kiro/mcp.json`.

---

## 13. GLOSSARY

- **GEO** — Generative Engine Optimization: optimizing to be cited by AI engines
  (ChatGPT, Claude, Perplexity, Google AI Overviews).
- **E-E-A-T** — Experience, Expertise, Authoritativeness, Trustworthiness (Google
  quality signals; drives whether AI cites you).
- **PPPS** — Pinterest Pin Production System: the 9-document deliverable spec in
  `.kiro/specs/pinterest-pin-production-system/` (0/12 tasks done).
- **Operator** — the non-designer human producing pins in Canva using the PPPS.
- **Pin Factory / pin pipeline** — `lib/pin-pipeline/*`: code that turns products
  + formulas into pin records/exports.
- **WF-0x** — n8n workflow numbering (WF-01 import, WF-02 pins, WF-04/b/c
  Pinterest, WF-06 opportunity; WF-03 Canva materializer + WF-05 analytics planned).
- **Opportunity Intelligence** — WF-06's daily scored report (0–100 per axis:
  Pinterest potential + affiliate potential) with climber/faller deltas.
- **Climber/faller signal** — day-over-day movement of a product's opportunity
  score (computed by reading yesterday's report).
- **`editorial: true`** — product flag protecting a row from automated overwrite
  on re-import.
- **`formulaId`** — a pin design "formula" (10 of them mirror
  `lib/pin-pipeline/templates.js`); each maps a product to a Canva layout.
- **Thumbnail Zone** — top 40% of a pin (top 600px of 1500px); primary hook lives here.
- **Mobile-Safe Area** — central 80% of the pin canvas; critical content stays inside.
- **Scroll-stop test** — readability check at 236px (Pinterest mobile thumbnail width).
- **Brand pass** — PPPS production stage applying brand colors/fonts/logo before export.
- **Answer-first block** — bold claim sentence → 2–3 supporting sentences →
  bullets; the structure AI engines quote most.
- **Ingest endpoint** — a `POST /api/*/ingest` route that receives data from n8n
  (bearer/secret authed) and persists it (durably once ADR-001 ships).
- **Conductor (n8n)** — orchestration-only role: schedules, retries, fans out,
  calls repo endpoints; never owns canonical data.

---

## 14. OPEN QUESTIONS / RISKS

- **Analytics undecided** — Plausible vs GA4 vs Vercel Analytics; nothing wired.
  *Mitigation:* pick one at T-012; record as ADR.
- **Amazon Associates approval** — status unknown; risk of account closure if
  qualifying-sales thresholds aren't met within Amazon's window. *Mitigation:*
  confirm tag + approval (T-003); prioritize getting real clicks via T-001/T-008.
- **Pinterest API access is approval-only** — blocks automated WF-04 publishing.
  *Mitigation:* CSV bulk-upload path works meanwhile; apply for API access early.
- **Read-only FS write-back not implemented** — blocks the self-feeding loop.
  *Mitigation:* T-004 (GitHub Contents API).
- **Canva Enterprise cost gate** — blocks Autofill path. *Mitigation:* CSV path
  for v1 (ADR-003).
- **Budget** — no domain purchased; ≤ $20/mo/service ceiling. *Mitigation:* free
  tiers + self-host bias; revert `siteConfig.url` at T-013.
- **FTC risk** — fake "As seen in" press strip + fake review counts must be
  removed before any real traffic. *Mitigation:* T-008.
- **Secret exposure** — live keys on the `sync/*` branch. *Mitigation:* T-002
  (rotate + delete) is P0.
- **Single point of failure** — solo operator; n8n Cloud + Vercel free-tier
  limits; Firecrawl scrape fragility if source pages change. *Mitigation:*
  idempotent re-runnable workflows; keep builders as source of truth.
- **AI model cost ambiguity (ADR-006)** — Opus is the de-facto default; confirm
  the tiered model strategy to control spend.
- **`main` staleness** — until T-001, any hotfix to `main` deploys against the
  old codebase (no new pages/APIs).

---

## 15. SELF-VALIDATION CHECKLIST FOR NEXT AI

- [ ] I can state the project's purpose in one sentence (self-feeding summer
      affiliate engine: discover → pages + pins → publish → Amazon clicks + AI citations).
- [ ] I know the current milestone ("Pre-launch GEO upgrade + automation wiring").
- [ ] I know the next task to pick up (T-001: merge `geo-upgrade-finds-pages` → `main`).
- [ ] I understand the communication preferences (English docs; bilingual
      Darija/English chat; concise; Autopilot with confirm-gates).
- [ ] I have read all ADRs (001–010) and know which are open (ADR-006).
- [ ] I know the failure log and will not re-trigger those bugs.
- [ ] I know `lib/types.ts` is the canonical schema and the 7 fixed category slugs.
- [ ] I know `main` is stale and the live site is pre-upgrade.
- [ ] I know secrets are exposed on `sync/*` and rotation is P0.
- [ ] I will not edit `.kiro/skills/<skill>/` by hand, push to `main` directly,
      install deps, run paid-API batches, or publish real pins without confirming first.

---

## Changelog

- **v1.6 (2026-05-31)** — Synced full local state to GitHub on `add-skills-superpowers`
  (commit `5e3183e`): committed the new `intelligence-discovery-agents`,
  `pmo-coordination-system`, and `ceo-operating-system` specs, `project-bible-policy`
  steering, durable `data/analytics|memory|training` files, the n8n `browser-agent`
  workflow + builder, and stitch exports. Added `/.playwright-mcp/` and `/audit-tmp/`
  to `.gitignore` as transient tool artifacts. Housekeeping only; no code behavior change.
- **v1.5 (2026-05-31)** — Authored `requirements.md` for the new
  `intelligence-discovery-agents` spec (requirements-first). Defines five
  AI-agent employees of the existing Discovery_Opportunity_Intelligence Dept
  (Trend Hunter, Product Hunter, Competitor Intelligence, Niche Discovery,
  Opportunity Scoring), each with Objective/Inputs/Outputs/Workflow/KPIs/Memory/
  n8n integration, plus cross-cutting requirements for the shared Opportunity
  data model, WF-06 0–100 scoring consistency, git-tracked Memory_Store dedup,
  n8n idempotency, and KPI alignment (Pinterest + GEO + affiliate, optimize for
  outbound Amazon clicks). Reuses CEO-OS/PMO concepts; does not redefine them.
  Requirements only; no design/tasks/implementation yet.
- **v1.4 (2026-05-31)** — Authored `tasks.md` for the `pmo-coordination-system`
  spec (requirements-first). 16 top-level tasks / 63 leaf sub-tasks covering the
  five deliverables plus storage/id primitives, integration, API layer, and the
  scheduled `run` cadence. 33 property-test sub-tasks mapped 1:1 to design
  Correctness Properties (fast-check + Vitest, JavaScript/ESM). Includes the
  8-wave Task Dependency Graph for parallel scheduling. Planning artifacts only;
  no implementation performed.
- **v1.3 (2026-05-31)** — Authored `design.md` for the `pmo-coordination-system`
  spec (requirements-first). Coordination layer below the Ghost CEO, above the
  seven Departments; reuses CEO-OS conventions (file-based JSON under `data/pmo/`,
  `writeData.js` persistence, `/api/*` bearer/shared-secret auth, idempotent
  upserts). Covers the five deliverables (Task Routing, Project Tracking, Dept
  Communication Protocol, Priority Scoring, Escalation Rules) plus goal
  intake/decomposition, fingerprint dedup, progress roll-up, and n8n integration.
  Routing expressed as n8n-evaluable JSON rules; 33 correctness properties for PBT.
- **v1.2 (2026-05-31)** — Installed 20 dev-workflow skills into `.kiro/skills/`
  from 3 new sources: obra/superpowers (14), obra/superpowers-lab (5),
  yusufkaraaslan/Skill_Seekers (1 → `skill-builder`). Updated skills-policy §2
  source table and `.kiro/skills/README.md` (new sources + LICENSE refs). The two
  `awesome-claude-skills` repos (BehiSecc, travisvn) were link-lists with no
  `SKILL.md` and were not installed. Branch `add-skills-superpowers`.
- **v1.1 (2026-05-31)** — ADR-001 **implemented**: durable write-back via GitHub
  Contents API (`lib/persist/githubCommit.js` + `writeData.js`), wired into
  `/api/opportunities/ingest` and the new `/api/analytics/ingest`. Added the
  analytics→learning loop (`lib/feedback/score.js` → `data/memory/learnings.jsonl`
  + `data/training/examples.jsonl`) and a WF-05 analytics-collector sketch
  (`active:false`). Updated §8 (write-back resolved in code), §9 (T-004 done),
  §11 (failure-log fix). PR #4 (`feat/analytics-memory`). Durable in prod pending
  `GITHUB_DATA_TOKEN` in Vercel env + chain merge.
- **v1.0 (2026-05-30)** — Initial Project Bible.

---

## How to keep this document updated (3 ways)

1. **On every merged PR**, bump the version line and add a one-line entry to a
   changelog section here (MAJOR for architecture/ADR changes, MINOR for
   tasks/content). Treat `PROJECT_BIBLE.md` as a required edit in the PR template.
2. **Pair each ADR with reality:** when a decision changes (e.g., ADR-006
   resolved, ADR-001 implemented), flip its Status and update §8 State Snapshot
   + §9 Task Queue in the same commit. Code wins on conflicts — then sync this file.
3. **Run a Kiro hook / weekly review:** a `postTaskExecution` hook (or a manual
   Friday pass) that re-checks the §8 snapshot against `git log`, the live
   Vercel state, and `data/*.json` counts, and updates the ✓/🟡/●/▪ markers and
   the Failure Log. Keep the §15 checklist answerable at all times.
