"use client";

import { useEffect, useRef } from "react";
import {
    motion,
    useMotionValue,
    useSpring,
    useScroll,
    useTransform
} from "motion/react";

/**
 * Hand-crafted animated beach scene.
 * Layers (back -> front):
 *  1. Sky gradient (transitions morning -> sunset on scroll)
 *  2. Stars/highlights canvas (subtle sparkle on the water)
 *  3. Sun + halo rings
 *  4. Far mountain silhouette
 *  5. Drifting clouds (3 SVG layers, different speeds)
 *  6. Birds (animated path)
 *  7. Ocean (animated SVG waves, 3 layers)
 *  8. Sun reflection on water (animated)
 *  9. Sand foreground
 * 10. Palm trees, swaying
 * 11. Foreground beach umbrella
 *
 * Every layer parallaxes with the mouse and the scroll position.
 */
export default function BeachScene() {
    const ref = useRef(null);

    // Scroll-driven sky color
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"]
    });

    const skyTop = useTransform(
        scrollYProgress,
        [0, 0.5, 1],
        ["#bfe3df", "#ffd2bb", "#ff8c5a"]
    );
    const skyMid = useTransform(
        scrollYProgress,
        [0, 0.5, 1],
        ["#ffe8db", "#ffb38a", "#f06a3a"]
    );
    const skyBottom = useTransform(
        scrollYProgress,
        [0, 0.5, 1],
        ["#fbf6ee", "#ffd2bb", "#ffb38a"]
    );

    const sunY = useTransform(scrollYProgress, [0, 1], ["0%", "60%"]);
    const sunBlur = useTransform(scrollYProgress, [0, 1], [0, 12]);
    const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0, 0.35]);

    // Mouse parallax
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const sxx = useSpring(mx, { stiffness: 60, damping: 18 });
    const syy = useSpring(my, { stiffness: 60, damping: 18 });

    function handleMove(e) {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
        my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
    }

    // Mouse parallax transforms (different magnitudes per layer)
    const cloudFarX = useTransform(sxx, (v) => v * -12);
    const cloudMidX = useTransform(sxx, (v) => v * -22);
    const cloudNearX = useTransform(sxx, (v) => v * -40);
    const mountainX = useTransform(sxx, (v) => v * -8);
    const mountainY = useTransform(syy, (v) => v * -3);
    const sandY = useTransform(syy, (v) => v * 6);
    const palmLX = useTransform(sxx, (v) => v * 8);
    const palmLY = useTransform(syy, (v) => v * 4);
    const palmRX = useTransform(sxx, (v) => v * -8);
    const palmRY = useTransform(syy, (v) => v * 4);
    const sunFilter = useTransform(sunBlur, (v) => `blur(${v}px)`);
    const skyBg = useTransform(
        [skyTop, skyMid, skyBottom],
        ([t, m, b]) => `linear-gradient(180deg, ${t} 0%, ${m} 55%, ${b} 100%)`
    );

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMove}
            className="absolute inset-0 overflow-hidden"
            aria-hidden
        >
            {/* SKY */}
            <motion.div
                className="absolute inset-0"
                style={{ background: skyBg }}
            />

            {/* STARLIGHT / WATER SPARKLE CANVAS */}
            <SparkleCanvas />

            {/* CLOUDS - far layer */}
            <motion.div
                className="absolute inset-x-0 top-[8%] h-32 opacity-90"
                style={{ x: cloudFarX }}
            >
                <DriftingClouds duration={120} count={4} variant="far" />
            </motion.div>

            {/* SUN + halo */}
            <motion.div
                className="absolute left-1/2 top-[10%] -translate-x-1/2"
                style={{ y: sunY, filter: sunFilter }}
            >
                <SunWithHalo />
            </motion.div>

            {/* MOUNTAINS far */}
            <motion.svg
                viewBox="0 0 1440 200"
                className="absolute bottom-[42%] left-0 right-0 w-[120%] -translate-x-[10%] h-32 md:h-40"
                preserveAspectRatio="none"
                style={{ x: mountainX, y: mountainY }}
            >
                <defs>
                    <linearGradient id="mtnGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#88c9c2" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#4ea69d" stopOpacity="0.7" />
                    </linearGradient>
                </defs>
                <path
                    d="M0,200 L0,140 L120,90 L260,130 L380,70 L520,120 L660,80 L820,140 L980,90 L1140,130 L1300,80 L1440,120 L1440,200 Z"
                    fill="url(#mtnGrad)"
                />
            </motion.svg>

            {/* CLOUDS - mid layer */}
            <motion.div
                className="absolute inset-x-0 top-[18%] h-28"
                style={{ x: cloudMidX }}
            >
                <DriftingClouds duration={80} count={3} variant="mid" />
            </motion.div>

            {/* BIRDS */}
            <Birds />

            {/* OCEAN — multi-layered animated SVG waves */}
            <div className="absolute bottom-0 left-0 right-0 h-[58%]">
                <Ocean />
                {/* Sun reflection shimmer */}
                <SunReflection scrollYProgress={scrollYProgress} />
            </div>

            {/* SAND FOREGROUND */}
            <motion.svg
                viewBox="0 0 1440 200"
                className="absolute bottom-0 left-0 right-0 w-full h-32 md:h-40"
                preserveAspectRatio="none"
                style={{ y: sandY }}
            >
                <defs>
                    <linearGradient id="sandGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#f3e3c6" />
                        <stop offset="100%" stopColor="#ead0a0" />
                    </linearGradient>
                </defs>
                <path
                    d="M0,200 L0,80 C220,30 480,140 720,90 C960,40 1240,150 1440,70 L1440,200 Z"
                    fill="url(#sandGrad)"
                />
            </motion.svg>

            {/* PALM left */}
            <motion.div
                className="absolute bottom-2 -left-6 md:left-4 origin-bottom"
                style={{ x: palmLX, y: palmLY }}
            >
                <PalmTree side="left" />
            </motion.div>

            {/* PALM right */}
            <motion.div
                className="absolute bottom-2 -right-6 md:right-6 origin-bottom"
                style={{ x: palmRX, y: palmRY }}
            >
                <PalmTree side="right" />
            </motion.div>

            {/* CLOUDS - foreground tiny */}
            <motion.div
                className="absolute inset-x-0 top-[5%] h-16"
                style={{ x: cloudNearX }}
            >
                <DriftingClouds duration={50} count={2} variant="near" />
            </motion.div>

            {/* DARK OVERLAY for readability of text */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-b from-ink/0 via-ink/0 to-ink/30 pointer-events-none"
                style={{ opacity: overlayOpacity }}
            />

            {/* GRAIN */}
            <div
                className="absolute inset-0 mix-blend-overlay opacity-25 pointer-events-none"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>\")"
                }}
            />
        </motion.div>
    );
}

