import Link from "next/link";
import SectionHeader from "@/components/SectionHeader";
import Breadcrumbs from "@/components/Breadcrumbs";
import DisclosureBanner from "@/components/DisclosureBanner";
import JsonLd from "@/components/JsonLd";
import { getAllGuides } from "@/lib/products";
import { breadcrumbsLd } from "@/lib/seo";

export const metadata = {
    title: "Buying guides",
    description:
        "In-depth, editor-tested buying guides for summer gadgets, beach essentials, viral TikTok picks, aesthetic room finds and travel accessories.",
    alternates: { canonical: "/guides" }
};

export default function GuidesIndex() {
    const guides = getAllGuides();
    const crumbs = [
        { name: "Home", url: "/" },
        { name: "Guides" }
    ];

    return (
        <>
            <JsonLd data={breadcrumbsLd(crumbs)} />
            <DisclosureBanner />
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                <Breadcrumbs items={crumbs} />
                <SectionHeader
                    eyebrow="Buying guides"
                    title="Editor-tested summer guides"
                    description="In-depth roundups, written and updated weekly by our editor after real-world testing."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {guides.map((g) => (
                        <Link
                            key={g.slug}
                            href={`/guides/${g.slug}`}
                            className="group block rounded-xl2 bg-white ring-1 ring-sand-100 p-6 hover:shadow-soft transition"
                        >
                            <div className="text-xs uppercase tracking-[0.18em] text-peach-500 font-semibold">
                                Buying guide · Updated {new Date(g.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </div>
                            <h3 className="mt-3 font-display text-2xl leading-snug">
                                {g.title}
                            </h3>
                            <p className="mt-2 text-sm text-ink/70 line-clamp-3">{g.intro}</p>
                            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-peach-500">
                                Read guide
                                <span className="transition-transform group-hover:translate-x-0.5">→</span>
                            </span>
                        </Link>
                    ))}
                </div>
            </section>
        </>
    );
}
