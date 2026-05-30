// TODO(launch): replace `siteConfig.url` with your real production domain
// before deploying. The current value is the canonical template — every
// metadata, OG, JSON-LD, sitemap and llms.txt reference is derived from it.
export const siteConfig = {
    name: "Summer Finds Lab Daily",
    shortName: "Summer Finds Lab",
    tagline: "Daily drops of trending summer must-haves.",
    description:
        "Summer Finds Lab Daily curates Amazon summer gadgets, beach essentials, viral TikTok products, aesthetic room finds and travel accessories. Daily updated, hand-picked, made for sunny days.",
    // TODO(domain): revert this to "https://summerfindslab.com" once the custom
    // domain is purchased and connected in Vercel (Settings → Domains). Until
    // then we use the live Vercel URL so canonical/OG/sitemap/JSON-LD resolve.
    url: "https://summerfindslab-site.vercel.app",
    ogImage: "/og.png",

    // TODO(brand): replace with your real handles, then uncomment in
    // `organizationLd().sameAs`. Until then we ship without `sameAs` so we
    // do not point AI crawlers at root social URLs (which breaks entity
    // resolution).
    social: {
        instagram: null,
        tiktok: null,
        pinterest: null,
        youtube: null
    },

    // TODO(team): swap with the real editor + headshot before launch.
    // The Person schema relies on this for E-E-A-T author signals.
    editor: {
        name: "Lina Reyes",
        role: "Founder & Lead Editor",
        bio: "Lina has spent six summers reviewing seasonal gadgets across travel, beach and aesthetic-home categories. She personally tests every product featured on Summer Finds Lab.",
        image: "/team/lina.jpg",
        sameAs: []
    },

    nav: [
        { label: "Home", href: "/" },
        { label: "Trending", href: "/trending" },
        { label: "Under $25", href: "/under-25" },
        { label: "TikTok Finds", href: "/tiktok-finds" },
        { label: "Categories", href: "/categories" },
        { label: "Guides", href: "/guides" },
        { label: "Blog", href: "/blog" }
    ],

    // Honest counters. Edit when you have real numbers.
    stats: [
        { value: 12, suffix: "", label: "Hand-picked finds in stock" },
        { value: 5, suffix: "", label: "Curated categories" },
        { value: 365, suffix: "", label: "Days a year of summer picks" },
        { value: 100, suffix: "%", label: "Editor-tested" }
    ],

    faqs: [
        {
            q: "Are these affiliate links?",
            a: "Yes. Summer Finds Lab Daily is a participant in the Amazon Services LLC Associates Program. When you buy through our links we may earn a small commission, at no extra cost to you. We only feature products we have personally tested or vetted against published specs."
        },
        {
            q: "How often is the site updated?",
            a: "Most weekdays. We add fresh trending picks throughout the week so the homepage feed reflects what is actually moving on Amazon, TikTok and Pinterest right now."
        },
        {
            q: "How do you choose the products?",
            a: "We start with what is trending on Amazon Movers & Shakers, TikTok Shop, and Pinterest seasonal trends, then filter for items priced fairly, shipped quickly, and rated 4 stars or higher with a healthy review count. Where possible we test the product ourselves before featuring it."
        },
        {
            q: "How is Summer Finds Lab Daily different from a regular Amazon affiliate blog?",
            a: "Most affiliate sites publish seasonal lists once and let them rot. We refresh daily and remove products that go out of stock, get bad updates, or stop deserving the recommendation."
        },
        {
            q: "Do you ship internationally?",
            a: "We are not a store. Every product opens directly on Amazon, so availability and shipping depend on your country's Amazon catalog."
        },
        {
            q: "Why focus only on summer products?",
            a: "Summer is the highest-intent shopping season for travel, outdoor, beach and aesthetic-home gear. By focusing tightly we go deeper than general gadget blogs and surface picks that solve real summer problems."
        }
    ]
};
