import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

export const runtime = "edge";
export const alt = siteConfig.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: 80,
                    background:
                        "linear-gradient(135deg,#ffd2bb 0%,#ffe8db 35%,#fbf6ee 60%,#bfe3df 100%)",
                    fontFamily: "Georgia, serif"
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div
                        style={{
                            width: 56,
                            height: 56,
                            borderRadius: 999,
                            background: "#ff8c5a",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 30
                        }}
                    >
                        S
                    </div>
                    <div style={{ fontSize: 28, color: "#1f2a37", fontWeight: 600 }}>
                        {siteConfig.shortName}
                    </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div
                        style={{
                            fontSize: 84,
                            lineHeight: 1.05,
                            color: "#1f2a37",
                            fontWeight: 600,
                            maxWidth: 1000
                        }}
                    >
                        Trending summer finds, curated daily.
                    </div>
                    <div style={{ fontSize: 28, color: "#1f2a3799", maxWidth: 880 }}>
                        Amazon gadgets · Beach essentials · Viral TikTok picks · Aesthetic
                        room · Travel
                    </div>
                </div>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 22,
                        color: "#1f2a37"
                    }}
                >
                    <div>summerfindslab.example.com</div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <span>☀️</span>
                        <span>Summer 2026</span>
                    </div>
                </div>
            </div>
        ),
        { ...size }
    );
}
