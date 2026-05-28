"use client";

import { motion } from "motion/react";

const items = [
    "✨ Trending now",
    "☀️ Summer 2026",
    "🛍️ New drops daily",
    "🌊 Beach essentials",
    "📱 TikTok approved",
    "💸 Under $25 picks",
    "🧳 Travel ready",
    "🌅 Aesthetic upgrades"
];

export default function Marquee() {
    const loop = [...items, ...items, ...items];
    return (
        <div className="relative overflow-hidden border-y border-sand-200 bg-gradient-to-r from-peach-100 via-cream to-sea-100 py-3">
            <motion.div
                className="flex whitespace-nowrap gap-10 will-change-transform"
                animate={{ x: ["0%", "-33.333%"] }}
                transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
            >
                {loop.map((t, i) => (
                    <span
                        key={i}
                        className="font-display text-lg md:text-xl text-ink/80 tracking-tight"
                    >
                        {t}
                        <span className="ml-10 text-peach-400">●</span>
                    </span>
                ))}
            </motion.div>
        </div>
    );
}
