# AGENT SYSTEM — Summer Finds Lab Daily

> **Document version:** v1.0
> **Last updated:** 2026-05-30
> **Owner:** nakazaki-simo
> **Status:** Blueprint (design-complete, build phased — see §16)
>
> This is the operations manual for the autonomous, multi-agent "company-in-a-box"
> that runs Summer Finds Lab Daily. It is the companion to `PROJECT_BIBLE.md`:
> the Bible explains the *site/product*; this file explains the *workforce of agents*
> that operates it. Any AI building or extending the agent layer must read this first.
>
> **One-line mission:** an org of specialized AI agents, orchestrated by n8n, that
> discovers trending summer products, produces GEO-optimized content + high-CTR
> Pinterest pins, distributes them, measures results, and improves itself from a
> shared memory — under human approval, on a budget, growing by reinvestment.

---

## Table of contents
0. How to use this document
1. Operating principles (non-negotiable)
2. Org chart (the schema)
3. Departments & agents (roles, I/O, tools, KPIs)
4. Orchestration model (manager–worker)
5. Shared memory (the learning substrate)
6. Inter-agent data contracts (detailed JSON schemas)
7. End-to-end pipelines (data flow)
8. Observability & evaluation
9. Problem-solving & self-healing
10. Control plane — WhatsApp command center
11. Infrastructure & hosting (Cloud → self-host on PC → local compute)
12. Tool & integration registry
13. Model routing strategy (free + local + premium)
14. Compliance, safety & guardrails
15. KPIs & success metrics
16. Phased roadmap
17. Security model
18. Glossary

---

## 0. How to use this document
- **Building an agent?** Read §1 (principles), §3 (its role), §6 (the schemas it must
  emit/consume), §14 (what it may NOT do).
- **Wiring a workflow in n8n?** Read §4, §7, §12, §13.
- **Operating day-to-day?** Read §10 (WhatsApp control) and §15 (KPIs).
- **Migrating hosting?** Read §11 and §17.
- Every department, agent, schema, and tool has a stable ID so other docs and prompts
  can reference it (e.g., `DEPT-INTEL`, `AGENT-trend-scout`, `SCHEMA-Task`, `TOOL-firecrawl`).

---

## 1. Operating principles (non-negotiable)
1. **n8n is the conductor; the repo owns the logic and data.** Business logic lives in
   `lib/*` and `n8n/build-*.js`; agents never become a place where un-versioned logic rots.
2. **Data is the source of truth.** `data/*.json` (+ vector memory) is canonical; every
   write is git-committed via PR. No silent state.
3. **Human-in-the-loop at the edges.** Agents draft and stage; a human (via WhatsApp or PR)
   approves anything that publishes publicly, spends money at scale, or makes a claim.
4. **Everything is observable.** Every agent run is traced (Langfuse). No black boxes.
5. **Self-funding.** Start on free tiers + local compute; reinvest revenue into paid scale.
6. **Compliance is a feature, not a tax.** FTC disclosure, Amazon/Pinterest ToS, GDPR
   opt-in, robots.txt/ToS of sources — all enforced in code (see §14).
7. **Least privilege.** Each agent gets only the tools and scopes its task needs (§17).
8. **Learn or it's not an agent.** Outcomes flow back into shared memory and tune future
   prompts/decisions (§5, §8).

---

## 2. Org chart (the schema)

