import Link from "next/link";

export default function NotFound() {
    return (
        <section className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-24 text-center">
            <h1 className="font-display text-6xl font-semibold">404</h1>
            <p className="mt-4 text-ink/70">
                That page took a sunshine break. Let&apos;s get you back home.
            </p>
            <Link
                href="/"
                className="mt-6 inline-block rounded-full bg-ink text-cream px-6 py-3 text-sm font-medium"
            >
                Back to homepage
            </Link>
        </section>
    );
}
