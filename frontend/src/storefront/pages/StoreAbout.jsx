import { Link } from "react-router-dom";
import { useStore } from "../StoreContext";
import TrustBadges from "../components/TrustBadges";
import StoreSeo from "../components/StoreSeo";
import { formatCount } from "../lib/format";

export default function StoreAbout() {
  const { store, base, products, categories, brands } = useStore();

  const stats = [
    { label: "Products online", value: formatCount(products.length) },
    { label: "Categories", value: formatCount(categories.length) },
    ...(brands.length ? [{ label: "Brands stocked", value: formatCount(brands.length) }] : []),
  ];

  return (
    <>
      <StoreSeo store={store} title="About Us" description={store.about} />

      <section className="mt-2 overflow-hidden rounded-3xl bg-store-accent px-7 py-12 md:px-14">
        <h1 className="font-display max-w-2xl text-2xl font-extrabold leading-tight tracking-tight text-store-brand md:text-4xl">
          {store.headline || `About ${store.name}`}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-store-fg/75 md:text-base">{store.about}</p>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-store-soft p-6 text-center ring-1 ring-store-line/60">
            <div className="font-display text-3xl font-extrabold text-store-brand">{stat.value}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-widest text-store-muted">{stat.label}</div>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-store-card p-6 ring-1 ring-store-line/70">
          <h2 className="font-display text-base font-bold text-store-fg">Visit us</h2>
          <p className="mt-2 text-sm text-store-muted">{store.address}</p>
          <p className="mt-1 text-sm text-store-muted">{store.hours}</p>
        </div>
        <div className="rounded-2xl bg-store-card p-6 ring-1 ring-store-line/70">
          <h2 className="font-display text-base font-bold text-store-fg">Delivery</h2>
          <p className="mt-2 text-sm text-store-muted">{store.deliveryNote}</p>
        </div>
      </section>

      <div className="mt-8 mb-4 flex flex-wrap gap-3">
        <Link
          to={`${base}/category/all`}
          className="rounded-full bg-store-brand px-6 py-2.5 text-sm font-bold text-store-brand-fg transition hover:opacity-90"
        >
          Browse products
        </Link>
        <Link
          to={`${base}/contact`}
          className="rounded-full border border-store-brand px-6 py-2.5 text-sm font-bold text-store-brand transition hover:bg-store-brand/5"
        >
          Contact us
        </Link>
      </div>

      <TrustBadges />
    </>
  );
}
