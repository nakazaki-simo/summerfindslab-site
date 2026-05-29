import { siteConfig } from "@/lib/site";
import {
    getAllPosts,
    getCategories,
    getAllGuides,
    getAllProducts
} from "@/lib/products";

export default function sitemap() {
    const base = siteConfig.url.replace(/\/$/, "");

    const staticEntries = [
        { url: base, priority: 1, changeFrequency: "daily" },
        { url: `${base}/trending`, priority: 0.9, changeFrequency: "daily" },
        { url: `${base}/under-25`, priority: 0.9, changeFrequency: "daily" },
        { url: `${base}/tiktok-finds`, priority: 0.9, changeFrequency: "daily" },
        { url: `${base}/categories`, priority: 0.8, changeFrequency: "weekly" },
        { url: `${base}/guides`, priority: 0.9, changeFrequency: "weekly" },
        { url: `${base}/blog`, priority: 0.8, changeFrequency: "weekly" },
        { url: `${base}/about`, priority: 0.6, changeFrequency: "yearly" },
        { url: `${base}/disclosure`, priority: 0.4, changeFrequency: "yearly" },
        { url: `${base}/privacy`, priority: 0.3, changeFrequency: "yearly" }
    ].map((e) => ({ ...e, lastModified: new Date() }));

    const categoryEntries = getCategories().map((c) => ({
        url: `${base}/category/${c.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
        images: [c.image]
    }));

    const guideEntries = getAllGuides().map((g) => ({
        url: `${base}/guides/${g.slug}`,
        lastModified: new Date(g.lastUpdated),
        changeFrequency: "weekly",
        priority: 0.85
    }));

    const postEntries = getAllPosts().map((p) => ({
        url: `${base}/blog/${p.slug}`,
        lastModified: new Date(p.dateModified || p.date),
        changeFrequency: "monthly",
        priority: 0.6,
        images: [p.cover]
    }));

    const productEntries = getAllProducts().map((p) => ({
        url: `${base}/finds/${p.id}`,
        lastModified: new Date(p.importedAt || Date.now()),
        changeFrequency: "weekly",
        priority: 0.55,
        images: [p.image]
    }));

    return [
        ...staticEntries,
        ...categoryEntries,
        ...guideEntries,
        ...postEntries,
        ...productEntries
    ];
}