```
                          ┌──────────────────────────────────────────────┐
   WhatsApp Command  ───▶ │   🧭 ORCHESTRATOR (CEO-agent)  [AGENT-ceo]     │ ◀── Schedule (cron)
   Center (owner)         │   intake · prioritize · delegate · review      │
                          └───────────────────────┬──────────────────────┘
                                                  │ delegates Task envelopes (SCHEMA-Task)
     ┌──────────────┬──────────────┬──────────────┼──────────────┬──────────────┬──────────────┐
     ▼              ▼              ▼              ▼              ▼              ▼              ▼
 ┌────────┐   ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐
 │DEPT-   │   │DEPT-   │    │DEPT-   │    │DEPT-   │    │DEPT-   │    │DEPT-   │    │DEPT-   │
 │INTEL   │   │PRODUCT │    │CONTENT │    │DESIGN  │    │DISTRIB │    │GROWTH  │    │ANALYTICS│
 │(OSINT) │   │        │    │        │    │        │    │        │    │        │    │        │
 └───┬────┘   └───┬────┘    └───┬────┘    └───┬────┘    └───┬────┘    └───┬────┘    └───┬────┘
   manager      manager       manager       manager       manager       manager       manager
   + workers    + workers     + workers     + workers     + workers     + workers     + workers
     └──────────────┴──────────────┴──────┬───────┴──────────────┴──────────────┴──────────────┘
                                          ▼
                    🧠 SHARED MEMORY (vector store + ledgers)  [LAYER-memory]
                    products · pins · opportunities · outcomes · learnings · brand
                                          ▼
        🛡️ OBSERVABILITY (Langfuse) [LAYER-obs] · 🧰 WATCHDOG / SELF-HEAL [DEPT-OPS] · ✅ HUMAN GATES
```

- **Executive layer:** one Orchestrator (`AGENT-ceo`) + one manager per department.
- **Departments (`DEPT-*`):** each is a *crew* — a manager that decomposes the goal and
  delegates to specialist worker agents.
- **Cross-cutting layers:** Shared Memory, Observability, Ops/Watchdog, Human Gates.

---

## 3. Departments & agents

Each agent entry: **ID · goal · inputs → outputs (schema) · tools · KPI.**

### DEPT-INTEL — Market Intelligence (OSINT, public data only)
Manager `AGENT-intel-lead`: turns raw signals into a ranked opportunity brief.
- `AGENT-trend-scout` — find rising summer products/keywords. In: sources → Out: `SCHEMA-Signal[]`. Tools: `TOOL-firecrawl`, `TOOL-exploding-topics`, `TOOL-dataforseo`, Pinterest Trends. KPI: # validated rising signals/week.
- `AGENT-competitor-analyst` — map competitor public content & AI-citation share. In: competitor URLs → Out: `SCHEMA-CompetitorNote[]`. Tools: `TOOL-firecrawl`, Wayback, URLscan (public only). KPI: gaps found.
- `AGENT-niche-researcher` — niche/sub-niche + audience interest (public, aggregate). In: seed topics → Out: `SCHEMA-Niche[]`. Tools: Reddit public, keyword APIs. KPI: niches with proven demand.
- `AGENT-opportunity-scorer` — deterministic 0–100 scoring (Pinterest potential + affiliate potential). In: `SCHEMA-Signal[]` + memory → Out: `SCHEMA-Opportunity[]`. (Maps to existing **WF-06**.) KPI: precision of "winners".

### DEPT-PRODUCT — Product & Affiliate
Manager `AGENT-product-lead`.
- `AGENT-product-hunter` — confirm win products on Amazon. Out: `SCHEMA-ProductCandidate[]`. Tools: Amazon Movers & Shakers via `TOOL-firecrawl`. KPI: approved products/week.
- `AGENT-enricher` — normalize to canonical product schema (`lib/types.ts`). In: candidate → Out: `SCHEMA-Product` (matches `data/products.json`). Tools: `scripts/extract-amazon-images.mjs`. KPI: % clean records.
- `AGENT-affiliate-linker` — attach the real Associates tag / `amzn.to` link, verify it resolves. KPI: 100% valid tagged links.

### DEPT-CONTENT — Content & GEO
Manager `AGENT-content-lead`.
- `AGENT-writer` — 800+ word author-attributed articles (Lina Reyes voice). Out: `SCHEMA-ContentDraft`. KPI: words, readability, internal links ≥3.
- `AGENT-geo-optimizer` — answer-first blocks, FAQs, comparison tables, `llms.txt` updates. KPI: GEO score delta.
- `AGENT-schema-builder` — JSON-LD (Product, Review/AggregateRating, BlogPosting w/ articleBody+wordCount, CollectionPage, HowTo). KPI: schema.org validation pass.
- `AGENT-fact-checker` — verify claims vs sources; strip hype/fake authority (FTC). KPI: 0 unverified claims shipped.

