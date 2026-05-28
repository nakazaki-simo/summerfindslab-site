"use client";

import { useEffect, useRef, useState } from "react";
import {
    motion,
    useMotionValue,
    useSpring,
    useScroll,
    useTransform
} from "motion/react";

/**
 * Real cinematic beach video with parallax sun, gradient atmosphere,
 * sparkle layer, and animated wave overlay. Falls back to a beach
 * photo if the video fails to load.
 */

const VIDEO_HD =
    "https://videos.pexels.com/video-files/2169880/2169880-hd_1920_1080_30fps.mp4";
const VIDEO_SD =
    "https://videos.pexels.com/video-files/2169880/2169880-sd_960_540_30fps.mp4";
const POSTER =
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&auto=format&fit=crop&q=80";

export default function BeachVideo() {
    const ref = useRef(null);
    const videoRef = useRef(null);
    const [failed, setFailed] = useState(false);

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"]
    });
    const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
    const videoScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.18]);
    const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.45, 0.85]);
    const sunY = useTransform(scrollYProgress, [0, 1], ["0%", "60%"]);
    const sunOpacity = useTransform(scrollYProgress, [0, 1], [0.85, 0.4]);

    // Mouse parallax
    const mx = useMotionValue(0);
    const my = useMotionValue(0);
    const sx = useSpring(mx, { stiffness: 60, damping: 18 });
    const sy = useSpring(my, { stiffness: 60, damping: 18 });
    const sunX = useTransform(sx, (v) => v * -10);
    const sunYOffset = useTransform(sy, (v) => v * -6);
    const palmLX = useTransform(sx, (v) => v * 14);
    const palmRX = useTransform(sx, (v) => v * -14);

    function handleMove(e) {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
        my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
    }

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const onError = () => setFailed(true);
        v.addEventListener("error", onError);
        // Try to play (some browsers need an explicit call after metadata loads)
        const tryPlay = () => v.play().catch(() => { });
        tryPlay();
        return () => v.removeEventListener("error", onError);
    }, []);

    return (
        <div
            ref={ref}
            onMouseMove={handleMove}
            className="absolute inset-0 overflow-hidden bg-ink"
            aria-hidden
        >
            {/* Real beach video */}
            {!failed ? (
                <motion.video
                    ref={videoRef}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    poster={POSTER}
                    style={{ y: videoY, scale: videoScale }}
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={() => setFailed(true)}
                >
                    <source src={VIDEO_HD} type="video/mp4" media="(min-width: 1024px)" />
                    <source src={VIDEO_SD} type="video/mp4" />
                </motion.video>
            ) : (
                <motion.img
                    src={POSTER}
                    alt=""
                    style={{ y: videoY, scale: videoScale }}
                    className="absolute inset-0 h-full w-full object-cover"
                />
            )}

            {/* Warm sunset color wash to match brand */}
            <div
                className="absolute inset-0 mix-blend-soft-light pointer-events-none"
                style={{
                    background:
                        "linear-gradient(180deg, rgba(255,210,187,0.55) 0%, rgba(255,140,90,0.25) 50%, rgba(31,42,55,0.4) 100%)"
                }}
            />

            {/* Glowing sun above the horizon */}
            <motion.div
                className="absolute left-1/2 top-[12%] -translate-x-1/2"
                style={{ y: sunY, x: sunX, opacity: sunOpacity }}
            >
                <motion.div
                    animate={{ scale: [1, 1.05, 1], opacity: [0.85, 1, 0.85] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    className="h-32 w-32 md:h-44 md:w-44 rounded-full"
                    style={{
                        background:
                            "radial-gradient(circle at 35% 35%, #ffe8db 0%, #ffb38a 45%, #ff8c5a 75%, rgba(240,106,58,0.3) 100%)",
                        boxShadow: "0 0 80px 20px rgba(255,140,90,0.6)"
                    }}
                />
                {/* sun rays */}
                <motion.div
                    aria-hidden
                    animate={{ rotate: 360 }}
                    transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 m-auto h-72 w-72 md:h-96 md:w-96 -translate-x-1/2 left-1/2 -translate-y-1/2 top-1/2"
                    style={{
                        background:
                            "conic-gradient(from 0deg, rgba(255,232,219,0), rgba(255,232,219,0.45), rgba(255,232,219,0))",
                        filter: "blur(18px)"
                    }}
                />
            </motion.div>

            {/* Animated water sparkles */}
            <SparkleCanvas />

            {/* Front palm tree silhouettes */}
            <motion.div
                style={{ x: palmLX }}
                className="absolute bottom-0 -left-6 md:left-2 z-[2]"
            >
                <PalmSilhouette side="left" />
            </motion.div>
            <motion.div
                style={{ x: palmRX }}
                className="absolute bottom-0 -right-6 md:right-2 z-[2]"
            >
                <PalmSilhouette side="right" />
            </motion.div>

            {/* Drifting clouds (top of the sky) */}
            <DriftingClouds />

            {/* Animated foam/wave divider at the very bottom */}
            <FoamWaves />

            {/* Darken edges for hero text legibility */}
            <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ opacity: overlayOpacity }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-ink/20 via-transparent to-ink/70" />
            </motion.div>

            {/* Subtle grain */}
            <div
                className="absolute inset-0 mix-blend-overlay opacity-20 pointer-events-none"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>\")"
                }}
            />
        </div>
    );
}

