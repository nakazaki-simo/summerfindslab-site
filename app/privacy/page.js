import Link from "next/link";

export const metadata = {
    title: "Privacy policy",
    description:
        "How Summer Finds Lab Daily handles your data: minimal analytics, affiliate-link tracking via Amazon, and no resale of personal information.",
    alternates: { canonical: "/privacy" }
};

const lastUpdated = "May 28, 2026";

export default function PrivacyPage() {
    return (
        <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <span className="inline-block text-xs uppercase tracking-[0.18em] text-peach-500 font-semibold">
                Last updated · {lastUpdated}
            </span>
            <h1 className="mt-2 font-display text-4xl md:text-5xl font-semibold">
                Privacy policy
            </h1>
            <p className="mt-5 text-ink/70 leading-relaxed">
                Summer Finds Lab Daily respects your privacy. This page explains, in
                plain English, what we collect, why we collect it, and the choices you
                have. We keep things minimal — no account is required to use the site.
            </p>

            <h2 className="mt-12 font-display text-2xl font-semibold">
                What we collect
            </h2>
            <ul className="mt-4 space-y-3 text-ink/80 leading-relaxed list-disc pl-5">
                <li>
                    <strong>Anonymous usage analytics.</strong> Page views, referring
                    site, country, device type, and the search query that brought you
                    in. No individual identifiers, no cross-site tracking.
                </li>
                <li>
                    <strong>Affiliate-link clicks.</strong> When you click an Amazon
                    link, Amazon sets its own cookie so we can be credited for the
                    referral. Amazon&apos;s data practices are governed by Amazon.
                </li>
                <li>
                    <strong>Newsletter signups (optional).</strong> If you opt in, we
                    store your email address with our email provider for the sole
                    purpose of sending the newsletter. You can unsubscribe at the
                    bottom of any email.
                </li>
            </ul>

            <h2 className="mt-12 font-display text-2xl font-semibold">
                What we do <em>not</em> do
            </h2>
            <ul className="mt-4 space-y-3 text-ink/80 leading-relaxed list-disc pl-5">
                <li>We do not sell or rent your data to anyone.</li>
                <li>We do not run third-party advertising networks on this site.</li>
                <li>
                    We do not build behavioral profiles. Analytics are aggregated and
                    anonymous.
                </li>
                <li>We do not use third-party fingerprinting or session replay.</li>
            </ul>

            <h2 className="mt-12 font-display text-2xl font-semibold">Cookies</h2>
            <p className="mt-4 text-ink/80 leading-relaxed">
                We use a small set of essential cookies (e.g. to remember whether
                you&apos;ve dismissed a banner) and the analytics cookie described
                above. You can clear cookies at any time from your browser settings.
                Visiting Amazon via our links may set an additional cookie controlled
                by Amazon.
            </p>

            <h2 className="mt-12 font-display text-2xl font-semibold">
                Your rights
            </h2>
            <p className="mt-4 text-ink/80 leading-relaxed">
                If you are in the EU, UK, California or another region with privacy
                rights, you can request access to or deletion of any personal data we
                hold about you (in practice, only your newsletter email if you signed
                up). Email <span className="font-medium">privacy@summerfindslab.com</span>{" "}
                and we will respond within 30 days.
            </p>

            <h2 className="mt-12 font-display text-2xl font-semibold">
                Children&apos;s privacy
            </h2>
            <p className="mt-4 text-ink/80 leading-relaxed">
                The site is not directed at children under 13 and we do not knowingly
                collect data from children. If you believe a child has submitted data,
                contact us and we will delete it.
            </p>

            <h2 className="mt-12 font-display text-2xl font-semibold">Updates</h2>
            <p className="mt-4 text-ink/80 leading-relaxed">
                We update this page when our practices change. The date at the top
                reflects the most recent revision. For the affiliate side of the site,
                see our{" "}
                <Link href="/disclosure" className="underline">
                    affiliate disclosure
                </Link>
                . For editorial methodology, see{" "}
                <Link href="/about#editorial-standards" className="underline">
                    editorial standards
                </Link>
                .
            </p>
        </section>
    );
}
