"use client";

import Link from "next/link";
import { useRef } from "react";
import {
    motion,
    useScroll,
    useTransform,
    useMotionValue,
    useSpring
} from "motion/react";
import MagneticButton from "./MagneticButton";

const floatImages = [
    {
        src: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=600&auto=format&fit=crop",
        label: "Sunset lamp",
        price: "$22.50",
        pos: "top-6 left-2 md:top-10 md:left-6",
        size: "w-32 md:w-44",
        z: 30
    },
    {
        src: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&auto=format&fit=crop",
        label: "Travel pillow",
        price: "$24.99",
        pos: "top-2 right-4 md:top-4 md:right-12",
        size: "w-28 md:w-40",
        z: 20
    },
    {
        src: "https://images.unsplash.com/photo-1571689936114-b16146c9570a?w=600&auto=format&fit=crop",
        label: "Mini blender",
        price: "$27.99",
        pos: "bottom-10 left-10 md:bottom-12 md:left-20",
        size: "w-32 md:w-44",
        z: 40
    },
    {
        src: "https://images.unsplash.com/photo-1519740698800-9d6f31037e3a?w=600&auto=format&fit=crop",
        label: "Beach kit",
        price: "$29.95",
        pos: "bottom-4 right-2 md:bottom-6 md:right-8",
        size: "w-36 md:w-52",
        z: 25
    }
];

export default function Hero() {
    const wrapRef = useRef(null);

    // Scroll-driven background sun + parallax
    const { scrollYProgress } = useScroll({
        target: wrapRef,
        offset: ["start start", "end start"]
    });
    const sunY = useTransform(scrollYProgress, [0, 1], ["0%", "60%"]);
    const sunScale = useTransform(scrollYProgress, [0, 1], [1, 1.4]);
    const cardsY = useTransform(scrollYProgress, [0, 1], ["0%", "-25%"]);
    const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
    const titleOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

    // Mouse parallax for the floating product cards
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const smx = useSpring(mx, { stiffness: 80, damping: 18 });
    const smy = useSpring(my, { stiffness: 80, damping: 18 });

    function handleMove(e) {
        const el = wrapRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
        my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
    }

    return (
        <section
            ref={wrapRef}
            onMouseMove={handleMove}
            className="relative overflow-hidden isolate"
        >
            {/* animated gradient background */}
            <motion.div
                aria-hidden
                className="absolute inset-0 -z-30"
                style={{
                    background:
                        "radial-gradient(1200px 500px at 12% 0%, rgba(255,179,138,0.55), transparent 60%), radial-gradient(900px 500px at 100% 30%, rgba(136,201,194,0.45), transparent 60%), linear-gradient(180deg,#fdf9f3 0%, #fbf6ee 100%)"
                }}
            />

            {/* floating sun blob */}
            <motion.div
                aria-hidden
                style={{ y: sunY, scale: sunScale }}
                className="absolute -z-20 top-[-120px] right-[-120px] h-[460px] w-[460px] rounded-full"
            >
                <div className="h-full w-full rounded-full bg-gradient-to-br from-peach-300 via-peach-400 to-peach-500 blur-3xl opacity-70" />
            </motion.div>

            {/* small sea blob bottom-left */}
            <motion.div
                aria-hidden
                style={{ y: useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]) }}
                className="absolute -z-20 bottom-[-160px] left-[-120px] h-[420px] w-[420px] rounded-full bg-gradient-to-br from-sea-200 to-sea-400 blur-3xl opacity-50"
            />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24 md:pt-24 md:pb-32 relative">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* left: animated copy */}
                    <motion.div style={{ y: titleY, opacity: titleOpacity }}>
                        <motion.span
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1 text-xs font-medium text-ink/80 ring-1 ring-sand-200"
                        >
                            <motion.span
                                className="h-2 w-2 rounded-full bg-peach-400"
                                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.7, 1] }}
                                transition={{ duration: 1.6, repeat: Infinity }}
                            />
                            Daily updated · Summer 2026 edition
                        </motion.span>

                        <h1 className="mt-5 font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] tracking-tight">
                            <AnimatedTitle />
                        </h1>

                        <motion.p
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.6 }}
                            className="mt-6 max-w-xl text-base md:text-lg text-ink/70"
                        >
                            Hand-picked Amazon gadgets, beach essentials, viral TikTok
                            products, aesthetic room upgrades and travel must-haves. All in
                            one breezy place.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.8 }}
                            className="mt-8 flex flex-wrap gap-3"
                        >
                            <MagneticButton
                                as="a"
                                href="/trending"
                                className="rounded-full bg-ink text-cream px-7 py-3.5 text-sm font-medium shadow-soft hover:bg-ink/90"
                            >
                                Shop trending finds →
                            </MagneticButton>
                            <MagneticButton
                                as="a"
                                href="/under-25"
                                className="rounded-full bg-white text-ink px-7 py-3.5 text-sm font-medium ring-1 ring-sand-200 hover:bg-sand-50"
                            >
                                Under $25
                            </MagneticButton>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.7, delay: 1 }}
                            className="mt-9 flex items-center gap-4 text-sm text-ink/60"
                        >
                            <div className="flex -space-x-2">
                                {[
                                    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&auto=format&fit=crop",
                                    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&auto=format&fit=crop",
                                    "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=60&auto=format&fit=crop"
                                ].map((src, i) => (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        key={i}
                                        src={src}
                                        alt="happy reader"
                                        className="h-8 w-8 rounded-full ring-2 ring-cream object-cover"
                                    />
                                ))}
                            </div>
                            Loved by 12k+ summer shoppers this month.
                        </motion.div>
                    </motion.div>

                    {/* right: floating 3D product cards */}
                    <motion.div
                        style={{ y: cardsY }}
                        className="relative h-[460px] md:h-[560px] [perspective:1200px]"
                    >
                        {floatImages.map((it, i) => (
                            <FloatCard
                                key={i}
                                item={it}
                                index={i}
                                mx={smx}
                                my={smy}
                            />
                        ))}

                        {/* center sun ring */}
                        <motion.div
                            aria-hidden
                            animate={{ rotate: 360 }}
                            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 m-auto h-44 w-44 md:h-56 md:w-56 rounded-full border border-dashed border-peach-300/60"
                        />
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 m-auto h-28 w-28 md:h-36 md:w-36 rounded-full bg-gradient-to-br from-peach-300 to-peach-500 shadow-[0_30px_80px_-10px_rgba(255,140,90,0.6)]"
                        />
                    </motion.div>
                </div>
            </div>

            {/* curved bottom divider */}
            <div className="absolute bottom-0 left-0 right-0 -z-10">
                <svg viewBox="0 0 1440 100" className="w-full h-12 text-cream">
                    <path fill="currentColor" d="M0,64 C360,120 1080,0 1440,64 L1440,100 L0,100 Z" />
                </svg>
            </div>
        </section>
    );
}

