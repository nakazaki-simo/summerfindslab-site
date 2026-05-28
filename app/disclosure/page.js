export const metadata = {
    title: "Affiliate disclosure",
    description:
        "Summer Finds Lab Daily participates in the Amazon Associates Program."
};

export default function DisclosurePage() {
    return (
        <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="font-display text-4xl font-semibold">
                Affiliate disclosure
            </h1>
            <p className="mt-5 text-ink/70 leading-relaxed">
                Summer Finds Lab Daily is a participant in the Amazon Services LLC
                Associates Program, an affiliate advertising program designed to
                provide a means for sites to earn advertising fees by advertising and
                linking to Amazon.com. As an Amazon Associate we earn from qualifying
                purchases.
            </p>
            <p className="mt-3 text-ink/70 leading-relaxed">
                We only feature products we genuinely think are worth a look. Affiliate
                commissions help us keep the site free and the recommendations honest.
            </p>
        </section>
    );
}
