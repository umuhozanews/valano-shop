import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { useStore } from "../StoreContext";
import { EmptyState, ProductImage } from "../components/Bits";
import StoreSeo from "../components/StoreSeo";
import { formatMoney, telLink, whatsappLink } from "../lib/format";
import { placeStoreOrder } from "../lib/storeApi";

const FIELD_CLASS =
  "w-full rounded-xl border border-store-line bg-store-card px-4 py-2.5 text-sm text-store-fg outline-none transition placeholder:text-store-muted focus:border-store-brand/50 focus:ring-2 focus:ring-store-brand/20";

function Confirmation({ order }) {
  const { store, base, currency } = useStore();
  const waHref = whatsappLink(
    store.whatsapp,
    `Hello ${store.name}, I just placed order ${order.reference} on your website.`
  );

  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <CheckCircle2 size={56} className="mx-auto text-store-brand" aria-hidden="true" />
      <h1 className="font-display mt-5 text-2xl font-extrabold tracking-tight text-store-fg md:text-3xl">
        Order received
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-store-muted">
        Thank you. {store.name} has your order and will contact you shortly to confirm payment and delivery.
      </p>

      <div className="mt-6 rounded-2xl bg-store-soft p-5 text-left ring-1 ring-store-line/60">
        <div className="flex items-center justify-between border-b border-store-line pb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-store-muted">Reference</span>
          <span className="font-display text-base font-extrabold text-store-brand">{order.reference}</span>
        </div>
        <ul className="mt-3 space-y-2">
          {order.items.map((line) => (
            <li key={line.itemId} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0 text-store-fg">
                {line.name}
                <span className="text-store-muted"> × {line.quantity}</span>
              </span>
              <span className="shrink-0 font-semibold text-store-fg">{formatMoney(line.lineTotal, currency)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-store-line pt-3">
          <span className="text-sm font-semibold text-store-fg">Total</span>
          <span className="font-display text-lg font-extrabold text-store-brand">
            {formatMoney(order.total, currency)}
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-store-brand px-6 py-2.5 text-sm font-bold text-store-brand-fg transition hover:opacity-90"
          >
            Confirm on WhatsApp
          </a>
        )}
        <Link
          to={`${base}/category/all`}
          className="rounded-full border border-store-brand px-6 py-2.5 text-sm font-bold text-store-brand transition hover:bg-store-brand/5"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

export default function StoreCheckout() {
  const { store, slug, base, cart, currency } = useStore();
  const [form, setForm] = useState({ customerName: "", customerPhone: "", customerEmail: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setError(null);

    if (form.customerName.trim().length < 2) return setError("Please enter your full name.");
    if (form.customerPhone.replace(/[^\d]/g, "").length < 9) return setError("Please enter a valid phone number.");
    if (!cart.lines.length) return setError("Your cart is empty.");

    setSubmitting(true);
    try {
      const result = await placeStoreOrder(slug, {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim() || undefined,
        note: form.note.trim() || undefined,
        items: cart.lines.map((line) => ({ id: line.id, quantity: line.quantity })),
      });
      cart.clear();
      setOrder(result);
    } catch (err) {
      setError(err.message || "We could not place your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (order) {
    return (
      <>
        <StoreSeo store={store} title="Order confirmed" />
        <Confirmation order={order} />
      </>
    );
  }

  if (!cart.lines.length) {
    return (
      <>
        <StoreSeo store={store} title="Checkout" />
        <div className="py-10">
          <EmptyState
            icon="🛍️"
            title="Your cart is empty"
            message="Add products to your cart and come back here to place your order."
            action={
              <Link
                to={`${base}/category/all`}
                className="rounded-full bg-store-brand px-6 py-2.5 text-sm font-semibold text-store-brand-fg transition hover:opacity-90"
              >
                Browse products
              </Link>
            }
          />
        </div>
      </>
    );
  }

  const phoneHref = telLink(store.phone);

  return (
    <>
      <StoreSeo store={store} title="Checkout" />

      <h1 className="font-display pt-2 text-2xl font-extrabold tracking-tight text-store-fg md:text-3xl">Checkout</h1>
      <p className="mt-2 text-sm text-store-muted">
        Leave your details and {store.name} will contact you to confirm payment and delivery. No online payment is
        needed now.
      </p>

      <div className="mt-8 mb-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <form onSubmit={submit} className="rounded-2xl bg-store-card p-6 ring-1 ring-store-line/70">
          <h2 className="font-display text-base font-bold text-store-fg">Your details</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="customerName" className="mb-1.5 block text-xs font-semibold text-store-fg">
                Full name <span className="text-store-brand">*</span>
              </label>
              <input id="customerName" value={form.customerName} onChange={update("customerName")} required
                autoComplete="name" placeholder="e.g. Aline Uwase" className={FIELD_CLASS} />
            </div>

            <div>
              <label htmlFor="customerPhone" className="mb-1.5 block text-xs font-semibold text-store-fg">
                Phone number <span className="text-store-brand">*</span>
              </label>
              <input id="customerPhone" value={form.customerPhone} onChange={update("customerPhone")} required
                type="tel" autoComplete="tel" placeholder="07xx xxx xxx" className={FIELD_CLASS} />
            </div>

            <div>
              <label htmlFor="customerEmail" className="mb-1.5 block text-xs font-semibold text-store-fg">
                Email <span className="font-normal text-store-muted">(optional)</span>
              </label>
              <input id="customerEmail" value={form.customerEmail} onChange={update("customerEmail")}
                type="email" autoComplete="email" placeholder="you@example.com" className={FIELD_CLASS} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="note" className="mb-1.5 block text-xs font-semibold text-store-fg">
                Delivery address or note <span className="font-normal text-store-muted">(optional)</span>
              </label>
              <textarea id="note" value={form.note} onChange={update("note")} rows={3}
                placeholder="Where should we deliver? Any special instructions?" className={FIELD_CLASS} />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-store-brand px-6 py-3 text-sm font-bold text-store-brand-fg transition hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Sending order…
              </>
            ) : (
              `Place order · ${formatMoney(cart.total, currency)}`
            )}
          </button>

          {phoneHref && (
            <p className="mt-3 text-center text-xs text-store-muted">
              Prefer to talk first? Call <a href={phoneHref} className="font-semibold text-store-brand hover:underline">{store.phone}</a>
            </p>
          )}
        </form>

        <aside className="h-fit rounded-2xl bg-store-soft p-6 ring-1 ring-store-line/60">
          <h2 className="font-display text-base font-bold text-store-fg">Order summary</h2>

          <ul className="mt-4 divide-y divide-store-line">
            {cart.lines.map((line) => (
              <li key={line.id} className="flex gap-3 py-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-store-card">
                  <ProductImage src={line.image} alt={line.name} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold text-store-fg">{line.name}</p>
                  <p className="mt-0.5 text-xs text-store-muted">{formatMoney(line.price, currency)} each</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex items-center rounded-full border border-store-line bg-store-card">
                      <button type="button" onClick={() => cart.setQuantity(line.id, line.quantity - 1)}
                        aria-label={`Reduce ${line.name}`}
                        className="grid h-6 w-6 place-items-center rounded-full text-store-muted hover:text-store-brand">
                        <Minus size={12} />
                      </button>
                      <span className="w-7 text-center text-xs font-bold text-store-fg">{line.quantity}</span>
                      <button type="button" onClick={() => cart.setQuantity(line.id, line.quantity + 1)}
                        aria-label={`Add another ${line.name}`}
                        className="grid h-6 w-6 place-items-center rounded-full text-store-muted hover:text-store-brand">
                        <Plus size={12} />
                      </button>
                    </div>
                    <button type="button" onClick={() => cart.remove(line.id)} aria-label={`Remove ${line.name}`}
                      className="rounded-full p-1 text-store-muted transition hover:text-red-600">
                      <Trash2 size={13} />
                    </button>
                    <span className="ml-auto text-sm font-bold text-store-brand">
                      {formatMoney(line.lineTotal, currency)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between border-t border-store-line pt-4">
            <span className="text-sm font-semibold text-store-fg">Total</span>
            <span className="font-display text-xl font-extrabold text-store-brand">
              {formatMoney(cart.total, currency)}
            </span>
          </div>
          <p className="mt-2 text-xs text-store-muted">{store.deliveryNote}</p>
        </aside>
      </div>
    </>
  );
}
