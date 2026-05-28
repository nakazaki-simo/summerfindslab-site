import { siteConfig } from "@/lib/site";

export default function manifest() {
    return {
        name: siteConfig.name,
        short_name: siteConfig.shortName,
        description: siteConfig.description,
        start_url: "/",
        display: "standalone",
        background_color: "#fbf6ee",
        theme_color: "#ff8c5a",
        icons: [
            {
                src: "/favicon.svg",
                sizes: "any",
                type: "image/svg+xml"
            }
        ]
    };
}
