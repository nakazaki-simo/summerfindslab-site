"use client";

import Link from "next/link";
import { motion } from "motion/react";

export default function BlogCard({ post, index = 0 }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{
                duration: 0.7,
                delay: index * 0.08,
                ease: [0.22, 1, 0.36, 1]
            }}
            whileHover={{ y: -6 }}
        >
            <Link
                href={`/blog/${post.slug}`}
                className="group block rounded-xl2 overflow-hidden bg-white ring-1 ring-sand-100 shadow-card transition-shadow duration-300 hover:shadow-soft"
            >
                <div className="overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={post.cover}
                        alt={post.title}
                        className="h-52 w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                </div>
                <div className="p-5">
                    <div className="text-xs text-ink/50 flex items-center gap-2">
                        <span>
                            {new Date(post.date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric"
                            })}
                        </span>
                        <span>·</span>
                        <span>{post.readTime}</span>
                    </div>
                    <h3 className="mt-2 font-display text-xl leading-snug">
                        {post.title}
                    </h3>
                    <p className="mt-2 text-sm text-ink/70 line-clamp-2">
                        {post.excerpt}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-peach-500">
                        Read more
                        <span className="transition-transform group-hover:translate-x-0.5">
                            →
                        </span>
                    </span>
                </div>
            </Link>
        </motion.div>
    );
}
