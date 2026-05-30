# Implementation Plan: Pinterest Pin Production System

## Overview

Produce the nine markdown deliverables under `.kiro/deliverables/pinterest-pin-production-system/`, plus a Node.js integrity-check script and a vitest property-test suite that validates the 24 correctness properties (P1–P24) defined in the design.

The order respects the cross-document foreign-key model (FK1–FK5):

```
D7 (PVBS, brand root) ─┐
D1 (Visual Strategy) ──┴─▶ D5 (Pin Styles, PS-*) ─▶ D4 (Canva Templates, CT-*)
                                                  │
                       ┌──────────────────────────┴── D8 (Headline Formulas, HF-*)
                       │                          │
                       │                          └── D6 (AI Prompts, PR-*)
                       │
                       └──▶ D2 (Canva Workflow) ─▶ D3 (50 Pin Concepts, PC-001..050)
                                                  │
                                                  ▶ Integrity check + property tests
                                                  │
                                                  ▶ D9 (README master index, mapping table + validation report)
```

Each property test lives in `.kiro/deliverables/pinterest-pin-production-system/__tests__/` and uses the parser implemented in `_check.mjs` (sibling). The implementation language is JavaScript (Node.js ES modules) with vitest as the test runner and `fast-check` for the seeded-violation regression in P4.

## Tasks

- [ ] 1. Set up deliverables directory and file scaffolds
  - [ ] 1.1 Create the deliverables directory and stub files for all nine deliverables
    - Create directory `.kiro/deliverables/pinterest-pin-production-system/`
    - Create empty (or H1-only) markdown stubs: `README.md`, `pin-visual-strategy.md`, `canva-production-workflow.md`, `pin-concepts.md`, `canva-template-recommendations.md`, `pin-styles.md`, `ai-image-prompts.md`, `pinterest-visual-branding-system.md`, `headline-formula-library.md`
    - Create `_check.mjs` with a placeholder default export (parser + assertions filled in later)
    - Create `__tests__/` subdirectory for vitest spec files
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Author D7: Pinterest Visual Branding System (brand root)
  - [ ] 2.1 Author `pinterest-visual-branding-system.md`
    - Section 1: "what this is and when to use it" opening paragraph
    - Section 2: primary palette of ≥6 hex colors (`brand.sun`, `brand.sand`, `brand.ocean`, `brand.sunset`, `brand.deep`, `brand.cta`, …)
    - Section 3: secondary/seasonal palette of ≥4 colors
    - Section 4: color role table (background, primary text, accent, CTA, divider, disclosure)
    - Section 5: font pairing — one display, one body, both Canva-native; specify `type.display`, `type.body`, optional `type.accent`
    - Section 6: font role table (primary hook, secondary hook, product label, CTA, disclosure)
    - Section 7: logo usage rules (placement zones, min size, clearspace, prohibited treatments)
    - Section 8: thumbnail optimization rules (≥4.5:1 contrast, ≤12 hook words, ≥80 px hook, Thumbnail Zone composition)
    - Section 9: brand voice for on-pin text (warm, confident, discovery-driven; no hype words like "INSANE")
    - Section 10: disclosure footer pattern (size, placement, color)
    - Section 11: accessibility minimum (4.5:1 for primary hook)
    - Section 12: do/don't gallery — ≥5 examples covering color, typography, layout
    - Section 13: how brand visuals vary across the seven Pin Styles while staying recognizably summerfindslab
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 12.2_

