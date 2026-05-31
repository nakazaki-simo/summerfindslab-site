/**
 * renderers/index.js — formula registry.
 * Maps each of the 10 canonical Pinterest formula IDs (from
 * scripts/generate-pinterest-pins.mjs) to a renderer. Four are bespoke; the
 * rest fall back to the default brand template until built out.
 */
import priceTagFind from "./price-tag-find.js";
import boldNumberList from "./bold-number-list.js";
import aestheticLifestyle from "./aesthetic-lifestyle.js";
import neonStickerTiktok from "./neon-sticker-tiktok.js";
import defaultTemplate from "./default-template.js";

/** All known formula IDs (kept in sync with the pin generator). */
export const FORMULA_IDS = [
    "bold-number-list",
    "curiosity-gap",
    "this-vs-that",
    "price-tag-find",
    "moodboard-grid",
    "tutorial-stepper",
    "aesthetic-lifestyle",
    "neon-sticker-tiktok",
    "headline-stat",
    "secret-roundup"
];

/** Human labels for footer/badge use. */
export const FORMULA_LABELS = {
    "bold-number-list": "Bold Number List",
    "curiosity-gap": "Curiosity Gap",
    "this-vs-that": "This vs That",
    "price-tag-find": "Price Tag Find",
    "moodboard-grid": "Moodboard Grid",
    "tutorial-stepper": "Tutorial Stepper",
    "aesthetic-lifestyle": "Aesthetic Lifestyle",
    "neon-sticker-tiktok": "TikTok Sticker Stack",
    "headline-stat": "Social-Proof Stat",
    "secret-roundup": "Gatekeep Roundup"
};

const RENDERERS = {
    "price-tag-find": priceTagFind,
    "bold-number-list": boldNumberList,
    "aesthetic-lifestyle": aestheticLifestyle,
    "neon-sticker-tiktok": neonStickerTiktok
};

export function isKnownFormula(formulaId) {
    return FORMULA_IDS.includes(formulaId);
}

/** Returns the renderer for a formula, or the default template. */
export function getRenderer(formulaId) {
    return RENDERERS[formulaId] || defaultTemplate;
}
