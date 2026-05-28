"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import WaveDivider from "./WaveDivider";

const slides = [
    {
        title: "Beach essentials",
        description: "Sand-free blankets, cooling mists, breezy reads.",
        image:
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&auto=format&fit=crop"
    },
    {
        title: "Aesthetic room",
        description: "Sunset lamps, cloud lights, claw clips.",
        image:
            "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1600&auto=format&fit=crop"
    },
    {
        title: "TikTok viral",
        description: "Mini blenders, cult tumblers, the FYP greatest hits.",
        image:
            "https://images.unsplash.com/photo-1571689936114-b16146c9570a?w=1600&auto=format&fit=crop"
    },
    {
        title: "Travel ready",
        description: "Foldable backpacks, silk eye masks, neck pillows.",
        image:
            "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1600&auto=format&fit=crop"
    }
];

export default function HorizontalShowcase() {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end end"]
    });
    const x = useTransform(scrollYProgress, [0, 1], ["0%", "-75%"]);

    return (
        <>
            <WaveDivider from="#fbf6ee" to="#1f2a37" />
            <section ref={ref} className="relative h-[400vh] bg-ink text-cream">
                <div className="sticky top-0 h-screen overflow-hidden">
                    {/* deep ocean ambient effects */}
                    <div className="pointer-events-none absolute inset-0 opacity-30">
                        <motion.div
                            className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-sea-400 blur-3xl"
                            animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
                            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <motion.div
                            className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-peach-400 blur-3xl"
                            animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
                            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                        />
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
                        className="absolute top-0 left-0 h-full flex items-center gap-8 pl-[8vw] pr-[20vw] pt-32"
                    >
                        {slides.map((s, i) => (
                            <Slide key={i} slide={s} index={i} />
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

function Slide({ slide, index }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: index * 0.05 }}
            className="relative h-[70vh] w-[80vw] md:w-[55vw] shrink-0 overflow-hidden rounded-3xl ring-1 ring-white/20"
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={slide.image}
                alt={slide.title}
                className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10">
                <div className="text-xs uppercase tracking-[0.18em] text-peach-300">
                    0{index + 1} / 04
                </div>
                <h3 className="mt-2 font-display text-3xl md:text-5xl font-semibold">
                    {slide.title}
                </h3>
                <p className="mt-2 max-w-md text-cream/80">{slide.description}</p>
            </div>
        </motion.div>
    );
}
