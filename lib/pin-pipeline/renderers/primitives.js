/**
 * lib/pin-pipeline/renderers/primitives.js
 * --------------------------------------------------------------------------
 * Shared building blocks every pin template composes, so the PPPS quality bar
 * is enforced in ONE place instead of per-template:
 *   - 1000x1500 canvas frame
 *   - logo lockup (consistent across all formulas)
 *   - affiliate disclosure footer (on every pin)
 *   - hook clamp (<= 12 words, font auto-scaled within 80..180px)
 *   - remote image verification with graceful fallback
 *
 * JSX is compiled by Next's SWC (automatic runtime — no React import needed,
 * same as app/opengraph-image.js). Satori supports a flexbox subset only:
 * every element with >1 child sets display:flex explicitly.
 * --------------------------------------------------------------------------
 */

import {
    BRAND,
    CANVAS,
    SPACING,
    DISCLOSURE,
    WORDMARK,
    FONT_DISPLAY,
    FONT_BODY,
    pickTextColor
} from "../brand.js";

/**
 * Clamp a hook to the PPPS rules: <= 12 words, and pick a font size that keeps
 * long hooks inside the thumbnail zone while never going under 80px.
 */
export function clampHook(raw) {
    const words = String(raw || "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    const clipped = words.slice(0, CANVAS.maxHookWords);
    const text = clipped.join(" ");
    const n = clipped.length;
    // Fewer words -> larger type. Bounds: [minHookFont, maxHookFont].
    let fontSize = CANVAS.maxHookFont;
    if (n > 8) fontSize = 92;
    else if (n > 6) fontSize = 104;
    else if (n > 4) fontSize = 124;
    else if (n > 2) fontSize = 150;
    fontSize = Math.max(CANVAS.minHookFont, Math.min(CANVAS.maxHookFont, fontSize));
    return { text, fontSize, wordCount: n, truncated: words.length > clipped.length };
}

/**
 * GET a remote image and return it as a data URI Satori can embed reliably.
 * Pre-fetching (instead of letting Satori fetch) lets a template fall back to
 * a gradient when the Amazon CDN 403s or the row has no image. Returns null on
 * any failure.
 */
export async function resolveImage(url) {
    if (!url || typeof url !== "string") return null;
    try {
        const res = await fetch(url, { cache: "force-cache" });
        if (!res.ok) return null;
        const type = res.headers.get("content-type") || "";
        if (!type.startsWith("image/")) return null;
        const buf = await res.arrayBuffer();
        let binary = "";
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);
        return `data:${type};base64,${base64}`;
    } catch {
        return null;
    }
}

/** Brand logo lockup — identical mark + wordmark on every formula. */
export function Logo({ onLight = true, compact = false }) {
    const wordColor = onLight ? BRAND.deep : BRAND.cream;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
                style={{
                    width: 54,
                    height: 54,
                    borderRadius: 999,
                    background: BRAND.sun,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 700,
                    fontSize: 32
                }}
            >
                S
            </div>
            {!compact && (
                <div
                    style={{
                        fontFamily: FONT_BODY,
                        fontWeight: 600,
                        fontSize: 30,
                        color: wordColor
                    }}
                >
                    {WORDMARK}
                </div>
            )}
        </div>
    );
}

/**
 * Mandatory affiliate disclosure footer. Sits inside the mobile-safe area,
 * always legible (chooses contrast vs the strip background).
 */
export function DisclosureFooter({ stripBg = BRAND.deep }) {
    const textColor = pickTextColor(stripBg);
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: stripBg,
                padding: `${SPACING.sm}px ${SPACING.lg}px`,
                fontFamily: FONT_BODY,
                fontWeight: 400
            }}
        >
            <div style={{ fontSize: 22, color: textColor, opacity: 0.95 }}>
                {DISCLOSURE}
            </div>
            <div
                style={{
                    fontSize: 22,
                    color: textColor,
                    fontWeight: 600,
                    letterSpacing: 0.3
                }}
            >
                {WORDMARK}
            </div>
        </div>
    );
}

/** Full-canvas frame wrapper enforcing exact 1000x1500 + column layout. */
export function Frame({ background, children }) {
    return (
        <div
            style={{
                width: CANVAS.width,
                height: CANVAS.height,
                display: "flex",
                flexDirection: "column",
                position: "relative",
                background
            }}
        >
            {children}
        </div>
    );
}

/** A soft brand gradient used as the universal image fallback. */
export function gradientFor(grad) {
    const [a, b] = grad || [BRAND.sand, BRAND.cream];
    return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

export { SPACING, CANVAS, BRAND, FONT_DISPLAY, FONT_BODY };
