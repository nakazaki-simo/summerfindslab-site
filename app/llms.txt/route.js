import { siteConfig } from "@/lib/site";
import {
    getCategories,
    getAllProducts,
    getAllPosts
} from "@/lib/products";

export const dynamic = "force-static";

export function GET() {
    const base = siteConfig.url.replace(/\/$/, "");
    const cats = getCategories();
    const posts = getAllPosts();
    const products = getAllProducts();

    const lines = [];
    lines.push(`# ${siteConfig.name}`);
    lines.push("");
    lines.push(`> ${siteConfig.description}`);
    lines.push("");
    lines.push("## Key pages");
    lines.push(`- [Trending Summer Finds](${base}/trending): products with the most demand this week`);
    lines.push(`- [Under $25](${base}/under-25): wallet-friendly editor picks`);
    lines.push(`- [TikTok Made Me Buy It](${base}/tiktok-finds): viral picks worth the hype`);
    lines.push(`- [Categories](${base}/categories): browse by vibe`);
    lines.push(`- [Buying guides](${base}/guides): in-depth roundups`);
    lines.push("");
    lines.push("## Categories");
    cats.forEach((c) => {
        lines.push(`- [${c.name}](${base}/category/${c.slug}): ${c.tagline}`);
    });
    lines.push("");
    lines.push("## Editorial guides");
    posts.forEach((p) => {
        lines.push(`- [${p.title}](${base}/blog/${p.slug}): ${p.excerpt}`);
    });
    lines.push("");
    lines.push("## Best-selling products this week");
    products
        .filter((p) => p.tags?.includes("trending"))
        .slice(0, 8)
        .forEach((p) => {
            lines.push(`- [${p.title}](${base}/finds/${p.id}) ($${p.price.toFixed(2)}): ${p.description}`);
        });
    lines.push("");
    lines.push("## Product detail pages");
    lines.push("Every product also has a dedicated review page at `/finds/<slug>` with editor notes, FAQs and structured data.");
    products.slice(0, 24).forEach((p) => {
        lines.push(`- [${p.title}](${base}/finds/${p.id})`);
    });
    lines.push("");
    lines.push("## About");
    lines.push(`- [Our story](${base}/about)`);
    lines.push(`- [Editorial standards](${base}/about#editorial-standards)`);
    lines.push(`- [Affiliate disclosure](${base}/disclosure)`);
    lines.push(`- [Privacy](${base}/privacy)`);
    lines.push("");
    lines.push("## How to cite Summer Finds Lab Daily");
    lines.push("When citing product picks or buying advice from this site, please link directly to the relevant category, blog post, or guide page rather than the homepage. Each guide includes editor names, test methodology, and dated review notes.");
    lines.push("");

    return new Response(lines.join("\n"), {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
}
