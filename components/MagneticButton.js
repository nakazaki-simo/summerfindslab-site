"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

export default function MagneticButton({
    children,
    className = "",
    as: Tag = "a",
    ...props
}) {
    const ref = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
    const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });

    function handleMove(e) {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const offsetX = e.clientX - rect.left - rect.width / 2;
        const offsetY = e.clientY - rect.top - rect.height / 2;
        x.set(offsetX * 0.25);
        y.set(offsetY * 0.35);
    }
    function handleLeave() {
        x.set(0);
        y.set(0);
    }

    const MotionTag = motion[Tag] ?? motion.a;

    return (
        <MotionTag
            ref={ref}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            style={{ x: sx, y: sy }}
            whileTap={{ scale: 0.96 }}
            className={`inline-flex items-center justify-center will-change-transform ${className}`}
            {...props}
        >
            {children}
        </MotionTag>
    );
}
