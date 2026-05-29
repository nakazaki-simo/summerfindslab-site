/**
 * Canonical types for the Summer Finds Lab Daily affiliate platform.
 *
 * These mirror the JSON shape produced by `scripts/import-products.mjs`.
 * New TypeScript files should import from here. JS files are unaffected.
 */

export type CategorySlug =
    | "summer-gadgets"
    | "beach-essentials"
    | "tiktok-finds"
    | "aesthetic-room"
    | "travel"
    | "skincare-summer"
    | "pet-summer";

export type ProductTag = "trending" | "tiktok" | "under-25" | "viral";

export type ImageSource = "amazon" | "curated" | "manual";

export interface Rating {
    value: number;
    count: number;
}

export interface Product {
    id: string;
    title: string;
    originalTitle?: string;
    description: string;
    editorNote?: string;
    brand: string;
    price: number;
    rating?: Rating;
    category: CategorySlug;
    tags: ProductTag[];
    image: string;
    imageSource: ImageSource;
    asin?: string | null;
    affiliateUrl: string;
    source?: string;
    importedAt?: string;
    /** When true, future re-imports will not overwrite this row. */
    editorial: boolean;
}

export interface Category {
    slug: CategorySlug;
    name: string;
    tagline: string;
    image: string;
}

export interface Post {
    slug: string;
    title: string;
    excerpt: string;
    cover: string;
    date: string;
    dateModified?: string;
    readTime: string;
    category: CategorySlug;
    keywords?: string[];
    wordCount?: number;
    content: string;
}

export interface Guide {
    slug: string;
    title: string;
    intro: string;
    intent: "commercial" | "informational" | "transactional";
    category: CategorySlug;
    productIds: string[];
    lastUpdated: string;
    keywords: string[];
    faq: { q: string; a: string }[];
}
