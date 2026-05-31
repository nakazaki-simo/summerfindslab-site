/**
 * renderers/aesthetic-lifestyle.js — "Aesthetic Lifestyle Scene" (PS-LUX).
 * Full-bleed product/scene with a legibility gradient. Hook still placed in
 * the thumbnail zone (top) over a dark scrim so it survives feed cropping,
 * tiny brand mark + mandatory disclosure at the very bottom.
 */
import {
    BRAND,
    SPACING,
    CANVAS,
    FONT_DISPLAY,
    Frame,
    Logo,
    DisclosureFooter,
    clampHook,
    gradientFor
} from "./primitives.js";

export default function aestheticLifestyle({ product, hook, image, grad }) {
    const { text, fontSize } = clampHook(hook);

    return (
        <Frame background={gradientFor(grad)}>
            {/* Full-bleed image layer */}
            {image && (
                <img
                    src={image}
                    width={CANVAS.width}
                    height={CANVAS.height}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: CANVAS.width,
                        height: CANVAS.height,
                        objectFit: "cover"
                    }}
                />
            )}

            {/* Top scrim carries the hook inside the thumbnail zone */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    height: CANVAS.thumbnailZone,
                    padding: SPACING.page,
                    background:
                        "linear-gradient(180deg, rgba(20,18,15,0.62) 0%, rgba(20,18,15,0.28) 70%, rgba(20,18,15,0) 100%)"
                }}
            >
                <Logo onLight={false} />
                <div
                    style={{
                        display: "flex",
                        fontFamily: FONT_DISPLAY,
                        fontWeight: 700,
                        fontSize,
                        lineHeight: 1.04,
                        color: BRAND.cream,
                        textShadow: "0 2px 14px rgba(0,0,0,0.45)",
                        maxWidth: CANVAS.width - CANVAS.safeInsetX
                    }}
                >
                    {text}
                </div>
            </div>

            {/* Spacer pushes footer to the bottom over the scene */}
            <div style={{ display: "flex", flex: 1 }} />

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    background:
                        "linear-gradient(0deg, rgba(20,18,15,0.72) 0%, rgba(20,18,15,0) 100%)",
                    paddingTop: SPACING.xl
                }}
            >
                <DisclosureFooter stripBg={BRAND.deep} />
            </div>
        </Frame>
    );
}
