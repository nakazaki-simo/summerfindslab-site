import JsonLd from "@/components/JsonLd";
import Breadcrumbs from "@/components/Breadcrumbs";
import { breadcrumbsLd, personLd } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata = {
    title: "About",
    description:
        "Summer Finds Lab Daily curates trending Amazon summer finds. Meet the editor and read our editorial standards.",
    alternates: { canonical: "/about" }
};

export default function AboutPage() {
    const crumbs = [{ name: "Home", url: "/" }, { name: "About" }];
    return (
        <>
            <JsonLd data={breadcrumbsLd(crumbs)} />
            <JsonLd data={personLd()} />

            <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                <Breadcrumbs items={crumbs} />
                <span className="mt-3 inline-block text-xs uppercase tracking-[0.18em] text-peach-500 font-semibold">
                    About
                </span>
                <h1 className="mt-2 font-display text-4xl md:text-5xl font-semibold">
                    Sunshine, picks, repeat.
                </h1>
                <p className="mt-5 text-ink/70 leading-relaxed">
                    Summer Finds Lab Daily is a small team of summer obsessives. We test,
                    sort and post the gadgets, gear and goodies that make sunny days
                    better. Our goal is simple: save you time scrolling, and help you find
                    things you&apos;ll actually love.
                </p>

                <div id="editor" className="mt-12 rounded-3xl bg-white ring-1 ring-sand-200 p-6 md:p-8 flex flex-col md:flex-row gap-6">
                    <div className="shrink-0">
                        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-peach-200 to-peach-400 flex items-center justify-center font-display text-3xl text-white">
                            {siteConfig.editor.name.split(" ").map((n) => n[0]).join("")}
                        </div>
                    </div>
                    <div>
                        <span className="text-xs uppercase tracking-[0.18em] text-peach-500 font-semibold">
                            Lead editor
                        </span>
                        <h2 className="mt-1 font-display text-2xl font-semibold">
                            {siteConfig.editor.name}
                        </h2>
                        <div className="text-sm text-ink/60">{siteConfig.editor.role}</div>
                        <p className="mt-3 text-ink/70 leading-relaxed">
                            {siteConfig.editor.bio}
                        </p>
                    </div>
                </div>

                <h2 id="editorial-standards" className="mt-14 font-display text-3xl font-semibold">
                    Editorial standards
                </h2>
                <ul className="mt-5 space-y-3 text-ink/80 leading-relaxed list-disc pl-5">
                    <li>
                        <strong>We test before we post.</strong> Every featured product is
                        either tested in person by our editor or vetted against published
                        specs and a healthy review base. We do not republish manufacturer
                        copy without testing.
                    </li>
                    <li>
                        <strong>Affiliate relationships do not influence picks.</strong> We
                        participate in the Amazon Associates Program. Brands cannot pay to
                        be added or moved up. Our commissions only come from clicks that
                        convert, never from upfront placement.
                    </li>
                    <li>
                        <strong>We update, we don&apos;t archive.</strong> Lists are
                        refreshed when stock changes, prices move sharply, or a better pick
                        arrives. Old picks are replaced, not buried.
                    </li>
                    <li>
                        <strong>We name what we don&apos;t recommend.</strong> Every guide
                        includes a short list of products we tested and chose not to
                        feature, with the reason.
                    </li>
                    <li>
                        <strong>We disclose at every step.</strong> A persistent banner sits
                        above each list, and our{" "}
                        <a href="/disclosure" className="underline">
                            affiliate disclosure
                        </a>{" "}
                        page details how we earn.
                    </li>
                </ul>

                <p className="mt-12 text-ink/70 leading-relaxed">
                    Have a tip, a product to suggest, or a correction? Email{" "}
                    <span className="font-medium">hello@summerfindslab.com</span> and the
                    editor will read it personally.
                </p>
            </section>
        </>
    );
}
