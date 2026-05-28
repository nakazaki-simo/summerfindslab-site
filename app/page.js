import CinematicHero from "@/components/CinematicHero";
import StatsStrip from "@/components/StatsStrip";
import SectionHeader from "@/components/SectionHeader";
import ProductGrid from "@/components/ProductGrid";
import CategoryRail from "@/components/CategoryRail";
import BlogCard from "@/components/BlogCard";
import Newsletter from "@/components/Newsletter";
import Marquee from "@/components/Marquee";
import HorizontalShowcase from "@/components/HorizontalShowcase";
import BentoGrid from "@/components/BentoGrid";
import FAQ from "@/components/FAQ";
import JsonLd from "@/components/JsonLd";
import {
    getAllProducts,
    getCategories,
    getProductsByTag,
    getProductsUnder,
    getAllPosts
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

    return (
        <>
            <JsonLd data={itemListLd(trending, "Trending Summer Finds")} />
            <JsonLd data={faqLd(siteConfig.faqs)} />

            <CinematicHero />
            <StatsStrip />
            <Marquee />

            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                <SectionHeader
                    eyebrow="Browse by vibe"
                    title="Shop by category"
                    description="Find your favorite corner of summer. Whether it's the beach, your bedroom, or a long flight, we've got picks for it."
                    ctaHref="/categories"
                    ctaLabel="See all"
                />
                <CategoryRail categories={categories} />
            </section>

            <HorizontalShowcase />

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
                    eyebrow="Why shop with us"
                    title="Built for summer obsessives"
                    description="Daily curation, honest reviews, no fluff."
                />
                <BentoGrid />
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

            <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
                <SectionHeader
                    eyebrow="Got questions"
                    title="Frequently asked"
                />
                <FAQ />
            </section>

            <div className="py-16 md:py-20">
                <Newsletter />
            </div>
        </>
    );
}
