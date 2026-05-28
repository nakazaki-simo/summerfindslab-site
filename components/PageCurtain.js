"use client";

import { motion } from "motion/react";

export default function PageCurtain() {
    return (
        <motion.div
            aria-hidden
            initial={{ y: 0 }}
            animate={{ y: "-100%" }}
            transition={{ delay: 0.6, duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center bg-ink text-cream"
        >
            <div className="flex items-center gap-3">
                <motion.span
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-peach-300 to-peach-500 font-bold text-white"
                >
                    S
                </motion.span>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, duration: 0.5 }}
                    className="font-display text-2xl tracking-tight"
                >
                    Summer Finds Lab
                </motion.div>
            </div>
        </motion.div>
    );
}
