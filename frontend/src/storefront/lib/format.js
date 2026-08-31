const numberFormat = new Intl.NumberFormat("en-RW");

export function formatMoney(amount, currency = "RWF") {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  return `${numberFormat.format(Math.round(Number(amount)))} ${currency}`;
}

export function formatCount(value) {
  return numberFormat.format(Number(value) || 0);
}

// Builds a wa.me link with a pre-filled message. Returns null when the shop has
// no WhatsApp number so callers can hide the entry point entirely.
export function whatsappLink(phone, message) {
  const digits = String(phone || "").replace(/[^\d]/g, "");
  if (digits.length < 9) return null;
  const suffix = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${suffix}`;
}

export function telLink(phone) {
  const cleaned = String(phone || "").replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
}

// A complete order the merchant can read and act on in one WhatsApp message.
// Many Rwandan SMEs close sales entirely in chat, so this has to stand alone:
// reference, who is buying, where it goes, every line, and the total.
export function orderManifest({
  store, lines, subtotal, delivery, customer = {}, reference = null, currency = "RWF",
}) {
  const money = (value) => formatMoney(value, currency);
  const parts = [];

  parts.push(reference ? `*Order ${reference}*` : "*New order*");
  if (store?.name) parts.push(`Shop: ${store.name}`);
  parts.push("");

  parts.push("*Items*");
  lines.forEach((line, index) => {
    parts.push(`${index + 1}. ${line.name} × ${line.quantity} — ${money(line.lineTotal)}`);
  });

  parts.push("");
  parts.push(`Subtotal: ${money(subtotal)}`);
  if (delivery?.fulfillment === "pickup") {
    parts.push("Collection: I will pick up from the shop");
  } else {
    parts.push(`Delivery${delivery?.zone ? ` (${delivery.zone})` : ""}: ${delivery?.fee ? money(delivery.fee) : "Free"}`);
  }
  parts.push(`*Total: ${money(subtotal + (delivery?.fee || 0))}*`);

  parts.push("");
  parts.push("*My details*");
  if (customer.name) parts.push(`Name: ${customer.name}`);
  if (customer.phone) parts.push(`Phone: ${customer.phone}`);
  if (delivery?.fulfillment !== "pickup" && customer.address) parts.push(`Address: ${customer.address}`);
  if (customer.note) parts.push(`Note: ${customer.note}`);

  return parts.join("\n");
}
