"use client";

import Link from "next/link";
import { motion } from "motion/react";

export default function SectionHeader({
    eyebrow,
    title,
    description,
    ctaHref,
    ctaLabel
}) {
    return (
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
                {eyebrow && (
                    <motion.span
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-peach-500 font-semibold"
                    >
                        <span className="h-px w-8 bg-peach-400" />
                        {eyebrow}
                    </motion.span>
                )}
                <motion.h2
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-2 font-display text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight"
                >
                    {title}
                </motion.h2>
                {description && (
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-60px" }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                        className="mt-3 max-w-2xl text-ink/70"
                    >
                        {description}
                    </motion.p>
                )}
            </div>
            {ctaHref && ctaLabel && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <Link
                        href={ctaHref}
                        className="group inline-flex items-center gap-1.5 self-start md:self-auto rounded-full bg-white ring-1 ring-sand-200 px-5 py-2.5 text-sm font-medium hover:bg-sand-50 transition"
                    >
                        {ctaLabel}
                        <span className="transition-transform group-hover:translate-x-0.5">
                            →
                        </span>
                    </Link>
                </motion.div>
            )}
        </div>
    );
}
