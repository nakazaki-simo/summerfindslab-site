#!/usr/bin/env node
/**
 * generate-pinterest-pins.mjs
 * --------------------------------------------------------------------------
 * AI-driven Pinterest pin generation pipeline for Summer Finds Lab.
 *
 * Reads:
 *   - data/products.json
 *   - data/guides.json
 *   - data/categories.json
 *
 * Writes:
 *   - data/pinterest-pins.json     (machine-readable, ready for Canva/Make/Zapier)
 *   - content/pinterest/pins.csv   (importable into Pinterest scheduler / Canva bulk create)
 *   - content/pinterest/pins.md    (human-readable preview)
 *
 * Each product yields 3 pin variants on different visual formulas to avoid
 * Pinterest spam-detection (duplicate creative penalty) and to A/B which
 * formula performs. Each guide yields 1 collection pin. Each category yields
 * 1 cover pin. Default budget: ~40-60 pins per run from the current catalog.
 *
 * Run:
 *   npm run generate:pins
 *
 * Dependencies: none. Pure Node, stdlib only.
 * --------------------------------------------------------------------------
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PRODUCTS_FILE = path.join(ROOT, "data", "products.json");
const GUIDES_FILE = path.join(ROOT, "data", "guides.json");
const CATEGORIES_FILE = path.join(ROOT, "data", "categories.json");
const OUT_JSON = path.join(ROOT, "data", "pinterest-pins.json");
const OUT_DIR = path.join(ROOT, "content", "pinterest");
const OUT_CSV = path.join(OUT_DIR, "pins.csv");
const OUT_MD = path.join(OUT_DIR, "pins.md");

const SITE = "https://summerfindslab.com";
const BRAND = "Summer Finds Lab";

/* ============================================================
 * 1. PINTEREST VISUAL FORMULAS
 *    10 high-CTR templates that rotate across the catalog.
 *    Each formula carries: layout, palette, font pairing, AI
 *    image prompt skeleton, Canva Magic Design prompt skeleton.
 * ============================================================ */

