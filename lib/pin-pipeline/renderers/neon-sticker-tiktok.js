/**
 * renderers/neon-sticker-tiktok.js — "TikTok Sticker Stack" (PS-TIK).
 * Dark canvas, neon hook sticker in the thumbnail zone, hero product, social
 * -proof sticker stack, disclosure footer. High-contrast neon on near-black.
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

const STICKERS = ["TIKTOK MADE ME", "VIRAL ON AMAZON", "SAVE FOR SUMMER"];

export default function neonStickerTiktok({ product, hook, image, grad }) {
    const { text, fontSize } = clampHook(hook);
    const bg = BRAND.nearBlack;

    return (
        <Frame background={bg}>
            {/* Thumbnail zone: logo + neon hook sticker */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: SPACING.page,
                    height: CANVAS.thumbnailZone,
                    justifyContent: "space-between"
                }}
            >
                <Logo onLight={false} />
                <div
                    style={{
                        display: "flex",
                        background: BRAND.neonLime,
                        color: BRAND.nearBlack,
                        fontFamily: FONT_DISPLAY,
                        fontWeight: 700,
                        fontSize: Math.min(fontSize, 132),
                        lineHeight: 1.0,
                        padding: "20px 30px",
                        borderRadius: 22,
                        transform: "rotate(-3deg)",
                        maxWidth: CANVAS.width - CANVAS.safeInsetX
                    }}
                >
                    {text}
                </div>
            </div>

            {/* Hero product + sticker stack */}
            <div
                style={{
                    display: "flex",
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    margin: `0 ${SPACING.lg}px`
                }}
            >
                <div
                    style={{
                        display: "flex",
                        width: 700,
                        height: 560,
                        alignItems: "center",
                        justifyContent: "center",
                        background: image ? "#ffffff" : gradientFor(grad),
                        borderRadius: 28,
                        overflow: "hidden"
                    }}
                >
                    {image ? (
                        <img
                            src={image}
                            width={660}
                            height={520}
                            style={{ objectFit: "contain" }}
                        />
                    ) : (
                        <div
                            style={{
                                display: "flex",
                                fontFamily: FONT_BODY,
                                fontWeight: 600,
                                fontSize: 32,
                                color: BRAND.nearBlack
                            }}
                        >
                            {product?.brand || "Summer find"}
                        </div>
                    )}
                </div>
                {/* Diagonal social-proof stickers */}
                <div
                    style={{
                        position: "absolute",
                        top: 8,
                        right: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                        alignItems: "flex-end"
                    }}
                >
                    {STICKERS.map((s, i) => (
                        <div
                            key={s}
                            style={{
                                display: "flex",
                                background: i % 2 === 0 ? BRAND.neonPink : BRAND.neonLime,
                                color: i % 2 === 0 ? "#fff" : BRAND.nearBlack,
                                fontFamily: FONT_BODY,
                                fontWeight: 600,
                                fontSize: 26,
                                padding: "10px 20px",
                                borderRadius: 999,
                                transform: `rotate(${i % 2 === 0 ? 4 : -4}deg)`
                            }}
                        >
                            {s}
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", marginTop: SPACING.md }}>
                <DisclosureFooter stripBg={BRAND.deep} />
            </div>
        </Frame>
    );
}
