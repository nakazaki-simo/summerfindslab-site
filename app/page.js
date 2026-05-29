import CinematicHero from "@/components/CinematicHero";
import StatsStrip from "@/components/StatsStrip";
import SectionHeader from "@/components/SectionHeader";
import ProductGrid from "@/components/ProductGrid";
import CategoryRail from "@/components/CategoryRail";
import BlogCard from "@/components/BlogCard";
import Newsletter from "@/components/Newsletter";
import HorizontalShowcase from "@/components/HorizontalShowcase";
import BentoGrid from "@/components/BentoGrid";
import FAQ from "@/components/FAQ";
import JsonLd from "@/components/JsonLd";
import DisclosureBanner from "@/components/DisclosureBanner";
import BundleShowcase from "@/components/BundleShowcase";
import ComparisonTable from "@/components/ComparisonTable";
import StickyMobileCta from "@/components/StickyMobileCta";
import {
    getAllProducts,
    getCategories,
    getProductsByTag,
    getProductsUnder,
    getAllPosts,
    getAllGuides,
    getAllBundles,
    getProductsForBundle
} from "@/lib/products";
import { itemListLd, faqLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export default function HomePage() {
    const trending = getProductsByTag("trending");
    const under25 = getProductsUnder(25);
    const tiktok = getProductsByTag("tiktok");
    const all = getAllProducts();
    const categories = getCategories();
    const posts = getAllPosts().slice(0, 3);
    const guides = getAllGuides();
    const bundles = getAllBundles();

    // Editor's top pick: highest-rated trending product, fallback to first product
    const sortedByRating = [...all].sort(
        (a, b) => (b.rating?.value ?? 0) - (a.rating?.value ?? 0)
    );
    const heroPick = sortedByRating[0];

    // Comparison table: 6 best products spanning categories for variety
    const comparisonPicks = pickOnePerCategory(all).slice(0, 6);

    return (
        <>
            <JsonLd data={itemListLd(all, "Summer Finds Lab top picks")} />
            <JsonLd data={faqLd(siteConfig.faqs)} />

            <CinematicHero heroPick={heroPick} total={all.length} />
            <StickyMobileCta product={heroPick} />
            <DisclosureBanner />

            {/* Comparison table — high conversion above the fold on mobile */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                <SectionHeader
                    eyebrow="At a glance"
                    title="The 6 best summer finds, compared"
                    description="One pick per category, ranked by editor confidence. Tap any row to buy on Amazon."
                />
                <ComparisonTable products={comparisonPicks} />
            </section>

            {/* Curated bundles — anchor the section so hero CTA scrolls here */}
            <section
                id="bundles"
                className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24 scroll-mt-16"
            >
                <SectionHeader
                    eyebrow="Editor's bundles"
                    title="Curated kits, not random grids"
                    description="Each bundle solves one summer problem. Buy three things that go together — or pick one and skip the rest."
                />
                <div className="grid gap-6 md:gap-8">
                    {bundles.map((b) => (
                        <BundleShowcase
                            key={b.slug}
                            bundle={b}
                            products={getProductsForBundle(b)}
                        />
                    ))}
                </div>
            </section>

            <StatsStrip />

            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                <SectionHeader
                    eyebrow="Browse by vibe"
                    title="Shop by category"
                    description="Find your favorite corner of summer."
                    ctaHref="/categories"
                    ctaLabel="See all"
                />
                <CategoryRail categories={categories} />
            </section>

            <HorizontalShowcase
                slides={categories.slice(0, 5).map((c) => ({
                    title: c.name,
                    description: c.tagline,
                    image: c.image,
                    href: `/category/${c.slug}`
                }))}
            />

            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                <SectionHeader
                    eyebrow="Hot right now"
                    title="Trending Summer Finds"
                    description="The picks getting the most clicks this week."
                    ctaHref="/trending"
                    ctaLabel="View all trending"
                />
                <ProductGrid products={trending.slice(0, 8)} />
            </section>

            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                <SectionHeader
                    eyebrow="Editor-tested"
                    title="Buying guides"
                    description="Long-form roundups with how-we-tested notes and editor picks."
                    ctaHref="/guides"
                    ctaLabel="All guides"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {guides.slice(0, 3).map((g) => (
                        <a
                            key={g.slug}
                            href={`/guides/${g.slug}`}
                            className="group block rounded-2xl bg-white ring-1 ring-sand-100 p-6 hover:shadow-soft transition"
                        >
                            <div className="text-[11px] uppercase tracking-[0.18em] text-peach-500 font-semibold">
                                Guide
                            </div>
                            <h3 className="mt-2 font-display text-xl leading-snug">
                                {g.title}
                            </h3>
                            <p className="mt-2 text-sm text-ink/70 line-clamp-3">{g.intro}</p>
                            <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-peach-500">
                                Read guide
                                <span className="transition-transform group-hover:translate-x-0.5">→</span>
                            </span>
                        </a>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
                <SectionHeader
                    eyebrow="Wallet friendly"
                    title="Under $25"
                    description="Cute, useful, and easy on the budget."
                    ctaHref="/under-25"
                    ctaLabel="Browse under $25"
                />
                <ProductGrid products={under25.slice(0, 8)} />
            </section>

            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
                <SectionHeader
                    eyebrow="As seen on your FYP"
                    title="TikTok Made Me Buy It"
                    description="The viral picks worth the hype, hand-checked by us."
                    ctaHref="/tiktok-finds"
                    ctaLabel="See viral picks"
                />
                <ProductGrid products={tiktok.slice(0, 8)} />
            </section>

            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
                <SectionHeader
                    eyebrow="The full feed"
                    title="Daily summer drops"
                    description="Pinterest-style feed of every fresh find. Scroll, save, and shop."
                />
                <ProductGrid products={all} masonry />
            </section>

            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-20">
                <SectionHeader
                    eyebrow="Stories & guides"
                    title="From the journal"
                    description="Helpful guides, gift ideas and trend reports."
                    ctaHref="/blog"
                    ctaLabel="Read the blog"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {posts.map((post, i) => (
                        <BlogCard key={post.slug} post={post} index={i} />
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                <SectionHeader eyebrow="Why shop with us" title="Built for summer obsessives" description="Daily curation, honest reviews, no fluff." />
                <BentoGrid />
            </section>

            <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                <SectionHeader eyebrow="Got questions" title="Frequently asked" />
                <FAQ />
            </section>

            <div className="py-16 md:py-20">
                <Newsletter />
            </div>
        </>
    );
}

/**
 * Pick the highest-rated product per category to give the comparison table
 * variety. If a category has no rated product, fall back to the first.
 */
function pickOnePerCategory(products) {
    const byCat = new Map();
    for (const p of products) {
        const existing = byCat.get(p.category);
        if (!existing) {
            byCat.set(p.category, p);
            continue;
        }
        const a = existing.rating?.value ?? 0;
        const b = p.rating?.value ?? 0;
        if (b > a) byCat.set(p.category, p);
    }
    return Array.from(byCat.values()).sort(
        (a, b) => (b.rating?.value ?? 0) - (a.rating?.value ?? 0)
    );
}
