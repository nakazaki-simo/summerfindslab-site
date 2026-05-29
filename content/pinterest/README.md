# AI Pinterest Pin Generation System — Summer Finds Lab

Fully AI-driven, batch-first, Pinterest-optimized pin production. Goal: take a product from `data/products.json` and turn it into 3+ ready-to-publish, save-magnet pins with **zero manual design work**.

```
data/products.json  ─┐
data/guides.json    ─┼──►  scripts/generate-pinterest-pins.mjs  ──►  data/pinterest-pins.json
data/categories.json ┘                                               content/pinterest/pins.csv
                                                                     content/pinterest/pins.md
                                                                            │
                                                                            ▼
                                              ┌──────────────────────────────────────────────┐
                                              │ Canva Bulk Create   │ Make.com / Zapier flow │
                                              │  (visuals)          │  (auto-publish)        │
                                              └──────────────────────────────────────────────┘
```

---

## What's in this folder

| File | What it is | Auto-generated? |
|---|---|:-:|
| [`README.md`](README.md) | This pipeline doc | ❌ |
| [`canva-prompts-50.md`](canva-prompts-50.md) | 50 manual-fallback Canva prompts + hook bank | ❌ |
| [`pins.csv`](pins.csv) | One row per pin, ready for Canva Bulk Create / scheduler | ✅ |
| [`pins.md`](pins.md) | Human-readable preview of every pin | ✅ |
| `../../data/pinterest-pins.json` | Machine-readable pin objects (for Make/Zapier) | ✅ |

Run anytime with:

```bash
npm run generate:pins
```

---

## The visual system (10 high-CTR formulas)

Every pin is rendered against one of these. The generator rotates them so no two pins for the same product look alike — that's how we beat Pinterest's duplicate-creative penalty and A/B which formula performs.

| # | Formula | Why it converts | Best for |
|---|---|---|---|
| 1 | **Bold Number List** | Numerals win the thumb-stop war | Roundup pins |
| 2 | **Curiosity Gap (POV)** | Open loop = click | Single-product hero pins |
| 3 | **This >>> That** | Comparison triggers System-2 attention | Upgrade-style narratives |
| 4 | **Price Tag Find** | Price anchor under $25 is Pinterest gold | Single-product, budget angle |
| 5 | **Moodboard Grid** | Collages drive ~3× saves vs single shots | Category covers + roundups |
| 6 | **Tutorial Stepper** | "How to" earns evergreen repins | Guide pins |
| 7 | **Aesthetic Lifestyle** | Pure aspiration → moodboard saves | Hero scene pins, no copy |
| 8 | **Neon Sticker / TikTok** | Y2K + viral language signal | TikTok-tag products |
| 9 | **Headline + Stat** | "★ 4.5 / 50+ reviews" beats plain copy | Trust-led products |
| 10 | **Gatekeep Roundup** | FOMO weaponized via insider tone | Curated lists |

Each formula carries a fixed **layout + palette + font pairing + Canva prompt skeleton + AI image prompt skeleton**, so brand consistency is built in.

> All pins are **1000×1500 (2:3)** — Pinterest's primary feed pin spec.

---

## Auto-generated outputs

### `data/pinterest-pins.json`

Each pin object is shaped like:

