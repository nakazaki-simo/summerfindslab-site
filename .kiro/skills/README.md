# Kiro Skills

This directory contains skills installed for use with Kiro / Claude.
Each subfolder is a single skill containing a `SKILL.md` file with metadata
(name, description) and instructions.

Skills in this folder are **workspace-level** — they apply only to this repository.
To activate a skill, use the `disclose_context` tool with the skill name.

## Sources

### From [anthropics/skills](https://github.com/anthropics/skills)

Official Anthropic skills.

- `claude-api` — Build, debug, and optimize Claude API / Anthropic SDK apps. Covers prompt caching, adaptive thinking, streaming, tool use, batches, files, citations, memory, Managed Agents, and Claude model migrations. Includes language-specific guides for Python, TypeScript/JavaScript, Java, Ruby, Go, PHP, C#, and cURL.

### From [geo-seo-claude](https://github.com/zubair-trabzada/geo-seo-claude)

GEO (Generative Engine Optimization) and SEO skills.

- `geo-audit` — Full website GEO+SEO audit
- `geo-brand-mentions` — Track brand mentions across AI answers
- `geo-citability` — Measure how citable your content is to AI
- `geo-compare` — Compare GEO performance across sites
- `geo-content` — GEO-optimized content production
- `geo-crawlers` — AI crawler analysis
- `geo-llmstxt` — `llms.txt` generation
- `geo-platform-optimizer` — Per-platform GEO tuning
- `geo-proposal` — Client GEO proposals
- `geo-prospect` — GEO-driven prospecting
- `geo-report` — GEO reporting
- `geo-report-pdf` — PDF report generation
- `geo-schema` — Schema.org for GEO
- `geo-technical` — Technical GEO checks
- `geo-update` — Maintenance updates

### From [marketingskills](https://github.com/coreyhaines31/marketingskills)

General marketing, growth, copy, and SEO skills.

- `ab-testing`, `ad-creative`, `ads`, `ai-seo`, `analytics`, `aso`
- `churn-prevention`, `cold-email`, `co-marketing`, `community-marketing`
- `competitor-profiling`, `competitors`, `content-strategy`
- `copy-editing`, `copywriting`, `cro`, `customer-research`
- `directory-submissions`, `emails`, `free-tools`
- `image`, `launch`, `lead-magnets`
- `marketing-ideas`, `marketing-psychology`, `onboarding`
- `paywalls`, `popups`, `pricing`, `product-marketing`
- `programmatic-seo`, `prospecting`, `referrals`, `revops`
- `sales-enablement`, `schema`, `seo-audit`, `signup`
- `site-architecture`, `sms`, `social`, `video`

## How to use

1. Open Kiro in this repository.
2. Ask Kiro to perform a marketing/SEO/GEO task — it will discover the
   matching skill and load it via the `disclose_context` mechanism.
3. You can also explicitly request a skill, e.g.
   *"Use the `copywriting` skill to rewrite my landing page hero."*

## Licenses

Skills retain the licenses of their source repositories. See:
- https://github.com/anthropics/skills/blob/main/LICENSE (and per-skill `LICENSE.txt` inside `claude-api/`)
- https://github.com/zubair-trabzada/geo-seo-claude/blob/main/LICENSE
- https://github.com/coreyhaines31/marketingskills/blob/main/LICENSE
