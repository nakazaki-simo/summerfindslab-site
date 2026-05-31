/**
 * renderers/price-tag-find.js — "Price Tag Find" (PS-VIR family).
 * Hook + neon price tag in the thumbnail zone; single hero product on a
 * pastel field; CTA + disclosure footer. Price anchor is the CTR lever.
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

export default function priceTagFind({ product, hook, image, accent, grad }) {
    const { text, fontSize } = clampHook(hook);
    const priceLabel =
        product?.price != null ? `$${Math.round(product.price)}` : "UNDER $25";
    const bg = BRAND.sand;
    const onBg = pickTextColor(bg);

    return (
        <Frame background={bg}>
            {/* Thumbnail zone: logo + hook + price tag */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: SPACING.page,
                    paddingBottom: SPACING.md,
                    height: CANVAS.thumbnailZone,
                    justifyContent: "space-between"
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start"
                    }}
                >
                    <Logo onLight />
                    <div
                        style={{
                            display: "flex",
                            background: BRAND.sunset,
                            color: "#fff",
                            fontFamily: FONT_DISPLAY,
                            fontWeight: 700,
                            fontSize: 52,
                            padding: "14px 26px",
                            borderRadius: 16,
                            transform: "rotate(8deg)"
                        }}
                    >
                        {priceLabel}
                    </div>
                </div>
                <div
                    style={{
                        display: "flex",
                        fontFamily: FONT_DISPLAY,
                        fontWeight: 700,
                        fontSize,
                        lineHeight: 1.04,
                        color: onBg,
                        maxWidth: CANVAS.width - CANVAS.safeInsetX
                    }}
                >
                    {text}
                </div>
            </div>

            {/* Hero product / fallback */}
            <div
                style={{
                    display: "flex",
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    background: image ? "#ffffff" : gradientFor(grad),
                    margin: `0 ${SPACING.lg}px`,
                    borderRadius: 28,
                    overflow: "hidden"
                }}
            >
                {image ? (
                    <img
                        src={image}
                        width={760}
                        height={620}
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
                        {product?.brand || "Summer find"}
                    </div>
                )}
            </div>

            {/* CTA + disclosure */}
            <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        padding: `${SPACING.md}px`,
                        fontFamily: FONT_BODY,
                        fontWeight: 600,
                        fontSize: 30,
                        color: BRAND.deep
                    }}
                >
                    Tap to shop on Amazon
                </div>
                <DisclosureFooter stripBg={BRAND.deep} />
            </div>
        </Frame>
    );
}