const FORMULAS = [
    {
        id: "bold-number-list",
        label: "Bold Number List",
        // Why it works: lists dominate Pinterest saves. Big numeral = thumb-stop.
        layout: "Top 35%: oversized serif numeral and headline. Middle 50%: 2x2 product collage on cream background. Bottom 15%: brand watermark + 'SAVE THIS' sticker.",
        palette: "warm cream #FAF3E7, terracotta #C97B5B, deep ocean #1F4E66, soft black #1A1A1A",
        fonts: "Display: Canela / Playfair Black. Body: Inter / DM Sans.",
        aspectRatio: "2:3 (1000x1500)",
        ctrLevers: ["numeric headline", "price-anchored subhead", "save sticker"],
        canvaSkeleton:
            "Pinterest pin 1000x1500 with a large serif numeral '{N}' centered at top, headline '{HOOK}' below, a 2x2 grid of product photos in the middle on a cream background, a small terracotta 'SAVE THIS' sticker bottom-right, and 'summerfindslab.com' wordmark bottom-left.",
        imagePromptSkeleton:
            "Editorial Pinterest pin layout, 2:3 vertical, oversized serif numeral '{N}' top, elegant headline '{HOOK}' beneath, four products arranged on a cream paper background with subtle shadows, warm afternoon light, modern luxury summer aesthetic, magazine moodboard style, high contrast text, --ar 2:3 --style raw"
    },
    {
        id: "curiosity-gap",
        label: "Curiosity Gap (POV)",
        // Why it works: open loop in headline => click to close it.
        layout: "Full-bleed lifestyle photo of the product. Bottom 30%: dark gradient overlay with white POV-style headline.",
        palette: "natural photography + white text + 12% black gradient overlay",
        fonts: "Display: Tan Pearl / Recoleta. Body: Inter Medium.",
        aspectRatio: "2:3 (1000x1500)",
        ctrLevers: ["open loop", "POV framing", "incomplete sentence"],
        canvaSkeleton:
            "Pinterest pin 1000x1500, full bleed lifestyle photo of {PRODUCT_TITLE}, dark gradient overlay on bottom third, large white serif headline '{HOOK}' bottom-left, tiny 'summerfindslab.com' bottom-right.",
        imagePromptSkeleton:
            "Cinematic lifestyle photograph of {PRODUCT_DESCRIPTOR} in a {SETTING}, golden hour, shallow depth of field, 35mm film grain, modern luxury Pinterest aesthetic, copy space at bottom for headline, vertical 2:3, --ar 2:3 --style raw"
    },
    {
        id: "this-vs-that",
        label: "This >>> That",
        // Why it works: comparison triggers System-2 attention.
        layout: "Vertical split: left half product/scene A, right half product/scene B. Diagonal banner with 'vs' or '>>>' text.",
        palette: "split complementary - sand #E8D8B7 vs cobalt #2746C8",
        fonts: "Display: Migra Italic. Body: Inter.",
        aspectRatio: "2:3 (1000x1500)",
        ctrLevers: ["comparison", "winner declaration", "dual product reveal"],
        canvaSkeleton:
            "Pinterest pin 1000x1500 split vertically, left side cluttered/old version, right side clean lifestyle of {PRODUCT_TITLE}, diagonal italic text '{HOOK}' across the middle, brand watermark bottom-center.",
        imagePromptSkeleton:
            "Split vertical Pinterest pin, left half generic boring beach scene, right half elevated aesthetic scene featuring {PRODUCT_DESCRIPTOR}, diagonal italic serif text '{HOOK}', clean editorial layout, 2:3, --ar 2:3"
    },
    {
        id: "price-tag-find",
        label: "Price Tag Find",
        // Why it works: explicit price under $25 is a Pinterest power-trigger.
        layout: "Centered hero product photo on solid pastel. Neon or red price-tag sticker at top-right. Headline below.",
        palette: "pastel pistachio #CFE8D7 OR butter #FFE9A8 + neon coral price tag #FF5F3F",
        fonts: "Display: Cooper BT Black. Body: DM Mono.",
        aspectRatio: "2:3 (1000x1500)",
        ctrLevers: ["price anchor", "scarcity badge", "single hero product"],
        canvaSkeleton:
            "Pinterest pin 1000x1500, single product photo of {PRODUCT_TITLE} centered on pastel background, oversized neon coral price tag 'UNDER $25' top-right rotated 12 degrees, bold rounded headline '{HOOK}' bottom, brand wordmark.",
        imagePromptSkeleton:
            "Studio product shot of {PRODUCT_DESCRIPTOR} centered on pastel pistachio paper, soft window light, oversized red price tag sticker rotated 12 degrees top-right, playful retro Amazon find pin, vertical 2:3, --ar 2:3 --style raw"
    },
    {
        id: "moodboard-grid",
        label: "Moodboard Grid",
        // Why it works: collages get 3x saves vs single-product pins (Tailwind data).
        layout: "3x4 or 2x3 grid of square tiles - some products, some lifestyle, one with bold text overlay, one solid color.",
        palette: "monochromatic - one base hue plus white/cream",
        fonts: "Display: GT Sectra. Body: Inter.",
        aspectRatio: "2:3 (1000x1500)",
        ctrLevers: ["save-as-board", "color cohesion", "multiple price points"],
        canvaSkeleton:
            "Pinterest pin 1000x1500 with a 2x3 grid of square tiles, alternating product photos and pastel color blocks, one tile contains the headline '{HOOK}' in serif, one tile is a typographic '$25 & UNDER' tag, brand wordmark across bottom strip.",
        imagePromptSkeleton:
            "Pinterest moodboard collage 2x3 grid, mix of {PRODUCT_DESCRIPTOR} product shots and lifestyle vignettes, monochromatic warm beige palette, one tile with serif headline '{HOOK}', editorial luxury summer aesthetic, vertical 2:3, --ar 2:3 --style raw"
    },
    {
        id: "tutorial-stepper",
        label: "Tutorial Stepper",
        // Why it works: 'how to' pins get repinned to evergreen boards.
        layout: "Top: headline. Body: 3-4 numbered steps with mini product thumbnails. Bottom: 'tap to shop' CTA.",
        palette: "soft white #FFFFFF + ocean #2E6F95 + sand #EBD8B5",
        fonts: "Display: Editorial New. Body: Inter.",
        aspectRatio: "2:3 (1000x1500)",
        ctrLevers: ["utility framing", "step icons", "tap-to-shop CTA"],
        canvaSkeleton:
            "Pinterest pin 1000x1500, headline '{HOOK}' top, four numbered rows each with a circle icon, mini product image, step name and 1-line tip, ocean blue accent line, 'tap to shop the list' CTA at bottom.",
        imagePromptSkeleton:
            "Clean infographic Pinterest pin, headline '{HOOK}', four numbered horizontal steps each with a small product photo of summer finds, soft sand and ocean blue accents, modern editorial typography, vertical 2:3, --ar 2:3 --style raw"
    },
    {
        id: "aesthetic-lifestyle",
        label: "Aesthetic Lifestyle Scene",
        // Why it works: pure aspiration - drives saves to mood boards.
        layout: "Full-bleed cinematic lifestyle scene featuring the product in context. Tiny brand watermark bottom-right only.",
        palette: "natural film palette - bias warm",
        fonts: "Optional ultra-thin serif watermark only.",
        aspectRatio: "2:3 (1000x1500)",
        ctrLevers: ["aspiration", "no-text save", "scene completeness"],
        canvaSkeleton:
            "Pinterest pin 1000x1500, full-bleed lifestyle photo of {PRODUCT_TITLE} in a {SETTING}, no headline overlay, tiny serif 'summerfindslab.com' watermark bottom-right.",
        imagePromptSkeleton:
            "Photoreal cinematic editorial photograph of {PRODUCT_DESCRIPTOR} in a {SETTING}, late afternoon golden hour, 35mm film, Kodak Portra 400 grain, modern luxury summer aesthetic, vertical Pinterest 2:3, --ar 2:3 --style raw"
    },
    {
        id: "neon-sticker-tiktok",
        label: "TikTok Sticker Stack",
        // Why it works: signals 'viral' and matches Gen-Z visual language.
        layout: "Hero product photo, three or four loud bubble stickers stacked diagonally - 'TIKTOK MADE ME DO IT', 'SOLD OUT 3X', 'AMAZON FAVE'.",
        palette: "soft black + neon green #C4FF61 + electric pink #FF3FA4",
        fonts: "Display: Migra Black. Body: hand-drawn.",
        aspectRatio: "2:3 (1000x1500)",
        ctrLevers: ["social proof badges", "viral language", "high-contrast neon"],
        canvaSkeleton:
            "Pinterest pin 1000x1500, product photo of {PRODUCT_TITLE} centered on soft black, neon green and electric pink starburst stickers stacked diagonally, top sticker '{HOOK}', secondary stickers 'TIKTOK MADE ME', 'SOLD OUT 3X', 'AMAZON FAVE'.",
        imagePromptSkeleton:
            "Y2K Pinterest pin, product photo of {PRODUCT_DESCRIPTOR} on soft black, neon green and hot pink hand-drawn starburst stickers, retro glossy stickers, high-energy TikTok visual language, vertical 2:3, --ar 2:3 --style raw"
    },
    {
        id: "headline-stat",
        label: "Headline + Social-Proof Stat",
        // Why it works: review counts and ratings beat plain copy.
        layout: "Top half: oversized stat ('★ 4.5 / 50+ reviews'). Bottom half: hero product, then headline.",
        palette: "ivory + sage + black",
        fonts: "Display: Domaine Display. Body: Inter Bold.",
        aspectRatio: "2:3 (1000x1500)",
        ctrLevers: ["star rating", "review count", "specificity"],
        canvaSkeleton:
            "Pinterest pin 1000x1500, top large display '★ {RATING} / {REVIEWS}+ reviews', under it the headline '{HOOK}', under it a clean cutout of {PRODUCT_TITLE}, sage green accents.",
        imagePromptSkeleton:
            "Editorial Pinterest pin, oversized stat '★ {RATING} / {REVIEWS}+ reviews' top, headline '{HOOK}' middle, clean cutout product photo of {PRODUCT_DESCRIPTOR} on ivory paper background, sage green accent strokes, modern luxury summer aesthetic, 2:3, --ar 2:3 --style raw"
    },
    {
        id: "secret-roundup",
        label: "Gatekeep Roundup",
        // Why it works: 'gatekeeping' framing weaponizes FOMO.
        layout: "Headline top with 'I'm gatekeeping these' or similar. 3 stacked horizontal product cards. Bottom CTA.",
        palette: "dusty pink #F5C2C7 + chocolate #4B2A19 + cream",
        fonts: "Display: Recoleta Bold Italic. Body: Inter.",
        aspectRatio: "2:3 (1000x1500)",
        ctrLevers: ["FOMO framing", "secret/insider tone", "stacked cards"],
        canvaSkeleton:
            "Pinterest pin 1000x1500, headline '{HOOK}' italic at top, three stacked horizontal product cards each with photo + name + tiny price, dusty pink background, chocolate brown text, brand wordmark bottom.",
        imagePromptSkeleton:
            "Editorial Pinterest collage, headline '{HOOK}' italic top, three stacked horizontal product cards on dusty pink paper, chocolate serif type, modern luxury summer aesthetic, vertical 2:3, --ar 2:3 --style raw"
    }
];

