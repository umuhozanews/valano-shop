import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, Clock, Minus, Plus, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { useStore } from "../StoreContext";
import ProductCard from "../components/ProductCard";
import { EmptyState, ProductImage, SectionHeading } from "../components/Bits";
import StoreSeo from "../components/StoreSeo";
import { formatMoney, whatsappLink } from "../lib/format";

// Product URLs are "<name>-<id>", and hero slides link with the bare id, so both
// forms resolve to the same product.
function productIdFromSlug(slug) {
  const trailing = String(slug || "").split("-").pop();
  const id = Number(trailing);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default function StoreProduct() {
  const { productSlug } = useParams();
  const { store, base, home, products, categories, currency, cart } = useStore();
  const [quantity, setQuantity] = useState(1);

  const productId = productIdFromSlug(productSlug);
  const product = useMemo(() => products.find((entry) => entry.id === productId), [products, productId]);
  const categorySlug = categories.find((entry) => entry.name === product?.category)?.slug || "all";

  const related = useMemo(() => {
    if (!product) return [];
    return products
      .filter((entry) => entry.id !== product.id && entry.category === product.category)
      .slice(0, 4);
  }, [products, product]);

  if (!product) {
    return (
      <div className="py-10">
        <EmptyState
          icon="🔍"
          title="Product not found"
          message="This item may have been sold or removed from the catalogue."
          action={
            <Link
              to={`${base}/category/all`}
              className="rounded-full bg-store-brand px-6 py-2.5 text-sm font-semibold text-store-brand-fg transition hover:opacity-90"
            >
              Browse all products
            </Link>
          }
        />
      </div>
    );
  }

  const waHref = whatsappLink(
    store.whatsapp,
    `Hello ${store.name}, I would like to order ${quantity} x ${product.name} (${formatMoney(product.price, currency)}).`
  );

  return (
    <>
      <StoreSeo
        store={store}
        title={product.name}
        description={product.description || `${product.name} available at ${store.name}. ${store.deliveryNote}`}
        image={product.image}
      />

      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 pt-2 text-xs text-store-muted">
        <Link to={home} className="hover:text-store-brand">Home</Link>
        <ChevronRight size={12} aria-hidden="true" />
        <Link to={`${base}/category/${categorySlug}`} className="hover:text-store-brand">
          {product.category}
        </Link>
        <ChevronRight size={12} aria-hidden="true" />
        <span className="truncate font-semibold text-store-fg">{product.name}</span>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-3xl bg-store-soft ring-1 ring-store-line/60">
          <ProductImage src={product.image} alt={product.name} className="aspect-square h-full w-full object-cover" />
        </div>

        <div className="flex flex-col">
          {product.brand && (
            <span className="text-[11px] font-bold uppercase tracking-widest text-store-muted">{product.brand}</span>
          )}
          <h1 className="font-display mt-1 text-2xl font-extrabold leading-tight tracking-tight text-store-fg md:text-3xl">
            {product.name}
          </h1>
          {product.nameRw && product.nameRw !== product.name && (
            <p className="mt-1 text-sm text-store-muted">{product.nameRw}</p>
          )}

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="font-display text-3xl font-extrabold text-store-brand">
              {formatMoney(product.price, currency)}
            </span>
            {product.compareAtPrice && (
              <>
                <span className="text-base text-store-muted line-through">
                  {formatMoney(product.compareAtPrice, currency)}
                </span>
                <span className="rounded-full bg-store-brand/10 px-2.5 py-1 text-xs font-bold text-store-brand">
                  Save {product.discountPct}%
                </span>
              </>
            )}
          </div>

          <div className="mt-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                product.inStock ? "bg-store-brand/10 text-store-brand" : "bg-store-soft text-store-muted"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${product.inStock ? "bg-store-brand" : "bg-store-muted"}`} />
              {product.inStock ? "In stock — ready to ship" : "Currently out of stock"}
            </span>
          </div>

          {product.description && (
            <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-store-fg/75">{product.description}</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border border-store-line">
              <button
                type="button"
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                aria-label="Reduce quantity"
                className="grid h-10 w-10 place-items-center rounded-full text-store-muted transition hover:text-store-brand"
              >
                <Minus size={15} />
              </button>
              <span className="w-10 text-center text-sm font-bold text-store-fg">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((current) => Math.min(999, current + 1))}
                aria-label="Increase quantity"
                className="grid h-10 w-10 place-items-center rounded-full text-store-muted transition hover:text-store-brand"
              >
                <Plus size={15} />
              </button>
            </div>

            <button
              type="button"
              disabled={!product.inStock}
              onClick={() => {
                cart.add(product.id, quantity);
                cart.open();
              }}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition sm:flex-none ${
                product.inStock
                  ? "bg-store-brand text-store-brand-fg hover:opacity-90"
                  : "cursor-not-allowed bg-store-soft text-store-muted"
              }`}
            >
              <ShoppingCart size={16} />
              {product.inStock ? "Add to cart" : "Unavailable"}
            </button>

            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-store-brand px-6 py-3 text-sm font-bold text-store-brand transition hover:bg-store-brand/5"
              >
                Order on WhatsApp
              </a>
            )}
          </div>

          <dl className="mt-7 grid gap-3 rounded-2xl bg-store-soft p-5 ring-1 ring-store-line/60">
            <div className="flex items-start gap-3">
              <Truck size={16} className="mt-0.5 shrink-0 text-store-brand" aria-hidden="true" />
              <div>
                <dt className="text-sm font-semibold text-store-fg">Delivery</dt>
                <dd className="text-xs text-store-muted">{store.deliveryNote}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-store-brand" aria-hidden="true" />
              <div>
                <dt className="text-sm font-semibold text-store-fg">Sold by {store.name}</dt>
                <dd className="text-xs text-store-muted">{store.address}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock size={16} className="mt-0.5 shrink-0 text-store-brand" aria-hidden="true" />
              <div>
                <dt className="text-sm font-semibold text-store-fg">Opening hours</dt>
                <dd className="text-xs text-store-muted">{store.hours}</dd>
              </div>
            </div>
          </dl>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16 mb-4">
          <SectionHeading title="You may also like" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((entry) => (
              <ProductCard key={entry.id} product={entry} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