### DEPT-DESIGN — Visual Production
Manager `AGENT-design-lead`.
- `AGENT-pin-designer` — render 1000×1500 pins via **Satori (`next/og`)** using the 10 formulas. Out: `SCHEMA-PinJob`. KPI: thumbnail-zone + 4.5:1 contrast + 236px readability pass.
- `AGENT-bg-generator` — optional AI lifestyle backgrounds (Ideogram/Flux), no text, mobile-safe. KPI: on-brand pass rate.
- `AGENT-brand-qa` — palette/logo/disclosure consistency check before publish. KPI: brand violations caught.

### DEPT-DISTRIB — Distribution
Manager `AGENT-distrib-lead`.
- `AGENT-pin-publisher` — publish to Pinterest (`/v5/pins`), throttled ramp (5→10→15-25). Maps to **WF-04/04b/04c**. Out: `SCHEMA-PublishLog`. KPI: pins/day, 0 ToS strikes.
- `AGENT-scheduler` — optimal slotting across boards/time. KPI: posting cadence adherence.
- `AGENT-social-poster` — (later) cross-post highlights. KPI: reach.

### DEPT-GROWTH — Audience & Conversion (opt-in only)
Manager `AGENT-growth-lead`.
- `AGENT-email-capture` — first-party, consented newsletter + lead magnets. KPI: opt-in subscribers (consented). **No scraping/buying lists.**
- `AGENT-cro` — test CTAs, disclosure placement, layout for outbound CTR. KPI: outbound CTR lift.
- `AGENT-audience-modeler` — aggregate, non-personal audience interests for targeting. KPI: segment quality.

### DEPT-ANALYTICS — Measurement & Feedback
Manager `AGENT-analytics-lead`.
- `AGENT-tracker` — pull Pinterest/site/Amazon metrics. Out: `SCHEMA-MetricSnapshot`. (Maps to planned **WF-05/WF-06 analytics**.)
- `AGENT-dashboard` — build a daily digest + dashboard page. KPI: freshness.
- `AGENT-feedback-writer` — write outcome learnings to memory (which pins/articles/products/niches won). **This closes the learning loop.** Out: `SCHEMA-Learning`.

### DEPT-OPS — Reliability & Problem-Solving (cross-cutting)
Manager `AGENT-ops-lead`.
- `AGENT-watchdog` — catch any workflow error, retry idempotently, open a GitHub issue, escalate to WhatsApp. Maps to **WF-07**.
- `AGENT-cost-governor` — enforce per-department budget caps; downgrade models when near cap (§13).
- `AGENT-evaluator` — LLM-as-judge regression on agent outputs; flag quality drift (§8).

### (Optional future departments)
- `DEPT-VIDEO` — short-form Reels/TikTok/Idea Pins (script → AI video → caption).
- `DEPT-FINANCE` — revenue/cost ledger, ROI per product/pin, reinvestment recommendations.

---

## 4. Orchestration model (manager–worker)
- Pattern: **hierarchical manager–worker** — the standard org-chart pattern codified across
  Anthropic/LangGraph/CrewAI docs. The manager decomposes a goal into sub-tasks, delegates to
  specialists, collects reports, and decides done vs re-delegate.
- **Backbone = n8n** (already hosted + MCP-connected). Each department = one or more n8n
  workflows; the AI Agent node (LLM + tools + memory) is the per-agent brain. Sub-workflows
  call each other via internal webhooks (the existing WF chain pattern).
- **When to add CrewAI:** only for a department that genuinely needs dynamic, multi-step
  delegation (e.g., DEPT-CONTENT research→write→edit). Run CrewAI as a service that an n8n
  HTTP node calls. Keep CrewAI crews ≤5 agents (known scaling pitfalls beyond that).
