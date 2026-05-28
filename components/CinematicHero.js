"use client";

import { useRef } from "react";
import {
    motion,
    useScroll,
    useTransform,
    useMotionValue,
    useSpring
} from "motion/react";
import MagneticButton from "./MagneticButton";
import BeachVideo from "./BeachVideo";

const floatImages = [
    {
        src: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=600&auto=format&fit=crop",
        label: "Sunset lamp",
        price: "$22.50",
        pos: "top-28 left-4 md:top-32 md:left-10",
        size: "w-32 md:w-44"
    },
    {
        src: "https://images.unsplash.com/photo-1571689936114-b16146c9570a?w=600&auto=format&fit=crop",
        label: "Mini blender",
        price: "$27.99",
        pos: "bottom-44 left-12 md:bottom-44 md:left-32",
        size: "w-28 md:w-40"
    },
    {
        src: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&auto=format&fit=crop",
        label: "Travel pillow",
        price: "$24.99",
        pos: "top-40 right-6 md:top-44 md:right-24",
        size: "w-32 md:w-44"
    },
    {
        src: "https://images.unsplash.com/photo-1519740698800-9d6f31037e3a?w=600&auto=format&fit=crop",
        label: "Beach kit",
        price: "$29.95",
        pos: "bottom-44 right-2 md:bottom-44 md:right-12",
        size: "w-32 md:w-48"
    }
];

export default function CinematicHero() {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"]
    });

    const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
    const titleOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

    // Mouse parallax for floating product cards
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const smx = useSpring(mx, { stiffness: 70, damping: 18 });
    const smy = useSpring(my, { stiffness: 70, damping: 18 });

    function handleMove(e) {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
        my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
    }

    return (
        <section
            ref={ref}
            onMouseMove={handleMove}
            className="relative h-[100svh] min-h-[680px] w-full overflow-hidden text-cream"
        >
            {/* Real cinematic beach video with parallax sun, palms, sparkles */}
            <BeachVideo />

            {/* Floating product cards */}
            {floatImages.map((it, i) => (
                <FloatCard key={i} item={it} index={i} mx={smx} my={smy} />
            ))}

            {/* Center content */}
            <motion.div
                style={{ y: titleY, opacity: titleOpacity }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-6"
            >
                <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.6, duration: 0.6 }}
                    className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/30 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-cream/90 shadow-soft"
                >
                    <motion.span
                        className="h-2 w-2 rounded-full bg-peach-500"
                        animate={{ scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                    />
                    Summer 2026 · Daily updated
                </motion.span>

                <h1 className="mt-6 font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold leading-[1.02] tracking-tight max-w-5xl text-cream drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)]">
                    <SplitLine text="Trending summer finds," delay={1.7} />
                    <SplitLine
                        text="curated daily."
                        delay={2.0}
                        accent
                        className="block"
                    />
                </h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.4, duration: 0.7 }}
                    className="mt-6 max-w-2xl text-base md:text-lg text-cream/90 backdrop-blur-sm bg-black/20 rounded-full px-5 py-2 ring-1 ring-white/20"
                >
                    Hand-picked Amazon gadgets, beach essentials, viral TikTok products,
                    aesthetic room upgrades and travel must-haves.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.6, duration: 0.6 }}
                    className="mt-8 flex flex-wrap items-center justify-center gap-3"
                >
                    <MagneticButton
                        as="a"
                        href="/trending"
                        data-cursor="shop"
                        className="rounded-full bg-cream text-ink px-7 py-3.5 text-sm font-medium hover:bg-white shadow-soft"
                    >
                        Shop trending finds →
                    </MagneticButton>
                    <MagneticButton
                        as="a"
                        href="/under-25"
                        className="rounded-full bg-white/15 backdrop-blur ring-1 ring-white/40 text-cream px-7 py-3.5 text-sm font-medium hover:bg-white/25"
                    >
                        Under $25
                    </MagneticButton>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2.9, duration: 0.7 }}
                    className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs uppercase tracking-[0.18em] text-cream/70"
                >
                    <span>As seen in</span>
                    <span className="font-display text-base normal-case tracking-normal text-cream/90">
                        Vogue Living
                    </span>
                    <span>·</span>
                    <span className="font-display text-base normal-case tracking-normal text-cream/90">
                        TechRadar
                    </span>
                    <span>·</span>
                    <span className="font-display text-base normal-case tracking-normal text-cream/90">
                        BuzzFeed
                    </span>
                    <span>·</span>
                    <span className="font-display text-base normal-case tracking-normal text-cream/90">
                        The Strategist
                    </span>
                </motion.div>
            </motion.div>

            {/* Scroll cue */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3, duration: 0.7 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 text-cream/80 text-xs uppercase tracking-[0.18em]"
            >
                <span>Scroll</span>
                <span className="block h-10 w-[1px] bg-cream/40 overflow-hidden">
                    <motion.span
                        className="block h-full w-full bg-cream"
                        animate={{ y: ["-100%", "100%"] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    />
                </span>
            </motion.div>
        </section>
    );
}

function SplitLine({ text, delay = 0, accent = false, className = "" }) {
    const words = text.split(" ");
    return (
        <span className={`block overflow-hidden ${className}`}>
            {words.map((w, i) => (
                <span key={i} className="inline-block overflow-hidden">
                    <motion.span
                        initial={{ y: "110%" }}
                        animate={{ y: "0%" }}
                        transition={{
                            delay: delay + i * 0.07,
                            duration: 0.85,
                            ease: [0.22, 1, 0.36, 1]
                        }}
                        className={`inline-block mr-3 ${accent ? "italic text-peach-500" : ""}`}
                    >
                        {w}
                    </motion.span>
                </span>
            ))}
        </span>
    );
}

function FloatCard({ item, index, mx, my }) {
    const factor = (index % 2 === 0 ? 1 : -1) * (14 + index * 4);
    const tx = useTransform(mx, (v) => v * factor);
    const ty = useTransform(my, (v) => v * factor * 0.7);

    return (
        <motion.div
            initial={{ opacity: 0, y: 80, rotate: -8 }}
            animate={{ opacity: 1, y: 0, rotate: index % 2 === 0 ? -3 : 4 }}
            transition={{
                delay: 1.8 + index * 0.12,
                duration: 1.1,
                ease: [0.22, 1, 0.36, 1]
            }}
            whileHover={{ scale: 1.06, rotate: 0, zIndex: 50 }}
            style={{ x: tx, y: ty }}
            className={`absolute z-10 ${item.pos} ${item.size} rounded-2xl bg-white/95 backdrop-blur shadow-soft ring-1 ring-white/40 overflow-hidden hidden sm:block`}
        >
            <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{
                    duration: 4 + index,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={item.src}
                    alt={item.label}
                    className="w-full h-32 md:h-40 object-cover"
                />
                <div className="px-3 py-2 text-ink">
                    <div className="text-[10px] uppercase tracking-wider text-ink/50">
                        Today
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.label}</span>
                        <span className="text-xs font-semibold text-peach-500">
                            {item.price}
                        </span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
