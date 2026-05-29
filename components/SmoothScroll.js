"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Buttery smooth scroll on desktop only. Mobile and reduced-motion users
 * get the native scroll, which is faster and respects platform conventions.
 */
export default function SmoothScroll() {
    useEffect(() => {
        if (typeof window === "undefined") return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
        const isCoarse = window.matchMedia("(pointer: coarse)");
        if (reduced.matches || isCoarse.matches) return;

        const lenis = new Lenis({
            duration: 1.0,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            lerp: 0.12
        });

        let rafId;
        function raf(time) {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        }
        rafId = requestAnimationFrame(raf);

        return () => {
            cancelAnimationFrame(rafId);
            lenis.destroy();
        };
    }, []);

    return null;
}