- **Determinism first:** scoring, filtering, and routing are deterministic Code nodes;
  LLMs are used for language/judgment, not for arithmetic or control flow that can be coded.

---

## 5. Shared memory (the learning substrate) — LAYER-memory
Two tiers:
1. **Structured ledgers (git-tracked JSON):** `data/products.json`, `data/pinterest-pins.json`,
   `data/pinterest-published.json`, `data/opportunities/*.json`, plus new
   `data/memory/outcomes.json` and `data/memory/learnings.json`.
2. **Vector store (semantic recall):** Supabase Vector / Qdrant / PGVector (free tiers).
   Stores embeddings of: winning pin patterns, high-CTR hooks, article angles that ranked,
   niches that converted, competitor gaps, and past failures.

**How "agents learn from each other":** DEPT-ANALYTICS writes `SCHEMA-Learning` records after
each cycle → DEPT-INTEL/CONTENT/DESIGN retrieve relevant learnings (RAG) into their prompts →
next outputs are conditioned on what actually worked. This is the feedback loop (boucle de
feedback), not self-modifying code.

**Memory write rule:** only DEPT-ANALYTICS and DEPT-OPS write *learnings*; everyone may write
*facts* (their own outputs). All writes are timestamped, sourced, and idempotent by ID.

---

## 6. Inter-agent data contracts (detailed JSON schemas)

> These are the message envelopes agents exchange. They extend the canonical product/pin
> schemas in `lib/types.ts` + `PROJECT_BIBLE.md §5`. All IDs are stable and human-readable.

### SCHEMA-Task (the delegation envelope)
```jsonc
{
  "taskId": "T-2026-05-30-0007",
  "from": "AGENT-ceo",
  "to": "DEPT-INTEL",                 // department or specific agent id
  "intent": "find_opportunities",     // verb the receiver understands
  "priority": "P0|P1|P2|P3",
  "input": { /* task-specific payload */ },
  "constraints": { "maxItems": 20, "budgetUsd": 0.50, "deadline": "2026-05-30T08:00:00Z" },
  "requiresHumanApproval": false,
  "traceId": "lf_abc123",             // Langfuse trace id
  "createdAt": "2026-05-30T06:00:00Z"
}
```

### SCHEMA-Report (what every agent returns)
```jsonc
{
  "taskId": "T-2026-05-30-0007",
  "agent": "AGENT-trend-scout",
  "status": "ok|partial|failed",
  "summary": "12 rising beach-tech signals; 3 strong.",
  "output": { /* schema below, e.g. Signal[] */ },
  "metrics": { "itemsIn": 50, "itemsOut": 12, "costUsd": 0.018, "latencyMs": 4200 },
  "issues": [{ "code": "rate_limited", "detail": "Firecrawl 429 on source 2" }],
  "nextSuggested": ["AGENT-opportunity-scorer"],
  "finishedAt": "2026-05-30T06:01:10Z"
}
```

### SCHEMA-Signal (raw intelligence)
```jsonc
{
  "signalId": "SIG-...",
  "kind": "keyword|product|category|competitor",
  "label": "sand-free beach blanket",
  "source": "pinterest-trends|amazon-movers|reddit|dataforseo",
  "sourceUrl": "https://...",          // public source
  "momentum": 0.0,                      // 0..1 normalized rise
  "evidence": "rising 140% WoW",
  "capturedAt": "2026-05-30T06:00:30Z"
}
```

### SCHEMA-Opportunity (scored, WF-06 output)
```jsonc
{
  "opportunityId": "OPP-2026-05-30-003",
  "productRef": "momomus-...-001",      // or proposed new product
  "pinterestPotential": 82,             // 0..100
  "affiliatePotential": 74,
  "breakdown": { "demand": 0.9, "competition": 0.4, "margin": 0.6, "seasonality": 1.0 },
  "recommendation": "produce 3 pins + 1 roundup section",
  "deltaVsYesterday": "+11 (climber)",
  "date": "2026-05-30"
}
```