- [ ] 3. Author D1: Pin Visual Strategy
  - [ ] 3.1 Author `pin-visual-strategy.md`
    - Opening "what this is and when to use it" paragraph
    - Canonical canvas sizes: standard 1000×1500 (2:3) and Idea/video 1080×1920 (9:16)
    - Thumbnail Zone definition: top 40% / top 600 px of a 1500 px pin; primary hook MUST sit here
    - Mobile-Safe Area: central 80% of the canvas
    - ≥7 save-maximization rules (utility framing, list pins, save-for-later cues, seasonal relevance, before/after contrast, aspirational lifestyle, information density)
    - ≥7 click-maximization rules (curiosity gap, partial reveals, number-driven headlines, CTA placement, urgency, price anchoring, "see all" patterns)
    - ≥5 curiosity-maximization patterns (incomplete lists, hidden price, "the one nobody talks about", before/after teasers, "viral product nobody knows the name of")
    - Mobile-first rules: min 80 px hook font at 1000×1500, contrast/stroke minimums, max 12-word primary hook
    - Native-to-Pinterest design principle (editorial, not Instagram or Facebook ads)
    - Thumbnail optimization checklist
    - 236 px scroll-stop test
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11_

- [ ] 4. Author D5: Pin Styles (defines `PS-*` IDs)
  - [ ] 4.1 Author `pin-styles.md`
    - Opening "what this is and when to use it" paragraph
    - Define the seven required styles using the per-style schema: `PS-MIN`, `PS-TIK`, `PS-LUX`, `PS-VIR`, `PS-COL`, `PS-BAA`, `PS-LST`
    - For each style: visual signature, color treatment (referencing D7 brand tokens), typography treatment (referencing D7 font tokens), layout pattern, image treatment, text overlay rules, when to use, when NOT to use, three example pin titles, and `Default Canva template ID` (FK5 — points to a `CT-*` defined in D4)
    - Document the per-style behaviors required by Req 6.3–6.9 (Minimal off-white/sand + serif, TikTok captioned stickers, Luxury full-bleed lifestyle, Viral Amazon bright accents + price tags, Product Collage 2×2/2×3/3×3 grid, Before/After split with labels, List-Style numbered 3–7 items)
    - ≥3 hybrid combinations (e.g., Luxury Summer + List)
    - Styles-by-category matrix
    - Use relative markdown links when referencing D7 (`./pinterest-visual-branding-system.md`) and D4 (`./canva-template-recommendations.md`)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 1.5_

- [ ] 5. Author D4: Canva Template Recommendations (defines `CT-*` IDs)
  - [ ] 5.1 Author `canva-template-recommendations.md`
    - Opening summary paragraph
    - Canva Brand Kit specification (hex codes, fonts, logo files — sourced from D7)
    - Typography system (display, body, accent — Canva-native)
    - Font sizes in px at 1000×1500: primary hook (80–180), secondary hook, product label, price tag, CTA block, disclosure
    - 12-column grid with column width and gutter values
    - Spacing tokens `space.xs/sm/md/lg/xl` with semantic uses
    - Mobile-first visual rules: ≥4.5:1 contrast, ≥48 px edge padding, ≤30% text density
    - Layer stack convention (bottom→top: background → image → image-treatments → headline → sub-hook → CTA → logo → disclosure)
    - At least one Canva-reproducible template per Pin Style, using ID pattern `CT-<STYLE-CODE>-###` (e.g., `CT-MIN-001`, `CT-TIK-001`, `CT-LUX-001`, `CT-VIR-001`, `CT-COL-001`, `CT-BAA-001`, `CT-LST-001`)
    - Per-template entry must include: backing Pin Style ID (FK to D5), canvas, grid, full layer stack, text/image placement zones, CTA block placement, disclosure placement, Canva element type per layer
    - Locked layers principle (logo, disclosure, palette swatches stay unedited across batches)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11_

- [ ] 6. Author D8: Headline Formula Library (defines `HF-*` IDs)
  - [ ] 6.1 Author `headline-formula-library.md`
    - Opening summary paragraph
    - Define the four formula categories `HF-NUM`, `HF-CUR`, `HF-SOC`, `HF-ASP`
    - ≥20 formulas total, ≥1 per category, distributed for variety
    - Per-formula entry: ID, group, template with placeholders, emotional trigger, recommended Pin Style IDs (FK to D5), three filled examples, "do not use when" note
    - ≥5 sub-hook patterns
    - ≥5 CTA block patterns
    - Pinterest-prohibited phrase list with ≥10 phrases (covers "SHOCKING", "DOCTORS HATE THIS", "you won't believe", "INSANE", and similar Pinterest-down-ranked clickbait)
    - Headline evaluation checklist tying back to D7 brand voice and D1 CTR rules
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 12.1_

