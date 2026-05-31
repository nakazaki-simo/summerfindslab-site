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
 * Curation pages — "best of" lists like /best/summer-gadgets-under-25.
 * Driven entirely by data/collections.json so we can scale to dozens of
 * lists without writing one route per list. See lib/products.js for the
 * filter resolver that turns a collection's `filter` declaration into a
 * concrete product list.
 */

export function generateStaticParams() {
    return getCollectionsByType("best").map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }) {
    const c = getCollectionBySlugAndType(params.slug, "best");
    if (!c) return {};
    return {
        title: c.metaTitle || c.title,
        description: c.metaDescription,
        alternates: { canonical: `/best/${c.slug}` },
        keywords: c.keywords?.join(", "),
        openGraph: {
            title: c.metaTitle || c.title,
            description: c.metaDescription,
            type: "article"
        }
    };
}

export default function BestCollectionPage({ params }) {
    const c = getCollectionBySlugAndType(params.slug, "best");
    if (!c) return notFound();
    const products = getProductsForCollection(c);

    const crumbs = [
        { name: "Home", url: "/" },
        { name: "Best of", url: "/best" },
        { name: c.title }
    ];

    return (
        <>
            <JsonLd data={breadcrumbsLd(crumbs)} />
            <JsonLd
                data={collectionPageLd({
                    name: c.title,
                    description: c.intro,
                    urlPath: `/best/${c.slug}`,
                    products
                })}
            />
            <DisclosureBanner />

            <article className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                <Breadcrumbs items={crumbs} />
                <span className="mt-4 inline-block text-xs uppercase tracking-[0.18em] text-peach-500 font-semibold">
                    Editor&apos;s shortlist · Updated{" "}
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
                    eyebrow="The shortlist"
                    title={`${products.length} editor picks`}
                    description="Each pick survived a month of real-world testing. Affiliate links — we earn a commission at no cost to you."
                />
                <ProductGrid products={products} masonry />

                <section className="mt-14 rounded-2xl bg-sand-50 ring-1 ring-sand-200 p-6 text-sm text-ink/70">
                    <p>
                        <span className="font-medium text-ink">
                            Editorial standards.
                        </span>{" "}
                        We only feature products our editor has tested or vetted
                        against published specs and a healthy review base. Lists
                        are refreshed when stock changes or when a better pick
                        emerges. Read our affiliate disclosure for the full
                        commercial relationship.
                    </p>
                </section>
            </article>
        </>
    );
}
