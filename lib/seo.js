import { siteConfig } from "./site";

const baseUrl = () => siteConfig.url.replace(/\/$/, "");

export function organizationLd() {
    const sameAs = Object.values(siteConfig.social).filter(Boolean);
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: siteConfig.name,
        url: baseUrl(),
        logo: `${baseUrl()}/favicon.svg`,
        description: siteConfig.description,
        ...(sameAs.length ? { sameAs } : {}),
        foundingDate: "2026",
        founder: personLd()
    };
}

export function personLd() {
    const e = siteConfig.editor;
    return {
        "@context": "https://schema.org",
        "@type": "Person",
        name: e.name,
        jobTitle: e.role,
        description: e.bio,
        image: `${baseUrl()}${e.image}`,
        worksFor: {
            "@type": "Organization",
            name: siteConfig.name,
            url: baseUrl()
        },
        ...(e.sameAs?.length ? { sameAs: e.sameAs } : {})
    };
}

export function websiteLd() {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteConfig.name,
        url: baseUrl(),
        inLanguage: "en-US",
        publisher: {
            "@type": "Organization",
            name: siteConfig.name,
            url: baseUrl()
        },
        potentialAction: {
            "@type": "SearchAction",
            target: `${baseUrl()}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string"
        }
    };
}

export function productLd(p, { canonicalPath } = {}) {
    const offer = {
        "@type": "Offer",
        url: p.affiliateUrl,
        priceCurrency: "USD",
        price: p.price,
        availability: "https://schema.org/InStock",
        priceValidUntil: nextYearISO(),
        seller: { "@type": "Organization", name: "Amazon" }
    };

    const url = canonicalPath ? `${baseUrl()}${canonicalPath}` : undefined;

    return {
        "@context": "https://schema.org",
        "@type": "Product",
        name: p.title,
        description: p.description,
        image: [p.image],
        sku: p.id,
        mpn: p.id,
        category: p.category,
        ...(url ? { url } : {}),
        brand: {
            "@type": "Brand",
            name: p.brand || "See Amazon listing"
        },
        offers: offer,
        ...(p.rating
            ? {
                aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: p.rating.value,
                    bestRating: 5,
                    worstRating: 1,
                    reviewCount: p.rating.count
                },
                review: {
                    "@type": "Review",
                    reviewRating: {
                        "@type": "Rating",
                        ratingValue: p.rating.value,
                        bestRating: 5
                    },
                    author: { "@type": "Organization", name: siteConfig.name },
                    reviewBody: p.editorNote || p.description
                }
            }
            : {})
    };
}

export function itemListLd(products, listName, urlPath = "/") {
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: listName,
        url: `${baseUrl()}${urlPath}`,
        numberOfItems: products.length,
        itemListElement: products.map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            url: `${baseUrl()}/category/${p.category}`,
            item: productLd(p)
        }))
    };
}

export function collectionPageLd({ name, description, urlPath, products }) {
    return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name,
        description,
        url: `${baseUrl()}${urlPath}`,
        isPartOf: { "@type": "WebSite", url: baseUrl(), name: siteConfig.name },
        mainEntity: itemListLd(products, name, urlPath)
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
        dateModified: post.dateModified || post.date,
        wordCount: post.wordCount || estimateWords(post.content),
        articleSection: post.category,
        articleBody: stripHtml(post.content || ""),
        inLanguage: "en-US",
        keywords: post.keywords?.join(", "),
        author: personLd(),
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

/** Rich roundup / "best X" guide schema */
export function howToLd({ name, description, steps }) {
    return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name,
        description,
        step: steps.map((s, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: s.name,
            text: s.text
        }))
    };
}

/* ---------------------- helpers ---------------------- */

function estimateWords(s = "") {
    return s.trim().split(/\s+/).filter(Boolean).length;
}

function stripHtml(s = "") {
    return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function nextYearISO() {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
}