### SCHEMA-Product (canonical — mirrors lib/types.ts)
```jsonc
{
  "id": "slug-001", "title": "", "originalTitle": "", "description": "",
  "brand": "", "price": 0.0, "rating": { "value": 4.5, "count": 50 },
  "category": "beach-essentials",       // one of the 7 CategorySlug values
  "tags": ["trending","tiktok","under-25","viral"],
  "image": "https://...", "imageSource": "amazon|curated|manual", "asin": "B0...|null",
  "affiliateUrl": "https://amzn.to/...", "source": "", "importedAt": "", "editorial": false
}
```

### SCHEMA-ContentDraft
```jsonc
{
  "draftId": "CT-...", "type": "article|roundup|collection|faq",
  "targetUrl": "https://summerfindslab.com/best/...",
  "h1": "", "metaTitle": "", "metaDescription": "",
  "body": "markdown, 800+ words", "wordCount": 0,
  "internalLinks": ["/category/..."], "productRefs": ["id1","id2"],
  "jsonLd": { /* BlogPosting/CollectionPage */ }, "author": "Lina Reyes",
  "status": "draft|approved|published", "needsHumanApproval": true
}
```

### SCHEMA-PinJob (design → distribution)
```jsonc
{
  "pinId": "PIN-...", "productRef": "id-001", "formulaId": "price-tag-find",
  "renderUrl": "/api/pins/render?id=id-001&formula=price-tag-find",
  "title": "", "description": "", "hashtags": ["#summerfinds"],
  "boardSuggestion": "Beach Essentials", "link": "https://...affiliate...",
  "altText": "", "status": "rendered|queued|published|failed", "batch": "2026-05-30"
}
```

### SCHEMA-PublishLog (idempotent on pinId)
```jsonc
{
  "pinId": "PIN-...", "pinterestPinId": "987...", "boardId": "123...",
  "publishedAt": "2026-05-30T09:00:01Z", "status": "ok|skipped|failed", "reason": null
}
```

### SCHEMA-MetricSnapshot
```jsonc
{
  "date": "2026-05-30",
  "pinterest": { "impressions": 0, "saves": 0, "outboundClicks": 0 },
  "site": { "sessions": 0, "topPages": [] },
  "amazon": { "outboundClicks": 0, "orders": 0, "commissionUsd": 0 },
  "byProduct": [{ "id": "id-001", "clicks": 0, "ctr": 0.0 }]
}
```

### SCHEMA-Learning (closes the loop)
```jsonc
{
  "learningId": "LRN-...", "scope": "pin|article|product|niche|formula",
  "ref": "formula:price-tag-find",
  "insight": "price-tag pins out-save list pins 1.8x in beach-essentials",
  "confidence": 0.0, "evidenceWindow": "2026-05-01..05-30",
  "action": "favor price-tag formula for under-$25 beach items",
  "createdBy": "AGENT-feedback-writer", "createdAt": "2026-05-30T02:00:00Z"
}
```

### SCHEMA-Command (WhatsApp → orchestrator) — see §10
```jsonc
{
  "from": "+212XXXXXXXXX", "verb": "status|approve|reject|run|pause|report",
  "args": { "target": "pin-batch", "id": "PIN-..." },
  "auth": "owner",                      // only allowlisted numbers
  "receivedAt": "2026-05-30T10:00:00Z"
}
```

---

## 7. End-to-end pipelines (data flow)
**Daily growth loop (the core money loop):**
```
06:00  DEPT-INTEL (WF-06)  → SCHEMA-Opportunity[]  → memory
       ↓ (orchestrator picks top N, within budget)
       DEPT-PRODUCT        → SCHEMA-Product[]       → data/products.json (PR)
       DEPT-CONTENT        → SCHEMA-ContentDraft[]  → [HUMAN APPROVE] → pages (PR)
       DEPT-DESIGN         → SCHEMA-PinJob[]        → /api/pins/render (Satori)
09:00  DEPT-DISTRIB (WF-04)→ Pinterest publish      → SCHEMA-PublishLog
02:00  DEPT-ANALYTICS      → SCHEMA-MetricSnapshot  → SCHEMA-Learning → memory
 ∞     DEPT-OPS watchdog + cost governor + evaluator run across all of the above
```
**Write-back (Vercel read-only FS):** ingest endpoints commit JSON to an `auto/*` branch via
the GitHub Contents API → PR → Vercel rebuilds (decided in `PROJECT_BIBLE.md`).