/* ============================================================
 * 2. HOOK BANK
 *    Viral Pinterest hooks per intent. We mix per formula.
 * ============================================================ */

const HOOKS = {
    // Single-product hooks - {p} is product noun, {price} optional
    product: [
        "I'm gatekeeping this {p}",
        "Amazon, what is this {p}?",
        "TikTok made me buy this {p}",
        "This {p} is selling out (again)",
        "POV: you find the perfect {p}",
        "The {p} I won't shut up about",
        "Save this before it sells out",
        "This {p} is your sign",
        "Why is everyone buying this {p}?",
        "Run, don't walk, to this {p}",
        "Under $25 and selling out",
        "Worth every penny",
        "This {p} >>> everything else"
    ],
    // Roundup / list hooks
    roundup: [
        "{n} Amazon summer finds I can't stop saving",
        "{n} viral Amazon finds for under $25",
        "{n} TikTok-famous summer products that actually work",
        "{n} aesthetic Amazon finds for summer",
        "{n} beach essentials that earned their tote space",
        "{n} travel finds that fit in your carry-on",
        "{n} summer gadgets I'm gatekeeping",
        "{n} Amazon finds for a soft summer"
    ],
    // Category cover hooks
    category: [
        "The aesthetic {cat} starter pack",
        "Amazon {cat} that look luxe",
        "{cat} for a Pinterest summer",
        "Save this {cat} board",
        "The only {cat} list you need"
    ],
    // Curiosity / lifestyle pure hooks (no template variable)
    curiosity: [
        "Soft summer starts here",
        "If you know, you know",
        "It girl summer.",
        "Pinned for a reason.",
        "Quietly the best $25 you'll spend"
    ]
};

