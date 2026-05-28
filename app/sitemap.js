import { siteConfig } from "@/lib/site";
import { getAllPosts, getCategories } from "@/lib/products";

export default function sitemap() {
    const base = siteConfig.url.replace(/\/$/, "");

    const staticEntries = [
        { url: base, priority: 1, changeFrequency: "daily" },
        { url: `${base}/trending`, priority: 0.9, changeFrequency: "daily" },
        { url: `${base}/under-25`, priority: 0.9, changeFrequency: "daily" },
        { url: `${base}/tiktok-finds`, priority: 0.9, changeFrequency: "daily" },
        { url: `${base}/categories`, priority: 0.8, changeFrequency: "weekly" },
        { url: `${base}/blog`, priority: 0.8, changeFrequency: "weekly" },
        { url: `${base}/about`, priority: 0.5, changeFrequency: "yearly" },
        {
            url: `${base}/disclosure`,
            priority: 0.4,
            changeFrequency: "yearly"
        },
        { url: `${base}/privacy`, priority: 0.3, changeFrequency: "yearly" }
    ].map((e) => ({ ...e, lastModified: new Date() }));

    const categoryEntries = getCategories().map((c) => ({
        url: `${base}/category/${c.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.7
    }));

    const postEntries = getAllPosts().map((p) => ({
        url: `${base}/blog/${p.slug}`,
        lastModified: new Date(p.date),
        changeFrequency: "monthly",
        priority: 0.6
    }));

    return [...staticEntries, ...categoryEntries, ...postEntries];
}