---

## 8. Observability & evaluation — LAYER-obs
- **Tracing:** Langfuse (free, self-hostable, GDPR-friendly) instruments every agent run:
  prompt, tools, tokens, cost, latency, errors. Integrates with n8n / CrewAI / LangGraph.
- **Three eval layers:** (1) unit checks on discrete steps, (2) LLM-as-judge regression on
  subjective quality (article, pin copy), (3) continuous production trace sampling for drift.
- **What we watch:** cost spikes / runaway loops, tool-call retry storms, prompt regressions
  after model upgrades, quality drift, ToS-risk phrases.
- `AGENT-evaluator` scores outputs; failures below threshold are blocked from publish.

---

## 9. Problem-solving & self-healing — DEPT-OPS
- **Per node:** `Continue On Fail` + 3 retries, exponential backoff, 30s timeout.
- **Per workflow:** error workflow = `AGENT-watchdog`.
- **Idempotency:** every write keyed by stable ID; retries are safe.
- **Escalation ladder:** retry once → open GitHub issue (labels bug/automation) → WhatsApp
  alert to owner with the Langfuse trace link → pause the affected department if repeated.
- **Cost governor:** if a department nears its daily budget, downgrade its model tier (§13)
  and notify; hard-stop on breach.

---

## 10. Control plane — WhatsApp command center
Goal: operate the whole company from your phone.
- **Channel:** WhatsApp Business **Cloud API** (official Meta) via n8n. Avoid unofficial
  web-automation libraries (ToS/ban risk). Twilio WhatsApp is an alternative.
- **Auth:** only allowlisted owner number(s); a shared secret + number check on every inbound
  message (`SCHEMA-Command.auth = "owner"`). Reject everything else.
- **Inbound commands (examples):**
  - `status` → orchestrator returns today's pipeline state + KPIs.
  - `report [dept]` → latest department report digest.
  - `run pin-batch [n]` / `run intel` → trigger a workflow (respects budget caps).
  - `approve <draftId|pinId>` / `reject <id> [reason]` → human-gate decisions.
  - `pause <dept>` / `resume <dept>` → throttle control.
  - `budget` → remaining daily spend per department.
- **Outbound (push):** daily digest at a set hour; watchdog alerts; "needs approval" prompts
  with inline accept/reject.
- **Flow in n8n:** `WhatsApp Trigger → Authenticate (Code) → Parse Command (SCHEMA-Command)
  → Route to department webhook → Format reply → WhatsApp Send`.
- **Guardrail:** destructive/public actions (publish, spend > cap) always require an explicit
  `approve`, never auto-execute from a vague message.

---

## 11. Infrastructure & hosting (Cloud → self-host on PC → local compute)
Phased so nothing breaks during migration.

- **Phase A — now: n8n Cloud** (`*.app.n8n.cloud`, MCP-connected). Fastest to validate.
- **Phase B — self-host on your PC (no monthly fee):**
  - `docker compose` running `n8nio/n8n` with a persistent volume (`~/.n8n`).
  - **Public webhooks without opening ports / paying:** **Cloudflare Tunnel** (free) maps a
    stable HTTPS URL → `localhost:5678`. Required for WhatsApp/Pinterest callbacks.
  - Postgres (Docker) for n8n state + as an optional write store / vector DB (PGVector).
  - **Backups:** nightly export of workflows + `data/` + DB to the git repo / external disk.
    (Self-hosting means YOU own reliability — automate backups before going live.)
