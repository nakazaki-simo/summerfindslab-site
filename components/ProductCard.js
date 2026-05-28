"use client";

import Link from "next/link";
import { useRef } from "react";
import {
    motion,
    useMotionValue,
    useSpring,
    useTransform
} from "motion/react";

export default function ProductCard({ product, masonry = false }) {
    const ref = useRef(null);
    const mx = useMotionValue(0.5);
    const my = useMotionValue(0.5);
    const sx = useSpring(mx, { stiffness: 200, damping: 20 });
    const sy = useSpring(my, { stiffness: 200, damping: 20 });

    const rotateY = useTransform(sx, [0, 1], [10, -10]);
    const rotateX = useTransform(sy, [0, 1], [-8, 8]);
    const imgX = useTransform(sx, [0, 1], [-12, 12]);
    const imgY = useTransform(sy, [0, 1], [-12, 12]);

    function handleMove(e) {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
    }
    function reset() {
        mx.set(0.5);
        my.set(0.5);
    }

    if (!product) return null;

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMove}
            onMouseLeave={reset}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{
                rotateX,
                rotateY,
                transformPerspective: 900,
                transformStyle: "preserve-3d"
            }}
            className={`group relative bg-white rounded-xl2 overflow-hidden shadow-card ring-1 ring-sand-100 ${masonry ? "masonry-item" : ""
                }`}
            data-cursor="view"
        >
            {/* glow halo on hover */}
            <div
                aria-hidden
                className="pointer-events-none absolute -inset-px z-0 rounded-xl2 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                    background:
                        "conic-gradient(from 120deg, rgba(255,140,90,0.0), rgba(255,140,90,0.35), rgba(78,166,157,0.35), rgba(255,140,90,0.0))",
                    filter: "blur(28px)"
                }}
            />

            <div className="relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <motion.img
                    src={product.image}
                    alt={product.title}
                    loading="lazy"
                    style={{ x: imgX, y: imgY, scale: 1.06 }}
                    className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {product.tags?.includes("tiktok") && (
                    <span className="absolute top-3 left-3 z-20 rounded-full bg-ink/90 backdrop-blur text-cream text-[11px] font-medium px-2.5 py-1">
                        TikTok pick
                    </span>
                )}
                {product.price <= 25 && (
                    <span className="absolute top-3 right-3 z-20 rounded-full bg-peach-300 text-ink text-[11px] font-semibold px-2.5 py-1">
                        Under $25
                    </span>
                )}
            </div>

            <div
                className="relative z-20 p-4"
                style={{ transform: "translateZ(20px)" }}
            >
                <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg leading-snug">
                        {product.title}
                    </h3>
                    <span className="shrink-0 font-semibold text-peach-500">
                        ${product.price.toFixed(2)}
                    </span>
                </div>
                <p className="mt-2 text-sm text-ink/70 line-clamp-3">
                    {product.description}
                </p>
                <div className="mt-4 flex items-center gap-2">
                    <a
                        href={product.affiliateUrl}
                        target="_blank"
                        rel="sponsored nofollow noopener noreferrer"
                        data-cursor="shop"
                        className="group/btn relative flex-1 overflow-hidden text-center rounded-full bg-ink text-cream px-4 py-2 text-sm font-medium transition"
                    >
                        <span className="relative z-10">Shop on Amazon →</span>
                        <span className="absolute inset-0 z-0 translate-y-full bg-gradient-to-r from-peach-400 to-peach-500 transition-transform duration-300 group-hover/btn:translate-y-0" />
                    </a>
                    <Link
                        href={`/category/${product.category}`}
                        className="rounded-full bg-sand-100 text-ink px-3 py-2 text-xs font-medium hover:bg-sand-200 transition"
                        aria-label={`See more in ${product.category}`}
                    >
                        More
                    </Link>
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-wider text-ink/40">
                    Affiliate link · we earn a small commission
                </p>
            </div>
        </motion.div>
    );
}
