// Client-side mirror of the backend's delivery pricing, used only to show the
// shopper what they will be charged. The figure that counts is recomputed by
// quoteDelivery() in backend/src/utils/storefront.js when the order is written,
// so a tampered fee here changes nothing — it would just disagree with the
// confirmation the server returns. Keep the two in step.

const FALLBACK_FEE = 1500;

function toInt(value, fallback = 0) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

export function deliveryConfig(store) {
  const config = store?.delivery || {};
  return {
    fee: Math.max(0, toInt(config.fee, FALLBACK_FEE)),
    freeOver: Math.max(0, toInt(config.freeOver)),
    zones: Array.isArray(config.zones)
      ? config.zones
          .filter((zone) => zone && zone.name)
          .map((zone) => ({ name: String(zone.name), fee: Math.max(0, toInt(zone.fee)) }))
      : [],
    pickupAvailable: config.pickupAvailable !== false,
  };
}

export function quoteDelivery(store, { subtotal = 0, fulfillment = "delivery", zone = null } = {}) {
  const config = deliveryConfig(store);

  // The config is spread first so the resolved fee below always wins over the
  // shop's flat `fee`.
  if (fulfillment === "pickup" && config.pickupAvailable) {
    return { ...config, fulfillment: "pickup", zone: null, fee: 0, freeApplied: false };
  }

  const matched = config.zones.find((entry) => entry.name === zone) || null;
  const fee = matched ? matched.fee : config.fee;
  const freeApplied = config.freeOver > 0 && toInt(subtotal) >= config.freeOver;

  return {
    ...config,
    fulfillment: "delivery",
    zone: matched ? matched.name : null,
    fee: freeApplied ? 0 : fee,
    freeApplied,
  };
}

// How much more the shopper must add to stop paying for delivery. Returns null
// when free delivery is switched off or already earned, so callers can simply
// check for a value before nudging.
export function amountToFreeDelivery(store, subtotal) {
  const { freeOver } = deliveryConfig(store);
  if (freeOver <= 0) return null;
  const remaining = freeOver - toInt(subtotal);
  return remaining > 0 ? remaining : null;
}
