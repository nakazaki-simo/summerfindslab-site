"use client";

import { motion } from "motion/react";

/**
 * Animated wave divider. Place between sections to keep the beach feel.
 * `flip` mirrors vertically so it can sit at the top of a section.
 * `from` and `to` set the colors above and below the wave.
 */
export default function WaveDivider({
    from = "transparent",
    to = "#fbf6ee",
    flip = false
}) {
    return (
        <div
            className="relative w-full overflow-hidden"
            style={{ background: from, transform: flip ? "scaleY(-1)" : undefined }}
            aria-hidden
        >
            <svg
                viewBox="0 0 1440 120"
                preserveAspectRatio="none"
                className="block w-full h-12 md:h-20"
            >
                <motion.path
                    fill={to}
                    d="M0,80 C180,30 360,120 540,70 C720,30 900,110 1080,70 C1260,30 1440,100 1440,80 L1440,120 L0,120 Z"
                    animate={{
                        d: [
                            "M0,80 C180,30 360,120 540,70 C720,30 900,110 1080,70 C1260,30 1440,100 1440,80 L1440,120 L0,120 Z",
                            "M0,70 C180,110 360,30 540,80 C720,120 900,40 1080,80 C1260,110 1440,40 1440,70 L1440,120 L0,120 Z",
                            "M0,80 C180,30 360,120 540,70 C720,30 900,110 1080,70 C1260,30 1440,100 1440,80 L1440,120 L0,120 Z"
                        ]
                    }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                />
            </svg>
        </div>
    );
}
