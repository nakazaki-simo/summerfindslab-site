import products from "@/data/products.json";
import categories from "@/data/categories.json";
import posts from "@/data/posts.json";

export function getAllProducts() {
    return products;
}

/**
 * Product detail pages live at /finds/[slug]. We use the existing `id`
 * as the slug — it is URL-safe, stable across re-imports, and already
 * derived from the product title.
 */
export function getProductSlug(product) {
    return product?.id ?? null;
}

export function getProductBySlug(slug) {
    return products.find((p) => p.id === slug) ?? null;
}

/**
 * Same-category products, excluding the current one, capped at `limit`.
 * Used for the "more in this category" rail on /finds/[slug].
 */
export function getRelatedProducts(product, limit = 4) {
    if (!product) return [];
    return products
        .filter((p) => p.id !== product.id && p.category === product.category)
        .slice(0, limit);
}

export function getProductsByTag(tag) {
    return products.filter((p) => p.tags?.includes(tag));
}

export function getProductsByCategory(slug) {
    return products.filter((p) => p.category === slug);
}

export function getProductsUnder(amount) {
    return products.filter((p) => p.price <= amount);
}

export function getCategories() {
    return categories;
}

export function getCategoryBySlug(slug) {
    return categories.find((c) => c.slug === slug) ?? null;
}

export function getAllPosts() {
    return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function getPostBySlug(slug) {
    return posts.find((p) => p.slug === slug) ?? null;
}


import guides from "@/data/guides.json";

export function getAllGuides() {
    return guides;
}

export function getGuideBySlug(slug) {
    return guides.find((g) => g.slug === slug) ?? null;
}

export function getProductsForGuide(guide) {
    if (!guide?.productIds) return [];
    const all = getAllProducts();
    return guide.productIds
        .map((id) => all.find((p) => p.id === id))
        .filter(Boolean);
}


import bundles from "@/data/bundles.json";

export function getAllBundles() {
    return bundles;
}

export function getBundleBySlug(slug) {
    return bundles.find((b) => b.slug === slug) ?? null;
}

export function getProductsForBundle(bundle) {
    if (!bundle?.productIds) return [];
    const all = getAllProducts();
    return bundle.productIds
        .map((id) => all.find((p) => p.id === id))
        .filter(Boolean);
}


import collections from "@/data/collections.json";

export function getAllCollections() {
    return collections;
}

export function getCollectionsByType(type) {
    return collections.filter((c) => c.type === type);
}

export function getCollectionBySlugAndType(slug, type) {
    return (
        collections.find((c) => c.slug === slug && c.type === type) ?? null
    );
}

/**
 * Resolve a collection's `filter` declaration into a list of products.
 * Filter shape (any combination):
 *   { category }                  — single category slug
 *   { categories: [slug, slug] }  — multiple category slugs (OR)
 *   { tag }                       — single tag (e.g. "under-25", "tiktok")
 *   { maxPrice }                  — price ceiling, inclusive
 *   { minRating }                 — rating floor (default 0)
 *   { onePerCategory: true }      — pick highest-rated per category, dedup
 */
export function getProductsForCollection(collection, { limit = 12 } = {}) {
    if (!collection?.filter) return [];
    const f = collection.filter;
    let list = getAllProducts();

    if (f.category) {
        list = list.filter((p) => p.category === f.category);
    }
    if (f.categories?.length) {
        list = list.filter((p) => f.categories.includes(p.category));
    }
    if (f.tag) {
        list = list.filter((p) => p.tags?.includes(f.tag));
    }
    if (typeof f.maxPrice === "number") {
        list = list.filter((p) => p.price <= f.maxPrice);
    }
    if (typeof f.minRating === "number") {
        list = list.filter((p) => (p.rating?.value ?? 0) >= f.minRating);
    }

    if (f.onePerCategory) {
        const byCat = new Map();
        for (const p of list) {
            const existing = byCat.get(p.category);
            if (
                !existing ||
                (p.rating?.value ?? 0) > (existing.rating?.value ?? 0)
            ) {
                byCat.set(p.category, p);
            }
        }
        list = Array.from(byCat.values());
    }

    // Sort by rating then price ascending so the cheapest of the highest-rated
    // products land at the top of every list.
    list = [...list].sort((a, b) => {
        const r = (b.rating?.value ?? 0) - (a.rating?.value ?? 0);
        if (r !== 0) return r;
        return a.price - b.price;
    });

    return list.slice(0, limit);
}
