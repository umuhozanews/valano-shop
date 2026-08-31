import { Link } from "react-router-dom";
import { useStore } from "../StoreContext";
import { ProductImage, SectionHeading } from "./Bits";

export default function CategoryGrid() {
  const { categories, base } = useStore();
  if (categories.length < 2) return null;

  return (
    <section className="mt-14">
      <SectionHeading title="Browse by Category" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {categories.slice(0, 12).map((category) => (
          <Link
            key={category.slug}
            to={`${base}/category/${category.slug}`}
            className="flex items-center gap-3 rounded-2xl bg-store-soft p-4 ring-1 ring-store-line/60 transition hover:shadow-sm hover:ring-store-brand/40"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-store-line/60">
              <ProductImage src={category.image} alt={category.name} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-store-fg">{category.name}</div>
              <div className="text-xs text-store-muted">{category.count} items</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
