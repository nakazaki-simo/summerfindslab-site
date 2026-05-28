import SectionHeader from "@/components/SectionHeader";
import ProductGrid from "@/components/ProductGrid";
import { getProductsUnder } from "@/lib/products";

export const metadata = {
    title: "Under $25 Summer Finds",
    description:
        "Affordable summer gadgets, beach essentials and aesthetic upgrades, all under $25."
};

export default function Under25Page() {
    const products = getProductsUnder(25);

    return (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
            <SectionHeader
                eyebrow="Wallet friendly"
                title="Under $25"
                description="Small treats, big summer energy."
            />
            <ProductGrid products={products} masonry />
        </section>
    );
}
