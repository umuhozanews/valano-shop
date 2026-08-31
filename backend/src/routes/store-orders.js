// Website order inbox. Orders arrive unauthenticated through /api/shop/:slug/orders;
// this is where the SME reads and works through them from the dashboard.

const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit, generateInvoiceNumber, notifyAdminsAndManagers } = require("../utils/helpers");
const { journalForSale } = require("../utils/journal");
const { ensureStoreColumns, parseJsonColumn } = require("../utils/storefront");

const STATUSES = ["pending", "confirmed", "shipped", "fulfilled", "cancelled"];
const PAYMENT_METHODS = ["cash", "mtn_momo", "airtel", "card", "bank_transfer", "credit"];
const FULFIL_ROLES = ["admin", "sme_owner", "pulse_admin", "manager"];

router.use(verifyToken);

// Admins have no owner scope and are allowed to look across every SME; everyone
// else is pinned to their own business.
function ownerScope(req) {
  const ownerId = req.ownerId || (req.user.role === "sme_owner" ? req.user.id : null);
  if (ownerId) return { ownerId, all: false };
  if (["pulse_admin", "admin"].includes(req.user.role)) return { ownerId: null, all: true };
  return { ownerId: null, all: false };
}

router.get("/", async (req, res, next) => {
  try {
    await ensureStoreColumns();
    const { ownerId, all } = ownerScope(req);
    if (!ownerId && !all) return res.json({ data: [], total: 0, summary: {} });

    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const offset = (page - 1) * limit;

    const filters = [];
    const params = [];
    if (ownerId) {
      params.push(ownerId);
      filters.push(`owner_id = $${params.length}`);
    }
    if (STATUSES.includes(req.query.status)) {
      params.push(req.query.status);
      filters.push(`status = $${params.length}`);
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT id, reference, customer_name, customer_phone, customer_email,
              delivery_note, items, total_amount, status, source, created_at,
              fulfillment, delivery_address, delivery_zone, delivery_fee,
              sale_id, fulfilled_at
         FROM store_orders
         ${where}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    // Counts are scoped to the owner but never to the status filter, so the tabs
    // keep showing the full picture while a single status is being viewed.
    const scopeParams = ownerId ? [ownerId] : [];
    const scopeWhere = ownerId ? "WHERE owner_id = $1" : "";
    const { rows: [counts] } = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'pending')::int   AS pending,
              COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
              COUNT(*) FILTER (WHERE status = 'shipped')::int   AS shipped,
              COUNT(*) FILTER (WHERE status = 'fulfilled')::int AS fulfilled,
              COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
              COALESCE(SUM(total_amount) FILTER (WHERE status <> 'cancelled'), 0)::bigint AS revenue
         FROM store_orders ${scopeWhere}`,
      scopeParams
    );

    res.json({
      data: rows.map((row) => ({ ...row, total_amount: Number(row.total_amount) })),
      total: counts.total,
      page,
      limit,
      summary: { ...counts, revenue: Number(counts.revenue) },
    });
  } catch (err) { next(err); }
});

router.put("/:id/status", requireRole(...FULFIL_ROLES), async (req, res, next) => {
  try {
    await ensureStoreColumns();
    const status = String(req.body?.status || "").toLowerCase();
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(", ")}` });
    }

    const { ownerId, all } = ownerScope(req);
    if (!ownerId && !all) return res.status(403).json({ error: "Not allowed" });

    const params = [status, req.params.id];
    let scope = "";
    if (ownerId) {
      params.push(ownerId);
      scope = ` AND owner_id = $${params.length}`;
    }

    const { rows: [order] } = await pool.query(
      `UPDATE store_orders SET status = $1 WHERE id = $2${scope} RETURNING *`,
      params
    );
    if (!order) return res.status(404).json({ error: "Order not found" });

    await logAudit(req.user.id, "STORE_ORDER_STATUS", "store_orders", order.id, null, { status }, req.ip);
    res.json({ ...order, total_amount: Number(order.total_amount) });
  } catch (err) { next(err); }
});

