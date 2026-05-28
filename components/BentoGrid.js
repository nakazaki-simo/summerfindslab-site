"use client";

import { motion } from "motion/react";

const items = [
    {
        title: "Daily fresh drops",
        body: "We hand-pick new finds every single morning. The feed is never stale.",
        icon: "☀️",
        span: "md:col-span-2 md:row-span-2",
        bg: "from-peach-200 to-peach-300"
    },
    {
        title: "Honest reviews",
        body: "If we wouldn't buy it ourselves, you won't see it here.",
        icon: "✓",
        span: "",
        bg: "from-sea-100 to-sea-200"
    },
    {
        title: "Under $25 always",
        body: "We feature wallet-friendly picks every single day.",
        icon: "💸",
        span: "",
        bg: "from-sand-100 to-sand-200"
    },
    {
        title: "TikTok approved",
        body: "Only the viral picks that genuinely work. No FYP regrets.",
        icon: "📱",
        span: "md:col-span-2",
        bg: "from-cream to-peach-100"
    },
    {
        title: "Made for summer",
        body: "Beach, travel, cozy room, summer kitchen. Pick your vibe.",
        icon: "🌊",
        span: "",
        bg: "from-sea-200 to-sea-300"
    }
];

export default function BentoGrid() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 md:auto-rows-[180px] gap-4">
            {items.map((it, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 30, scale: 0.97 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{
                        duration: 0.7,
                        delay: i * 0.07,
                        ease: [0.22, 1, 0.36, 1]
                    }}
                    whileHover={{ y: -4 }}
                    className={`group relative overflow-hidden rounded-3xl ring-1 ring-sand-200 bg-gradient-to-br ${it.bg} ${it.span} p-6 md:p-7`}
                >
                    <motion.div
                        aria-hidden
                        className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-white/50 blur-2xl opacity-0 group-hover:opacity-100 transition"
                    />
                    <div className="text-3xl">{it.icon}</div>
                    <h3 className="mt-3 font-display text-xl md:text-2xl font-semibold text-ink">
                        {it.title}
                    </h3>
                    <p className="mt-2 text-sm md:text-base text-ink/70 max-w-md">
                        {it.body}
                    </p>
                </motion.div>
            ))}
        </div>
    );
}
