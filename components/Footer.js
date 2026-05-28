import Link from "next/link";
import { siteConfig } from "@/lib/site";

const socialIcons = {
    instagram: (
        <path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.3 2.2.5.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .5 2.2.1 1.2.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.3 1.8-.5 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.5-1.2.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.3-2.2-.5-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.5-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.3-1.8.5-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.5C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2 .4-.5.2-.9.4-1.2.7-.3.3-.5.7-.7 1.2-.1.3-.3.9-.4 2C3 8.5 3 8.9 3 12s0 3.5.1 4.7c.1 1.1.2 1.7.4 2 .2.5.4.9.7 1.2.3.3.7.5 1.2.7.3.1.9.3 2 .4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2-.4.5-.2.9-.4 1.2-.7.3-.3.5-.7.7-1.2.1-.3.3-.9.4-2 .1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.7-.4-2-.2-.5-.4-.9-.7-1.2-.3-.3-.7-.5-1.2-.7-.3-.1-.9-.3-2-.4C15.5 4 15.1 4 12 4zm0 3.1a4.9 4.9 0 110 9.8 4.9 4.9 0 010-9.8zm0 1.8a3.1 3.1 0 100 6.2 3.1 3.1 0 000-6.2zm5.1-2.1a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
    ),
    tiktok: (
        <path d="M19.6 7.4a6.7 6.7 0 01-3.9-1.3v9.3a5.6 5.6 0 11-5.6-5.6c.3 0 .6 0 .9.1v2.5a3.1 3.1 0 102.2 2.9V2h2.5a4.7 4.7 0 003.9 4.5v2.9z" />
    ),
    pinterest: (
        <path d="M12 2a10 10 0 00-3.6 19.3c0-.8-.1-2 0-2.9.2-.8 1.3-5.1 1.3-5.1s-.3-.6-.3-1.6c0-1.5.9-2.6 2-2.6.9 0 1.4.7 1.4 1.5 0 .9-.6 2.3-.9 3.6-.3 1.1.6 2 1.6 2 1.9 0 3.3-2 3.3-4.9 0-2.6-1.8-4.4-4.5-4.4-3 0-4.8 2.3-4.8 4.6 0 .9.4 1.9.8 2.4.1.1.1.2.1.3-.1.4-.3 1.1-.3 1.3 0 .2-.2.3-.4.2-1.4-.7-2.3-2.7-2.3-4.4 0-3.6 2.6-6.9 7.5-6.9 3.9 0 7 2.8 7 6.5 0 3.9-2.5 7.1-5.9 7.1-1.2 0-2.3-.6-2.6-1.4l-.7 2.7c-.3 1-.9 2.3-1.4 3.1A10 10 0 1012 2z" />
    ),
    youtube: (
        <path d="M23 12s0-3.2-.4-4.7c-.2-.8-.9-1.5-1.7-1.7C19.3 5.2 12 5.2 12 5.2s-7.3 0-8.9.4c-.8.2-1.5.9-1.7 1.7C1 8.8 1 12 1 12s0 3.2.4 4.7c.2.8.9 1.5 1.7 1.7 1.6.4 8.9.4 8.9.4s7.3 0 8.9-.4c.8-.2 1.5-.9 1.7-1.7.4-1.5.4-4.7.4-4.7zM10 15.5v-7l6 3.5-6 3.5z" />
    )
};

function SocialLink({ kind, href }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={kind}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sand-100 text-ink hover:bg-peach-200 transition"
        >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                {socialIcons[kind]}
            </svg>
        </a>
    );
}

export default function Footer() {
    return (
        <footer className="mt-20 border-t border-sand-200 bg-cream">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 grid gap-10 md:grid-cols-4">
                <div className="md:col-span-2">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-peach-300 text-white font-bold">
                            S
                        </span>
                        <span className="font-display text-xl font-semibold">
                            {siteConfig.shortName}
                        </span>
                    </div>
                    <p className="mt-3 text-sm text-ink/70 max-w-md">
                        {siteConfig.description}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                        <SocialLink kind="instagram" href={siteConfig.social.instagram} />
                        <SocialLink kind="tiktok" href={siteConfig.social.tiktok} />
                        <SocialLink kind="pinterest" href={siteConfig.social.pinterest} />
                        <SocialLink kind="youtube" href={siteConfig.social.youtube} />
                    </div>
                </div>

                <div>
                    <h4 className="font-display text-base font-semibold">Explore</h4>
                    <ul className="mt-3 space-y-2 text-sm text-ink/70">
                        <li>
                            <Link href="/trending" className="hover:text-ink">
                                Trending Summer Finds
                            </Link>
                        </li>
                        <li>
                            <Link href="/under-25" className="hover:text-ink">
                                Under $25
                            </Link>
                        </li>
                        <li>
                            <Link href="/tiktok-finds" className="hover:text-ink">
                                TikTok Made Me Buy It
                            </Link>
                        </li>
                        <li>
                            <Link href="/categories" className="hover:text-ink">
                                Categories
                            </Link>
                        </li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-display text-base font-semibold">About</h4>
                    <ul className="mt-3 space-y-2 text-sm text-ink/70">
                        <li>
                            <Link href="/about" className="hover:text-ink">
                                Our story
                            </Link>
                        </li>
                        <li>
                            <Link href="/blog" className="hover:text-ink">
                                Blog
                            </Link>
                        </li>
                        <li>
                            <Link href="/disclosure" className="hover:text-ink">
                                Affiliate disclosure
                            </Link>
                        </li>
                        <li>
                            <Link href="/privacy" className="hover:text-ink">
                                Privacy
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="border-t border-sand-200">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <p className="text-xs text-ink/60">
                        © {new Date().getFullYear()} {siteConfig.name}. As an Amazon
                        Associate we earn from qualifying purchases.
                    </p>
                    <p className="text-xs text-ink/60">Made with sunshine ☀️</p>
                </div>
            </div>
        </footer>
    );
}