```json
{
  "id": "pin-007-curiosity-gap",
  "kind": "product",
  "productId": "momomus-...-001",
  "formulaId": "curiosity-gap",
  "formulaLabel": "Curiosity Gap (POV)",
  "aspectRatio": "2:3 (1000x1500)",
  "title": "POV: you find the perfect beach towel",
  "boardSuggestion": "beach-essentials | Summer Finds Lab",
  "link": "https://amzn.to/...?utm_source=pinterest&utm_medium=social&utm_campaign=summer-2026",
  "sourceImage": "https://m.media-amazon.com/images/I/...jpg",
  "textOverlay": "POV: you find the perfect beach towel",
  "secondaryStickers": ["AMAZON FIND"],
  "layout": "...",
  "palette": "...",
  "fonts": "...",
  "canvaPrompt": "Pinterest pin 1000x1500, full bleed lifestyle photo of ...",
  "imagePrompt": "Cinematic lifestyle photograph of ...",
  "collagePrompt": "Composite collage Pinterest pin, the existing Amazon product photo as the hero asset ...",
  "lifestylePrompt": "Cinematic lifestyle photograph evoking '...'",
  "description": "POV: you find the perfect beach towel — ... #summerfinds ...",
  "hashtags": ["#summerfinds", "#amazonfinds", "#summer2026", "..."],
  "cta": "Tap to shop on Amazon",
  "ctrLevers": ["open loop", "POV framing", "incomplete sentence"],
  "batch": "summer-2026-batch-01"
}
```

### `pins.csv` columns

```
id, kind, title, boardSuggestion, link, sourceImage, aspectRatio,
formulaId, textOverlay, description, hashtags,
canvaPrompt, imagePrompt, collagePrompt, lifestylePrompt
```

Drop this CSV directly into **Canva → Apps → Bulk Create → Connect data**. Canva will mass-render every row using the template you wire up (see Canva workflow below).

---

## Canva AI workflow (the no-manual-work path)

The fastest path. ~30 minutes to set up, then every future batch is 1 click.

### One-time setup

1. **Create a brand kit** in Canva → Brand → Brand Kit:
   - Colors: cream `#FAF3E7`, terracotta `#C97B5B`, ocean `#1F4E66`, butter `#FFE9A8`, sage `#C6D5B0`, dusty pink `#F5C2C7`, soft black `#1A1A1A`, neon coral `#FF5F3F`, neon green `#C4FF61`.
   - Display fonts: Playfair Display, Recoleta, Migra Italic, Editorial New, Tan Pearl.
   - Body fonts: Inter, DM Sans, DM Mono.
   - Logo + wordmark.
2. **Build 10 Canva templates**, one per formula (start with Bold Number List, Curiosity Gap, Price Tag Find — the highest CTR three). Each template:
   - Pinterest pin size 1000×1500.
   - Slots for: `{title}`, `{textOverlay}`, `{sourceImage}`, `{boardSuggestion}`, `{cta}`, `{hashtags}`.
   - Brand kit colors + fonts locked.

### Per batch (now 1 click)

1. `npm run generate:pins` → updates `pins.csv`.
2. In Canva, open one of the 10 formula templates → **Apps → Bulk Create → Upload CSV** → upload `pins.csv` → map fields.
3. Canva renders one pin per row in seconds.
4. **Magic Resize** the page to also produce 1080×1920 (Story / Idea pin) and 1080×1080 (Instagram cross-post) variants — single click.
5. Export all as PNG → drop into Pinterest scheduler or pass to Make.com (next section).

### Fallback when Canva templates aren't ready

Use **Canva Magic Design → Custom prompt** with any prompt from [`canva-prompts-50.md`](canva-prompts-50.md). Each prompt is brand-locked and Pinterest-sized, so output stays consistent.

---

## AI image generation pipeline (for fully synthetic / lifestyle pins)

When the Amazon product photo isn't enough — e.g. for moodboard pins, lifestyle backdrops, or category covers — use the prompts in `pins.json[*].imagePrompt` and `pins.json[*].lifestylePrompt`.

| Goal | Recommended model | Why |
|---|---|---|
| Lifestyle scene with the product *in context* | **Flux Pro 1.1** (multi-image reference) or **Gemini Nano Banana Pro** | Photoreal + can ingest the real product photo as reference for consistency |
| Pin with **text directly baked into the image** | **Ideogram 3.0** | Best-in-class typography rendering |
| Pure aesthetic moodboard / abstract | **Flux Pro 1.1** or **Midjourney v7** | Highest aesthetic ceiling |
| Cheap, batch volume | **Flux Schnell** or **Gemini Flash** | $/image is lowest |