/* ============================================================
 * 3. SETTINGS / SCENES
 *    Lifestyle context per category for AI prompts.
 * ============================================================ */

const SCENES = {
    "beach-essentials":
        "sunlit beach moment, linen tote, sandy towel, ceramic mug, palm shadows on a pastel wall",
    travel:
        "open suitcase on a hotel bed, linen sheets, passport and sunglasses, soft morning light",
    "summer-gadgets":
        "minimal cream desk by an open window, raffia placemat, ceramic vase, soft afternoon light",
    "skincare-summer":
        "marble bathroom counter, dewy droplets, warm sunlight through linen curtain",
    "aesthetic-room":
        "soft pastel bedroom corner with rattan headboard, linen bedding and a small ceramic lamp",
    "pet-summer":
        "linen blanket on grass, dappled afternoon light, golden retriever lounging",
    default:
        "warm cream paper backdrop with soft window light and a sprig of dried grass"
};

/* ============================================================
 * 4. UTILS
 * ============================================================ */

function readJson(p) {
    return JSON.parse(fs.readFileSync(p, "utf8"));
}

function ensureDir(p) {
    fs.mkdirSync(p, { recursive: true });
}

function pick(arr, seed) {
    // deterministic pick by seed string
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return arr[h % arr.length];
}

function pickN(arr, n, seed) {
    const out = [];
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const seen = new Set();
    let i = 0;
    while (out.length < Math.min(n, arr.length) && i < arr.length * 3) {
        const idx = (h + i * 17) % arr.length;
        if (!seen.has(idx)) {
            seen.add(idx);
            out.push(arr[idx]);
        }
        i++;
    }
    return out;
}

