import { Link } from "react-router-dom";
import { useStore } from "../StoreContext";
import { SectionHeading } from "./Bits";

export default function BrandStrip() {
  const { brands, base } = useStore();
  if (brands.length < 2) return null;

  return (
    <section className="mt-14">
      <SectionHeading title="Shop by Brand" />
      <div className="flex flex-wrap gap-3">
        {brands.map((brand) => (
          <Link
            key={brand.name}
            to={`${base}/search?q=${encodeURIComponent(brand.name)}`}
            className="rounded-full border border-store-line bg-store-card px-5 py-2.5 text-sm font-semibold text-store-fg/80 transition hover:text-store-brand hover:shadow-sm hover:ring-1 hover:ring-store-brand/40"
          >
            {brand.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
