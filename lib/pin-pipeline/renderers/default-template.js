/**
 * renderers/default-template.js — neutral brand template used by every formula
 * that does not yet have a bespoke renderer. Clean, on-brand, and passes the
 * same quality bar (hook in thumbnail zone, hero product, disclosure footer).
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

export default function defaultTemplate({ product, hook, image, accent, grad, formulaLabel }) {
    const { text, fontSize } = clampHook(hook);
    const bg = BRAND.sand;
    const onBg = pickTextColor(bg);

    return (
        <Frame background={bg}>
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: SPACING.page,
                    height: CANVAS.thumbnailZone,
                    justifyContent: "space-between"
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}
                >
                    <Logo onLight />
                    {formulaLabel && (
                        <div
                            style={{
                                display: "flex",
                                fontFamily: FONT_BODY,
                                fontWeight: 600,
                                fontSize: 22,
                                color: "#fff",
                                background: accent,
                                padding: "8px 18px",
                                borderRadius: 999
                            }}
                        >
                            {formulaLabel}
                        </div>
                    )}
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
                        width={740}
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

            <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        padding: SPACING.md,
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
