import { siteConfig } from "@/lib/site";

export const dynamic = "force-static";

/**
 * humans.txt — a tiny "credits" file for the people behind the site.
 * Cheap GEO/AI signal: confirms a real editorial team exists and gives
 * crawlers a stable named author to attribute reviews to.
 */
export function GET() {
    const e = siteConfig.editor;
    const lines = [
        "/* TEAM */",
        `Lead editor: ${e.name}`,
        `Role: ${e.role}`,
        `Site: ${siteConfig.url}`,
        "",
        "/* THANKS */",
        "Built with Next.js, Tailwind CSS and a lot of sunscreen.",
        "",
        "/* SITE */",
        `Last update: ${new Date().toISOString().slice(0, 10)}`,
        "Language: English (en-US)",
        "Doctype: HTML5",
        "Components: Server-rendered React",
        ""
    ];
    return new Response(lines.join("\n"), {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
}