// POST /:id/convert — accept a website order and turn it into a real sale: deduct
// the physical stock, raise the invoice, and leave the order pointing at the sale
// so the RRA/EBM receipt can be printed for the shopper.
//
// Everything runs on one checked-out client, because BEGIN/COMMIT issued through
// the pool would land on different connections and the FOR UPDATE locks below
// would be released the moment each statement finished.
router.post("/:id/convert", requireRole(...FULFIL_ROLES), async (req, res, next) => {
  let client;
  try {
    await ensureStoreColumns();

    const { ownerId, all } = ownerScope(req);
    if (!ownerId && !all) return res.status(403).json({ error: "Not allowed" });

    const paymentMethod = String(req.body?.payment_method || "cash").toLowerCase();
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ error: `Payment method must be one of: ${PAYMENT_METHODS.join(", ")}` });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const orderParams = [req.params.id];
    let orderScope = "";
    if (ownerId) {
      orderParams.push(ownerId);
      orderScope = ` AND owner_id = $${orderParams.length}`;
    }
    const { rows: [order] } = await client.query(
      `SELECT * FROM store_orders WHERE id = $1${orderScope} FOR UPDATE`,
      orderParams
    );
    if (!order) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found" });
    }

    // Converting twice would deduct the stock twice, so a converted order is a
    // no-op that simply reports the sale it already produced.
    if (order.sale_id) {
      const { rows: [existing] } = await client.query(
        `SELECT s.id, s.total_amount, i.invoice_number
           FROM sales s LEFT JOIN invoices i ON i.sale_id = s.id
          WHERE s.id = $1`,
        [order.sale_id]
      );
      await client.query("COMMIT");
      return res.json({
        already_converted: true,
        order: { ...order, total_amount: Number(order.total_amount) },
        sale: existing ? { ...existing, total_amount: Number(existing.total_amount) } : null,
      });
    }
    if (order.status === "cancelled") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "This order was cancelled and cannot be fulfilled." });
    }

    const targetOwner = order.owner_id || ownerId;
    const lines = parseJsonColumn(order.items, []);
    if (!Array.isArray(lines) || !lines.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "This order has no items to fulfil." });
    }

    // Lock every stock row before touching any of them, and verify the whole
    // basket is available so a partial deduction can never be committed.
    const validated = [];
    for (const line of lines) {
      const quantity = Math.max(1, Math.round(Number(line?.quantity) || 1));
      const itemId = Number(line?.itemId ?? line?.id);
      if (!Number.isInteger(itemId) || itemId <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `"${line?.name || "An item"}" is no longer in your inventory.` });
      }

      const { rows: [stock] } = await client.query(
        `SELECT id, name, quantity, unit, low_stock_threshold
           FROM stock_items
          WHERE id = $1 AND (owner_id = $2 OR owner_id IS NULL) AND is_active = true
          FOR UPDATE`,
        [itemId, targetOwner]
      );
      if (!stock) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `"${line?.name || "An item"}" is no longer in your inventory.` });
      }

      const available = Number(stock.quantity) || 0;
      if (available < quantity) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          error: `Not enough stock for "${stock.name}". You have ${available} ${stock.unit || "units"} but the order needs ${quantity}.`,
          code: "INSUFFICIENT_STOCK",
        });
      }

      // The shopper was quoted this price on the website, so the sale honours it
      // even if the shelf price has moved since the order was placed.
      const unitPrice = Math.max(0, Math.round(Number(line?.unitPrice) || 0));
      validated.push({ stock, quantity, unitPrice, subtotal: unitPrice * quantity });
    }

    const goodsTotal = validated.reduce((sum, line) => sum + line.subtotal, 0);

    // Reuse this shopper's customer record so the web order feeds the same CRM
    // history as their walk-in purchases.
    const phone = String(order.customer_phone || "").trim();
    let customerId = null;
    if (phone) {
      const { rows: [match] } = await client.query(
        "SELECT id FROM customers WHERE phone = $1 AND (owner_id = $2 OR owner_id IS NULL) LIMIT 1",
        [phone, targetOwner]
      );
      customerId = match?.id || null;
    }
    if (!customerId) {
      const { rows: [created] } = await client.query(
        `INSERT INTO customers (name, phone, location, owner_id)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [
          String(order.customer_name || "Website customer").slice(0, 100),
          phone.slice(0, 20) || null,
          order.delivery_address ? String(order.delivery_address).slice(0, 500) : order.delivery_zone || null,
          targetOwner,
        ]
      );
      customerId = created.id;
    }

    // A key derived from the order id means the unique index on
    // sales(idempotency_key) rejects a second sale even on a double click.
    const idempotencyKey = `weborder-${order.id}`;
    const { rows: [sale] } = await client.query(
      `INSERT INTO sales (user_id, customer_id, payment_method, total_amount,
                          payment_status, owner_id, idempotency_key, payment_reference)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        req.user.id, customerId, paymentMethod, goodsTotal,
        paymentMethod === "credit" ? "pending" : "completed",
        targetOwner, idempotencyKey, order.reference,
      ]
    );

    const placeholders = validated.map((_, i) => {
      const b = i * 5;
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5})`;
    }).join(",");
    await client.query(
      `INSERT INTO sale_items (sale_id, stock_item_id, quantity, unit_price, subtotal) VALUES ${placeholders}`,
      validated.flatMap((line) => [sale.id, line.stock.id, line.quantity, line.unitPrice, line.subtotal])
    );

    const restocked = [];
    for (const line of validated) {
      const { rows: [updated] } = await client.query(
        `UPDATE stock_items
            SET quantity = quantity - $1, owner_id = COALESCE(owner_id, $3)
          WHERE id = $2
          RETURNING name, quantity, low_stock_threshold`,
        [line.quantity, line.stock.id, targetOwner]
      );
      if (updated) restocked.push(updated);
    }

    const invoiceNumber = generateInvoiceNumber();
    const paid = paymentMethod === "credit" ? 0 : goodsTotal;
    const remaining = goodsTotal - paid;
    await client.query(
      "INSERT INTO invoices (sale_id, invoice_number, status, owner_id) VALUES ($1,$2,$3,$4)",
      [sale.id, invoiceNumber, remaining > 0 ? "pending" : "paid", targetOwner]
    );
    if (remaining > 0) {
      await client.query(
        `INSERT INTO accounts_receivable (customer_id, sale_id, amount, due_date, notes, owner_id)
         VALUES ($1,$2,$3,NULL,$4,$5)`,
        [customerId, sale.id, remaining, `Website order ${order.reference}`, targetOwner]
      );
    }

    const { rows: [fulfilled] } = await client.query(
      `UPDATE store_orders
          SET status = 'fulfilled', sale_id = $1, fulfilled_at = NOW()
        WHERE id = $2
        RETURNING *`,
      [sale.id, order.id]
    );

    await client.query("COMMIT");

    // Side effects that must not be able to roll back a committed sale.
    journalForSale({
      saleId: sale.id, total: goodsTotal, amountPaid: paid,
      paymentMethod, invoiceNumber, createdBy: req.user.id,
      saleDate: sale.created_at, ownerId: targetOwner,
    });
    for (const item of restocked) {
      if (Number(item.quantity) === 0) {
        await notifyAdminsAndManagers("OUT_OF_STOCK", "Out of Stock Alert", `${item.name} is out of stock`);
      } else if (Number(item.quantity) <= Number(item.low_stock_threshold)) {
        await notifyAdminsAndManagers("LOW_STOCK", "Low Stock Alert", `${item.name} has only ${item.quantity} left`);
      }
    }
    await logAudit(
      req.user.id, "STORE_ORDER_CONVERTED", "store_orders", order.id,
      null, { sale_id: sale.id, reference: order.reference, total: goodsTotal }, req.ip
    );

    res.status(201).json({
      order: { ...fulfilled, total_amount: Number(fulfilled.total_amount) },
      sale: { ...sale, total_amount: Number(sale.total_amount), invoice_number: invoiceNumber },
      // The sale covers the goods only. A delivery fee is not an inventory line
      // and would appear as a blank row on the EBM receipt, so it stays on the
      // order for the merchant to collect alongside.
      delivery_fee_to_collect: Number(order.delivery_fee) || 0,
      receipt_url: `/api/sales/${sale.id}/receipt-pdf`,
      qr_url: `/api/sales/${sale.id}/qr`,
    });
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    if (client) client.release();
  }
});

module.exports = router;
