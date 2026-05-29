import products from "@/data/products.json";
import categories from "@/data/categories.json";
import posts from "@/data/posts.json";

export function getAllProducts() {
    return products;
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
