import SectionHeader from "@/components/SectionHeader";
import CategoryRail from "@/components/CategoryRail";
import { getCategories } from "@/lib/products";

export const metadata = {
    title: "Categories",
    description:
        "Browse all categories: summer gadgets, beach essentials, viral TikTok finds, aesthetic room and travel accessories."
};

export default function CategoriesPage() {
    const categories = getCategories();
    return (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <SectionHeader
                eyebrow="Browse by vibe"
                title="All categories"
                description="Find your favorite corner of summer."
            />
            <CategoryRail categories={categories} />
        </section>
    );
}
