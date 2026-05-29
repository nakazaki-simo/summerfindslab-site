#!/usr/bin/env node
/**
 * import-products.mjs
 * --------------------------------------------------------------------------
 * Reads every CSV under /content/imports/, normalises the rows, auto-detects
 * a category and tags from keywords, generates a clean SEO title + short
 * description, and writes the merged result to /data/products.json.
 *
 * CSV format expected (no header required):
 *   <amazon affiliate url>,<original product title>
 *
 * The script is idempotent: it keeps editor-tweaked rows in
 * /data/products.json (any row with `editorial: true`) and only refreshes
 * the imported ones.
 *
 * Run with:
 *   npm run import:products
 *
 * Dependencies: none — uses Node's built-in `fs` and a tiny CSV parser.
 * --------------------------------------------------------------------------
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IMPORTS_DIR = path.join(ROOT, "content", "imports");
const PRODUCTS_FILE = path.join(ROOT, "data", "products.json");

/* ----------------------------- CSV parser ----------------------------- */

function parseCsv(text) {
    const rows = [];
    let cur = "";
    let inQuotes = false;
    let row = [];

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i + 1];

        if (ch === '"' && inQuotes && next === '"') {
            cur += '"';
            i++;
            continue;
        }
        if (ch === '"') {
            inQuotes = !inQuotes;
            continue;
        }
        if (ch === "," && !inQuotes) {
            row.push(cur);
            cur = "";
            continue;
        }
        if ((ch === "\n" || ch === "\r") && !inQuotes) {
            if (cur.length || row.length) {
                row.push(cur);
                rows.push(row);
                row = [];
                cur = "";
            }
            if (ch === "\r" && next === "\n") i++;
            continue;
        }
        cur += ch;
    }
    if (cur.length || row.length) {
        row.push(cur);
        rows.push(row);
    }
    return rows.filter((r) => r.length >= 2 && r[0]?.trim());
}

/* --------------- French/English keyword → category map --------------- */

const CATEGORIES = [
    {
        slug: "beach-essentials",
        keywords: [
            "fouta",
            "plage",
            "beach",
            "anti-sable",
            "sand",
            "serviette",
            "swimsuit",
            "maillot",
            "umbrella",
            "parasol",
            "snorkel",
            "spf",
            "sunscreen",
            "sunblock"
        ]
    },
    {
        slug: "travel",
        keywords: [
            "valise",
            "voyage",
            "travel",
            "luggage",
            "passport",
            "pèse valise",
            "balance bagage",
            "neck pillow",
            "carry-on",
            "rangement",
            "cubes",
            "organisateur",
            "packing",
            "backpack",
            "sac à dos"
        ]
    },
    {
        slug: "summer-gadgets",
        keywords: [
            "ventilateur",
            "fan",
            "blender",
            "blendjet",
            "cooling",
            "rafraichissant",
            "rafraîchissement",
            "cooler",
            "tumbler",
            "earbuds",
            "écouteurs",
            "led",
            "ruban led",
            "spray",
            "pulvérisateur",
            "humidifier",
            "speaker",
            "haut-parleur",
            "smartphone",
            "usb",
            "device",
            "dispositif",
            "tracker"
        ]
    },
    {
        slug: "aesthetic-room",
        keywords: [
            "led",
            "lamp",
            "lampe",
            "ruban led",
            "fairy lights",
            "néon",
            "candle",
            "diffuser",
            "diffuseur",
            "claw clip",
            "pince",
            "cushion",
            "coussin",
            "decor",
            "déco"
        ]
    },
    {
        slug: "skincare-summer",
        keywords: [
            "tonique",
            "exfoliant",
            "acide",
            "glycolic",
            "skincare",
            "ordinary",
            "serum",
            "sérum",
            "moisturizer",
            "crème",
            "spf",
            "sunscreen",
            "after sun",
            "cica"
        ]
    },
    {
        slug: "pet-summer",
        keywords: [
            "chien",
            "chat",
            "dog",
            "cat",
            "pet",
            "gilet de sauvetage",
            "life jacket",
            "tapis rafraichissant",
            "cooling mat",
            "pet"
        ]
    }
];

/** Pick the first category whose keywords match. Falls back to summer-gadgets. */
function inferCategory(text) {
    const t = text.toLowerCase();
    // Specific categories first (pet, skincare, beach) so they don't get
    // swallowed by the broad "summer-gadgets" bucket.
    const order = [
        "pet-summer",
        "skincare-summer",
        "beach-essentials",
        "travel",
        "aesthetic-room",
        "summer-gadgets"
    ];
    for (const slug of order) {
        const c = CATEGORIES.find((x) => x.slug === slug);
        if (c && c.keywords.some((k) => t.includes(k.toLowerCase()))) return c.slug;
    }
    return "summer-gadgets";
}

