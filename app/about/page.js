export const metadata = {
    title: "About",
    description:
        "Summer Finds Lab Daily curates the trending Amazon summer finds you'll actually love."
};

export default function AboutPage() {
    return (
        <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
            <span className="text-xs uppercase tracking-[0.18em] text-peach-500 font-semibold">
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
            <p className="mt-4 text-ink/70 leading-relaxed">
                We update daily. We focus on Amazon-friendly picks so you can checkout
                in seconds. Some links are affiliate links, which means we may earn a
                small commission when you buy through them. It never costs you extra
                and it lets us keep this site free.
            </p>
        </section>
    );
}
