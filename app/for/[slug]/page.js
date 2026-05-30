import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import DisclosureBanner from "@/components/DisclosureBanner";
import ProductGrid from "@/components/ProductGrid";
import SectionHeader from "@/components/SectionHeader";
import JsonLd from "@/components/JsonLd";
import {
    getCollectionsByType,
    getCollectionBySlugAndType,
    getProductsForCollection
} from "@/lib/products";
import { breadcrumbsLd, collectionPageLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

/**
 * Persona pages — /for/the-pinterest-girl, /for/the-frequent-flyer, etc.
 * Same templated structure as /best/[slug] but with a persona-flavored
 * intro pulled from data/collections.json (type: "for").
 */

export function generateStaticParams() {
    return getCollectionsByType("for").map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }) {
    const c = getCollectionBySlugAndType(params.slug, "for");
    if (!c) return {};
    return {
        title: c.metaTitle || c.title,
        description: c.metaDescription,
        alternates: { canonical: `/for/${c.slug}` },
        keywords: c.keywords?.join(", "),
        openGraph: {
            title: c.metaTitle || c.title,
            description: c.metaDescription,
            type: "article"
        }
    };
}

export default function PersonaCollectionPage({ params }) {
    const c = getCollectionBySlugAndType(params.slug, "for");
    if (!c) return notFound();
    const products = getProductsForCollection(c);

    const crumbs = [
        { name: "Home", url: "/" },
        { name: "Made for", url: "/for" },
        { name: c.title }
    ];

    return (
        <>
            <JsonLd data={breadcrumbsLd(crumbs)} />
            <JsonLd
                data={collectionPageLd({
                    name: c.title,
                    description: c.intro,
                    urlPath: `/for/${c.slug}`,
                    products
                })}
            />
            <DisclosureBanner />

            <article className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                <Breadcrumbs items={crumbs} />
                <span className="mt-4 inline-block text-xs uppercase tracking-[0.18em] text-peach-500 font-semibold">
                    Curated for · Updated{" "}
                    {new Date().toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                    })}
                </span>
                <h1 className="mt-2 font-display text-4xl md:text-6xl font-semibold leading-[1.05]">
                    {c.h1}
                </h1>
                <p className="mt-5 max-w-3xl text-lg text-ink/80 leading-relaxed">
                    {c.intro}
                </p>

                <div className="mt-6 inline-flex items-center gap-3 rounded-full bg-cream ring-1 ring-sand-200 px-4 py-2 text-sm">
                    <span className="font-medium">By {siteConfig.editor.name}</span>
                    <span className="text-ink/40">·</span>
                    <span className="text-ink/60">{siteConfig.editor.role}</span>
                </div>

                <SectionHeader
                    eyebrow="The kit"
                    title={`${products.length} editor picks`}
                    description="Hand-curated for this reader. Affiliate links — we earn a commission at no cost to you."
                />
                <ProductGrid products={products} masonry />
            </article>
        </>
    );
}
