import { Link, useParams } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useStore } from "../StoreContext";
import Catalog from "../components/Catalog";
import TrustBadges from "../components/TrustBadges";
import StoreSeo from "../components/StoreSeo";

export default function StoreCategory() {
  const { categorySlug } = useParams();
  const { store, base, products, categories } = useStore();

  const isAll = !categorySlug || categorySlug === "all";
  const category = isAll ? null : categories.find((entry) => entry.slug === categorySlug);
  const title = isAll ? "All Products" : category?.name || "Products";
  const visible = isAll ? products : products.filter((product) => product.category === category?.name);

  return (
    <>
      <StoreSeo
        store={store}
        title={title}
        description={`Browse ${title.toLowerCase()} available at ${store.name}. ${store.deliveryNote}`}
        image={visible[0]?.image}
      />

      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 pt-2 text-xs text-store-muted">
        <Link to={base} className="hover:text-store-brand">Home</Link>
        <ChevronRight size={12} aria-hidden="true" />
        <span className="font-semibold text-store-fg">{title}</span>
      </nav>

      <h1 className="font-display mt-3 text-2xl font-extrabold tracking-tight text-store-fg md:text-3xl">{title}</h1>
      {!isAll && !category && (
        <p className="mt-2 text-sm text-store-muted">
          We could not find that category. Browse everything below instead.
        </p>
      )}

      <Catalog
        products={!isAll && !category ? products : visible}
        title={title}
        enableCategoryFilter={isAll}
        emptyMessage={`There are no products in ${title.toLowerCase()} right now.`}
      />
      <TrustBadges />
    </>
  );
}
