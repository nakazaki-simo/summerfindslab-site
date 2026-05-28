"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { siteConfig } from "@/lib/site";

export default function Navbar() {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <motion.header
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
                    ? "bg-cream/85 backdrop-blur-md border-b border-sand-200 shadow-[0_6px_20px_-12px_rgba(31,42,55,0.18)]"
                    : "bg-transparent border-b border-transparent"
                }`}
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <motion.span
                            whileHover={{ rotate: 18, scale: 1.08 }}
                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-peach-300 to-peach-500 text-white font-bold shadow-soft"
                        >
                            S
                        </motion.span>
                        <span className="font-display text-xl font-semibold tracking-tight">
                            {siteConfig.shortName}
                        </span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
                        {siteConfig.nav.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="relative text-ink/80 hover:text-ink transition group"
                            >
                                {item.label}
                                <span className="absolute -bottom-1 left-0 h-px w-0 bg-peach-400 transition-all duration-300 group-hover:w-full" />
                            </Link>
                        ))}
                    </nav>

                    <div className="hidden md:block">
                        <Link
                            href="/trending"
                            className="group relative inline-flex items-center overflow-hidden rounded-full bg-ink text-cream px-5 py-2 text-sm font-medium"
                        >
                            <span className="relative z-10">Shop trending</span>
                            <span className="absolute inset-0 z-0 translate-y-full bg-gradient-to-r from-peach-400 to-peach-500 transition-transform duration-300 group-hover:translate-y-0" />
                        </Link>
                    </div>

                    <button
                        onClick={() => setOpen((v) => !v)}
                        className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-ink hover:bg-sand-100"
                        aria-label="Toggle menu"
                        aria-expanded={open}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            {open ? (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            ) : (
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            )}
                        </svg>
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        key="mobile"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="md:hidden border-t border-sand-200 bg-cream overflow-hidden"
                    >
                        <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-3">
                            {siteConfig.nav.map((item, i) => (
                                <motion.div
                                    key={item.href}
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.05 * i }}
                                >
                                    <Link
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        className="block py-2 text-base text-ink/80"
                                    >
                                        {item.label}
                                    </Link>
                                </motion.div>
                            ))}
                            <Link
                                href="/trending"
                                onClick={() => setOpen(false)}
                                className="rounded-full bg-ink text-cream px-4 py-2 text-sm font-medium text-center"
                            >
                                Shop trending
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    );
}
