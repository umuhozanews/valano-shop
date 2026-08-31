import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, MapPin, Minus, Plus, Store as StoreIcon, Trash2, Truck } from "lucide-react";
import { useStore } from "../StoreContext";
import { EmptyState, ProductImage } from "../components/Bits";
import StoreSeo from "../components/StoreSeo";
import { formatMoney, orderManifest, telLink, whatsappLink } from "../lib/format";
import { amountToFreeDelivery } from "../lib/delivery";
import { placeStoreOrder } from "../lib/storeApi";

const FIELD_CLASS =
  "w-full rounded-xl border border-store-line bg-store-card px-4 py-2.5 text-sm text-store-fg outline-none transition placeholder:text-store-muted focus:border-store-brand/50 focus:ring-2 focus:ring-store-brand/20";

function Confirmation({ order, customer }) {
  const { store, base, currency } = useStore();
  const waHref = whatsappLink(
    store.whatsapp,
    orderManifest({
      store,
      lines: order.items,
      subtotal: order.subtotal ?? order.total,
      delivery: order.delivery,
      customer,
      reference: order.reference,
      currency,
    })
  );

  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <CheckCircle2 size={56} className="mx-auto text-store-brand" aria-hidden="true" />
      <h1 className="font-display mt-5 text-2xl font-extrabold tracking-tight text-store-fg md:text-3xl">
        Order received
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-store-muted">
        Thank you. {store.name} has your order and will contact you shortly to confirm payment and
        {order.delivery?.fulfillment === "pickup" ? " collection" : " delivery"}.
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

        <div className="mt-3 space-y-1.5 border-t border-store-line pt-3 text-sm">
          <div className="flex items-center justify-between text-store-muted">
            <span>Subtotal</span>
            <span>{formatMoney(order.subtotal ?? order.total, currency)}</span>
          </div>
          <div className="flex items-center justify-between text-store-muted">
            <span>
              {order.delivery?.fulfillment === "pickup"
                ? "Collection from shop"
                : `Delivery${order.delivery?.zone ? ` — ${order.delivery.zone}` : ""}`}
            </span>
            <span>{order.delivery?.fee ? formatMoney(order.delivery.fee, currency) : "Free"}</span>
          </div>
          <div className="flex items-center justify-between pt-1.5">
            <span className="text-sm font-semibold text-store-fg">Total</span>
            <span className="font-display text-lg font-extrabold text-store-brand">
              {formatMoney(order.total, currency)}
            </span>
          </div>
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
            Send details on WhatsApp
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

// Delivery or collection, then the area. Fees come from the shop's own settings
// and are confirmed by the server when the order is placed.
function FulfillmentPicker({ delivery, currency }) {
  const options = [
    { id: "delivery", label: "Deliver to me", icon: Truck },
    ...(delivery.pickupAvailable ? [{ id: "pickup", label: "I will collect", icon: StoreIcon }] : []),
  ];

  return (
    <>
      <div className={`grid gap-3 ${options.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {options.map((option) => {
          const Icon = option.icon;
          const active = delivery.fulfillment === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => delivery.setFulfillment(option.id)}
              aria-pressed={active}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                active
                  ? "border-store-brand bg-store-brand/5 ring-1 ring-store-brand/30"
                  : "border-store-line bg-store-card hover:border-store-brand/40"
              }`}
            >
              <Icon size={18} className={active ? "text-store-brand" : "text-store-muted"} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-store-fg">{option.label}</span>
                <span className="block text-xs text-store-muted">
                  {option.id === "pickup" ? "No delivery fee" : "Fee depends on your area"}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {delivery.fulfillment === "delivery" && delivery.zones.length > 0 && (
        <div className="mt-4">
          <label htmlFor="deliveryZone" className="mb-1.5 block text-xs font-semibold text-store-fg">
            Delivery area <span className="text-store-brand">*</span>
          </label>
          <select
            id="deliveryZone"
            value={delivery.zone || ""}
            onChange={(event) => delivery.setZone(event.target.value)}
            className={FIELD_CLASS}
          >
            {delivery.zones.map((zone) => (
              <option key={zone.name} value={zone.name}>
                {zone.name} — {zone.fee ? formatMoney(zone.fee, currency) : "Free"}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}

export default function StoreCheckout() {
  const { store, slug, base, cart, currency, delivery } = useStore();
  const [form, setForm] = useState({
    customerName: "", customerPhone: "", customerEmail: "", address: "", note: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);

  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const isPickup = delivery.fulfillment === "pickup";
  const shortfall = isPickup ? null : amountToFreeDelivery(store, cart.subtotal);

  function validate() {
    if (form.customerName.trim().length < 2) return "Please enter your full name.";
    if (form.customerPhone.replace(/[^\d]/g, "").length < 9) return "Please enter a valid phone number.";
    if (!isPickup && form.address.trim().length < 5) {
      return "Please tell us where to deliver — a street, house number or landmark.";
    }
    if (!cart.lines.length) return "Your cart is empty.";
    return null;
  }

  async function submit(event) {
    event.preventDefault();
    const problem = validate();
    if (problem) return setError(problem);

    setError(null);
    setSubmitting(true);
    try {
      const result = await placeStoreOrder(slug, {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim() || undefined,
        note: form.note.trim() || undefined,
        fulfillment: delivery.fulfillment,
        deliveryZone: isPickup ? undefined : delivery.zone || undefined,
        deliveryAddress: isPickup ? undefined : form.address.trim(),
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
        <Confirmation
          order={order}
          customer={{
            name: form.customerName.trim(),
            phone: form.customerPhone.trim(),
            address: form.address.trim(),
            note: form.note.trim(),
          }}
        />
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

  // Some shoppers would rather finish the whole thing in chat, so the same order
  // can be sent as one readable WhatsApp message instead of a web order.
  const waHref = whatsappLink(
    store.whatsapp,
    orderManifest({
      store,
      lines: cart.lines,
      subtotal: cart.subtotal,
      delivery,
      customer: {
        name: form.customerName.trim(),
        phone: form.customerPhone.trim(),
        address: form.address.trim(),
        note: form.note.trim(),
      },
      currency,
    })
  );

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
          <h2 className="font-display text-base font-bold text-store-fg">How would you like it?</h2>
          <div className="mt-4">
            <FulfillmentPicker delivery={delivery} currency={currency} />
          </div>

          <h2 className="font-display mt-7 border-t border-store-line pt-6 text-base font-bold text-store-fg">
            Your details
          </h2>

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

            {!isPickup && (
              <div className="sm:col-span-2">
                <label htmlFor="address" className="mb-1.5 block text-xs font-semibold text-store-fg">
                  Delivery address <span className="text-store-brand">*</span>
                </label>
                <input id="address" value={form.address} onChange={update("address")} required
                  autoComplete="street-address" placeholder="Street, house number or nearest landmark"
                  className={FIELD_CLASS} />
              </div>
            )}

            <div className="sm:col-span-2">
              <label htmlFor="note" className="mb-1.5 block text-xs font-semibold text-store-fg">
                Note for the shop <span className="font-normal text-store-muted">(optional)</span>
              </label>
              <textarea id="note" value={form.note} onChange={update("note")} rows={3}
                placeholder="Anything else we should know?" className={FIELD_CLASS} />
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
              `Place order · ${formatMoney(cart.grandTotal, currency)}`
            )}
          </button>

          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => {
                const problem = validate();
                if (problem) {
                  event.preventDefault();
                  setError(problem);
                }
              }}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-store-brand px-6 py-3 text-sm font-bold text-store-brand transition hover:bg-store-brand/5"
            >
              Or send this order on WhatsApp
            </a>
          )}

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

          <div className="mt-4 space-y-2 border-t border-store-line pt-4 text-sm">
            <div className="flex items-center justify-between text-store-muted">
              <span>Subtotal</span>
              <span className="font-medium text-store-fg">{formatMoney(cart.subtotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-store-muted">
              <span className="flex min-w-0 items-center gap-1.5">
                {isPickup ? <StoreIcon size={13} aria-hidden="true" /> : <MapPin size={13} aria-hidden="true" />}
                <span className="truncate">
                  {isPickup ? "Collection" : delivery.zone || "Delivery"}
                </span>
              </span>
              <span className={`font-medium ${delivery.fee ? "text-store-fg" : "text-store-brand"}`}>
                {delivery.fee ? formatMoney(delivery.fee, currency) : "Free"}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-store-line pt-3">
              <span className="text-sm font-semibold text-store-fg">Total</span>
              <span className="font-display text-xl font-extrabold text-store-brand">
                {formatMoney(cart.grandTotal, currency)}
              </span>
            </div>
          </div>

          {shortfall != null && (
            <p className="mt-3 rounded-xl bg-store-brand/10 px-3 py-2.5 text-xs font-medium text-store-brand">
              Add {formatMoney(shortfall, currency)} more to get free delivery.
            </p>
          )}
          {delivery.freeApplied && !isPickup && (
            <p className="mt-3 rounded-xl bg-store-brand/10 px-3 py-2.5 text-xs font-semibold text-store-brand">
              You have earned free delivery on this order.
            </p>
          )}

          <p className="mt-3 text-xs text-store-muted">{store.deliveryNote}</p>
        </aside>
      </div>
    </>
  );
}
