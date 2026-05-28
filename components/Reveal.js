"use client";

import { motion } from "motion/react";

const variants = {
    hidden: { opacity: 0, y: 32, filter: "blur(8px)" },
    visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    }
};

export default function Reveal({
    children,
    delay = 0,
    className = "",
    as = "div"
}) {
    const MotionTag = motion[as] ?? motion.div;
    return (
        <MotionTag
            className={className}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={{
                hidden: variants.hidden,
                visible: {
                    ...variants.visible,
                    transition: { ...variants.visible.transition, delay }
                }
            }}
        >
            {children}
        </MotionTag>
    );
}