/* ------------------------------- Tags ------------------------------- */

const TAG_RULES = [
    {
        tag: "trending",
        test: (t) =>
            /(viral|trending|tiktok|fouta|tumbler|sunset|claw clip)/i.test(t)
    },
    {
        tag: "tiktok",
        test: (t) =>
            /(viral|tiktok|fouta|sunset|claw clip|blender|tumbler|led)/i.test(t)
    },
    { tag: "under-25", test: () => false } // assigned later from price
];

function inferTags(rawTitle, price) {
    const tags = new Set();
    for (const rule of TAG_RULES) {
        if (rule.test(rawTitle)) tags.add(rule.tag);
    }
    if (price !== null && price !== undefined && price <= 25) tags.add("under-25");
    return Array.from(tags);
}

/* ----------------- SEO title + description generators ----------------- */

const BRAND_HEAD_REGEX = /^([A-Z][A-Z0-9'&-]{1,}|[A-Z][a-z0-9]+(?:\s+[A-Z][A-Za-z0-9'&-]+)?)/;

function extractBrand(title) {
    const m = title.match(BRAND_HEAD_REGEX);
    if (!m) return "";
    let brand = m[1].trim();

    // Trim French connectors that sneak in (e.g. "GRIFEMA Pulvérisateur" → "GRIFEMA")
    const stopWords = [
        "de",
        "du",
        "des",
        "le",
        "la",
        "les",
        "pour",
        "sans",
        "avec",
        "ensemble",
        "tonique",
        "exfoliant",
        "acide",
        "ruban",
        "fouta",
        "pulv",
        "tapis",
        "gilet",
        "p[èe]se"
    ];
    const words = brand.split(/\s+/);
    if (
        words.length > 1 &&
        stopWords.some((w) => new RegExp(`^${w}$`, "i").test(words[1]))
    ) {
        return words[0];
    }
    return brand;
}

/**
 * Boil a long French Amazon title down to a short clean SEO title.
 *  - Take the brand prefix
 *  - Keep the first 6–8 meaningful words after it
 *  - Drop sizes/codes/variant SKUs
 *  - Keep under ~70 chars
 */
function makeSeoTitle(rawTitle) {
    const cleaned = rawTitle
        .replace(/\s+\(Anciennement[^)]*\)/gi, "")
        .replace(/\s+[A-Z]{2,}\d{2,}[A-Z0-9-]*/g, "") // SKU codes like GE2003W-200
        .replace(/\s+\d{2,4}\s*x\s*\d{2,4}\s*cm/gi, "")
        .replace(/\s+\d+\s*g\b/gi, "")
        .replace(/\s+max\s*\d+\s*kg.*$/gi, "")
        .replace(/–|—/g, "-")
        .trim();

    // Take only the first segment before " - " or " | "
    const head = cleaned.split(/\s[-|]\s/)[0].trim();

    // Limit to ~70 chars softly at a word boundary
    if (head.length <= 70) return head;
    const truncated = head.slice(0, 70);
    const idx = truncated.lastIndexOf(" ");
    return (idx > 30 ? truncated.slice(0, idx) : truncated) + "…";
}

