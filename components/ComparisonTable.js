"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";

const SUPERLATIVES = [
    "Best overall",
    "Best under $25",
    "Most viral",
    "Best for travel",
    "Best room glow",
    "Best for pets"
];

export default function ComparisonTable({ products }) {
    if (!products?.length) return null;

    const rows = products.slice(0, 6).map((p, i) => ({
        ...p,
        super: SUPERLATIVES[i] || "Editor's pick"
    }));

    return (
        <div className="rounded-3xl bg-white ring-1 ring-sand-200 overflow-hidden shadow-card">
            <div className="hidden md:grid grid-cols-[140px_1fr_120px_140px_140px] gap-4 px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-ink/55 font-semibold border-b border-sand-200 bg-sand-50">
                <div>Best for</div>
                <div>Product</div>
                <div>Price</div>
                <div>Rating</div>
                <div className="text-right">Buy</div>
            </div>

            <ul className="divide-y divide-sand-100">
                {rows.map((p, i) => (
                    <motion.li
                        key={p.id}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{ delay: i * 0.04, duration: 0.4 }}
                        className="grid grid-cols-[64px_1fr_auto] md:grid-cols-[140px_1fr_120px_140px_140px] items-center gap-4 px-4 md:px-6 py-4"
                    >
                        <div className="md:hidden h-14 w-14 relative rounded-xl bg-sand-50 overflow-hidden">
                            <Image
                                src={p.image}
                                alt=""
                                fill
                                sizes="64px"
                                className={
                                    p.imageSource === "amazon"
                                        ? "object-contain p-1.5"
                                        : "object-cover"
                                }
                            />
                        </div>

                        <div className="hidden md:block">
                            <div className="text-xs uppercase tracking-[0.16em] text-ink/55 font-semibold">
                                {p.super}
                            </div>
                        </div>

                        <div className="min-w-0 flex items-center gap-3">
                            <div className="hidden md:block h-14 w-14 relative rounded-xl bg-sand-50 overflow-hidden shrink-0">
                                <Image
                                    src={p.image}
                                    alt=""
                                    fill
                                    sizes="56px"
                                    className={
                                        p.imageSource === "amazon"
                                            ? "object-contain p-1.5"
                                            : "object-cover"
                                    }
                                />
                            </div>
                            <div className="min-w-0">
                                <div className="md:hidden text-[10px] uppercase tracking-[0.16em] text-peach-500 font-semibold">
                                    {p.super}
                                </div>
                                <div className="text-[10px] uppercase tracking-[0.16em] text-ink/50 font-semibold mt-0.5 md:mt-0">
                                    {p.brand}
                                </div>
                                <div className="text-sm md:text-base font-medium leading-snug truncate">
                                    {p.title}
                                </div>
                                <Link
                                    href={`/category/${p.category}`}
                                    className="hidden md:inline text-[11px] text-ink/55 hover:text-ink transition"
                                >
                                    More in {p.category.replace(/-/g, " ")}
                                </Link>
                            </div>
                        </div>

                        <div className="hidden md:block font-semibold text-peach-500">
                            ${p.price.toFixed(2)}
                        </div>

                        <div className="hidden md:flex flex-col text-xs text-ink/65">
                            {p.rating && (
                                <>
                                    <span className="text-amber-500 font-medium">
                                        ★ {p.rating.value.toFixed(1)}
                                    </span>
                                    <span>{p.rating.count}+ reviews</span>
                                </>
                            )}
                        </div>

                        <a
                            href={p.affiliateUrl}
                            target="_blank"
                            rel="sponsored nofollow noopener noreferrer"
                            className="md:justify-self-end inline-flex items-center gap-1 rounded-full bg-ink text-cream px-3.5 md:px-4 py-2 text-xs md:text-sm font-medium hover:bg-ink/90 transition"
                        >
                            <span className="md:hidden">${p.price.toFixed(2)}</span>
                            <span className="hidden md:inline">View on Amazon</span>
                            <span>→</span>
                        </a>
                    </motion.li>
                ))}
            </ul>

            <div className="px-6 py-3 text-[10px] uppercase tracking-[0.16em] text-ink/40 font-semibold border-t border-sand-100 bg-sand-50">
                Affiliate links · we earn a commission · prices verified at update
            </div>
        </div>
    );
}
