// Public storefront API — no authentication. Everything served here is data the
// SME has explicitly chosen to publish: its shop profile and the inventory items
// flagged is_published. Prices are always re-read from the database so a shopper
// cannot influence an order total from the browser.

const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { createRateLimiter } = require("../middleware/security");
const {
  ensureStoreColumns,
  backfillSlugs,
  resolveStore,
  buildStorePayload,
  quoteDelivery,
} = require("../utils/storefront");

const MAX_PRODUCTS = 200;
const MAX_ORDER_LINES = 40;

const orderRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  message: "Too many orders from this device. Please contact the shop directly.",
});

function isOpen(store) {
  return store.store_published !== false;
}

async function loadPublishedProducts(ownerId) {
  const { rows } = await pool.query(
    `SELECT id, name, name_rw, category, brand, unit, description, image_url,
            quantity, sell_price_rwf, compare_price_rwf, is_featured
       FROM stock_items
      WHERE owner_id = $1
        AND is_active = true
        AND COALESCE(is_published, true) = true
        AND sell_price_rwf > 0
      ORDER BY is_featured DESC NULLS LAST, quantity > 0 DESC, name ASC
      LIMIT ${MAX_PRODUCTS}`,
    [ownerId]
  );
  return rows;
}

// GET /api/shop/:slug — everything needed to render the storefront in one call
router.get("/:slug", async (req, res, next) => {
  try {
    await ensureStoreColumns();
    await backfillSlugs();

    const store = await resolveStore(req.params.slug);
    if (!store || !store.owner_id) {
      return res.status(404).json({ error: "Store not found", code: "STORE_NOT_FOUND" });
    }
    if (!isOpen(store)) {
      return res.status(404).json({ error: "This store is not published yet", code: "STORE_UNPUBLISHED" });
    }

    const products = await loadPublishedProducts(store.owner_id);
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json(buildStorePayload(store, products));
  } catch (err) { next(err); }
});

// POST /api/shop/:slug/orders — a shopper places an order on the public website
router.post("/:slug/orders", orderRateLimiter, async (req, res, next) => {
  try {
    await ensureStoreColumns();

    const store = await resolveStore(req.params.slug);
    if (!store || !store.owner_id || !isOpen(store)) {
      return res.status(404).json({ error: "Store not found", code: "STORE_NOT_FOUND" });
    }

    const {
      customerName, customerPhone, customerEmail, note, items,
      fulfillment, deliveryZone, deliveryAddress,
    } = req.body || {};
    const name = String(customerName || "").trim();
    const phone = String(customerPhone || "").trim();
    const wantsPickup = String(fulfillment || "delivery").toLowerCase() === "pickup";
    const address = String(deliveryAddress || "").trim();

    if (name.length < 2) return res.status(400).json({ error: "Please enter your name" });
    if (phone.replace(/[^\d]/g, "").length < 9) return res.status(400).json({ error: "Please enter a valid phone number" });
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "Your cart is empty" });
    if (items.length > MAX_ORDER_LINES) return res.status(400).json({ error: "Too many items in one order" });
    if (!wantsPickup && address.length < 5) {
      return res.status(400).json({ error: "Please tell us where to deliver (street, house or landmark)" });
    }

    // Collapse the request into id → quantity so duplicate lines cannot be used
    // to bypass the line limit, then price everything from the database.
    const requested = new Map();
    for (const line of items) {
      const id = Number(line?.id);
      const qty = Math.max(1, Math.min(999, Math.floor(Number(line?.quantity) || 1)));
      if (!Number.isInteger(id) || id <= 0) continue;
      requested.set(id, (requested.get(id) || 0) + qty);
    }
    if (!requested.size) return res.status(400).json({ error: "Your cart is empty" });

    const { rows: priced } = await pool.query(
      `SELECT id, name, unit, sell_price_rwf
         FROM stock_items
        WHERE owner_id = $1
          AND id = ANY($2::int[])
          AND is_active = true
          AND COALESCE(is_published, true) = true
          AND sell_price_rwf > 0`,
      [store.owner_id, [...requested.keys()]]
    );
    if (!priced.length) {
      return res.status(400).json({ error: "None of these items are available anymore" });
    }

    const orderLines = priced.map((row) => {
      const quantity = requested.get(row.id);
      const unitPrice = Number(row.sell_price_rwf) || 0;
      return {
        itemId: row.id,
        name: row.name,
        unit: row.unit || "pcs",
        quantity,
        unitPrice,
        lineTotal: unitPrice * quantity,
      };
    });
    const subtotal = orderLines.reduce((sum, line) => sum + line.lineTotal, 0);

    // The browser sends a zone name only. The fee — and therefore the total the
    // shopper owes — is decided here from the SME's own configuration.
    const delivery = quoteDelivery(store, {
      subtotal,
      fulfillment: wantsPickup ? "pickup" : "delivery",
      zone: deliveryZone,
    });
    const total = subtotal + delivery.fee;
    const reference = `WEB-${Date.now().toString(36).toUpperCase()}`;

    const { rows: [order] } = await pool.query(
      `INSERT INTO store_orders
         (owner_id, reference, customer_name, customer_phone, customer_email,
          delivery_note, items, total_amount, status, source,
          fulfillment, delivery_address, delivery_zone, delivery_fee)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,'pending','website',$9,$10,$11,$12)
       RETURNING id, reference, total_amount, created_at`,
      [
        store.owner_id,
        reference,
        name.slice(0, 120),
        phone.slice(0, 30),
        customerEmail ? String(customerEmail).trim().toLowerCase().slice(0, 120) : null,
        note ? String(note).slice(0, 1000) : null,
        JSON.stringify(orderLines),
        total,
        delivery.fulfillment,
        delivery.fulfillment === "pickup" ? null : address.slice(0, 500),
        delivery.zone,
        delivery.fee,
      ]
    );

    await pool.query(
      `INSERT INTO notifications (user_id, owner_id, type, title, message)
       VALUES ($1,$1,'website_order',$2,$3)`,
      [
        store.owner_id,
        `New website order ${reference}`,
        `${name} (${phone}) ordered ${orderLines.length} item(s) worth ${total.toLocaleString("en-RW")} RWF` +
          `${delivery.fulfillment === "pickup" ? " for pickup" : ` for delivery to ${delivery.zone || address}`}.`,
      ]
    ).catch(() => {});

    res.status(201).json({
      reference: order.reference,
      subtotal,
      delivery,
      total: Number(order.total_amount),
      itemCount: orderLines.length,
      items: orderLines,
      createdAt: order.created_at,
    });
  } catch (err) { next(err); }
});

module.exports = router;
