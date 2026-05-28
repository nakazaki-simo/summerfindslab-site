import SectionHeader from "@/components/SectionHeader";
import ProductGrid from "@/components/ProductGrid";
import { getProductsByTag } from "@/lib/products";

export const metadata = {
    title: "Trending Summer Finds",
    description:
        "The summer products people are buying right now. Hand-picked daily by Summer Finds Lab."
};

export default function TrendingPage() {
    const products = getProductsByTag("trending");

    return (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <SectionHeader
                eyebrow="This week's heat"
                title="Trending Summer Finds"
                description="The picks getting the most clicks, comments and saves right now."
            />
            <ProductGrid products={products} masonry />
        </section>
    );
}