/* ----------------------------- Sub components ---------------------------- */

function SunWithHalo() {
    return (
        <div className="relative">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 m-auto h-72 w-72 rounded-full"
                style={{
                    background:
                        "conic-gradient(from 0deg, rgba(255,210,187,0), rgba(255,210,187,0.7), rgba(255,210,187,0))",
                    filter: "blur(20px)"
                }}
            />
            <motion.div
                animate={{ scale: [1, 1.06, 1], opacity: [0.95, 1, 0.95] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="relative h-44 w-44 md:h-56 md:w-56 rounded-full"
                style={{
                    background:
                        "radial-gradient(circle at 35% 35%, #ffe8db 0%, #ffb38a 40%, #ff8c5a 70%, #f06a3a 100%)",
                    boxShadow: "0 0 80px 20px rgba(255,140,90,0.55)"
                }}
            />
            {/* faint outer rings */}
            <div className="absolute inset-0 m-auto h-64 w-64 rounded-full ring-1 ring-white/30" />
            <div className="absolute inset-0 m-auto h-80 w-80 rounded-full ring-1 ring-white/20" />
        </div>
    );
}

function DriftingClouds({ duration, count, variant }) {
    const opacity = variant === "far" ? 0.7 : variant === "mid" ? 0.85 : 1;
    const scale = variant === "far" ? 0.9 : variant === "mid" ? 1 : 0.7;
    const arr = Array.from({ length: count });
    return (
        <motion.div
            className="absolute inset-0"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration, repeat: Infinity, ease: "linear" }}
        >
            <div className="flex gap-[8vw] w-[200%]">
                {[...arr, ...arr].map((_, i) => (
                    <Cloud key={i} opacity={opacity} scale={scale} index={i} />
                ))}
            </div>
        </motion.div>
    );
}

function Cloud({ opacity, scale, index }) {
    const top = (index * 17) % 60;
    return (
        <svg
            viewBox="0 0 200 80"
            className="shrink-0"
            style={{
                width: 160 * scale,
                height: 64 * scale,
                opacity,
                marginTop: top
            }}
        >
            <g fill="white">
                <ellipse cx="50" cy="50" rx="40" ry="22" />
                <ellipse cx="90" cy="35" rx="35" ry="22" />
                <ellipse cx="140" cy="50" rx="40" ry="20" />
            </g>
        </svg>
    );
}

function Birds() {
    return (
        <motion.div
            className="absolute top-[26%] left-0"
            animate={{ x: ["0vw", "120vw"] }}
            transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
        >
            <Bird />
            <div className="mt-2 ml-8">
                <Bird small />
            </div>
            <div className="mt-1 ml-1">
                <Bird small />
            </div>
        </motion.div>
    );
}

