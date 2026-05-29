"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { motion } from "motion/react";

const FALLBACK_BY_CATEGORY = {
    "summer-gadgets":
        "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f37?w=800&auto=format&fit=crop",
    "beach-essentials":
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop",
    "tiktok-finds":
        "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop",
    "aesthetic-room":
        "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&auto=format&fit=crop",
    travel: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop",
    "skincare-summer":
        "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop",
    "pet-summer":
        "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop"
};

export default function ProductCard({ product, masonry = false, priority = false }) {
    const [imgError, setImgError] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    if (!product) return null;

    const isAmazonImage = product.imageSource === "amazon";
    const imgSrc = imgError
        ? FALLBACK_BY_CATEGORY[product.category]
        : product.image;

    return (
        <motion.article
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -4 }}
            className={`group relative bg-white rounded-2xl overflow-hidden shadow-card ring-1 ring-sand-100 hover:shadow-soft transition-shadow duration-300 ${masonry ? "masonry-item" : ""
                }`}
            data-cursor="view"
            itemScope
            itemType="https://schema.org/Product"
        >
            <meta itemProp="name" content={product.title} />
            {product.brand ? <meta itemProp="brand" content={product.brand} /> : null}

            <div className="relative overflow-hidden bg-sand-50">
                {!imgLoaded && (
                    <div
                        aria-hidden
                        className="absolute inset-0 animate-pulse bg-gradient-to-br from-sand-50 via-sand-100 to-sand-50"
                        style={{ aspectRatio: "1 / 1" }}
                    />
                )}

                <Image
                    src={imgSrc}
                    alt={product.title}
                    width={600}
                    height={600}
                    priority={priority}
                    loading={priority ? "eager" : "lazy"}
                    onLoad={() => setImgLoaded(true)}
                    onError={() => {
                        setImgError(true);
                        setImgLoaded(true);
                    }}
                    sizes="(min-width:1280px) 25vw, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                    className={`w-full h-auto ${isAmazonImage ? "object-contain bg-white p-3 md:p-4" : "object-cover"
                        } transition-transform duration-500 group-hover:scale-105`}
                    itemProp="image"
                />

                {/* badges */}
                <div className="absolute top-3 left-3 right-3 z-20 flex items-start justify-between gap-2 pointer-events-none">
                    <div className="flex flex-wrap gap-1.5">
                        {product.tags?.includes("tiktok") && (
                            <span className="rounded-full bg-ink/90 backdrop-blur text-cream text-[11px] font-medium px-2.5 py-1">
                                TikTok pick
                            </span>
                        )}
                        {product.tags?.includes("trending") && (
                            <span className="rounded-full bg-peach-500 text-white text-[11px] font-medium px-2.5 py-1">
                                Trending
                            </span>
                        )}
                    </div>
                    {product.price <= 25 && (
                        <span className="rounded-full bg-peach-300 text-ink text-[11px] font-semibold px-2.5 py-1">
                            Under $25
                        </span>
                    )}
                </div>

                {/* save action — desktop only */}
                <button
                    type="button"
                    aria-label="Save"
                    className="hidden md:inline-flex absolute bottom-3 right-3 z-20 items-center gap-1 rounded-full bg-white/95 backdrop-blur ring-1 ring-sand-200 text-ink text-xs font-medium px-3 py-1.5 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition shadow-soft"
                >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                        <path d="M12 21s-7-4.35-7-10a4.5 4.5 0 018-2.79A4.5 4.5 0 0119 11c0 5.65-7 10-7 10z" />
                    </svg>
                    Save
                </button>
            </div>

            <div className="p-4">
                {product.brand && (
                    <div className="text-[10px] uppercase tracking-[0.18em] text-ink/50 font-semibold">
                        {product.brand}
                    </div>
                )}
                <div className="mt-1 flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg leading-snug" itemProp="name">
                        {product.title}
                    </h3>
                    <span
                        className="shrink-0 font-semibold text-peach-500"
                        itemProp="offers"
                        itemScope
                        itemType="https://schema.org/Offer"
                    >
                        <meta itemProp="priceCurrency" content="USD" />
                        <span itemProp="price" content={product.price.toFixed(2)}>
                            ${product.price.toFixed(2)}
                        </span>
                    </span>
                </div>

                <p
                    className="mt-2 text-sm text-ink/70 line-clamp-3"
                    itemProp="description"
                >
                    {product.description}
                </p>

                {product.rating && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-ink/60">
                        <span className="text-amber-500">
                            {"★".repeat(Math.round(product.rating.value))}
                            <span className="text-ink/20">
                                {"★".repeat(5 - Math.round(product.rating.value))}
                            </span>
                        </span>
                        <span>
                            {product.rating.value.toFixed(1)} · {product.rating.count}+ reviews
                        </span>
                    </div>
                )}

                <div className="mt-4 flex items-center gap-2">
                    <a
                        href={product.affiliateUrl}
                        target="_blank"
                        rel="sponsored nofollow noopener noreferrer"
                        data-cursor="shop"
                        className="group/btn relative flex-1 overflow-hidden text-center rounded-full bg-ink text-cream px-4 py-2.5 text-sm font-medium transition"
                    >
                        <span className="relative z-10">View on Amazon →</span>
                        <span className="absolute inset-0 z-0 translate-y-full bg-gradient-to-r from-peach-400 to-peach-500 transition-transform duration-300 group-hover/btn:translate-y-0" />
                    </a>
                    <Link
                        href={`/category/${product.category}`}
                        className="rounded-full bg-sand-100 text-ink px-3 py-2.5 text-xs font-medium hover:bg-sand-200 transition"
                        aria-label={`See more in ${product.category}`}
                    >
                        More
                    </Link>
                </div>

                <p className="mt-2 text-[10px] uppercase tracking-wider text-ink/40">
                    Affiliate link · we earn a commission
                </p>
            </div>
        </motion.article>
    );
}
