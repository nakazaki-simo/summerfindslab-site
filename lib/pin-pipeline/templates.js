/**
 * lib/pin-pipeline/templates.js
 * --------------------------------------------------------------------------
 * The "template registry" — maps each Pinterest visual formula
 * (from scripts/generate-pinterest-pins.mjs) to:
 *
 *   1. A Canva Brand Template ID (set in your Canva account, copy here),
 *      OR a placeholder you'll fill once you build the template.
 *   2. A field-mapping function that turns one of our product/guide/category
 *      pin records into the autofill payload Canva expects.
 *
 * To add a real template:
 *   a. Build it in Canva at 1000x1500. Use named text & image elements
 *      (right-click an element -> "Properties" -> name them like
 *      `headline`, `product_image`, `price_tag`, `subhead`, `cta`).
 *   b. Publish it as a Brand Template (Enterprise feature).
 *   c. Run `npm run canva:list-templates` to find its id.
 *   d. Paste the id into `BRAND_TEMPLATE_IDS` below.
 *
 * Fields used per template are documented inline so the Canva designer
 * knows exactly what to name.
 * --------------------------------------------------------------------------
 */

import { textField, imageField } from "../canva/autofill.js";

/**
 * Look up table: formulaId -> brand_template_id
 * Empty strings = template not built yet. The runner will skip those
 * unless you pass --formula=<id> with a built template.
 */
export const BRAND_TEMPLATE_IDS = {
    "bold-number-list": process.env.CANVA_TPL_BOLD_NUMBER_LIST || "",
    "curiosity-gap": process.env.CANVA_TPL_CURIOSITY_GAP || "",
    "this-vs-that": process.env.CANVA_TPL_THIS_VS_THAT || "",
    "price-tag-find": process.env.CANVA_TPL_PRICE_TAG_FIND || "",
    "moodboard-grid": process.env.CANVA_TPL_MOODBOARD_GRID || "",
    "tutorial-stepper": process.env.CANVA_TPL_TUTORIAL_STEPPER || "",
    "aesthetic-lifestyle": process.env.CANVA_TPL_AESTHETIC_LIFESTYLE || "",
    "neon-sticker-tiktok": process.env.CANVA_TPL_NEON_STICKER || "",
    "headline-stat": process.env.CANVA_TPL_HEADLINE_STAT || "",
    "secret-roundup": process.env.CANVA_TPL_SECRET_ROUNDUP || "",
};

/**
 * Default mapping. Every template should expose at least these fields:
 *
 *  text fields   -> headline, subhead, brand, cta, price
 *  image fields  -> product_image
 *
 * Specific formulas request extra fields below. Anything the template
 * doesn't actually contain is silently ignored by Canva.
 */
function baseTextFields(pin, productImageAsset) {
    const fields = {
        headline: textField(pin.title || pin.textOverlay || ""),
        subhead: textField(pin.cta || ""),
        brand: textField("summerfindslab.com"),
        cta: textField(pin.cta || "Tap to shop"),
    };
    if (productImageAsset?.id) {
        fields.product_image = imageField(productImageAsset.id);
    }
    return fields;
}

/**
 * Per-formula extras. Each receives ({ pin, product, productImageAsset })
 * and returns extra fields merged on top of `baseTextFields`.
 */
const FORMULA_FIELD_BUILDERS = {
    "bold-number-list": ({ pin }) => ({
        big_number: textField(pin.title?.match(/\d+/)?.[0] || "5"),
        sticker: textField("SAVE THIS"),
    }),
    "price-tag-find": ({ product }) => ({
        price_tag: textField(
            product?.price ? `$${Math.round(product.price)}` : "UNDER $25",
        ),
        badge: textField("AMAZON FIND"),
    }),
    "headline-stat": ({ product }) => ({
        rating: textField(`★ ${product?.rating?.value ?? 4.5}`),
        review_count: textField(`${product?.rating?.count ?? 50}+ reviews`),
    }),
    "neon-sticker-tiktok": ({ pin }) => ({
        sticker_1: textField(pin.secondaryStickers?.[0] || "TIKTOK MADE ME"),
        sticker_2: textField(pin.secondaryStickers?.[1] || "SOLD OUT 3X"),
        sticker_3: textField(pin.secondaryStickers?.[2] || "AMAZON FAVE"),
    }),
    "this-vs-that": () => ({ vs_label: textField(">>>") }),
    "aesthetic-lifestyle": () => ({}),
    "moodboard-grid": () => ({ tag: textField("$25 & UNDER") }),
    "tutorial-stepper": ({ pin }) => ({
        step_label: textField(pin.cta || "Tap to shop the list"),
    }),
    "curiosity-gap": () => ({}),
    "secret-roundup": () => ({ tag: textField("GATEKEPT") }),
};

export function buildAutofillData({ pin, product, productImageAsset }) {
    const base = baseTextFields(pin, productImageAsset);
    const extra =
        FORMULA_FIELD_BUILDERS[pin.formulaId]?.({
            pin,
            product,
            productImageAsset,
        }) || {};
    return { ...base, ...extra };
}

export function getBrandTemplateId(formulaId) {
    return BRAND_TEMPLATE_IDS[formulaId] || "";
}

export function isFormulaConfigured(formulaId) {
    return Boolean(getBrandTemplateId(formulaId));
}

export function listConfiguredFormulas() {
    return Object.entries(BRAND_TEMPLATE_IDS)
        .filter(([, id]) => Boolean(id))
        .map(([formulaId, templateId]) => ({ formulaId, templateId }));
}