> Keep `imagePrompt` for fully-synthetic scenes, `collagePrompt` when the real Amazon photo is the hero asset, `lifestylePrompt` for context shots without text.

### Sample API call (Flux via fal.ai)

```bash
curl -X POST https://fal.run/fal-ai/flux-pro/v1.1 \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "<imagePrompt from pins.json>",
    "image_size": { "width": 1000, "height": 1500 },
    "num_inference_steps": 28,
    "guidance_scale": 3.5
  }'
```

(Same shape works for Gemini Image, Ideogram, OpenAI GPT Image — only the URL and auth change. Use Ideogram when the prompt contains a quoted headline.)

---

## Batch automation: products → pins → Pinterest

End-to-end auto-publishing chain. Pick the stack you already use.

### Option A — Make.com (no code, recommended)

```
[CSV Watch: data/pinterest-pins.json or pins.csv]
   │
   ▼
[Iterator: one pin per record]
   │
   ▼
[HTTP POST → Flux/Gemini/Ideogram with imagePrompt]   (only needed for synthetic pins)
   │
   ▼
[Canva: Create design from template + record data]    (preferred for all pins)
   │
   ▼
[Pinterest: Create Pin]
   - Board:        {{boardSuggestion}}
   - Title:        {{title}}
   - Description:  {{description}}
   - Link:         {{link}}
   - Image:        {{Canva PNG export}}
```

### Option B — Direct Pinterest API + Canva Connect API

`POST https://api.pinterest.com/v5/pins` — see [Pinterest dev docs](https://developers.pinterest.com/docs/api/v5/pins-create). The CSV columns map 1:1 to the request body.

### Option C — Tailwind / Buffer / Later

Upload `pins.csv` directly. Most schedulers accept this exact column shape.

### Option D — Built-in Make-friendly JSON

Point Make.com or n8n at `data/pinterest-pins.json`. It's already iteration-ready.

---

## Pinterest-specific optimization rules baked in

1. **2:3 aspect ratio** — Pinterest specs say 1000×1500 outperforms 1:1 and 9:16 in feed.
2. **Keyword-front descriptions** — first 50 chars of `description` are SEO-loaded ("amazon summer finds", category name, "under $25").
3. **6–8 hashtags per pin** — auto-generated from product tags, not stuffed.
4. **One `boardSuggestion` per category** — keeps boards tight, which Pinterest's algo rewards.
5. **UTM-tagged affiliate links** — `utm_source=pinterest&utm_medium=social&utm_campaign=summer-2026`. Lets you measure conversions in your affiliate dashboard.
6. **3 visual variants per product** — different formulas avoid duplicate-creative penalty and let you A/B in real time.
7. **Title duplicates as text overlay** — Pinterest's CV pass rewards readable on-pin text that matches metadata.
8. **CTA always present** — "Tap to shop on Amazon" / "Read the editor-tested list" / "Shop the category".

---

## Quick start

```bash
# 1. Generate all pins from current product catalog
npm run generate:pins

# 2. Inspect
code content/pinterest/pins.md       # human preview
code data/pinterest-pins.json        # machine

# 3. Open Canva → Apps → Bulk Create → upload content/pinterest/pins.csv
#    pick a formula template, map fields, export PNGs.

# 4. Drop PNGs + descriptions into Tailwind / Pinterest scheduler.
#    OR pipe data/pinterest-pins.json into Make.com for full auto-publish.
```

That's the full loop. Add a product to `data/products.json`, run `npm run generate:pins`, and you have 3 new ready-to-publish pins per product — no manual design.

---

## Extending the system

- **Add a formula** — append to `FORMULAS` in `scripts/generate-pinterest-pins.mjs`. New pins for it will appear next run.
- **Add a hook** — append to `HOOKS` in the same file. Hooks are picked deterministically per pin so you'll see them spread across the catalog.
- **More variants per product** — change `pickN(FORMULAS, 3, seed)` to `4` or `5` in `generate()`.
- **Different niche** — swap `SCENES` and the `productNoun` keywords. Everything else generalizes.
