"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

export default function Cursor() {
    const x = useMotionValue(-100);
    const y = useMotionValue(-100);
    const sx = useSpring(x, { damping: 20, stiffness: 280, mass: 0.4 });
    const sy = useSpring(y, { damping: 20, stiffness: 280, mass: 0.4 });

    const [enabled, setEnabled] = useState(false);
    const [variant, setVariant] = useState("default");
    const [label, setLabel] = useState("");
    const last = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (typeof window === "undefined") return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
        const isFinePointer = window.matchMedia("(pointer: fine)");
        if (reduced.matches || !isFinePointer.matches) return;
        setEnabled(true);

        const onMove = (e) => {
            x.set(e.clientX);
            y.set(e.clientY);
            last.current = { x: e.clientX, y: e.clientY };
        };
        const onOver = (e) => {
            const t = e.target.closest("a, button, [data-cursor]");
            if (!t) {
                setVariant("default");
                setLabel("");
                return;
            }
            const c = t.dataset?.cursor;
            if (c === "view") {
                setVariant("view");
                setLabel("View");
            } else if (c === "shop") {
                setVariant("shop");
                setLabel("Shop");
            } else {
                setVariant("link");
                setLabel("");
            }
        };
        const onOut = () => {
            setVariant("default");
            setLabel("");
        };

        window.addEventListener("mousemove", onMove);
        document.addEventListener("mouseover", onOver);
        document.addEventListener("mouseleave", onOut);
        return () => {
            window.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseover", onOver);
            document.removeEventListener("mouseleave", onOut);
        };
    }, [x, y]);

    if (!enabled) return null;

    const ringSize =
        variant === "view" || variant === "shop"
            ? 90
            : variant === "link"
                ? 60
                : 32;

    return (
        <>
            <motion.div
                aria-hidden
                style={{
                    x: sx,
                    y: sy,
                    translateX: "-50%",
                    translateY: "-50%",
                    width: ringSize,
                    height: ringSize,
                    mixBlendMode: "difference"
                }}
                transition={{ width: { duration: 0.25 }, height: { duration: 0.25 } }}
                className="pointer-events-none fixed left-0 top-0 z-[100] rounded-full bg-white"
            >
                {label && (
                    <span className="flex h-full w-full items-center justify-center text-[11px] font-medium uppercase tracking-wider text-ink">
                        {label}
                    </span>
                )}
            </motion.div>
            <motion.div
                aria-hidden
                style={{
                    x: sx,
                    y: sy,
                    translateX: "-50%",
                    translateY: "-50%"
                }}
                className="pointer-events-none fixed left-0 top-0 z-[101] h-1.5 w-1.5 rounded-full bg-peach-500"
            />
        </>
    );
}
