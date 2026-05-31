/**
 * GET /api/pins/render?id=<productId>&formula=<formulaId>
 * --------------------------------------------------------------------------
 * Free, API-driven Pinterest pin generator. Renders a 1000x1500 (2:3) PNG with
 * Satori via next/og's ImageResponse — the same engine app/opengraph-image.js
 * uses — so there is zero paid dependency (no Canva needed for this path).
 *
 * Query params:
 *   id       (required) — a product id from data/products.json
 *   formula  (optional) — one of the 10 canonical formula ids; defaults to
 *                         price-tag-find. Unknown formulas fall back to the
 *                         default brand template.
 *   hook     (optional) — override the auto-derived headline (still clamped
 *                         to <=12 words / >=80px in the renderer).
 *
 * Responses:
 *   200 image/png            — the rendered pin
 *   400 application/json     — bad/missing id, or formula not a known id
 *   500 application/json     — render failure
 *
 * Caching: immutable-ish CDN cache; pins are deterministic per (id, formula).
 * --------------------------------------------------------------------------
 */

import { ImageResponse } from "next/og";
import products from "@/data/products.json";
import { loadBrandFonts } from "@/lib/pin-pipeline/brand.js";
import { CATEGORY_ACCENT } from "@/lib/pin-pipeline/brand.js";
import { resolveImage } from "@/lib/pin-pipeline/renderers/primitives.js";
import {
    getRenderer,
    isKnownFormula,
    FORMULA_IDS,
    FORMULA_LABELS
} from "@/lib/pin-pipeline/renderers/index.js";

export const runtime = "edge";

const DEFAULT_FORMULA = "price-tag-find";
const SIZE = { width: 1000, height: 1500 };

/* --------------------------- hook derivation ----------------------------- */

/** Deterministic index from a seed string (matches the generator's pick()). */
function seededIndex(seed, len) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return len ? h % len : 0;
}

/** Short product noun from a title (first 2-3 meaningful words). */
function productNoun(title) {
    const stop = new Set(["the", "a", "an", "with", "and", "for", "de", "of"]);
    const words = String(title || "")
        .split(/\s+/)
        .filter((w) => w && !stop.has(w.toLowerCase()));
    return words.slice(0, 3).join(" ") || "summer find";
}

// No-hype, FTC-clean hooks (no "INSANE", no fake claims, <=12 words each).
const HOOKS_BY_FORMULA = {
    "price-tag-find": ["The {p} worth saving", "Under $25 and worth it", "This {p} earns its price"],
    "bold-number-list": ["{n} summer finds I keep saving", "{n} Amazon picks under $25", "{n} finds for a soft summer"],
    "aesthetic-lifestyle": ["Soft summer starts here", "The {p} that completes the scene", "Pinned for a reason"],
    "neon-sticker-tiktok": ["TikTok made me find this {p}", "The {p} everyone is saving", "Save this {p} for summer"],
    "default": ["The {p} I keep recommending", "This {p} is your summer sign", "Save this {p}"]
};

function deriveHook(product, formulaId) {
    const bank = HOOKS_BY_FORMULA[formulaId] || HOOKS_BY_FORMULA.default;
    const seed = `${product.id}::${formulaId}`;
    const template = bank[seededIndex(seed, bank.length)];
    const numeral = String(product.rating?.count || 5).length > 2 ? "5" : "5";
    return template
        .replace("{p}", productNoun(product.title))
        .replace("{n}", numeral);
}

/* -------------------------------- route ---------------------------------- */

function badRequest(error, extra = {}) {
    return new Response(JSON.stringify({ ok: false, error, ...extra }), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8" }
    });
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const formula = searchParams.get("formula") || DEFAULT_FORMULA;
    const hookOverride = searchParams.get("hook");

    if (!id) {
        return badRequest("missing_id", { hint: "pass ?id=<productId>" });
    }
    if (!isKnownFormula(formula)) {
        return badRequest("unknown_formula", { allowed: FORMULA_IDS });
    }

    const product = products.find((p) => p.id === id);
    if (!product) {
        return badRequest("product_not_found", { id });
    }

    try {
        const accentSet =
            CATEGORY_ACCENT[product.category] || CATEGORY_ACCENT["summer-gadgets"];
        const [fonts, image] = await Promise.all([
            loadBrandFonts(),
            resolveImage(product.image)
        ]);

        const render = getRenderer(formula);
        const tree = render({
            product,
            hook: hookOverride || deriveHook(product, formula),
            image, // null => template uses brand gradient fallback
            accent: accentSet.accent,
            grad: accentSet.grad,
            formulaLabel: FORMULA_LABELS[formula]
        });

        return new ImageResponse(tree, {
            ...SIZE,
            fonts,
            headers: {
                "content-type": "image/png",
                "cache-control":
                    "public, immutable, no-transform, max-age=86400, s-maxage=604800"
            }
        });
    } catch (err) {
        return new Response(
            JSON.stringify({ ok: false, error: "render_failed", detail: String(err?.message || err) }),
            { status: 500, headers: { "content-type": "application/json; charset=utf-8" } }
        );
    }
}
