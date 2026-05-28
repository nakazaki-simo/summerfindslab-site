import { notFound } from "next/navigation";
import SectionHeader from "@/components/SectionHeader";
import ProductGrid from "@/components/ProductGrid";
import Breadcrumbs from "@/components/Breadcrumbs";
import JsonLd from "@/components/JsonLd";
import {
    getCategories,
    getCategoryBySlug,
    getProductsByCategory
} from "@/lib/products";
import { breadcrumbsLd, itemListLd } from "@/lib/seo";

export function generateStaticParams() {
    return getCategories().map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }) {
    const cat = getCategoryBySlug(params.slug);
    if (!cat) return {};
    return {
        title: cat.name,
        description: `${cat.name} — ${cat.tagline}. Curated picks from Summer Finds Lab.`,
        alternates: { canonical: `/category/${cat.slug}` },
        openGraph: {
            title: cat.name,
            description: cat.tagline,
            images: [cat.image]
        }
    };
}

export default function CategoryPage({ params }) {
    const cat = getCategoryBySlug(params.slug);
    if (!cat) return notFound();
    const products = getProductsByCategory(cat.slug);

    const crumbs = [
        { name: "Home", url: "/" },
        { name: "Categories", url: "/categories" },
        { name: cat.name }
    ];

    return (
        <>
            <JsonLd data={breadcrumbsLd(crumbs)} />
            <JsonLd data={itemListLd(products, cat.name)} />

            <section className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={cat.image}
                    alt={cat.name}
                    className="h-72 md:h-96 w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cream via-cream/50 to-transparent" />
                <div className="absolute inset-x-0 bottom-0">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-10">
                        <Breadcrumbs items={crumbs} />
                        <span className="mt-3 inline-block text-xs uppercase tracking-[0.18em] text-peach-500 font-semibold">
                            Category
                        </span>
                        <h1 className="mt-2 font-display text-4xl md:text-6xl font-semibold leading-[1.05]">
                            {cat.name}
                        </h1>
                        <p className="mt-2 text-ink/70 max-w-xl">{cat.tagline}</p>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                <SectionHeader
                    eyebrow="Hand-picked"
                    title={`Best of ${cat.name}`}
                    description="Updated daily with our team's favorites."
                />
                <ProductGrid products={products} masonry />
            </section>
        </>
    );
}
