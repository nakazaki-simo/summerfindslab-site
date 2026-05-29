"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { siteConfig } from "@/lib/site";

export default function FAQ({ items }) {
    const list = items ?? siteConfig.faqs;
    const [open, setOpen] = useState(0);
    return (
        <div className="divide-y divide-sand-200 rounded-3xl bg-white ring-1 ring-sand-200 overflow-hidden">
            {list.map((f, i) => {
                const isOpen = open === i;
                return (
                    <div key={i}>
                        <button
                            onClick={() => setOpen(isOpen ? -1 : i)}
                            className="w-full flex items-center justify-between gap-4 text-left px-6 py-5 hover:bg-sand-50 transition"
                            aria-expanded={isOpen}
                        >
                            <span className="font-display text-lg md:text-xl">{f.q}</span>
                            <motion.span
                                animate={{ rotate: isOpen ? 45 : 0 }}
                                transition={{ duration: 0.3 }}
                                className="text-2xl text-peach-500"
                            >
                                +
                            </motion.span>
                        </button>
                        <AnimatePresence initial={false}>
                            {isOpen && (
                                <motion.div
                                    key="content"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                    className="overflow-hidden"
                                >
                                    <p className="px-6 pb-5 text-ink/70 leading-relaxed">
                                        {f.a}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
}
