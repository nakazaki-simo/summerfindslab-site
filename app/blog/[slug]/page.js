import { notFound } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import JsonLd from "@/components/JsonLd";
import { getAllPosts, getPostBySlug } from "@/lib/products";
import { blogPostingLd, breadcrumbsLd } from "@/lib/seo";

export function generateStaticParams() {
    return getAllPosts().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }) {
    const post = getPostBySlug(params.slug);
    if (!post) return {};
    return {
        title: post.title,
        description: post.excerpt,
        alternates: { canonical: `/blog/${post.slug}` },
        openGraph: {
            title: post.title,
            description: post.excerpt,
            images: [post.cover],
            type: "article",
            publishedTime: post.date
        },
        twitter: {
            card: "summary_large_image",
            title: post.title,
            description: post.excerpt,
            images: [post.cover]
        }
    };
}

export default function PostPage({ params }) {
    const post = getPostBySlug(params.slug);
    if (!post) return notFound();

    const crumbs = [
        { name: "Home", url: "/" },
        { name: "Blog", url: "/blog" },
        { name: post.title }
    ];

    return (
        <>
            <JsonLd data={breadcrumbsLd(crumbs)} />
            <JsonLd data={blogPostingLd(post)} />

            <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                <Breadcrumbs items={crumbs} />
                <h1 className="mt-4 font-display text-4xl md:text-6xl font-semibold leading-[1.05]">
                    {post.title}
                </h1>
                <div className="mt-3 text-sm text-ink/60">
                    {new Date(post.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                    })}{" "}
                    · {post.readTime}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={post.cover}
                    alt={post.title}
                    className="mt-6 w-full rounded-xl2 object-cover"
                />
                <div className="prose prose-lg mt-8 max-w-none text-ink/80 leading-relaxed">
                    <p>{post.content}</p>
                    <p>
                        Want more like this? Browse our{" "}
                        <Link
                            href={`/category/${post.category}`}
                            className="text-peach-500 underline"
                        >
                            {post.category.replace(/-/g, " ")}
                        </Link>{" "}
                        picks for the full lineup.
                    </p>
                </div>
            </article>
        </>
    );
}