function productNoun(p) {
    // Reduce a product title to a 1-3 word noun for hook substitution.
    const t = (p.title || "").toLowerCase();
    if (t.includes("fan")) return "mini fan";
    if (t.includes("blender")) return "portable blender";
    if (t.includes("scale") || t.includes("pèse") || t.includes("balance")) return "luggage scale";
    if (t.includes("towel") || t.includes("fouta") || t.includes("serviette")) return "beach towel";
    if (t.includes("tumbler")) return "tumbler";
    if (t.includes("spray") || t.includes("pulvérisateur")) return "mist spray";
    if (t.includes("light") || t.includes("lamp") || t.includes("lampe")) return "aesthetic lamp";
    if (t.includes("bag") || t.includes("sac")) return "tote bag";
    if (t.includes("sunscreen") || t.includes("spf")) return "summer skincare hero";
    if (t.includes("collar") || t.includes("leash")) return "pet summer find";
    return "Amazon summer find";
}

function descriptor(p) {
    // Compact noun phrase used in image prompts.
    const noun = productNoun(p);
    const cat = (p.category || "").replace(/-/g, " ");
    return `${noun} (a ${cat} product)`;
}

function fillHook(template, ctx) {
    return template
        .replace(/\{p\}/g, ctx.p || "Amazon find")
        .replace(/\{n\}/g, ctx.n != null ? String(ctx.n) : "")
        .replace(/\{cat\}/g, ctx.cat || "summer finds")
        .replace(/\{price\}/g, ctx.price ? `$${Math.round(ctx.price)}` : "")
        .replace(/\{rating\}/g, ctx.rating || "4.5")
        .replace(/\{reviews\}/g, ctx.reviews || "50")
        .replace(/\s+/g, " ")
        .trim();
}

function fillTemplate(skeleton, vars) {
    return Object.entries(vars).reduce(
        (s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, "g"), v ?? ""),
        skeleton
    );
}

function pinterestDescription({ hook, product, category, hashtags }) {
    // Pinterest-optimized: keyword-stuffed first sentence (SEO), 2nd sentence emotional, then # tags.
    const kw = [
        "amazon summer finds",
        "viral tiktok products",
        "summer 2026",
        category && category.replace(/-/g, " "),
        "amazon finds under 25",
        "aesthetic amazon"
    ]
        .filter(Boolean)
        .join(", ");
    const emo = product
        ? `${product.description || product.title}`
        : "Hand-picked, editor-tested, save the board.";
    return `${hook} — ${emo} Tap to shop the link. Keywords: ${kw}. ${hashtags.join(" ")}`.slice(
        0,
        500
    );
}

function hashtagsFor(item) {
    const base = ["#summerfinds", "#amazonfinds", "#summer2026", "#pinterestaesthetic"];
    if (!item) return base;
    const cat = (item.category || "").replace(/-/g, "");
    if (cat) base.push(`#${cat}`);
    if ((item.tags || []).includes("tiktok")) base.push("#tiktokmademebuyit");
    if ((item.tags || []).includes("under-25")) base.push("#under25");
    if ((item.tags || []).includes("trending")) base.push("#trendingnow");
    return base.slice(0, 8);
}

