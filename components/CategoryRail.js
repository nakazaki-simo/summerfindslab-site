"use client";

import Link from "next/link";
import { useRef } from "react";
import {
    motion,
    useMotionValue,
    useSpring,
    useTransform
} from "motion/react";

function CategoryCard({ c, index }) {
    const ref = useRef(null);
    const mx = useMotionValue(0.5);
    const my = useMotionValue(0.5);
    const sx = useSpring(mx, { stiffness: 220, damping: 20 });
    const sy = useSpring(my, { stiffness: 220, damping: 20 });
    const rotateY = useTransform(sx, [0, 1], [8, -8]);
    const rotateX = useTransform(sy, [0, 1], [-6, 6]);
    const imgX = useTransform(sx, [0, 1], [-10, 10]);
    const imgY = useTransform(sy, [0, 1], [-10, 10]);

    function handleMove(e) {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
    }
    function reset() {
        mx.set(0.5);
        my.set(0.5);
    }

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMove}
            onMouseLeave={reset}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{
                duration: 0.7,
                delay: index * 0.07,
                ease: [0.22, 1, 0.36, 1]
            }}
            style={{
                rotateX,
                rotateY,
                transformPerspective: 900,
                transformStyle: "preserve-3d"
            }}
            className="relative shrink-0 w-64 md:w-auto"
        >
            <Link
                href={`/category/${c.slug}`}
                className="group relative block rounded-2xl overflow-hidden ring-1 ring-sand-100 shadow-card"
            >
                <motion.img
                    src={c.image}
                    alt={c.name}
                    style={{ x: imgX, y: imgY, scale: 1.1 }}
                    className="h-52 md:h-60 w-full object-cover transition-transform duration-700 group-hover:scale-[1.18]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
                <div
                    className="absolute bottom-0 left-0 right-0 p-4"
                    style={{ transform: "translateZ(20px)" }}
                >
                    <div className="font-display text-xl text-white drop-shadow">
                        {c.name}
                    </div>
                    <div className="text-xs text-white/85">{c.tagline}</div>
                </div>
                <div className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/90 text-ink text-sm flex items-center justify-center opacity-0 -translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                    →
                </div>
            </Link>
        </motion.div>
    );
}

export default function CategoryRail({ categories }) {
    return (
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:gap-5">
            {categories.map((c, i) => (
                <CategoryCard key={c.slug} c={c} index={i} />
            ))}
        </div>
    );
}
