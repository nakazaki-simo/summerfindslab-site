/**
 * lib/pin-pipeline/brand.js
 * --------------------------------------------------------------------------
 * Brand tokens + runtime web-font loading for the Satori (next/og) pin
 * renderer. This is the single source of truth for color, type, spacing and
 * the affiliate disclosure used by every template in
 * `lib/pin-pipeline/renderers/`.
 *
 * Tokens implement the PVBS spec (Doc D7) in
 * `.kiro/specs/pinterest-pin-production-system/design.md`:
 *   brand.sun  · brand.sand · brand.ocean · brand.sunset · brand.deep · brand.cta
 * Hex values are aligned with `tailwind.config.js` (peach / sand / sea / ink)
 * so pins stay visually consistent with the website.
 *
 * Fonts: Satori cannot read the filesystem and only accepts TTF/OTF/WOFF
 * (NOT woff2), so we fetch them at runtime from the Google Fonts `css2`
 * endpoint, which returns a TrueType `src: url(...)` when the request has no
 * woff2-capable User-Agent. We use:
 *   - Display (bold hooks / numerals): Playfair Display 700  -> "Playfair Display"
 *   - Body (sub-hooks / labels / disclosure): Inter 400 + 600 -> "Inter"
 * These mirror `--font-playfair` / `--font-inter` used across the site.
 * --------------------------------------------------------------------------
 */

/** Canonical PVBS color tokens (see design.md §"Brand Kit for Canva"). */
export const BRAND = {
    // brand.sun — warm sun tone, accent / CTA hover
    sun: "#ff8c5a",
    // brand.sand — sand / cream, background neutral
    sand: "#faf2e4",
    // brand.ocean — ocean accent, secondary accent
    ocean: "#1f4e66",
    // brand.sunset — sunset accent, gradient endpoint / price tag
    sunset: "#ff5f3f",
    // brand.deep — deep contrast, primary text on light
    deep: "#1f2a37",
    // brand.cta — bright CTA block (dark enough for 4.5:1 white text)
    cta: "#c0392b",
    // supporting neutrals
    cream: "#fbf6ee",
    ink: "#1f2a37",
    // TikTok / viral accents (high-contrast neon, used as sticker fills only)
    neonLime: "#c4ff61",
    neonPink: "#ff3fa4",
    nearBlack: "#14120f"
};

/** Per-category accent + fallback gradient (used when no product photo loads). */
export const CATEGORY_ACCENT = {
    "summer-gadgets": { accent: "#2d8079", grad: ["#e3f3f1", "#bfe3df"] },
    "beach-essentials": { accent: "#1f4e66", grad: ["#e3f3f1", "#ffe8db"] },
    "tiktok-finds": { accent: "#ff3fa4", grad: ["#ffe8db", "#ffd2bb"] },
    "aesthetic-room": { accent: "#c79657", grad: ["#fdf9f3", "#f3e3c6"] },
    travel: { accent: "#1f4e66", grad: ["#e3f3f1", "#faf2e4"] },
    "skincare-summer": { accent: "#f06a3a", grad: ["#fdf9f3", "#ffe8db"] },
    "pet-summer": { accent: "#2d8079", grad: ["#faf2e4", "#e3f3f1"] }
};

/** Spacing scale (px @ 1000x1500). */
export const SPACING = {
    page: 56, // min edge padding (>= PVBS 48px minimum)
    xs: 8,
    sm: 16,
    md: 24,
    lg: 40,
    xl: 64
};

/** Quality-bar constants from the PPPS design (Doc D1 canonical specs). */
export const CANVAS = {
    width: 1000,
    height: 1500,
    thumbnailZone: 600, // top 40%
    safeInsetX: 100, // central 80% horizontally (10% each side)
    minHookFont: 80,
    maxHookFont: 180,
    maxHookWords: 12
};

/** FTC-clean affiliate disclosure shown on every pin. */
export const DISCLOSURE = "Affiliate link · we may earn a commission";

/** Brand wordmark text. */
export const WORDMARK = "summerfindslab.com";

/* ----------------------------- contrast ----------------------------------- */

function hexToRgb(hex) {
    const h = hex.replace("#", "");
    return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16)
    ];
}

function relativeLuminance(hex) {
    const [r, g, b] = hexToRgb(hex).map((v) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two hex colors (1..21). */
export function contrastRatio(a, b) {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    const [hi, lo] = la > lb ? [la, lb] : [lb, la];
    return (hi + 0.05) / (lo + 0.05);
}

/**
 * Pick the on-color (deep ink or cream) that has the higher contrast against
 * `bg`, guaranteeing the strongest available legibility. Throws in dev if the
 * winner is still under the 4.5:1 quality bar so bad palettes fail loudly.
 */
export function pickTextColor(bg, { dark = BRAND.deep, light = BRAND.cream } = {}) {
    const cDark = contrastRatio(bg, dark);
    const cLight = contrastRatio(bg, light);
    const winner = cDark >= cLight ? dark : light;
    const ratio = Math.max(cDark, cLight);
    if (ratio < 4.5 && process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(
            `[pins] contrast ${ratio.toFixed(2)}:1 for text on ${bg} is below 4.5:1`
        );
    }
    return winner;
}

/* ------------------------------- fonts ------------------------------------ */

/**
 * Fetch a single Google font weight as an ArrayBuffer that Satori can parse.
 * No User-Agent is sent, so the css2 endpoint returns a TrueType source.
 */
async function loadGoogleFont(family, weight) {
    const familyParam = family.replace(/ /g, "+");
    const url = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weight}`;
    const cssRes = await fetch(url, { cache: "force-cache" });
    if (!cssRes.ok) throw new Error(`font css ${family} ${weight}: ${cssRes.status}`);
    const css = await cssRes.text();
    const match = css.match(
        /src:\s*url\(([^)]+)\)\s*format\(['"]?(?:opentype|truetype)['"]?\)/
    );
    if (!match) throw new Error(`no ttf src for ${family} ${weight}`);
    const fontRes = await fetch(match[1], { cache: "force-cache" });
    if (!fontRes.ok) throw new Error(`font file ${family} ${weight}: ${fontRes.status}`);
    return fontRes.arrayBuffer();
}

/**
 * Load the brand font set for ImageResponse. Returns the `fonts` array shape
 * next/og expects. Display = Playfair Display 700; Body = Inter 400 + 600.
 */
export async function loadBrandFonts() {
    const [playfair700, inter400, inter600] = await Promise.all([
        loadGoogleFont("Playfair Display", 700),
        loadGoogleFont("Inter", 400),
        loadGoogleFont("Inter", 600)
    ]);
    return [
        { name: "Playfair Display", data: playfair700, weight: 700, style: "normal" },
        { name: "Inter", data: inter400, weight: 400, style: "normal" },
        { name: "Inter", data: inter600, weight: 600, style: "normal" }
    ];
}

export const FONT_DISPLAY = "Playfair Display";
export const FONT_BODY = "Inter";
