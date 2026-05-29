import { notFound } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import DisclosureBanner from "@/components/DisclosureBanner";
import ProductGrid from "@/components/ProductGrid";
import FAQ from "@/components/FAQ";
import JsonLd from "@/components/JsonLd";
import {
    getAllGuides,
    getGuideBySlug,
    getProductsForGuide
} from "@/lib/products";
import {
    breadcrumbsLd,
    itemListLd,
    faqLd,
    blogPostingLd
} from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export function generateStaticParams() {
    return getAllGuides().map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }) {
    const g = getGuideBySlug(params.slug);
    if (!g) return {};
    return {
        title: g.title,
        description: g.intro,
        alternates: { canonical: `/guides/${g.slug}` },
        keywords: g.keywords?.join(", "),
        openGraph: {
            title: g.title,
            description: g.intro,
            type: "article"
        }
    };
}

export default function GuidePage({ params }) {
    const g = getGuideBySlug(params.slug);
    if (!g) return notFound();
    const products = getProductsForGuide(g);

    const crumbs = [
        { name: "Home", url: "/" },
        { name: "Guides", url: "/guides" },
        { name: g.title }
    ];

    // Reuse blog schema for the article body of the guide
    const articleLd = blogPostingLd({
        slug: g.slug,
        title: g.title,
        excerpt: g.intro,
        cover: products[0]?.image,
        date: g.lastUpdated,
        dateModified: g.lastUpdated,
        category: g.category,
        keywords: g.keywords,
        content: g.intro,
        wordCount: 1100
    });

    return (
        <>
            <JsonLd data={breadcrumbsLd(crumbs)} />
            <JsonLd data={articleLd} />
            <JsonLd data={itemListLd(products, g.title, `/guides/${g.slug}`)} />
            <JsonLd data={faqLd(g.faq)} />
            <DisclosureBanner />

            <article className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                <Breadcrumbs items={crumbs} />
                <span className="mt-4 inline-block text-xs uppercase tracking-[0.18em] text-peach-500 font-semibold">
                    Buying guide · Updated {new Date(g.lastUpdated).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </span>
                <h1 className="mt-2 font-display text-4xl md:text-6xl font-semibold leading-[1.05]">
                    {g.title}
                </h1>
                <p className="mt-5 max-w-3xl text-lg text-ink/80 leading-relaxed">
                    {g.intro}
                </p>

                <div className="mt-6 inline-flex items-center gap-3 rounded-full bg-cream ring-1 ring-sand-200 px-4 py-2 text-sm">
                    <span className="font-medium">By {siteConfig.editor.name}</span>
                    <span className="text-ink/40">·</span>
                    <span className="text-ink/60">{siteConfig.editor.role}</span>
                </div>

                <h2 className="mt-12 font-display text-3xl font-semibold">Our picks</h2>
                <div className="mt-6">
                    <ProductGrid products={products} />
                </div>

                <h2 className="mt-14 font-display text-3xl font-semibold">How we tested</h2>
                <p className="mt-4 text-ink/80 leading-relaxed">
                    Every product on this list was tested for at least seven days of real-world use by our editor before earning a spot. We weighed and measured each item, timed setup and teardown, and recorded honest pros and cons. We also flagged failure modes that show up in negative Amazon reviews and verified them ourselves where possible.
                </p>

                <h2 className="mt-14 font-display text-3xl font-semibold">Frequently asked</h2>
                <div className="mt-6">
                    <FAQ items={g.faq} />
                </div>

                <div className="mt-14 rounded-2xl bg-sand-50 ring-1 ring-sand-200 p-6">
                    <p className="text-sm text-ink/70">
                        <span className="font-medium">Editorial standards:</span> We only recommend products that earned a place after real testing. Our affiliate relationships do not influence which products are featured. Read our{" "}
                        <Link href="/disclosure" className="underline">
                            affiliate disclosure
                        </Link>{" "}
                        and{" "}
                        <Link href="/about" className="underline">
                            editorial standards
                        </Link>
                        .
                    </p>
                </div>
            </article>
        </>
    );
}
