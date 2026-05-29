"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

/**
 * Sticky bottom CTA on mobile. Appears after the user scrolls past the hero,
 * offers one-tap "Buy on Amazon" for the editor's top pick. Disappears on
 * desktop where there's already room for the CTA in the hero.
 */
export default function StickyMobileCta({ product }) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const onScroll = () => setShow(window.scrollY > 800);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    if (!product) return null;

    return (
        <AnimatePresence>
            {show && (
                <motion.aside
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 240, damping: 24 }}
                    className="fixed inset-x-3 bottom-3 z-40 md:hidden rounded-2xl bg-ink text-cream shadow-soft ring-1 ring-white/10"
                >
                    <a
                        href={product.affiliateUrl}
                        target="_blank"
                        rel="sponsored nofollow noopener noreferrer"
                        className="flex items-center gap-3 p-2.5"
                    >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white">
                            <Image
                                src={product.image}
                                alt={product.title}
                                fill
                                sizes="48px"
                                className={
                                    product.imageSource === "amazon"
                                        ? "object-contain p-1"
                                        : "object-cover"
                                }
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[10px] uppercase tracking-[0.16em] text-cream/70 font-semibold">
                                Editor&apos;s top pick
                            </div>
                            <div className="text-sm font-medium leading-snug truncate">
                                {product.title}
                            </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-peach-500 px-3.5 py-2 text-xs font-semibold text-white">
                            ${product.price.toFixed(2)} →
                        </span>
                    </a>
                </motion.aside>
            )}
        </AnimatePresence>
    );
}
