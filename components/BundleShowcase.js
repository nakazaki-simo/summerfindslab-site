"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";

export default function BundleShowcase({ bundle, products }) {
    if (!bundle || !products?.length) return null;

    const total = products.reduce((sum, p) => sum + p.price, 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${bundle.color} ring-1 ring-sand-200`}
        >
            <div className="grid lg:grid-cols-[1.1fr_1fr] gap-0">
                {/* Copy column */}
                <div className="p-8 md:p-12 flex flex-col">
                    <span className="inline-flex items-center gap-2 self-start rounded-full bg-white/70 backdrop-blur ring-1 ring-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-peach-500" />
                        Editor&apos;s pick · Bundle
                    </span>
                    <h3 className="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-semibold leading-[1.05]">
                        {bundle.name}
                    </h3>
                    <p className="mt-3 text-ink/80 max-w-md">{bundle.tagline}</p>
                    <p className="mt-5 text-ink/70 max-w-md leading-relaxed">
                        {bundle.intro}
                    </p>

                    <div className="mt-auto pt-8">
                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-xs uppercase tracking-[0.18em] text-ink/60 font-semibold">
                                    {bundle.totalLabel}
                                </div>
                                <div className="font-display text-4xl font-semibold mt-1">
                                    ${total.toFixed(2)}
                                </div>
                                <div className="text-xs text-ink/55 mt-1">
                                    {products.length} items · all under $30
                                </div>
                            </div>
                            <Link
                                href={`#bundle-${bundle.slug}`}
                                className="inline-flex items-center gap-1.5 rounded-full bg-ink text-cream px-5 py-3 text-sm font-medium hover:bg-ink/90 transition"
                            >
                                See picks →
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Stacked product preview column */}
                <div id={`bundle-${bundle.slug}`} className="relative bg-cream/40 backdrop-blur p-6 md:p-10">
                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                        {products.slice(0, 4).map((p, i) => (
                            <motion.a
                                key={p.id}
                                href={p.affiliateUrl}
                                target="_blank"
                                rel="sponsored nofollow noopener noreferrer"
                                initial={{ opacity: 0, y: 12 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.06, duration: 0.5 }}
                                className="group relative bg-white rounded-2xl ring-1 ring-sand-200 overflow-hidden hover:shadow-soft transition-shadow"
                            >
                                <div className="relative aspect-square bg-white">
                                    <Image
                                        src={p.image}
                                        alt={p.title}
                                        fill
                                        sizes="(min-width:1024px) 18vw, 40vw"
                                        className={
                                            p.imageSource === "amazon"
                                                ? "object-contain p-3"
                                                : "object-cover"
                                        }
                                    />
                                    <span className="absolute top-2 left-2 rounded-full bg-ink/90 text-cream text-[10px] font-semibold px-2 py-0.5 backdrop-blur">
                                        0{i + 1}
                                    </span>
                                </div>
                                <div className="p-3">
                                    <div className="text-[10px] uppercase tracking-[0.16em] text-ink/50 font-semibold">
                                        {p.brand}
                                    </div>
                                    <div className="mt-0.5 text-xs leading-snug font-medium line-clamp-2">
                                        {p.title}
                                    </div>
                                    <div className="mt-1.5 flex items-center justify-between">
                                        <span className="text-sm font-semibold text-peach-500">
                                            ${p.price.toFixed(2)}
                                        </span>
                                        <span className="text-[11px] text-ink/60 group-hover:text-peach-500 transition">
                                            View →
                                        </span>
                                    </div>
                                </div>
                            </motion.a>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
