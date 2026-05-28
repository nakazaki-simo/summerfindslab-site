import SectionHeader from "@/components/SectionHeader";
import BlogCard from "@/components/BlogCard";
import { getAllPosts } from "@/lib/products";

export const metadata = {
    title: "Blog",
    description:
        "Summer guides, gift ideas and trend reports from Summer Finds Lab Daily."
};

export default function BlogPage() {
    const posts = getAllPosts();
    return (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <SectionHeader
                eyebrow="The journal"
                title="Stories & guides"
                description="Helpful guides, gift ideas and trend reports."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                    <BlogCard key={post.slug} post={post} />
                ))}
            </div>
        </section>
    );
}
