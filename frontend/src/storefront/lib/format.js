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
