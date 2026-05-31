/**
 * renderers/bold-number-list.js — "Bold Number List" (PS-LST family).
 * Oversized numeral + hook in the thumbnail zone; product card mid; brand
 * + disclosure footer. Numeric headline is the save lever.
 */
import {
    BRAND,
    SPACING,
    CANVAS,
    FONT_DISPLAY,
    FONT_BODY,
    Frame,
    Logo,
    DisclosureFooter,
    clampHook,
    gradientFor
} from "./primitives.js";
import { pickTextColor } from "../brand.js";

export default function boldNumberList({ product, hook, image, accent, grad }) {
    const { text, fontSize } = clampHook(hook);
    const numeral = String(hook || "").match(/\d+/)?.[0] || "5";
    const bg = BRAND.cream;
    const onBg = pickTextColor(bg);

    return (
        <Frame background={bg}>
            {/* Thumbnail zone: numeral + hook */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: SPACING.page,
                    height: CANVAS.thumbnailZone,
                    justifyContent: "space-between"
                }}
            >
                <Logo onLight />
                <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
                    <div
                        style={{
                            display: "flex",
                            fontFamily: FONT_DISPLAY,
                            fontWeight: 700,
                            fontSize: 240,
                            lineHeight: 0.8,
                            color: BRAND.sunset
                        }}
                    >
                        {numeral}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            fontFamily: FONT_DISPLAY,
                            fontWeight: 700,
                            fontSize: Math.min(fontSize, 120),
                            lineHeight: 1.02,
                            color: onBg,
                            paddingBottom: 18,
                            maxWidth: 560
                        }}
                    >
                        {text}
                    </div>
                </div>
            </div>

            {/* Product card */}
            <div
                style={{
                    display: "flex",
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    background: image ? "#ffffff" : gradientFor(grad),
                    margin: `0 ${SPACING.lg}px`,
                    borderRadius: 28,
                    border: `6px solid ${accent}`,
                    overflow: "hidden"
                }}
            >
                {image ? (
                    <img
                        src={image}
                        width={720}
                        height={600}
                        style={{ objectFit: "contain" }}
                    />
                ) : (
                    <div
                        style={{
                            display: "flex",
                            fontFamily: FONT_BODY,
                            fontWeight: 600,
                            fontSize: 34,
                            color: accent
                        }}
                    >
                        {product?.title?.slice(0, 32) || "Summer pick"}
                    </div>
                )}
            </div>

            {/* Save sticker + disclosure */}
            <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: SPACING.md
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            background: accent,
                            color: "#fff",
                            fontFamily: FONT_BODY,
                            fontWeight: 600,
                            fontSize: 28,
                            padding: "12px 28px",
                            borderRadius: 999
                        }}
                    >
                        Save this list
                    </div>
                </div>
                <DisclosureFooter stripBg={BRAND.deep} />
            </div>
        </Frame>
    );
}
