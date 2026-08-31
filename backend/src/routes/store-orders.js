// Website order inbox. Orders arrive unauthenticated through /api/shop/:slug/orders;
// this is where the SME reads and works through them from the dashboard.

const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit } = require("../utils/helpers");
const { ensureStoreColumns } = require("../utils/storefront");

const STATUSES = ["pending", "confirmed", "fulfilled", "cancelled"];

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
              delivery_note, items, total_amount, status, source, created_at
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

router.put("/:id/status", requireRole("admin", "sme_owner", "pulse_admin", "manager"), async (req, res, next) => {
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

module.exports = router;