function Bird({ small = false }) {
    const size = small ? 14 : 22;
    return (
        <motion.svg
            viewBox="0 0 50 20"
            width={size}
            height={size / 2.3}
            animate={{ scaleY: [1, 0.55, 1] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
            style={{ display: "block", color: "#1f2a37", opacity: 0.7 }}
        >
            <path
                d="M0 15 Q 12 0 25 12 Q 38 0 50 15"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
            />
        </motion.svg>
    );
}

function Ocean() {
    return (
        <div className="absolute inset-0 overflow-hidden">
            {/* base water */}
            <div className="absolute inset-0 bg-gradient-to-b from-sea-300 via-sea-400 to-sea-500" />
            {/* layered animated waves */}
            <Wave color="rgba(255,255,255,0.18)" duration={14} top="0%" />
            <Wave color="rgba(255,255,255,0.25)" duration={10} top="25%" reverse />
            <Wave color="rgba(255,255,255,0.4)" duration={7} top="55%" />
            <Wave color="rgba(255,255,255,0.6)" duration={5} top="80%" reverse />
        </div>
    );
}

function Wave({ color, duration, top, reverse = false }) {
    return (
        <motion.svg
            viewBox="0 0 1440 80"
            preserveAspectRatio="none"
            className="absolute left-0 w-[200%] h-12 md:h-16"
            style={{ top }}
            animate={{ x: reverse ? ["0%", "-50%"] : ["-50%", "0%"] }}
            transition={{ duration, repeat: Infinity, ease: "linear" }}
        >
            <path
                d="M0,40 C180,80 360,0 540,40 C720,80 900,0 1080,40 C1260,80 1440,0 1620,40 C1800,80 1980,0 2160,40 C2340,80 2520,0 2700,40 C2880,80 2880,80 2880,80 L0,80 Z"
                fill={color}
            />
        </motion.svg>
    );
}

function SunReflection({ scrollYProgress }) {
    const opacity = useTransform(scrollYProgress, [0, 1], [0.55, 0.95]);
    return (
        <motion.div
            className="absolute left-1/2 -translate-x-1/2 top-0 w-40 md:w-64 h-full pointer-events-none"
            style={{ opacity }}
        >
            <motion.div
                className="absolute inset-0"
                animate={{ scaleY: [1, 1.05, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                style={{
                    background:
                        "radial-gradient(ellipse 50% 100% at 50% 0%, rgba(255,232,219,0.95), rgba(255,179,138,0.6) 40%, transparent 75%)",
                    filter: "blur(2px)"
                }}
            />
        </motion.div>
    );
}

function PalmTree({ side }) {
    const flip = side === "right" ? -1 : 1;
    return (
        <motion.svg
            viewBox="0 0 200 260"
            width={170}
            height={220}
            className="md:w-[230px] md:h-[300px]"
            style={{ transform: `scaleX(${flip})`, transformOrigin: "bottom center" }}
            animate={{ rotate: [-1.5, 1.5, -1.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
            {/* trunk */}
            <path
                d="M95 260 Q 88 180 100 110 Q 112 60 95 20"
                stroke="#7a4a1f"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
            />
            {/* leaves */}
            <g fill="#2d8079">
                <path d="M95 25 Q 30 -10 -10 35 Q 30 45 95 50 Z" />
                <path d="M95 25 Q 160 -5 200 30 Q 160 50 95 50 Z" />
                <path d="M95 30 Q 40 60 0 110 Q 60 90 100 60 Z" />
                <path d="M95 30 Q 150 60 195 110 Q 140 95 100 60 Z" />
                <path d="M95 35 Q 70 -5 60 -25 Q 100 -10 105 30 Z" />
            </g>
            <g fill="#4ea69d" opacity="0.85">
                <path d="M95 30 Q 50 15 20 45 Q 55 35 100 50 Z" />
                <path d="M95 30 Q 140 15 180 45 Q 140 35 100 50 Z" />
            </g>
            {/* coconuts */}
            <circle cx="92" cy="40" r="5" fill="#5a3a18" />
            <circle cx="103" cy="42" r="5" fill="#5a3a18" />
        </motion.svg>
    );
}

function SparkleCanvas() {
    const ref = useRef(null);
    useEffect(() => {
        const canvas = ref.current;
        if (!canvas) return;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (reduced.matches) return;

        const ctx = canvas.getContext("2d");
        let raf;
        const dpr = window.devicePixelRatio || 1;

        const resize = () => {
            canvas.width = canvas.clientWidth * dpr;
            canvas.height = canvas.clientHeight * dpr;
        };
        resize();
        const onResize = () => resize();
        window.addEventListener("resize", onResize);

        const sparkles = Array.from({ length: 60 }).map(() => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.45 + canvas.height * 0.55,
            r: Math.random() * 1.4 + 0.4,
            a: Math.random(),
            s: Math.random() * 0.02 + 0.005
        }));

        const tick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            sparkles.forEach((p) => {
                p.a += p.s;
                if (p.a > 1 || p.a < 0) p.s *= -1;
                ctx.beginPath();
                ctx.fillStyle = `rgba(255,255,255,${p.a * 0.8})`;
                ctx.arc(p.x, p.y, p.r * dpr, 0, Math.PI * 2);
                ctx.fill();
            });
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", onResize);
        };
    }, []);

    return (
        <canvas
            ref={ref}
            className="absolute inset-0 w-full h-full pointer-events-none"
        />
    );
}