function makeShortDescription(rawTitle, category) {
    const t = rawTitle.toLowerCase();

    // Product-pattern matching for sharper, more specific copy
    if (/(fouta|serviette|towel|blanket)/i.test(t))
        return "Oversized, sand-free and quick-drying. The beach blanket that earns its bag space — pairs as a picnic throw, paréo or oversized scarf.";
    if (/(p[èe]se valise|luggage scale|balance bagage)/i.test(t))
        return "Pocket-sized luggage scale that saves you from airline overweight fees. Reads up to 50 kg in four units, runs on a single battery.";
    if (/(ventilateur|fan|usb fan)/i.test(t))
        return "Compact, surprisingly quiet and powerful — three speeds and a 90° tilt make it a plug-and-play desk and bedside cooler.";
    if (/(pulv[ée]risateur|spray|brume|mister)/i.test(t))
        return "Refillable fine-mist spray bottle for hair, skin and plants. The under-$10 multipurpose tool you'll actually keep using all summer.";
    if (/(tonique|exfoliant|acide glycolique|skincare|s[ée]rum|moisturizer)/i.test(t))
        return "A cult skincare staple that earns its hype. Light, fast-absorbing and friendly with summer SPF routines.";
    if (/(cube|packing|rangement|organisateur|organiser|organizer)/i.test(t))
        return "Four-cube packing set that turns chaotic suitcases into clean, browsable layers. The single best $20 you'll spend before a trip.";
    if (/(led|ruban led|fairy light|n[ée]on)/i.test(t))
        return "RGB LED strip with app + music sync — the easy aesthetic upgrade that quietly transforms any room into a Pinterest mood board.";
    if (/(insectes|piq[uû]res|bite|itch|d[ée]mangeaisons)/i.test(t))
        return "Smartphone-powered heat device that calms insect bites in minutes — no creams, no chemicals, fits in a pocket.";
    if (/(gilet de sauvetage|life jacket)/i.test(t))
        return "Reflective, buoyant pet life jacket with a sturdy handle — built for confident summer days at the lake or pool.";
    if (/(tapis rafraichissant|cooling mat|cool pad)/i.test(t))
        return "Self-activating cooling mat that gives pets a cool spot on hot afternoons — no fridge, no electricity, scratch-resistant top.";
    if (/(blender|smoothie)/i.test(t))
        return "USB-rechargeable mini blender for smoothies, protein shakes and travel-sized iced drinks anywhere you can plug a cable.";
    if (/(tumbler|insulated cup|gourde isol)/i.test(t))
        return "Vacuum-insulated tumbler that keeps drinks cold for a full day. Fits a standard car cup holder and survives a dishwasher.";
    if (/(spf|sunscreen|sun cream|protection solaire)/i.test(t))
        return "Lightweight, no white-cast SPF that layers cleanly under makeup — a daily summer-skin essential.";
    if (/(sleep mask|eye mask|silk mask)/i.test(t))
        return "Cool, gentle silk eye mask that fits any travel kit. The sleep upgrade you keep wishing you'd packed.";

    // Category fallback
    const seed = makeSeoTitle(rawTitle);
    if (category === "beach-essentials")
        return `${seed}. A light, packable beach essential editor-tested on real sand and salt-water days.`;
    if (category === "travel")
        return `${seed}. A travel-ready upgrade that earns its place in the carry-on without weighing it down.`;
    if (category === "summer-gadgets")
        return `${seed}. A small, smart summer gadget that solves a real problem in real heat.`;
    if (category === "aesthetic-room")
        return `${seed}. The aesthetic-room upgrade that quietly makes every photo look better.`;
    if (category === "skincare-summer")
        return `${seed}. A summer-skin staple our editor uses through the warm months.`;
    if (category === "pet-summer")
        return `${seed}. A summer-safe pick for the four-legged member of the family.`;
    return `${seed}. Hand-picked by our editor for summer 2026.`;
}

function slugify(s) {
    return s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // strip accents
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 60);
}

function buildId(brand, title, idx) {
    const base = `${slugify(brand) || "find"}-${slugify(title)}`;
    return `${base}-${String(idx + 1).padStart(3, "0")}`.slice(0, 80);
}

/* -------------------- Default placeholder pricing -------------------- */

// Without scraping Amazon we cannot know the real price. We assign a
// category-typical placeholder so under-$25 filtering still works. The
// editor can override per-row in /data/products.json (set `editorial: true`
// to lock the row from re-imports).
const DEFAULT_PRICES = {
    "beach-essentials": 24.99,
    travel: 19.99,
    "summer-gadgets": 22.99,
    "aesthetic-room": 19.99,
    "skincare-summer": 14.99,
    "pet-summer": 29.99
};

const CATEGORY_FALLBACK_IMAGES = {
    "beach-essentials":
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop",
    travel:
        "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop",
    "summer-gadgets":
        "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f37?w=800&auto=format&fit=crop",
    "aesthetic-room":
        "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&auto=format&fit=crop",
    "skincare-summer":
        "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop",
    "pet-summer":
        "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop"
};

