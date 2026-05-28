"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, animate } from "motion/react";
import { siteConfig } from "@/lib/site";

function Counter({ to, suffix }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-60px" });
    const mv = useMotionValue(0);
    const [display, setDisplay] = useState("0");

    useEffect(() => {
        if (!inView) return;
        const controls = animate(mv, to, {
            duration: 1.6,
            ease: [0.22, 1, 0.36, 1],
            onUpdate: (v) => setDisplay(Math.round(v).toString())
        });
        return controls.stop;
    }, [inView, mv, to]);

    return (
        <span ref={ref}>
            {display}
            {suffix}
        </span>
    );
}

export default function StatsStrip() {
    return (
        <section className="relative -mt-12 z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-2 md:grid-cols-4 rounded-3xl bg-white/90 backdrop-blur ring-1 ring-sand-200 shadow-soft overflow-hidden"
            >
                {siteConfig.stats.map((s, i) => (
                    <div
                        key={i}
                        className="p-6 md:p-8 text-center md:border-r border-sand-200 last:border-r-0"
                    >
                        <div className="font-display text-4xl md:text-5xl font-semibold text-ink">
                            <Counter to={s.value} suffix={s.suffix} />
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-ink/60">
                            {s.label}
                        </div>
                    </div>
                ))}
            </motion.div>
        </section>
    );
}
