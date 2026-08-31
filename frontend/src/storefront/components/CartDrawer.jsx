import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useStore } from "../StoreContext";
import { formatMoney } from "../lib/format";
import { amountToFreeDelivery } from "../lib/delivery";
import { ProductImage } from "./Bits";

export default function CartDrawer() {
  const { cart, currency, base, store, delivery } = useStore();
  const shortfall = amountToFreeDelivery(store, cart.subtotal);

  useEffect(() => {
    if (!cart.isOpen) return undefined;
    const onKeyDown = (event) => event.key === "Escape" && cart.close();
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [cart.isOpen, cart.close]);

  if (!cart.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button type="button" aria-label="Close cart" onClick={cart.close} className="absolute inset-0 bg-store-fg/40 backdrop-blur-sm" />

      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-store-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-store-line px-5 py-4">
          <h2 className="font-display flex items-center gap-2 text-base font-bold text-store-fg">
            <ShoppingBag size={18} className="text-store-brand" />
            Your Cart
            {cart.itemCount > 0 && <span className="text-sm font-normal text-store-muted">({cart.itemCount})</span>}
          </h2>
          <button
            type="button"
            onClick={cart.close}
            aria-label="Close cart"
            className="rounded-full p-2 text-store-muted transition hover:bg-store-soft hover:text-store-fg"
          >
            <X size={18} />
          </button>
        </div>

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="text-5xl">🛍️</span>
            <p className="text-base font-semibold text-store-fg">Your cart is empty</p>
            <p className="text-sm text-store-muted">Add a few products and they will show up here.</p>
            <Link
              to={`${base}/category/all`}
              onClick={cart.close}
              className="mt-2 rounded-full bg-store-brand px-6 py-2.5 text-sm font-semibold text-store-brand-fg transition hover:opacity-90"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 divide-y divide-store-line overflow-y-auto px-5">
              {cart.lines.map((line) => (
                <div key={line.id} className="flex gap-3 py-4">
                  <Link to={`${base}/product/${line.slug}`} onClick={cart.close} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-store-soft">
                    <ProductImage src={line.image} alt={line.name} className="h-full w-full object-cover" />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`${base}/product/${line.slug}`}
                      onClick={cart.close}
                      className="line-clamp-2 text-sm font-semibold text-store-fg hover:text-store-brand"
                    >
                      {line.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-store-muted">
                      {formatMoney(line.price, currency)} / {line.unit}
                    </p>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-full border border-store-line">
                        <button
                          type="button"
                          onClick={() => cart.setQuantity(line.id, line.quantity - 1)}
                          aria-label={`Reduce ${line.name}`}
                          className="grid h-7 w-7 place-items-center rounded-full text-store-muted transition hover:text-store-brand"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-store-fg">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => cart.setQuantity(line.id, line.quantity + 1)}
                          aria-label={`Add another ${line.name}`}
                          className="grid h-7 w-7 place-items-center rounded-full text-store-muted transition hover:text-store-brand"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <span className="text-sm font-bold text-store-brand">{formatMoney(line.lineTotal, currency)}</span>

                      <button
                        type="button"
                        onClick={() => cart.remove(line.id)}
                        aria-label={`Remove ${line.name}`}
                        className="rounded-full p-1.5 text-store-muted transition hover:bg-store-soft hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-store-line px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-store-muted">Subtotal</span>
                <span className="font-display text-lg font-extrabold text-store-brand">
                  {formatMoney(cart.total, currency)}
                </span>
              </div>
              {shortfall != null ? (
                <p className="mt-2 rounded-xl bg-store-brand/10 px-3 py-2 text-xs font-medium text-store-brand">
                  Add {formatMoney(shortfall, currency)} more to get free delivery.
                </p>
              ) : (
                <p className="mt-1 text-xs text-store-muted">
                  {delivery.freeApplied
                    ? "Free delivery applies to this order."
                    : "Delivery is calculated at checkout."}
                </p>
              )}
              <Link
                to={`${base}/checkout`}
                onClick={cart.close}
                className="mt-4 flex w-full items-center justify-center rounded-full bg-store-brand px-6 py-3 text-sm font-bold text-store-brand-fg transition hover:opacity-90"
              >
                Continue to checkout
              </Link>
              <button
                type="button"
                onClick={cart.clear}
                className="mt-2 w-full rounded-full px-6 py-2 text-xs font-semibold text-store-muted transition hover:text-store-fg"
              >
                Clear cart
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