- **Phase C — use your PC's performance (local models):**
  - **Ollama** (or LM Studio) serves local LLMs (Llama / Qwen / Mistral) on your GPU/CPU.
  - n8n calls Ollama via the Ollama node / local HTTP — **$0 inference** for high-volume tasks
    (product descriptions, pin titles, tagging, classification).
  - Local embeddings (e.g., `nomic-embed-text`) feed the vector store for free.
  - Route premium/quality tasks to Claude; everything routine stays local (§13).
- **Migration checklist (Cloud → PC):** export all workflows JSON → import into local n8n →
  recreate credentials/env → point Cloudflare Tunnel URL into the site/WhatsApp/Pinterest
  callbacks → run one dry cycle → cut over → keep Cloud as a 1-week fallback.

---

## 12. Tool & integration registry

| ID | Tool | Used by | Tier | Notes |
|---|---|---|---|---|
| TOOL-n8n | n8n (Cloud→self-host) | all | free self-host | orchestration backbone |
| TOOL-ollama | Ollama local LLMs | volume tasks | free (local) | uses your PC GPU |
| TOOL-claude | Anthropic Claude | content/strategy | paid | quality tier |
| TOOL-gemini | Gemini 2.5 Flash-Lite | volume tasks | free tier (~1k/day) | cheap fallback |
| TOOL-groq | Groq | latency-sensitive | free tier | very fast |
| TOOL-firecrawl | Firecrawl | INTEL/PRODUCT | paid/free trial | scrape public trends |
| TOOL-exploding-topics | Exploding Topics | INTEL | paid (trends API) | early trend/TikTok signals |
| TOOL-dataforseo | DataForSEO | INTEL | paid (cheap/call) | keyword + trends API |
| TOOL-satori | next/og (Satori) | DESIGN | free | pin rendering (in-repo) |
| TOOL-ideogram | Ideogram/Flux | DESIGN | paid | AI backgrounds (text-safe) |
| TOOL-pinterest | Pinterest API v5 | DISTRIB | free (approval) | publish + analytics |
| TOOL-whatsapp | WhatsApp Cloud API | control | free tier | command center |
| TOOL-langfuse | Langfuse | OPS/obs | free/self-host | tracing + evals |
| TOOL-supabase | Supabase (Vector+PG) | memory | free tier | shared memory store |
| TOOL-github | GitHub Contents API | write-back | free | commit data → PR |
| TOOL-vercel | Vercel | hosting site | free tier | site deploy |
| TOOL-cf-tunnel | Cloudflare Tunnel | self-host | free | public URL → localhost |

> Public-data OSINT helpers (Wayback, URLscan, Google "dork" queries, Reddit public) are used
> **read-only on public pages** for competitive/market intelligence — never for personal data.

---

## 13. Model routing strategy (free + local + premium)
- **Local first (free):** Ollama for high-volume, low-stakes text (descriptions, tags, pin
  titles, classification, embeddings). Uses your PC — zero API cost.
- **Free cloud next:** Gemini Flash-Lite / Groq for overflow or when the PC is busy.
- **Premium last (paid):** Claude (Opus/Sonnet) for articles, strategy briefs, fact-checking,
  and anything customer-facing where quality drives revenue.
- **Router:** a Code node (or OpenRouter) picks the model by task `tier` + remaining budget
  (from `AGENT-cost-governor`). Always log model + cost to Langfuse.
- **Resolve the existing discrepancy:** docs once suggested `gpt-4o-mini`; builders default to
  `claude-opus-4`. Decision: **local/free for volume, Claude for quality** — update WF env
  (`CLAUDE_MODEL`) and document per-task model in each workflow note.

---

## 14. Compliance, safety & guardrails
- **OSINT scope:** public, aggregate market/competitor/trend data only. **No** harvesting of
  personal emails, **no** tracking/profiling of individuals, **no** scraping behind logins,
  **respect** each source's robots.txt/ToS.
- **Email/leads:** opt-in (consent) only; GDPR/CAN-SPAM compliant; first-party; easy
  unsubscribe. Never buy or scrape lists; never spam.
- **Affiliate/FTC:** clear, conspicuous disclosure near affiliate links and on every pin; no
  fake reviews, no invented press/"as seen in", no fabricated ratings.
