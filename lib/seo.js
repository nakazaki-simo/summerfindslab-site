import { siteConfig } from "./site";

const baseUrl = () => siteConfig.url.replace(/\/$/, "");

export function organizationLd() {
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: siteConfig.name,
        url: baseUrl(),
        logo: `${baseUrl()}/favicon.svg`,
        sameAs: [
            siteConfig.social.instagram,
            siteConfig.social.tiktok,
            siteConfig.social.pinterest,
            siteConfig.social.youtube
        ]
    };
}

export function websiteLd() {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteConfig.name,
        url: baseUrl(),
        potentialAction: {
            "@type": "SearchAction",
            target: `${baseUrl()}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string"
        }
    };
}

export function productLd(p) {
    return {
        "@context": "https://schema.org",
        "@type": "Product",
        name: p.title,
        description: p.description,
        image: [p.image],
        sku: p.id,
        brand: { "@type": "Brand", name: siteConfig.name },
        offers: {
            "@type": "Offer",
            url: p.affiliateUrl,
            priceCurrency: "USD",
            price: p.price,
            availability: "https://schema.org/InStock"
        }
    };
}

export function itemListLd(products, listName) {
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: listName,
        itemListElement: products.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${baseUrl()}/category/${p.category}`,
            item: productLd(p)
        }))
    };
}

export function breadcrumbsLd(items) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((it, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: it.name,
            item: it.url ? `${baseUrl()}${it.url}` : undefined
        }))
    };
}

export function blogPostingLd(post) {
    return {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.excerpt,
        image: [post.cover],
        datePublished: post.date,
        dateModified: post.date,
        author: { "@type": "Organization", name: siteConfig.name },
        publisher: {
            "@type": "Organization",
            name: siteConfig.name,
            logo: { "@type": "ImageObject", url: `${baseUrl()}/favicon.svg` }
        },
        mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `${baseUrl()}/blog/${post.slug}`
        }
    };
}

export function faqLd(items) {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((q) => ({
            "@type": "Question",
            name: q.q,
            acceptedAnswer: { "@type": "Answer", text: q.a }
        }))
    };
}