function PalmSilhouette({ side }) {
    const flip = side === "right" ? -1 : 1;
    return (
        <motion.svg
            viewBox="0 0 200 280"
            width={150}
            height={210}
            className="md:w-[210px] md:h-[290px] drop-shadow-2xl"
            style={{ transform: `scaleX(${flip})`, transformOrigin: "bottom center" }}
            animate={{ rotate: [-1.5, 1.5, -1.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
            <path
                d="M95 280 Q 88 200 100 130 Q 112 80 95 30"
                stroke="#1f2a37"
                strokeOpacity="0.75"
                strokeWidth="9"
                fill="none"
                strokeLinecap="round"
            />
            <g fill="#1f2a37" fillOpacity="0.78">
                <path d="M95 35 Q 30 0 -10 45 Q 30 55 95 60 Z" />
                <path d="M95 35 Q 160 5 200 40 Q 160 60 95 60 Z" />
                <path d="M95 40 Q 40 70 0 120 Q 60 100 100 70 Z" />
                <path d="M95 40 Q 150 70 195 120 Q 140 105 100 70 Z" />
                <path d="M95 45 Q 70 5 60 -15 Q 100 0 105 40 Z" />
            </g>
            <circle cx="92" cy="50" r="5" fill="#1f2a37" fillOpacity="0.85" />
            <circle cx="103" cy="52" r="5" fill="#1f2a37" fillOpacity="0.85" />
        </motion.svg>
    );
}

function DriftingClouds() {
    return (
        <motion.div
            className="absolute inset-x-0 top-[6%] h-24 opacity-70 pointer-events-none"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        >
            <div className="flex gap-[10vw] w-[200%]">
                {Array.from({ length: 6 }).map((_, i) => (
                    <svg
                        key={i}
                        viewBox="0 0 200 80"
                        className="shrink-0"
                        style={{ width: 160, height: 60, marginTop: (i * 13) % 50 }}
                    >
                        <g fill="white" fillOpacity="0.9">
                            <ellipse cx="50" cy="50" rx="40" ry="22" />
                            <ellipse cx="90" cy="35" rx="35" ry="22" />
                            <ellipse cx="140" cy="50" rx="40" ry="20" />
                        </g>
                    </svg>
                ))}
            </div>
        </motion.div>
    );
}

function FoamWaves() {
    return (
        <div className="absolute bottom-0 left-0 right-0 h-24 md:h-28 pointer-events-none">
            <Wave color="rgba(255,255,255,0.35)" duration={9} top="40%" />
            <Wave color="rgba(255,255,255,0.55)" duration={6} top="65%" reverse />
            <Wave color="rgba(255,255,255,0.85)" duration={4.5} top="85%" />
        </div>
    );
}

function Wave({ color, duration, top, reverse = false }) {
    return (
        <motion.svg
            viewBox="0 0 1440 80"
            preserveAspectRatio="none"
            className="absolute left-0 w-[200%] h-10 md:h-14"
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
        window.addEventListener("resize", resize);

        const sparkles = Array.from({ length: 70 }).map(() => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height * 0.5 + canvas.height * 0.5,
            r: Math.random() * 1.6 + 0.4,
            a: Math.random(),
            s: Math.random() * 0.025 + 0.005
        }));

        const tick = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            sparkles.forEach((p) => {
                p.a += p.s;
                if (p.a > 1 || p.a < 0) p.s *= -1;
                ctx.beginPath();
                ctx.fillStyle = `rgba(255,232,219,${p.a * 0.85})`;
                ctx.arc(p.x, p.y, p.r * dpr, 0, Math.PI * 2);
                ctx.fill();
            });
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", resize);
        };
    }, []);

    return (
        <canvas
            ref={ref}
            className="absolute inset-0 w-full h-full pointer-events-none"
        />
    );
}
