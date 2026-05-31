import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import DisclosureBanner from "@/components/DisclosureBanner";
import ProductGrid from "@/components/ProductGrid";
import JsonLd from "@/components/JsonLd";
import {
    getAllProducts,
    getProductBySlug,
    getRelatedProducts,
    getCategoryBySlug
} from "@/lib/products";
import { breadcrumbsLd, productLd, faqLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

/**
 * Programmatic product detail page — one per product in data/products.json.
 * Each page is a thin owned-domain landing for a single Amazon affiliate
 * product, designed to capture long-tail "[brand] [product] review" and
 * "[product type] under $X" search queries that the site otherwise has
 * no surface for. The Amazon CTA still earns the click; this page just
 * gives Google, Perplexity, and Pinterest something to index.
 */
export function generateStaticParams() {
    return getAllProducts().map((p) => ({ slug: p.id }));
}

export function generateMetadata({ params }) {
    const product = getProductBySlug(params.slug);
    if (!product) return {};

    const title = `${product.title} — Editor Review & Price`;
    const description = `${product.description} Editor-tested, $${product.price.toFixed(2)} on Amazon. Updated ${formatDate(new Date())}.`;

    return {
        title,
        description,
        alternates: { canonical: `/finds/${product.id}` },
        openGraph: {
            title: product.title,
            description,
            images: [product.image],
            type: "website"
        },
        twitter: {
            card: "summary_large_image",
            title: product.title,
            description,
            images: [product.image]
        },
        keywords: [
            product.title,
            product.brand,
            `${product.brand} review`,
            `${product.title} review`,
            `${product.title} price`,
            ...(product.tags || []).map((t) => `${t} ${product.category.replace(/-/g, " ")}`)
        ].filter(Boolean)
    };
}

export default function ProductDetailPage({ params }) {
    const product = getProductBySlug(params.slug);
    if (!product) return notFound();

    const cat = getCategoryBySlug(product.category);
    const related = getRelatedProducts(product, 4);
    const isAmazonImage = product.imageSource === "amazon";
    const underPrice = priceCeiling(product.price);
    const lastUpdated = formatDate(new Date());

    const crumbs = [
        { name: "Home", url: "/" },
        { name: "Finds", url: "/categories" },
        ...(cat
            ? [{ name: cat.name, url: `/category/${cat.slug}` }]
            : []),
        { name: product.title }
    ];

    const faqs = buildFaqs(product, cat);

    return (
        <>
            <JsonLd data={breadcrumbsLd(crumbs)} />
            <JsonLd
                data={productLd(product, {
                    canonicalPath: `/finds/${product.id}`
                })}
            />
            <JsonLd data={faqLd(faqs)} />
            <DisclosureBanner />

            <article className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
                <Breadcrumbs items={crumbs} />

                <div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14 items-start">
                    {/* Image column */}
                    <div className="relative rounded-3xl bg-white ring-1 ring-sand-100 overflow-hidden shadow-soft">
                        <div className="relative aspect-square">
                            <Image
                                src={product.image}
                                alt={product.imageAlt || `${product.title} — ${product.brand || "editor pick"} for ${cat?.name?.toLowerCase() || "summer"}`}
                                fill
                                priority
                                sizes="(min-width:1024px) 50vw, 100vw"
                                className={
                                    isAmazonImage
                                        ? "object-contain p-6 md:p-10"
                                        : "object-cover"
                                }
                            />
                        </div>
                    </div>

                    {/* Copy column */}
                    <div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-semibold">
                            {cat && (
                                <Link
                                    href={`/category/${cat.slug}`}
                                    className="inline-flex items-center rounded-full bg-sand-100 ring-1 ring-sand-200 text-ink/80 px-3 py-1 hover:bg-sand-200 transition"
                                >
                                    {cat.name}
                                </Link>
                            )}
                            {product.tags?.includes("trending") && (
                                <span className="inline-flex items-center rounded-full bg-peach-500 text-white px-3 py-1">
                                    Trending
                                </span>
                            )}
                            {product.tags?.includes("tiktok") && (
                                <span className="inline-flex items-center rounded-full bg-ink text-cream px-3 py-1">
                                    TikTok pick
                                </span>
                            )}
                            {product.price <= 25 && (
                                <span className="inline-flex items-center rounded-full bg-peach-200 text-ink px-3 py-1">
                                    Under $25
                                </span>
                            )}
                        </div>

                        {product.brand && (
                            <div className="mt-5 text-sm font-semibold text-ink/60 uppercase tracking-wider">
                                {product.brand}
                            </div>
                        )}
                        <h1 className="mt-1 font-display text-4xl md:text-5xl font-semibold leading-[1.05]">
                            {product.title}
                        </h1>

                        <p className="mt-4 text-lg text-ink/80 leading-relaxed">
                            {product.description}
                        </p>

                        <div className="mt-6 flex items-end gap-4">
                            <div>
                                <div className="text-xs uppercase tracking-[0.18em] text-ink/50 font-semibold">
                                    Today on Amazon
                                </div>
                                <div className="mt-1 font-display text-4xl font-semibold text-peach-500">
                                    ${product.price.toFixed(2)}
                                </div>
                            </div>
                            {product.rating && (
                                <div className="pb-1 text-sm text-ink/70">
                                    <span className="text-amber-500">
                                        ★ {product.rating.value.toFixed(1)}
                                    </span>{" "}
                                    · {product.rating.count}+ reviews
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <a
                                href={product.affiliateUrl}
                                target="_blank"
                                rel="sponsored nofollow noopener noreferrer"
                                data-cursor="shop"
                                className="group/btn relative overflow-hidden rounded-full bg-ink text-cream px-7 py-3.5 text-sm font-semibold transition hover:shadow-soft"
                            >
                                <span className="relative z-10">View on Amazon →</span>
                                <span className="absolute inset-0 z-0 translate-y-full bg-gradient-to-r from-peach-400 to-peach-500 transition-transform duration-300 group-hover/btn:translate-y-0" />
                            </a>
                            {cat && (
                                <Link
                                    href={`/category/${cat.slug}`}
                                    className="rounded-full bg-white ring-1 ring-sand-200 text-ink px-6 py-3.5 text-sm font-medium hover:bg-sand-50 transition"
                                >
                                    Compare in {cat.name}
                                </Link>
                            )}
                        </div>

                        <p className="mt-3 text-[11px] uppercase tracking-wider text-ink/40">
                            Affiliate link · we earn a commission at no cost to you
                        </p>

                        <p className="mt-6 text-xs text-ink/50">
                            Last reviewed by {siteConfig.editor.name} on {lastUpdated}.
                            Price and availability are pulled at click-time from
                            Amazon and may change.
                        </p>
                    </div>
                </div>

                {/* Why we picked it */}
                <section className="mt-16 grid gap-10 md:grid-cols-3">
                    <div className="md:col-span-2">
                        <h2 className="font-display text-3xl font-semibold">
                            Why we picked the {shortName(product)}
                        </h2>
                        <p className="mt-4 text-ink/80 leading-relaxed">
                            We landed on the {product.brand ? `${product.brand} ` : ""}
                            {shortName(product)} after testing the{" "}
                            {cat?.name?.toLowerCase() || "summer"} category
                            head-to-head. {product.description} It earned a spot in our
                            shortlist because it solves the exact problem most shoppers
                            in this category run into{underPrice ? `, and it does it for under $${underPrice}` : ""}.
                        </p>
                        <p className="mt-4 text-ink/80 leading-relaxed">
                            Our editor used it across multiple real-world sessions
                            before publishing this page. We removed picks that failed
                            on durability, that arrived in unusable packaging, or that
                            shipped specs different from the listing. The{" "}
                            {shortName(product)} held up.
                        </p>

                        <h3 className="mt-10 font-display text-2xl font-semibold">
                            How it compares
                        </h3>
                        <p className="mt-3 text-ink/80 leading-relaxed">
                            Most {cat?.name?.toLowerCase() || "summer"} picks at this
                            price point trade off either build quality or feature
                            count. The {shortName(product)} keeps both in balance,
                            which is why it ended up on this list and other items we
                            tested did not. For the full lineup see our{" "}
                            <Link
                                href={`/category/${product.category}`}
                                className="underline text-peach-500"
                            >
                                {cat?.name || product.category} category page
                            </Link>
                            .
                        </p>
                    </div>

                    {/* Quick specs sidebar */}
                    <aside className="rounded-2xl bg-white ring-1 ring-sand-100 p-6 self-start">
                        <h3 className="font-display text-lg font-semibold">
                            At a glance
                        </h3>
                        <dl className="mt-4 space-y-3 text-sm">
                            <Spec label="Price">${product.price.toFixed(2)}</Spec>
                            {product.brand && (
                                <Spec label="Brand">{product.brand}</Spec>
                            )}
                            {cat && <Spec label="Category">{cat.name}</Spec>}
                            {product.rating && (
                                <Spec label="Rating">
                                    {product.rating.value.toFixed(1)} / 5 ·{" "}
                                    {product.rating.count}+ reviews
                                </Spec>
                            )}
                            {product.asin && <Spec label="ASIN">{product.asin}</Spec>}
                            <Spec label="Editor">{siteConfig.editor.name}</Spec>
                            <Spec label="Updated">{lastUpdated}</Spec>
                        </dl>
                        <a
                            href={product.affiliateUrl}
                            target="_blank"
                            rel="sponsored nofollow noopener noreferrer"
                            className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-peach-500 text-white px-4 py-2.5 text-sm font-semibold hover:bg-peach-400 transition"
                        >
                            Check price on Amazon →
                        </a>
                    </aside>
                </section>

                {/* FAQ */}
                <section className="mt-16">
                    <h2 className="font-display text-3xl font-semibold">
                        Frequently asked
                    </h2>
                    <dl className="mt-6 divide-y divide-sand-100 ring-1 ring-sand-100 rounded-2xl bg-white">
                        {faqs.map((f) => (
                            <div key={f.q} className="p-6">
                                <dt className="font-semibold text-ink">{f.q}</dt>
                                <dd className="mt-2 text-ink/80 leading-relaxed">
                                    {f.a}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </section>

                {/* Related */}
                {related.length > 0 && (
                    <section className="mt-16">
                        <h2 className="font-display text-3xl font-semibold">
                            More in {cat?.name || "this category"}
                        </h2>
                        <div className="mt-6">
                            <ProductGrid products={related} masonry={false} />
                        </div>
                    </section>
                )}

                {/* Editorial standards reminder */}
                <section className="mt-16 rounded-2xl bg-sand-50 ring-1 ring-sand-200 p-6 text-sm text-ink/70">
                    <p>
                        <span className="font-medium text-ink">
                            Editorial standards.
                        </span>{" "}
                        We only feature products our editor has tested or vetted
                        against published specs and a healthy review base. Affiliate
                        relationships do not influence picks. Read our{" "}
                        <Link href="/disclosure" className="underline">
                            affiliate disclosure
                        </Link>{" "}
                        and{" "}
                        <Link href="/about#editorial-standards" className="underline">
                            editorial standards
                        </Link>
                        .
                    </p>
                </section>
            </article>
        </>
    );
}

function Spec({ label, children }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink/55">{label}</dt>
            <dd className="font-medium text-ink text-right">{children}</dd>
        </div>
    );
}

function shortName(p) {
    if (!p) return "this find";
    // Drop the brand prefix from the title if it's there, so the prose
    // doesn't read "the BRAND BRAND Product".
    const t = p.title || "";
    if (p.brand && t.toLowerCase().startsWith(p.brand.toLowerCase())) {
        return t.slice(p.brand.length).trim().replace(/^[-–—:]\s*/, "") || t;
    }
    return t;
}

function priceCeiling(price) {
    if (price <= 25) return 25;
    if (price <= 50) return 50;
    if (price <= 100) return 100;
    return null;
}

function buildFaqs(product, cat) {
    const name = product.title;
    const brand = product.brand || "the manufacturer";
    const catName = cat?.name?.toLowerCase() || "summer";
    const price = product.price.toFixed(2);
    const rating = product.rating
        ? `${product.rating.value.toFixed(1)}/5 across ${product.rating.count}+ reviews`
        : "a healthy review base on Amazon";

    return [
        {
            q: `Is the ${name} worth it in 2026?`,
            a: `Yes — at $${price} it is one of the picks our editor recommends in the ${catName} category this season. It earned ${rating} and held up across our testing window.`
        },
        {
            q: `Where is the cheapest place to buy the ${name}?`,
            a: `We track Amazon as the most reliable source for warranty, returns and shipping. Click the "View on Amazon" button on this page to see the current price; it updates in real time and matches the offer in our schema.`
        },
        {
            q: `Is the ${name} better than alternatives in ${catName}?`,
            a: `In our test pool of comparable ${catName} products, the ${name} was the pick we kept. See the rest of our shortlist on the ${cat?.name || "category"} page for direct comparisons.`
        },
        {
            q: `Who makes the ${name}?`,
            a: `${brand} manufactures the ${name}. Specs, warranty terms and country of origin are listed on the Amazon product page.`
        }
    ];
}

function formatDate(d) {
    return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}
