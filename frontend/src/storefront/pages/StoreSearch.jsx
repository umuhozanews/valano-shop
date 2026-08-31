import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useStore } from "../StoreContext";
import ProductCard from "../components/ProductCard";
import { EmptyState } from "../components/Bits";
import StoreSeo from "../components/StoreSeo";

// Small catalogues (capped at 200 items server-side) mean matching in the browser
// is instant and works offline once the store payload is loaded.
function matches(product, terms) {
  const haystack = [product.name, product.nameRw, product.brand, product.category, product.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

export default function StoreSearch() {
  const [params] = useSearchParams();
  const query = (params.get("q") || "").trim();
  const { store, products, base } = useStore();

  const results = useMemo(() => {
    if (!query) return [];
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return products.filter((product) => matches(product, terms));
  }, [products, query]);

  return (
    <>
      <StoreSeo store={store} title={query ? `Search: ${query}` : "Search"} />

      <div className="pt-2">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-store-fg md:text-3xl">
          {query ? `Results for "${query}"` : "Search"}
        </h1>
        <p className="mt-2 text-sm text-store-muted">
          {query
            ? `${results.length} product${results.length === 1 ? "" : "s"} found`
            : "Type in the search box above to find a product."}
        </p>
      </div>

      <section className="mt-8 mb-4">
        {results.length === 0 ? (
          <EmptyState
            icon="🔍"
            title={query ? "Nothing matched your search" : "Start searching"}
            message={
              query
                ? "Try a shorter word, or browse the full catalogue instead."
                : "Search by product name, brand or category."
            }
            action={
              <Link
                to={`${base}/category/all`}
                className="rounded-full bg-store-brand px-6 py-2.5 text-sm font-semibold text-store-brand-fg transition hover:opacity-90"
              >
                Browse all products
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