function withUtm(url, source = "pinterest", medium = "social", campaign = "summer-2026") {
    if (!url) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign}`;
}

/* ============================================================
 * 5. PIN BUILDERS
 * ============================================================ */

function buildProductPin({ product, formula, variantIndex }) {
    const seed = `${product.id}::${formula.id}::${variantIndex}`;
    const noun = productNoun(product);
    const setting = SCENES[product.category] || SCENES.default;
    const hookTemplate =
        formula.id === "headline-stat"
            ? pick(HOOKS.product.filter((h) => h.includes("{p}")), seed)
            : pick(HOOKS.product, seed);
    const hook = fillHook(hookTemplate, {
        p: noun,
        rating: product.rating?.value || 4.5,
        reviews: product.rating?.count || 50,
        price: product.price
    });

    const vars = {
        N: 0,
        HOOK: hook,
        PRODUCT_TITLE: product.title,
        PRODUCT_DESCRIPTOR: descriptor(product),
        SETTING: setting,
        RATING: product.rating?.value || "4.5",
        REVIEWS: product.rating?.count || "50"
    };

    const tags = hashtagsFor(product);

    return {
        kind: "product",
        productId: product.id,
        formulaId: formula.id,
        formulaLabel: formula.label,
        aspectRatio: formula.aspectRatio,
        title: hook,
        boardSuggestion: `${product.category} | ${BRAND}`,
        link: withUtm(product.affiliateUrl || `${SITE}/category/${product.category}`),
        sourceImage: product.image,
        textOverlay: hook,
        secondaryStickers: ["AMAZON FIND", "UNDER $25", "TIKTOK FAVE"].slice(
            0,
            formula.id === "neon-sticker-tiktok" ? 3 : 1
        ),
        layout: formula.layout,
        palette: formula.palette,
        fonts: formula.fonts,
        canvaPrompt: fillTemplate(formula.canvaSkeleton, vars),
        imagePrompt: fillTemplate(formula.imagePromptSkeleton, vars),
        collagePrompt: `Composite collage Pinterest pin, the existing Amazon product photo as the hero asset (do NOT regenerate the product), placed on a ${formula.palette.split(",")[0]} background, headline '${hook}' in ${formula.fonts.split(".")[0]}, vertical 2:3, layered with paper texture and a single soft drop shadow.`,
        lifestylePrompt: `Cinematic lifestyle photograph evoking '${hook}', ${descriptor(product)} placed in ${setting}, golden hour, 35mm film grain, modern luxury summer aesthetic, vertical Pinterest 2:3, --ar 2:3 --style raw`,
        description: pinterestDescription({
            hook,
            product,
            category: product.category,
            hashtags: tags
        }),
        hashtags: tags,
        cta: "Tap to shop on Amazon",
        ctrLevers: formula.ctrLevers
    };
}

function buildGuidePin(guide) {
    const seed = `guide::${guide.slug}`;
    const formula = pick(
        FORMULAS.filter((f) =>
            ["bold-number-list", "moodboard-grid", "tutorial-stepper", "secret-roundup"].includes(
                f.id
            )
        ),
        seed
    );
    const n = (guide.productIds || []).length || 7;
    const hookTemplate = pick(HOOKS.roundup, seed);
    const hook = fillHook(hookTemplate, { n, cat: guide.category });

    const vars = {
        N: n,
        HOOK: hook,
        PRODUCT_TITLE: guide.title,
        PRODUCT_DESCRIPTOR: `the ${guide.category} roundup`,
        SETTING: SCENES[guide.category] || SCENES.default
    };

    const tags = hashtagsFor({ category: guide.category, tags: ["trending"] });

    return {
        kind: "guide",
        guideSlug: guide.slug,
        formulaId: formula.id,
        formulaLabel: formula.label,
        aspectRatio: formula.aspectRatio,
        title: hook,
        boardSuggestion: `${guide.category} guides | ${BRAND}`,
        link: withUtm(`${SITE}/guides/${guide.slug}`),
        sourceImage: null,
        textOverlay: hook,
        secondaryStickers: ["EDITOR-TESTED", "SAVE THE LIST"],
        layout: formula.layout,
        palette: formula.palette,
        fonts: formula.fonts,
        canvaPrompt: fillTemplate(formula.canvaSkeleton, vars),
        imagePrompt: fillTemplate(formula.imagePromptSkeleton, vars),
        collagePrompt: `Pinterest collection pin for the guide '${guide.title}', a 2x3 grid of square product tiles on cream paper, italic serif headline '${hook}', editor-tested badge, brand watermark.`,
        lifestylePrompt: `Editorial flat lay representing '${guide.title}', curated ${guide.category} products arranged on cream paper, soft window light, modern luxury summer aesthetic, vertical 2:3, --ar 2:3 --style raw`,
        description: pinterestDescription({
            hook,
            product: { title: guide.title, description: guide.intro, category: guide.category },
            category: guide.category,
            hashtags: tags
        }),
        hashtags: tags,
        cta: "Read the editor-tested list",
        ctrLevers: formula.ctrLevers
    };
}

function buildCategoryPin(category) {
    const seed = `cat::${category.slug}`;
    const formula = pick(
        FORMULAS.filter((f) =>
            ["aesthetic-lifestyle", "moodboard-grid", "secret-roundup"].includes(f.id)
        ),
        seed
    );
    const hookTemplate = pick(HOOKS.category, seed);
    const hook = fillHook(hookTemplate, { cat: category.name.toLowerCase() });

    const vars = {
        N: 0,
        HOOK: hook,
        PRODUCT_TITLE: category.name,
        PRODUCT_DESCRIPTOR: `the ${category.name} edit`,
        SETTING: SCENES[category.slug] || SCENES.default
    };

    const tags = hashtagsFor({ category: category.slug, tags: ["trending"] });

    return {
        kind: "category",
        categorySlug: category.slug,
        formulaId: formula.id,
        formulaLabel: formula.label,
        aspectRatio: formula.aspectRatio,
        title: hook,
        boardSuggestion: `${category.name} | ${BRAND}`,
        link: withUtm(`${SITE}/category/${category.slug}`),
        sourceImage: category.image,
        textOverlay: hook,
        secondaryStickers: ["SHOP THE EDIT"],
        layout: formula.layout,
        palette: formula.palette,
        fonts: formula.fonts,
        canvaPrompt: fillTemplate(formula.canvaSkeleton, vars),
        imagePrompt: fillTemplate(formula.imagePromptSkeleton, vars),
        collagePrompt: `Category cover Pinterest pin for '${category.name}', moodboard collage of representative items on a soft palette consistent with ${category.tagline}, italic serif headline '${hook}', brand watermark.`,
        lifestylePrompt: `Cinematic lifestyle photograph representing the '${category.name}' edit, ${SCENES[category.slug] || SCENES.default}, modern luxury summer aesthetic, vertical Pinterest 2:3, --ar 2:3 --style raw`,
        description: pinterestDescription({
            hook,
            product: {
                title: category.name,
                description: category.tagline,
                category: category.slug
            },
            category: category.slug,
            hashtags: tags
        }),
        hashtags: tags,
        cta: "Shop the category",
        ctrLevers: formula.ctrLevers
    };
}

/* ============================================================
 * 6. ORCHESTRATION
 * ============================================================ */

function generate() {
    const products = readJson(PRODUCTS_FILE);
    const guides = fs.existsSync(GUIDES_FILE) ? readJson(GUIDES_FILE) : [];
    const categories = fs.existsSync(CATEGORIES_FILE) ? readJson(CATEGORIES_FILE) : [];

    const pins = [];

    // 3 variants per product on different formulas
    for (const p of products) {
        const seed = p.id;
        const chosen = pickN(FORMULAS, 3, seed);
        chosen.forEach((formula, i) => {
            pins.push(buildProductPin({ product: p, formula, variantIndex: i }));
        });
    }

    // 1 collection pin per guide
    for (const g of guides) pins.push(buildGuidePin(g));

    // 1 cover pin per category
    for (const c of categories) pins.push(buildCategoryPin(c));

    // Stable order: kind > formula > title
    pins.sort((a, b) => {
        const ka = `${a.kind}::${a.formulaId}::${a.title}`;
        const kb = `${b.kind}::${b.formulaId}::${b.title}`;
        return ka.localeCompare(kb);
    });

    // Index identifiers
    pins.forEach((pin, i) => {
        pin.id = `pin-${String(i + 1).padStart(3, "0")}-${pin.formulaId}`;
        pin.batch = "summer-2026-batch-01";
    });

    return { pins, products, guides, categories };
}

/* ============================================================
 * 7. WRITERS
 * ============================================================ */

function writeJson(pins) {
    fs.writeFileSync(OUT_JSON, JSON.stringify(pins, null, 2));
}

function csvEscape(v) {
    if (v == null) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
}

function writeCsv(pins) {
    // Pinterest scheduler-friendly columns + Canva bulk-create columns.
    const headers = [
        "id",
        "kind",
        "title",
        "boardSuggestion",
        "link",
        "sourceImage",
        "aspectRatio",
        "formulaId",
        "textOverlay",
        "description",
        "hashtags",
        "canvaPrompt",
        "imagePrompt",
        "collagePrompt",
        "lifestylePrompt"
    ];
    const rows = pins.map((p) =>
        [
            p.id,
            p.kind,
            p.title,
            p.boardSuggestion,
            p.link,
            p.sourceImage,
            p.aspectRatio,
            p.formulaId,
            p.textOverlay,
            p.description,
            (p.hashtags || []).join(" "),
            p.canvaPrompt,
            p.imagePrompt,
            p.collagePrompt,
            p.lifestylePrompt
        ]
            .map(csvEscape)
            .join(",")
    );
    fs.writeFileSync(OUT_CSV, [headers.join(","), ...rows].join("\n"));
}

function writeMarkdown(pins) {
    const groups = new Map();
    for (const p of pins) {
        if (!groups.has(p.formulaId)) groups.set(p.formulaId, []);
        groups.get(p.formulaId).push(p);
    }
    const lines = [
        `# Pinterest Pins — ${BRAND}`,
        ``,
        `Generated ${new Date().toISOString().slice(0, 10)} • ${pins.length} pins • ${FORMULAS.length} formulas`,
        ``,
        `Each pin is 1000×1500 (2:3), Pinterest-optimized, ready to drop into Canva, Make.com, or a Pinterest scheduler.`,
        ``,
        `**Open the CSV in Canva → Apps → Bulk Create → Connect data** to mass-produce. Each row becomes one pin.`,
        ``
    ];
    for (const [formulaId, list] of groups) {
        const f = FORMULAS.find((x) => x.id === formulaId);
        lines.push(`## ${f.label} (${list.length})`);
        lines.push(``);
        lines.push(`> ${f.layout}`);
        lines.push(``);
        for (const pin of list) {
            lines.push(`### ${pin.id} — ${pin.title}`);
            lines.push(``);
            lines.push(`- **Kind**: ${pin.kind}`);
            lines.push(`- **Board**: ${pin.boardSuggestion}`);
            lines.push(`- **Link**: ${pin.link}`);
            if (pin.sourceImage) lines.push(`- **Source image**: ${pin.sourceImage}`);
            lines.push(`- **Palette**: ${pin.palette}`);
            lines.push(`- **Fonts**: ${pin.fonts}`);
            lines.push(``);
            lines.push(`**Canva Magic Design prompt**`);
            lines.push("```");
            lines.push(pin.canvaPrompt);
            lines.push("```");
            lines.push(`**AI image prompt (Flux / Gemini / Ideogram)**`);
            lines.push("```");
            lines.push(pin.imagePrompt);
            lines.push("```");
            lines.push(`**Collage prompt (uses real product photo)**`);
            lines.push("```");
            lines.push(pin.collagePrompt);
            lines.push("```");
            lines.push(`**Lifestyle prompt**`);
            lines.push("```");
            lines.push(pin.lifestylePrompt);
            lines.push("```");
            lines.push(`**Description**`);
            lines.push(`> ${pin.description}`);
            lines.push(``);
        }
    }
    fs.writeFileSync(OUT_MD, lines.join("\n"));
}

/* ============================================================
 * 8. MAIN
 * ============================================================ */

function main() {
    ensureDir(OUT_DIR);
    const { pins } = generate();
    writeJson(pins);
    writeCsv(pins);
    writeMarkdown(pins);
    const byFormula = pins.reduce((acc, p) => {
        acc[p.formulaId] = (acc[p.formulaId] || 0) + 1;
        return acc;
    }, {});
    console.log(`✓ Generated ${pins.length} Pinterest pins`);
    console.log(`  → ${path.relative(ROOT, OUT_JSON)}`);
    console.log(`  → ${path.relative(ROOT, OUT_CSV)}`);
    console.log(`  → ${path.relative(ROOT, OUT_MD)}`);
    console.log(`  Formula spread:`);
    for (const [k, v] of Object.entries(byFormula)) console.log(`    • ${k}: ${v}`);
}

main();