- [ ] 7. Author D6: AI Image Prompts (defines `PR-*` IDs)
  - [ ] 7.1 Author `ai-image-prompts.md`
    - Opening summary paragraph
    - Prompt structure template (subject, environment, lighting, color palette, style references, mood, framing, aspect ratio)
    - Three category sections — `PR-COLLAGE`, `PR-LIFESTYLE`, `PR-SUMMER` — with ≥20 prompts each, totalling ≥60
    - Per-prompt entry uses ID `PR-<CATEGORY>-###` and contains: category ID, intended use case, target Pin Style ID (FK to D5), recommended tools, recommended aspect ratio, prompt text variants for each of midjourney / flux / ideogram / nano-banana, negative prompts list, post-processing notes
    - Sub-tagging: ≥5 lifestyle scene prompts (beach, poolside, travel, aesthetic interior), ≥5 product hero prompts, ≥5 aesthetic flatlay prompts (linen, sand, marble, terrazzo)
    - Negative prompts list always includes patterns excluding text/typography artifacts, watermarks, unrealistic anatomy, brand logos
    - Prohibited prompt patterns section: no real people, no copyrighted characters, no named brand products
    - Backgrounds compatible with the Mobile-Safe Area constraint
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 12.7_

- [ ] 8. Author D2: Canva Production Workflow
  - [ ] 8.1 Author `canva-production-workflow.md`
    - Opening summary paragraph
    - Pre-batch checklist (template version, brand assets loaded, concept list selected, target categories chosen)
    - Master Canva template structure (canvas, grid, layer naming, locked vs editable layers)
    - Eight-stage content pipeline: concept intake → image sourcing → Canva assembly → text overlay → brand pass → thumbnail QA → export → upload metadata
    - Step-by-step single-pin workflow
    - Batch production workflow targeting 10–25 pins/session and ≥10 pins per 60 minutes
    - Variant scaling pattern (3 thumbnail variants, 2 color variants per concept via Canva "duplicate page")
    - Canva export settings (PNG, 1000×1500, RGB)
    - File-naming convention for exported pins: `<PC-ID>__<PS-ID>__<CT-ID>__YYYY-MM-DD__v<n>.png` with at least one fully worked example (e.g., `PC-014__PS-LUX__CT-LUX-002__2026-05-28__v1.png`)
    - Post-export QA checklist (236 px readability, Mobile-Safe Area, brand consistency, CTA presence)
    - Pinterest upload metadata templates (pin title, description, alt text, destination URL, board)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11_

- [ ] 9. Author D3: 50 Pin Concepts (defines `PC-001` … `PC-050`)
  - [ ] 9.1 Author `pin-concepts.md`
    - Opening summary paragraph + "how to read a concept entry" guide
    - Concept distribution summary (by category, by Pin Style, by emotional trigger, by CTR priority)
    - Exactly 50 concept entries `PC-001` … `PC-050` grouped by category, each filling every field of the per-concept schema (hook, sub-hook, target product category, Pin Style ID [FK1→D5], Canva template ID [FK2→D4], layout pattern, emotional trigger, AI prompt category IDs [FK3→D6, 1–5 entries], headline formula ID [FK4→D8], CTA block text, destination URL pattern on `summerfindslab.com`, CTR priority, seasonal relevance months)
    - Distribution constraints: every brand category {summer-finds, viral-gadgets, beach-essentials, tiktok-products, travel-accessories, aesthetic-products} has ≥5 concepts; ≥6 distinct headline formula IDs referenced overall; ≥5 distinct emotional triggers; every Pin Style in D5 referenced by ≥3 concepts
    - Price references use generic tiers ("Under $25", "Under $50") only — no fixed prices
    - Index by emotional trigger; index by Pin Style; index by season
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 12.6_

