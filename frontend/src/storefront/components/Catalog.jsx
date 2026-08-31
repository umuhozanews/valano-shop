import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useStore } from "../StoreContext";
import ProductCard from "./ProductCard";
import { Chip, EmptyState } from "./Bits";

const SORTS = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "price-desc", label: "Price: High to Low" },
  { key: "name", label: "Name A–Z" },
];

function sortProducts(products, sortKey) {
  const list = [...products];
  if (sortKey === "price-asc") return list.sort((a, b) => a.price - b.price);
  if (sortKey === "price-desc") return list.sort((a, b) => b.price - a.price);
  if (sortKey === "name") return list.sort((a, b) => a.name.localeCompare(b.name));
  // "featured" keeps the order the API returned: featured first, then in-stock.
  return list;
}

function SortMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const active = SORTS.find((option) => option.key === value) || SORTS[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-store-line bg-store-card px-4 py-2 text-xs font-semibold text-store-fg/80 transition hover:border-store-brand/40 hover:text-store-brand"
      >
        {active.label}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="store-fade-up absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-2xl border border-store-line bg-store-card p-1.5 shadow-xl">
          {SORTS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                onChange(option.key);
                setOpen(false);
              }}
              className={`block w-full rounded-xl px-3 py-2 text-left text-xs font-medium transition hover:bg-store-soft ${
                option.key === value ? "text-store-brand" : "text-store-fg/80"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Catalog({ products, title = "All Products", enableCategoryFilter = false, emptyMessage }) {
  const { categories, base } = useStore();
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortKey, setSortKey] = useState("featured");

  const visible = useMemo(() => {
    const filtered =
      enableCategoryFilter && activeCategory !== "all"
        ? products.filter((product) => product.category === activeCategory)
        : products;
    return sortProducts(filtered, sortKey);
  }, [products, enableCategoryFilter, activeCategory, sortKey]);

  const showToolbar = enableCategoryFilter && categories.length > 1;

  return (
    <>
      {(showToolbar || products.length > 1) && (
        <section className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {showToolbar && (
              <>
                <Chip active={activeCategory === "all"} onClick={() => setActiveCategory("all")}>
                  All
                </Chip>
                {categories.slice(0, 8).map((category) => (
                  <Chip
                    key={category.slug}
                    active={activeCategory === category.name}
                    onClick={() => setActiveCategory(category.name)}
                  >
                    {category.name}
                  </Chip>
                ))}
                <Link
                  to={`${base}/category/all`}
                  className="flex items-center gap-2 rounded-full border border-store-line bg-store-card px-4 py-2 text-xs font-semibold text-store-fg/80 transition hover:border-store-brand/40 hover:text-store-brand"
                >
                  Browse All
                  <SlidersHorizontal size={12} aria-hidden="true" />
                </Link>
              </>
            )}
          </div>
          {products.length > 1 && <SortMenu value={sortKey} onChange={setSortKey} />}
        </section>
      )}

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold tracking-tight text-store-fg">
            {title}
            <span className="ml-2 text-sm font-normal text-store-muted">({visible.length})</span>
          </h2>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            title="No products here yet"
            message={emptyMessage || "This shop is still adding products. Please check back soon or contact us directly."}
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