function FloatCard({ item, index, mx, my }) {
    // Each card moves a different amount with the mouse
    const factor = (index % 2 === 0 ? 1 : -1) * (10 + index * 4);
    const tx = useTransform(mx, (v) => v * factor);
    const ty = useTransform(my, (v) => v * factor * 0.8);

    return (
        <motion.div
            initial={{ opacity: 0, y: 60, rotate: -6 }}
            animate={{ opacity: 1, y: 0, rotate: index % 2 === 0 ? -3 : 4 }}
            transition={{
                duration: 0.9,
                delay: 0.2 + index * 0.12,
                ease: [0.22, 1, 0.36, 1]
            }}
            whileHover={{ scale: 1.06, rotate: 0, zIndex: 50 }}
            style={{ x: tx, y: ty, zIndex: item.z }}
            className={`absolute ${item.pos} ${item.size} rounded-2xl bg-white shadow-soft ring-1 ring-sand-200 overflow-hidden`}
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
                <img src={item.src} alt={item.label} className="w-full h-32 md:h-40 object-cover" />
                <div className="px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wider text-ink/50">
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

function AnimatedTitle() {
    const lines = [
        ["Trending", "summer", "finds,"],
        ["curated", "daily."]
    ];
    let counter = 0;
    return (
        <span className="inline-block">
            {lines.map((line, li) => (
                <span key={li} className="block">
                    {line.map((word, wi) => {
                        const delay = 0.1 + counter * 0.07;
                        counter += 1;
                        const isAccent = li === 1;
                        return (
                            <motion.span
                                key={`${li}-${wi}`}
                                initial={{ y: "110%", opacity: 0 }}
                                animate={{ y: "0%", opacity: 1 }}
                                transition={{
                                    duration: 0.8,
                                    delay,
                                    ease: [0.22, 1, 0.36, 1]
                                }}
                                className={`inline-block mr-3 ${isAccent ? "text-peach-500" : ""
                                    }`}
                                style={{ display: "inline-block" }}
                            >
                                {word}
                            </motion.span>
                        );
                    })}
                </span>
            ))}
        </span>
    );
}