- [ ] 10. Set up integrity check script and property-based test suite
  - [ ] 10.1 Install vitest + fast-check, add npm scripts, configure vitest
    - Add `vitest` and `fast-check` as devDependencies in `package.json`
    - Add scripts: `"test": "vitest --run"`, `"test:watch": "vitest"`, `"check:ppps": "node .kiro/deliverables/pinterest-pin-production-system/_check.mjs"`
    - Create `vitest.config.mjs` at the repo root that scopes test discovery to `.kiro/deliverables/pinterest-pin-production-system/__tests__/**/*.test.mjs`
    - _Requirements: 10.5_

  - [ ] 10.2 Implement the markdown parser module in `_check.mjs`
    - Read every `.md` file in the deliverables directory
    - Parse and expose: the deliverable file set; every `PC-###`, `PS-*`, `CT-*`, `PR-*` (category and per-prompt), `HF-*` identifier and its surrounding fields; the D9 mapping table rows; cardinality-counted sections (D1 rules, D6 prompts and sub-tags, D7 palettes, D8 formulas/sub-hooks/CTAs/prohibited phrases); D7 color-token role rows; markdown links in every doc; per-doc H1 count, opening paragraph, line count, and code-block/table presence; D2 example filenames; D9 changelog entries
    - Export a `loadDeliverables()` function returning a structured object the property tests will consume
    - _Requirements: 10.5_

  - [ ]* 10.3 Write property test for Property 1 (deliverable set integrity)
    - **Property 1: Deliverable set integrity**
    - **Validates: Requirements 1.1, 1.2**
    - Assert the set of `.md` files in the deliverables directory equals the canonical set `{README.md, pin-visual-strategy.md, canva-production-workflow.md, pin-concepts.md, canva-template-recommendations.md, pin-styles.md, ai-image-prompts.md, pinterest-visual-branding-system.md, headline-formula-library.md}` with optional `appendix-deprecated.md`

  - [ ]* 10.4 Write property test for Property 22 (color token role completeness)
    - **Property 22: Color token role completeness**
    - **Validates: Requirements 8.3**
    - Iterate every D7 primary and seasonal palette token; assert non-empty `role` ∈ documented role set `{background, primary text, accent, CTA, divider, disclosure}` (or documented superset)

  - [ ]* 10.5 Write property test for Property 8 (style and template entry completeness)
    - **Property 8: Style and template entry completeness**
    - **Validates: Requirements 5.8, 5.9, 6.2, 11.6**
    - Iterate D5 entries — assert all schema fields non-empty
    - Iterate D4 entries — assert layer stack, text/image zones, CTA placement, disclosure placement, and per-layer Canva element type are all non-empty

  - [ ]* 10.6 Write property test for Property 9 (Style → Template coverage)
    - **Property 9: Style → Template coverage**
    - **Validates: Requirements 5.7**
    - For every `PS-*` defined in D5, assert ≥1 D4 template entry whose backing Pin Style equals that ID

  - [ ]* 10.7 Write property test for Property 12 (headline formula entry completeness)
    - **Property 12: Headline formula entry completeness**
    - **Validates: Requirements 9.2, 11.6**
    - Iterate every `HF-*` entry in D8; assert all schema fields non-empty and ≥3 filled examples

  - [ ]* 10.8 Write property test for Property 10 (AI prompt entry completeness)
    - **Property 10: AI prompt entry completeness**
    - **Validates: Requirements 7.3, 7.4**
    - Iterate every `PR-<CATEGORY>-###` entry in D6; assert non-empty schema fields and presence of tool-specific prompt-text variants for each of midjourney, flux, ideogram, nano-banana

  - [ ]* 10.9 Write property test for Property 11 (AI prompt safety)
    - **Property 11: AI prompt safety**
    - **Validates: Requirements 7.8, 7.12, 12.7**
    - Iterate every D6 prompt; regex-scan for real-person likenesses, copyrighted characters, named brand products; assert negative-prompt list contains patterns excluding text/typography artifacts, watermarks, unrealistic anatomy, brand logos

  - [ ]* 10.10 Write property test for Property 17 (file-naming convention)
    - **Property 17: File-naming convention**
    - **Validates: Requirements 3.6**
    - Iterate every example exported pin filename in D2; assert it matches `PC-\d{3}__PS-[A-Z]+__CT-[A-Z]+-\d{3}__\d{4}-\d{2}-\d{2}__v\d+\.png` and that every embedded `PC-`, `PS-`, `CT-` token resolves to a defined identifier in D3, D5, and D4 respectively

  - [ ]* 10.11 Write property test for Property 5 (concept entry completeness)
    - **Property 5: Concept entry completeness**
    - **Validates: Requirements 4.2, 4.9, 4.10**
    - Iterate `PC-001` … `PC-050`; assert all required fields non-empty and that `Target product category`, `Emotional trigger`, `CTR priority` are drawn from their fixed sets

  - [ ]* 10.12 Write property test for Property 6 (concept distribution)
    - **Property 6: Concept distribution**
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.6**
    - Group D3 by `Target product category`; assert partition into the six brand categories with ≥5 per category; assert ≥6 distinct headline formula IDs referenced overall; assert ≥5 distinct emotional triggers

  - [ ]* 10.13 Write property test for Property 7 (Pin Style usage minimum)
    - **Property 7: Pin Style usage minimum**
    - **Validates: Requirements 4.8**
    - For every `PS-*` defined in D5, assert ≥3 D3 concepts reference that style

  - [ ]* 10.14 Write property test for Property 13 (prohibited phrase compliance)
    - **Property 13: Prohibited phrase compliance**
    - **Validates: Requirements 9.6, 12.1, 12.5**
    - Iterate D3 hooks, sub-hooks, CTA blocks and D8 filled examples; assert disjoint with D8's prohibited-phrase list (case-insensitive, word-boundary aware)

  - [ ]* 10.15 Write property test for Property 14 (destination URL pattern)
    - **Property 14: Destination URL pattern**
    - **Validates: Requirements 12.6**
    - Iterate every D3 `Destination URL pattern`; assert begins with `https://summerfindslab.com/` and contains no link-shortener domain (`bit.ly`, `t.co`, `lnk.to`, `s.click.aspx`)

  - [ ]* 10.16 Write property test for Property 15 (price reference convention)
    - **Property 15: Price reference convention**
    - **Validates: Requirements 4.7**
    - Iterate every D3 hook, sub-hook, CTA text; assert price references match `Under \$\d+` and assert no `\$\d+\.\d{2}` hard-priced strings appear

  - [ ]* 10.17 Write property test for Property 2 (cross-document referential integrity)
    - **Property 2: Cross-document referential integrity (FK1–FK5)**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4**
    - For every D3 concept assert: FK1 `Pin Style ID` is non-empty and ∈ D5 IDs; FK2 `Canva template ID` is non-empty and ∈ D4 IDs; FK3 `AI prompt category IDs` has cardinality 1..5 and ⊆ D6 category IDs; FK4 `Headline formula ID` is non-empty and ∈ D8 IDs
    - For every D5 style assert: FK5 `Default Canva template ID` is non-empty and ∈ D4 IDs

  - [ ]* 10.18 Write property test for Property 16 (minimum cardinality table)
    - **Property 16: Minimum cardinality table**
    - **Validates: Requirements 2.5, 2.6, 2.7, 6.1, 6.11, 7.1, 7.2, 7.9, 7.10, 7.11, 8.1, 8.2, 8.7, 9.1, 9.4, 9.5, 12.1**
    - Drive the test from the static cardinality table in the design (D1 ≥7 save / ≥7 click / ≥5 curiosity, D5 ≥7 styles + must contain `{PS-MIN, PS-TIK, PS-LUX, PS-VIR, PS-COL, PS-BAA, PS-LST}`, D5 ≥3 hybrids, D6 ≥60 total / ≥20 per category, D6 ≥5 lifestyle / ≥5 product hero / ≥5 flatlay, D7 ≥6 primary / ≥4 seasonal / ≥5 do-don't, D8 ≥20 formulas / ≥5 sub-hooks / ≥5 CTAs / ≥10 prohibited)
    - One assertion per row

  - [ ]* 10.19 Write property test for Property 18 (document structure invariants)
    - **Property 18: Document structure invariants**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4**
    - Iterate every deliverable; assert exactly one H1, opening "what this is and when to use it" single-paragraph block, TOC iff line count > 500, every D4/D6/D8 per-entry block presented as code block or table

  - [ ]* 10.20 Write property test for Property 19 (jargon definition)
    - **Property 19: Jargon definition**
    - **Validates: Requirements 11.5**
    - For each jargon term `kerning`, `leading`, `tracking` and each deliverable, assert the first occurrence is followed within 30 words by a parenthetical plain-language definition

  - [ ]* 10.21 Write property test for Property 20 (relative cross-deliverable links)
    - **Property 20: Cross-deliverable links are relative**
    - **Validates: Requirements 1.5**
    - Parse every markdown link; for any link whose target filename matches another deliverable, assert the target is a relative path (e.g., `./pin-styles.md`) and not an absolute URL

  - [ ]* 10.22 Write property test for Property 23 (ID stability)
    - **Property 23: ID stability**
    - **Validates: Requirements 13.6**
    - Build the union of ID definitions across active deliverables and `appendix-deprecated.md` (if present); assert every referenced ID anywhere in the deliverable set is in that union

  - [ ] 10.23 Implement the Validation Report writer in `_check.mjs`
    - Add a function that takes the FK violation list produced by Property 2 and (a) emits `OK — no validation errors` or a markdown error table, and (b) replaces the body of the `## Validation Report` section in `README.md` with that output, preserving the rest of the file
    - Each error row uses fields `{ concept_id, asset_type ∈ {pin_style, canva_template, ai_prompt_category, headline_formula}, invalid_value, reason ∈ {missing, not-defined-in-source-doc, out-of-range} }`
    - Wire `node _check.mjs` to: parse → run all assertions → write the validation report block → exit non-zero on failure
    - _Requirements: 10.5, 10.6, 13.2_

  - [ ]* 10.24 Write property test for Property 4 (validation error coverage)
    - **Property 4: Validation error coverage**
    - **Validates: Requirements 10.5**
    - Use `fast-check` to generate seeded FK-violation sets (random `PC-###` choices and bad asset values) injected into a parsed-deliverables fixture; assert that the validation-report writer produces a corresponding entry for every injected violation, and that the affected concept is flagged not-ready-for-production
    - Minimum 100 iterations

- [ ] 11. Author D9: README master index
  - [ ] 11.1 Author `README.md` static content
    - Opening "what this is and when to use it" paragraph
    - Version field `v1.0` and changelog section (one initial entry with date, version, summary)
    - One-paragraph descriptions of each of the nine deliverables, each with a relative markdown link
    - Quick-start section: "produce a first pin in 30 minutes"
    - Seasonal refresh checklist (spring, summer, fall, winter)
    - Versioning policy (MAJOR for Pinterest policy changes, MINOR for new style/formula/prompt/concept)
    - Deprecated pattern note (link target `./appendix-deprecated.md`)
    - Editorial Review Checklist section covering Req 1.6 self-containment, Req 2.9 native-to-Pinterest, Req 8.8 brand voice, Req 11.7 quick-start, Req 12.1–12.4 Pinterest policy alignment
    - Empty `## Validation Report` section as a placeholder for task 11.3
    - _Requirements: 1.4, 11.7, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [ ] 11.2 Generate and embed the 50-row mapping table in `README.md`
    - Read the parsed D3 catalog via the `_check.mjs` parser
    - Render a markdown table with exactly the columns `Concept ID | Pin Style ID | Canva Template ID | AI Prompt Category IDs | Headline Formula ID` and exactly 50 rows (one per `PC-001`…`PC-050`)
    - Insert under a `## Mapping` section in `README.md`; assert no empty cells
    - _Requirements: 10.6_

  - [ ] 11.3 Run the integrity check and embed the Validation Report block
    - Execute `npm run check:ppps`
    - The writer from task 10.23 fills `## Validation Report` with either the OK line or the error table
    - _Requirements: 10.5_

  - [ ]* 11.4 Write property test for Property 3 (mapping table completeness)
    - **Property 3: Mapping table completeness**
    - **Validates: Requirements 10.6**
    - Parse the `## Mapping` table in `README.md`; assert exactly 50 rows; exactly the five required columns; no empty cells; every cell value resolves to a defined identifier in its source document

  - [ ]* 11.5 Write property test for Property 21 (master index link coverage)
    - **Property 21: Master index link coverage**
    - **Validates: Requirements 1.4**
    - For every deliverable filename other than `README.md`, assert `README.md` contains at least one relative markdown link whose target is that filename

  - [ ]* 11.6 Write property test for Property 24 (changelog entry completeness)
    - **Property 24: Changelog entry completeness**
    - **Validates: Requirements 13.2**
    - Iterate every D9 changelog entry; assert non-empty `date`, non-empty `version` matching `v\d+\.\d+`, non-empty `summary`

- [ ] 12. Final checkpoint - Ensure all tests pass and editorial review is complete
  - Run `npm run check:ppps` end-to-end and confirm the `## Validation Report` in `README.md` reads `OK — no validation errors`
  - Run `npm run test` and confirm all property tests pass (skipping any sub-tasks marked optional that were not implemented)
  - Confirm the Editorial Review Checklist in `README.md` lists every editorial criterion (Req 1.6, 2.9, 8.8, 11.7, 12.1–12.4) and that each entry is actionable
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 1.6, 2.9, 8.8, 10.5, 10.6, 11.7, 12.1, 12.2, 12.3, 12.4, 13.4_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; skipping them removes the property-test guarantee for that property but does not block the deliverable set from existing.
- Each task references specific requirement clauses for traceability; property-test sub-tasks additionally reference their property number from `design.md`.
- The integrity check (`_check.mjs`) and the vitest suite are complementary: `_check.mjs` is the one-shot validator that updates the `## Validation Report` block in `README.md`; the vitest suite is the regression harness that asserts each correctness property as a parameterized test over the parsed deliverable set.
- Task 11.3 depends on tasks 9.1, 10.2, 10.17, and 10.23 because it runs the assembled writer over the finished D3 catalog.
- D9 is intentionally last among the deliverables — its mapping table (11.2) and validation report (11.3) are derived views of the upstream documents.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "10.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "10.2"] },
    { "id": 2, "tasks": ["4.1", "6.1"] },
    { "id": 3, "tasks": ["5.1", "7.1"] },
    { "id": 4, "tasks": ["8.1"] },
    { "id": 5, "tasks": ["9.1"] },
    { "id": 6, "tasks": ["10.3", "10.4", "10.5", "10.6", "10.7", "10.8", "10.9", "10.10", "10.11", "10.12", "10.13", "10.14", "10.15", "10.16", "10.17", "10.18", "10.19", "10.20", "10.21", "10.22", "11.1"] },
    { "id": 7, "tasks": ["10.23", "11.2", "11.5", "11.6"] },
    { "id": 8, "tasks": ["10.24", "11.3", "11.4"] }
  ]
}
```
