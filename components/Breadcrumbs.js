import Link from "next/link";

export default function Breadcrumbs({ items }) {
    return (
        <nav
            aria-label="Breadcrumb"
            className="text-sm text-ink/60 flex items-center gap-1.5 flex-wrap"
        >
            {items.map((it, i) => {
                const last = i === items.length - 1;
                return (
                    <span key={i} className="flex items-center gap-1.5">
                        {it.url && !last ? (
                            <Link href={it.url} className="hover:text-ink transition">
                                {it.name}
                            </Link>
                        ) : (
                            <span className={last ? "text-ink" : ""}>{it.name}</span>
                        )}
                        {!last && <span className="text-ink/30">/</span>}
                    </span>
                );
            })}
        </nav>
    );
}
