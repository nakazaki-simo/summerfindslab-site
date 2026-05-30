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

/**
 * Price-ceiling pages — /under/15, /under/25, /under/50, /under/100.
 * One templated route, four pages. Each page is differentiated by its
 * price filter and intro copy from data/collections.json (type: "under").
 */

export function generateStaticParams() {
    return getCollectionsByType("under").map((c) => ({ amount: c.slug }));
}

export function generateMetadata({ params }) {
    const c = getCollectionBySlugAndType(params.amount, "under");
    if (!c) return {};
    return {
        title: c.metaTitle || c.title,
        description: c.metaDescription,
        alternates: { canonical: `/under/${c.slug}` },
        keywords: c.keywords?.join(", ")
    };
}

export default function UnderPriceCollectionPage({ params }) {
    const c = getCollectionBySlugAndType(params.amount, "under");
    if (!c) return notFound();
    const products = getProductsForCollection(c, { limit: 24 });

    const crumbs = [
        { name: "Home", url: "/" },
        { name: `Under $${c.slug}` }
    ];

    return (
        <>
            <JsonLd data={breadcrumbsLd(crumbs)} />
            <JsonLd
                data={collectionPageLd({
                    name: c.title,
                    description: c.intro,
                    urlPath: `/under/${c.slug}`,
                    products
                })}
            />
            <DisclosureBanner />

            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                <Breadcrumbs items={crumbs} />
                <SectionHeader
                    eyebrow="Wallet friendly"
                    title={c.h1}
                    description={c.intro}
                />
                <p className="-mt-2 mb-6 text-sm text-ink/60">
                    {products.length} picks · Editor-tested · Affiliate links
                </p>
                <ProductGrid products={products} masonry />
            </section>
        </>
    );
}
