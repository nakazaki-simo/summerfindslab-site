"use client";

import { motion } from "motion/react";
import MagneticButton from "./MagneticButton";

export default function Newsletter() {
    return (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.98 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-peach-200 via-sand-100 to-sea-100 p-8 md:p-12 ring-1 ring-sand-200"
            >
                {/* floating bubbles */}
                <motion.div
                    aria-hidden
                    animate={{ y: [0, -14, 0], x: [0, 6, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-peach-300/60 blur-2xl"
                />
                <motion.div
                    aria-hidden
                    animate={{ y: [0, 12, 0], x: [0, -8, 0] }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-sea-300/60 blur-2xl"
                />

                <div className="relative grid md:grid-cols-2 gap-8 items-center">
                    <div>
                        <h3 className="font-display text-3xl md:text-4xl font-semibold leading-tight">
                            Get tomorrow&apos;s drops in your inbox
                        </h3>
                        <p className="mt-3 text-ink/70 max-w-md">
                            One short email, three fresh finds, zero spam. Cancel anytime.
                        </p>
                    </div>
                    <form
                        className="flex flex-col sm:flex-row gap-3 w-full"
                        onSubmit={(e) => e.preventDefault()}
                    >
                        <input
                            type="email"
                            required
                            placeholder="you@summer.com"
                            className="flex-1 rounded-full bg-white px-5 py-3 text-sm ring-1 ring-sand-200 focus:outline-none focus:ring-2 focus:ring-peach-300"
                        />
                        <MagneticButton
                            as="button"
                            type="submit"
                            className="rounded-full bg-ink text-cream px-6 py-3 text-sm font-medium hover:bg-ink/90 transition"
                        >
                            Subscribe
                        </MagneticButton>
                    </form>
                </div>
            </motion.div>
        </section>
    );
}
