"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

/**
 * Lightweight cinematic hero backdrop. Replaces the 17 MB Pexels video with
 * a layered gradient + animated sun + soft palms. Loads in <30 KB total and
 * scrolls smoothly on mobile.
 */
export default function BeachVideo() {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"]
    });

    const sunY = useTransform(scrollYProgress, [0, 1], ["0%", "60%"]);
    const sunOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.4]);

    return (
        <div ref={ref} className="absolute inset-0 overflow-hidden bg-ink" aria-hidden>
            {/* Layered sunset gradient — pure CSS, instant */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "linear-gradient(180deg, #1f2a37 0%, #b35e3b 38%, #ff8c5a 65%, #ffb38a 85%, #4ea69d 100%)"
                }}
            />

            {/* Sun */}
            <motion.div
                style={{ y: sunY, opacity: sunOpacity }}
                className="absolute left-1/2 -translate-x-1/2 top-[18%] h-32 w-32 md:h-44 md:w-44 rounded-full"
            >
                <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="h-full w-full rounded-full"
                    style={{
                        background:
                            "radial-gradient(circle at 35% 35%, #ffe8db 0%, #ffb38a 45%, #ff8c5a 75%, rgba(240,106,58,0.3) 100%)",
                        boxShadow: "0 0 100px 30px rgba(255,140,90,0.55)"
                    }}
                />
            </motion.div>

            {/* Sun reflection on water */}
            <motion.div
                style={{ opacity: sunOpacity }}
                className="absolute left-1/2 -translate-x-1/2 top-[35%] w-32 md:w-44 h-[60%] pointer-events-none"
            >
                <div
                    className="h-full w-full"
                    style={{
                        background:
                            "radial-gradient(ellipse 50% 100% at 50% 0%, rgba(255,232,219,0.45), rgba(255,179,138,0.15) 40%, transparent 75%)",
                        filter: "blur(4px)"
                    }}
                />
            </motion.div>

            {/* Palm silhouettes (CSS, no animation = no jank) */}
            <PalmSilhouette side="left" />
            <PalmSilhouette side="right" />

            {/* Bottom water line */}
            <div className="absolute bottom-0 left-0 right-0 h-[42%] bg-gradient-to-b from-transparent via-sea-500/40 to-sea-500/80" />

            {/* Dark wash for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-transparent to-ink/60" />

            {/* Subtle grain (decorative, no JS) */}
            <div
                className="absolute inset-0 mix-blend-overlay opacity-15 pointer-events-none"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>\")"
                }}
            />
        </div>
    );
}

function PalmSilhouette({ side }) {
    const flip = side === "right" ? -1 : 1;
    const cls =
        side === "right" ? "absolute bottom-0 -right-6 md:right-2" : "absolute bottom-0 -left-6 md:left-2";
    return (
        <svg
            viewBox="0 0 200 280"
            className={`${cls} w-32 md:w-48 h-auto opacity-80`}
            style={{ transform: `scaleX(${flip})` }}
        >
            <path
                d="M95 280 Q 88 200 100 130 Q 112 80 95 30"
                stroke="#1f2a37"
                strokeOpacity="0.85"
                strokeWidth="9"
                fill="none"
                strokeLinecap="round"
            />
            <g fill="#1f2a37" fillOpacity="0.85">
                <path d="M95 35 Q 30 0 -10 45 Q 30 55 95 60 Z" />
                <path d="M95 35 Q 160 5 200 40 Q 160 60 95 60 Z" />
                <path d="M95 40 Q 40 70 0 120 Q 60 100 100 70 Z" />
                <path d="M95 40 Q 150 70 195 120 Q 140 105 100 70 Z" />
                <path d="M95 45 Q 70 5 60 -15 Q 100 0 105 40 Z" />
            </g>
        </svg>
    );
}