// Keyword-based image overrides — beats the generic category fallback for
// product types where a specific royalty-free Unsplash photo nails the look.
const KEYWORD_IMAGE_OVERRIDES = [
    { test: /(fouta|serviette|towel|blanket)/i, src: "https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&auto=format&fit=crop" },
    { test: /(p[èe]se valise|luggage scale|balance bagage)/i, src: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&auto=format&fit=crop" },
    { test: /(ventilateur|usb fan|desk fan)/i, src: "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=800&auto=format&fit=crop" },
    { test: /(pulv[ée]risateur|spray bottle|brume)/i, src: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop" },
    { test: /(tonique|exfoliant|acide glycolique|the ordinary|skincare)/i, src: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=800&auto=format&fit=crop" },
    { test: /(cube|packing|rangement)/i, src: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop" },
    { test: /(led|ruban led|fairy light)/i, src: "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&auto=format&fit=crop" },
    { test: /(gilet de sauvetage|life jacket)/i, src: "https://images.unsplash.com/photo-1583511655802-41f4e0bd5ec1?w=800&auto=format&fit=crop" },
    { test: /(tapis rafraichissant|cooling mat)/i, src: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&auto=format&fit=crop" },
    { test: /(insectes|bite|piq[uû]res)/i, src: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f37?w=800&auto=format&fit=crop" }
];

function pickImage(rawTitle, category) {
    const hit = KEYWORD_IMAGE_OVERRIDES.find((rule) => rule.test.test(rawTitle));
    if (hit) return hit.src;
    return CATEGORY_FALLBACK_IMAGES[category];
}

/* ------------------------------ Pipeline ------------------------------ */

function readExisting() {
    if (!fs.existsSync(PRODUCTS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf8"));
    } catch {
        return [];
    }
}

function readAllImports() {
    if (!fs.existsSync(IMPORTS_DIR)) return [];
    const files = fs
        .readdirSync(IMPORTS_DIR)
        .filter((f) => f.toLowerCase().endsWith(".csv"))
        .sort();

    return files.flatMap((file) => {
        const fullPath = path.join(IMPORTS_DIR, file);
        const text = fs.readFileSync(fullPath, "utf8");
        return parseCsv(text).map((row) => ({
            sourceFile: file,
            affiliateUrl: row[0].trim(),
            rawTitle: (row[1] || "").trim()
        }));
    });
}

function loadImageCache() {
    const file = path.join(ROOT, "content", "cache", "amazon-images.json");
    if (!fs.existsSync(file)) return {};
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
        return {};
    }
}

const IMAGE_CACHE = loadImageCache();

function buildProductFromCsvRow(row, idx) {
    const category = inferCategory(row.rawTitle);
    const price = DEFAULT_PRICES[category] ?? 24.99;
    const tags = inferTags(row.rawTitle, price);
    const brand = extractBrand(row.rawTitle);
    const seoTitle = makeSeoTitle(row.rawTitle);
    const description = makeShortDescription(row.rawTitle, category);

    // Real Amazon image if the cache has one, otherwise curated category image.
    const cached = IMAGE_CACHE[row.affiliateUrl];
    const image = cached?.image || pickImage(row.rawTitle, category);
    const asin = cached?.asin || null;

    return {
        id: buildId(brand, seoTitle, idx),
        title: seoTitle,
        originalTitle: row.rawTitle,
        description,
        brand: brand || "See Amazon listing",
        price,
        rating: { value: 4.5, count: 50 },
        category,
        tags,
        image,
        imageSource: cached?.image ? "amazon" : "curated",
        asin,
        affiliateUrl: row.affiliateUrl,
        source: row.sourceFile,
        importedAt: new Date().toISOString(),
        editorial: false
    };
}

function main() {
    const existing = readExisting();
    const lockedEditorial = existing.filter((p) => p.editorial);

    const imports = readAllImports();
    if (!imports.length) {
        console.log("No CSV files found in /content/imports/.");
        return;
    }

    // Dedupe by affiliateUrl (last write wins inside a single import batch)
    const seen = new Map();
    imports.forEach((row, i) => seen.set(row.affiliateUrl, { row, i }));

    const generated = Array.from(seen.values()).map(({ row, i }) =>
        buildProductFromCsvRow(row, i)
    );

    // Editor-locked rows take precedence over auto-generated ones with same ID
    const lockedIds = new Set(lockedEditorial.map((p) => p.id));
    const merged = [
        ...lockedEditorial,
        ...generated.filter((p) => !lockedIds.has(p.id))
    ];

    fs.mkdirSync(path.dirname(PRODUCTS_FILE), { recursive: true });
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(merged, null, 2) + "\n");

    // Stats summary
    const counts = merged.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1;
        return acc;
    }, {});
    console.log(`✓ Imported ${imports.length} CSV rows`);
    console.log(`✓ Wrote ${merged.length} products to data/products.json`);
    console.log("✓ By category:");
    Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([k, v]) => console.log(`    ${k.padEnd(20, " ")} ${v}`));
}

main();
