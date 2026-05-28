import SectionHeader from "@/components/SectionHeader";
import ProductGrid from "@/components/ProductGrid";
import { getProductsByTag } from "@/lib/products";

export const metadata = {
    title: "TikTok Made Me Buy It",
    description:
        "The viral TikTok summer products that are actually worth the hype. Reviewed by Summer Finds Lab."
};

export default function TikTokPage() {
    const products = getProductsByTag("tiktok");

    return (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <SectionHeader
                eyebrow="As seen on your FYP"
                title="TikTok Made Me Buy It"
                description="The viral picks our team actually keeps using."
            />
            <ProductGrid products={products} masonry />
        </section>
    );
}