- **Platform ToS:** respect Amazon Associates + Pinterest rules; throttle posting; no
  misleading/sensational pin copy.
- **Human gates:** publish, spend-above-cap, and any public claim require human approval (via
  WhatsApp `approve` or a PR merge).
- **Secrets:** env/credentials only; never in git or in agent prompts. Rotate the keys in the
  `mcp.json` files + the `sync/full-local-state` branch after handoff. Prefer
  `mcp.example.json` in git.
- **Least privilege & local access:** when self-hosting, agents run inside the n8n/Docker
  sandbox with a **scoped workspace directory** and an **allowlist of commands** — never an
  unrestricted shell over the whole OS (§17).

---

## 15. KPIs & success metrics
- **North star:** monthly outbound clicks to Amazon → commission.
- **Top-of-funnel:** pins published/week, Pinterest impressions, saves, outbound clicks.
- **GEO:** AI-citation count (ChatGPT/Perplexity/AI Overviews), schema validation pass rate.
- **Content:** indexed pages, avg word count, internal-link density.
- **Ops:** agent success rate, mean cost/task, error rate, MTTR (mean time to recovery).
- **Growth:** consented subscribers, outbound CTR.
- **Finance (later):** revenue, cost, ROI per product/pin, reinvestment rate.

---

## 16. Phased roadmap
- **Phase 0 (stabilize):** fix canonical/domain, merge GEO upgrade to `main`, Pinterest token,
  WF-01 schema fix. (See `PROJECT_BIBLE.md §9`.)
- **Phase 1 (design dept):** Satori pin renderer replaces Canva; first real pins live.
- **Phase 2 (intel + content loop):** WF-06 → product → content (human-approved) → design.
- **Phase 3 (memory + analytics):** vector memory + WF-05 analytics + feedback learnings.
- **Phase 4 (control + self-host):** WhatsApp command center; migrate n8n to PC + Ollama.
- **Phase 5 (scale):** add DEPT-VIDEO, DEPT-FINANCE; reinvest revenue into paid tiers/volume.
Each phase is self-funding and independently shippable.

---

## 17. Security model
- **Identity:** one secret per webhook/route; bearer tokens for ingest; owner-only WhatsApp.
- **Least privilege:** each agent's tools/scopes limited to its task (e.g., DESIGN can render
  + read products, cannot publish; DISTRIB can publish, cannot edit products).
- **Local/self-host:** run n8n + agents in Docker; mount only a **scoped workspace**, not the
  whole disk; **allowlist** any shell command; no access to personal files, browser profiles,
  or credentials outside the project. Use a dedicated OS user.
- **Network:** Cloudflare Tunnel with access policies; only expose the webhooks that must be
  public.
- **Secrets hygiene:** rotate after handoff; `.gitignore` real secret files; keep
  `mcp.example.json` as the template.
- **Audit:** Langfuse + git history provide a full audit trail of who/what did what.

---

## 18. Glossary
- **Agent (agent):** an LLM + tools + memory performing one role autonomously.
- **Department / Crew (département):** a manager agent + specialist worker agents.
- **Orchestrator (orchestrateur):** the top manager that delegates and reviews.
- **Shared memory (mémoire partagée):** vector store + ledgers agents learn from.
- **Observability (observabilité):** tracing/eval of every agent run (Langfuse).
- **Human gate (validation humaine):** required human approval before sensitive actions.
- **OSINT:** open-source intelligence — here, public/aggregate market data only.
- **WF-0x:** an n8n workflow (see `n8n/README.md`).
- **GEO:** Generative Engine Optimization — being cited by AI answer engines.

---

### Cross-references
- Product/site state, ADRs, task queue → `PROJECT_BIBLE.md`
- n8n workflow inventory + env → `n8n/README.md`, `docs/n8n-architecture.md`
- Canva (legacy/future path) → `docs/CANVA_INTEGRATION.md`
- Pin spec / visual quality bar → `.kiro/specs/pinterest-pin-production-system/`
