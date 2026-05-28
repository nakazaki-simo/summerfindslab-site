"use client";

import { motion, useScroll, useSpring } from "motion/react";

export default function ScrollProgress() {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 120,
        damping: 22,
        restDelta: 0.001
    });

    return (
        <motion.div
            style={{ scaleX }}
            className="fixed top-0 left-0 right-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-peach-400 via-peach-500 to-sea-400"
        />
    );
}
