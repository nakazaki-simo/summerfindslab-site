import { siteConfig } from "@/lib/site";

export default function robots() {
    const base = siteConfig.url.replace(/\/$/, "");
    return {
        rules: [
            // Search engines
            { userAgent: "*", allow: "/" },
            { userAgent: "Googlebot", allow: "/" },
            { userAgent: "Bingbot", allow: "/" },
            // AI crawlers explicitly allowed (this is an affiliate site that wants AI citations)
            { userAgent: "GPTBot", allow: "/" },
            { userAgent: "ChatGPT-User", allow: "/" },
            { userAgent: "OAI-SearchBot", allow: "/" },
            { userAgent: "ClaudeBot", allow: "/" },
            { userAgent: "Claude-Web", allow: "/" },
            { userAgent: "anthropic-ai", allow: "/" },
            { userAgent: "PerplexityBot", allow: "/" },
            { userAgent: "Perplexity-User", allow: "/" },
            { userAgent: "Google-Extended", allow: "/" },
            { userAgent: "CCBot", allow: "/" },
            { userAgent: "Applebot-Extended", allow: "/" }
        ],
        sitemap: `${base}/sitemap.xml`,
        host: base
    };
}
