import Link from "next/link";

/**
 * FTC-compliant affiliate disclosure banner.
 * Appears once per page near the top of the main content.
 * Required to be "clear and conspicuous near the affiliate links".
 */
export default function DisclosureBanner() {
    return (
        <div className="bg-sand-100 border-y border-sand-200">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2.5 text-center text-xs text-ink/70">
                <span className="font-medium">Editorial disclosure:</span>{" "}
                Some links on Summer Finds Lab are affiliate links. We earn a small commission when you buy, at no extra cost to you.{" "}
                <Link href="/disclosure" className="underline hover:text-ink">
                    Learn more
                </Link>
                .
            </div>
        </div>
    );
}
