import { Link } from "react-router-dom";
import { Check, Plus } from "lucide-react";
import { useStore } from "../StoreContext";
import { formatMoney } from "../lib/format";
import { ProductImage } from "./Bits";

export default function ProductCard({ product }) {
  const { base, currency, cart } = useStore();
  const inCart = cart.has(product.id);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-store-card ring-1 ring-store-line/70 transition hover:shadow-lg hover:ring-store-brand/30">
      <Link to={`${base}/product/${product.slug}`} className="relative block aspect-square overflow-hidden bg-store-soft">
        <ProductImage
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {product.discountPct > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-store-brand px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-store-brand-fg">
            -{product.discountPct}%
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-store-fg/75 py-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-white">
            Out of stock
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {product.brand && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-store-muted">{product.brand}</span>
        )}
        <Link
          to={`${base}/product/${product.slug}`}
          className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-store-fg transition hover:text-store-brand"
        >
          {product.name}
        </Link>

        <div className="mt-auto pt-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-display text-base font-extrabold text-store-brand">
              {formatMoney(product.price, currency)}
            </span>
            {product.compareAtPrice && (
              <span className="text-xs text-store-muted line-through">
                {formatMoney(product.compareAtPrice, currency)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!product.inStock}
            onClick={() => {
              cart.add(product.id, 1);
              cart.open();
            }}
            className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
              product.inStock
                ? inCart
                  ? "bg-store-brand/10 text-store-brand hover:bg-store-brand/20"
                  : "bg-store-brand text-store-brand-fg hover:opacity-90"
                : "cursor-not-allowed bg-store-soft text-store-muted"
            }`}
          >
            {product.inStock ? (
              inCart ? (
                <>
                  <Check size={14} /> In cart — add more
                </>
              ) : (
                <>
                  <Plus size={14} /> Add to cart
                </>
              )
            ) : (
              "Unavailable"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
