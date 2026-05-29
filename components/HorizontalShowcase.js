"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import WaveDivider from "./WaveDivider";

export default function HorizontalShowcase({ slides }) {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end end"]
    });

    const total = slides?.length || 0;
    // Calculate scroll distance based on number of slides
    const x = useTransform(scrollYProgress, [0, 1], ["0%", `-${(total - 1) * 60}%`]);

    if (!slides || slides.length === 0) return null;

    return (
        <>
            <WaveDivider from="#fbf6ee" to="#1f2a37" />
            <section ref={ref} className="relative h-[300vh] bg-ink text-cream">
                <div className="sticky top-0 h-screen overflow-hidden">
                    <div className="pointer-events-none absolute inset-0 opacity-30">
                        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-sea-400 blur-3xl" />
                        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-peach-400 blur-3xl" />
                    </div>

                    <div className="absolute top-10 left-0 right-0 z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <span className="text-xs uppercase tracking-[0.18em] text-peach-300 font-semibold">
                            The collection
                        </span>
                        <h2 className="mt-2 font-display text-4xl md:text-6xl font-semibold leading-[1.05]">
                            One scroll, every vibe.
                        </h2>
                    </div>

                    <motion.div
                        style={{ x }}
                        className="absolute top-0 left-0 h-full flex items-center gap-8 pl-[8vw] pr-[20vw] pt-32 will-change-transform"
                    >
                        {slides.map((s, i) => (
                            <Slide key={i} slide={s} index={i} total={total} />
                        ))}
                    </motion.div>

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.18em] text-cream/60">
                        ← Scroll →
                    </div>
                </div>
            </section>
            <WaveDivider from="#1f2a37" to="#fbf6ee" flip />
        </>
    );
}

function Slide({ slide, index, total }) {
    const isAmazon = slide.image?.includes("media-amazon.com");
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.04 }}
            className="relative h-[70vh] w-[80vw] md:w-[55vw] shrink-0 overflow-hidden rounded-3xl ring-1 ring-white/20 bg-cream"
        >
            <Image
                src={slide.image}
                alt={slide.title}
                fill
                sizes="(min-width:1024px) 55vw, 80vw"
                className={isAmazon ? "object-contain p-12 bg-cream" : "object-cover"}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
                <div className="text-xs uppercase tracking-[0.18em] text-peach-300">
                    0{index + 1} / 0{total}
                </div>
                <h3 className="mt-2 font-display text-3xl md:text-5xl font-semibold">
                    {slide.title}
                </h3>
                <p className="mt-2 max-w-md text-cream/85">{slide.description}</p>
                {slide.href && (
                    <Link
                        href={slide.href}
                        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cream/90 hover:text-peach-300"
                    >
                        Browse the collection →
                    </Link>
                )}
            </div>
        </motion.div>
    );
}
