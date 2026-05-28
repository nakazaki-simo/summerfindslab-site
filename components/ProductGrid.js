import ProductCard from "./ProductCard";

export default function ProductGrid({ products, masonry = true }) {
    if (!products?.length) {
        return (
            <p className="text-sm text-ink/60">
                No products yet. Check back soon for fresh summer drops.
            </p>
        );
    }

    if (masonry) {
        return (
            <div className="masonry">
                {products.map((p) => (
                    <ProductCard key={p.id} product={p} masonry />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p) => (
                <ProductCard key={p.id} product={p} />
            ))}
        </div>
    );
}
