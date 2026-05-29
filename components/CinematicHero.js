"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import MagneticButton from "./MagneticButton";
import BeachVideo from "./BeachVideo";

/**
 * Editorial-grade hero. Patterned after Wirecutter / The Strategist:
 *  - One single hero pick, big photo, instant click target
 *  - Trust ribbon (last updated + tested by editor)
 *  - Mini "we tested 10, this won" credibility line
 */
export default function CinematicHero({ heroPick, total = 10 }) {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"]
    });
    const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
    const titleOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

    if (!heroPick) return null;

    return (
        <section
            ref={ref}
            className="relative min-h-[100svh] w-full overflow-hidden text-cream"
        >
            <BeachVideo />

            <motion.div
                style={{ y: titleY, opacity: titleOpacity }}
                className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 md:pt-28 pb-16"
            >
                <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-16 items-center">
                    {/* Copy column */}
                    <div>
                        <motion.span
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
                        >
                            <motion.span
                                className="h-2 w-2 rounded-full bg-peach-300"
                                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.6, 1] }}
                                transition={{ duration: 1.6, repeat: Infinity }}
                            />
                            Summer 2026 · Editor-tested
                        </motion.span>

                        <h1 className="mt-6 font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.02] tracking-tight drop-shadow-[0_2px_20px_rgba(0,0,0,0.55)]">
                            <SplitLine text="The summer picks" delay={0.1} />
                            <SplitLine text="we&apos;d buy ourselves." delay={0.4} accent className="block" />
                        </h1>

                        <p className="mt-6 max-w-xl text-base md:text-lg text-cream/85 leading-relaxed">
                            We tested {total} of summer 2026&apos;s most-shared Amazon finds.
                            Below is the top pick, plus four curated bundles that solve
                            real summer problems for under $100 each.
                        </p>

                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8, duration: 0.6 }}
                            className="mt-8 flex flex-wrap items-center gap-3"
                        >
                            <MagneticButton
                                as="a"
                                href={heroPick.affiliateUrl}
                                target="_blank"
                                rel="sponsored nofollow noopener noreferrer"
                                data-cursor="shop"
                                className="rounded-full bg-cream text-ink px-7 py-3.5 text-sm font-semibold hover:bg-white shadow-soft"
                            >
                                See the top pick on Amazon →
                            </MagneticButton>
                            <MagneticButton
                                as="a"
                                href="#bundles"
                                className="rounded-full bg-white/15 backdrop-blur ring-1 ring-white/40 text-cream px-7 py-3.5 text-sm font-medium hover:bg-white/25"
                            >
                                Browse bundles
                            </MagneticButton>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1, duration: 0.6 }}
                            className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs uppercase tracking-[0.18em] text-cream/70"
                        >
                            <span className="inline-flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-peach-300" />
                                Updated weekly
                            </span>
                            <span>·</span>
                            <span>Editor-tested</span>
                            <span>·</span>
                            <span>FTC-disclosed affiliate links</span>
                        </motion.div>
                    </div>

                    {/* Hero pick card */}
                    <motion.a
                        href={heroPick.affiliateUrl}
                        target="_blank"
                        rel="sponsored nofollow noopener noreferrer"
                        data-cursor="shop"
                        initial={{ opacity: 0, scale: 0.92, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        whileHover={{ y: -6 }}
                        className="relative block group rounded-3xl bg-white shadow-soft ring-1 ring-white/50 overflow-hidden"
                    >
                        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                            <span className="rounded-full bg-emerald-600 text-white text-[11px] font-semibold uppercase tracking-[0.14em] px-3 py-1.5 shadow">
                                Top pick
                            </span>
                            {heroPick.tags?.includes("trending") && (
                                <span className="rounded-full bg-peach-500 text-white text-[11px] font-semibold uppercase tracking-[0.14em] px-3 py-1.5 shadow">
                                    Trending
                                </span>
                            )}
                        </div>
                        <div className="relative aspect-[5/4] bg-white">
                            <Image
                                src={heroPick.image}
                                alt={heroPick.title}
                                fill
                                priority
                                sizes="(min-width:1024px) 40vw, 100vw"
                                className={
                                    heroPick.imageSource === "amazon"
                                        ? "object-contain p-8 md:p-10"
                                        : "object-cover"
                                }
                            />
                        </div>
                        <div className="p-6 md:p-7 text-ink">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-ink/55 font-semibold">
                                {heroPick.brand}
                            </div>
                            <h2 className="mt-2 font-display text-xl md:text-2xl font-semibold leading-snug">
                                {heroPick.title}
                            </h2>
                            <p className="mt-2 text-sm text-ink/70 line-clamp-2">
                                {heroPick.description}
                            </p>
                            <div className="mt-4 flex items-end justify-between">
                                <div>
                                    <div className="font-display text-3xl font-semibold text-peach-500">
                                        ${heroPick.price.toFixed(2)}
                                    </div>
                                    {heroPick.rating && (
                                        <div className="mt-1 text-xs text-ink/60">
                                            <span className="text-amber-500">★ {heroPick.rating.value.toFixed(1)}</span>{" "}
                                            <span>· {heroPick.rating.count}+ reviews</span>
                                        </div>
                                    )}
                                </div>
                                <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink group-hover:text-peach-500 transition">
                                    View on Amazon →
                                </span>
                            </div>
                            <p className="mt-3 text-[10px] uppercase tracking-wider text-ink/40">
                                Affiliate link · we earn a commission
                            </p>
                        </div>
                    </motion.a>
                </div>
            </motion.div>

            {/* Soft scroll cue */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-cream/70 text-[10px] uppercase tracking-[0.18em]">
                Scroll for bundles ↓
            </div>
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
                            delay: delay + i * 0.06,
                            duration: 0.7,
                            ease: [0.22, 1, 0.36, 1]
                        }}
                        className={`inline-block mr-3 ${accent ? "italic text-peach-300" : ""}`}
                    >
                        {w}
                    </motion.span>
                </span>
            ))}
        </span>
    );
}
