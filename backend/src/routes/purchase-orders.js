const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit, paginate } = require("../utils/helpers");
const { ensureTenantColumns, addOwnerFilter } = require("../utils/tenant");

router.use(verifyToken, requireRole("admin", "sme_owner", "manager", "accountant", "pulse_admin"));

const STATUS_FLOW = ["draft", "ordered", "in_transit", "arrived", "received", "stocked"];

// GET /api/purchase-orders — List purchase orders
router.get("/", async (req, res, next) => {
  try {
    await ensureTenantColumns();
    const { page, limit, status, supplier_id } = req.query;
    const { limit: lim, offset } = paginate(page, limit);
    const conds = ["1=1"]; const params = [];
    if (status) {
      if (status === "received" || status === "arrived") {
        params.push("arrived"); params.push("received");
        conds.push(`(po.status = $${params.length - 1} OR po.status = $${params.length})`);
      } else {
        params.push(status);
        conds.push(`po.status = $${params.length}`);
      }
    }
    if (supplier_id) {
      params.push(supplier_id);
      conds.push(`po.supplier_id = $${params.length}`);
    }
    addOwnerFilter(conds, params, req.ownerId, 'po');
    params.push(lim); params.push(offset);

    const [data, cnt] = await Promise.all([
      pool.query(
        `SELECT po.*,
                s.name as supplier_name,
                s.phone as supplier_phone,
                s.email as supplier_email,
                (SELECT COUNT(*) FROM purchase_order_items i WHERE i.order_id = po.id) as items_count,
                (SELECT COALESCE(SUM(i.quantity * i.unit_cost_rwf), 0) FROM purchase_order_items i WHERE i.order_id = po.id) as total_cost_rwf,
                COALESCE(
                  (SELECT json_agg(json_build_object(
                    'id', i.id,
                    'stock_item_id', i.stock_item_id,
                    'item_name', i.item_name,
                    'quantity', i.quantity,
                    'unit_cost_rwf', i.unit_cost_rwf
                  )) FROM purchase_order_items i WHERE i.order_id = po.id),
                  '[]'::json
                ) as items
         FROM purchase_orders po
         LEFT JOIN suppliers s ON s.id = po.supplier_id
         WHERE ${conds.join(" AND ")}
         ORDER BY po.created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) FROM purchase_orders po WHERE ${conds.join(" AND ")}`,
        params.slice(0, -2)
      ),
    ]);
    res.json({ data: data.rows, total: parseInt(cnt.rows[0].count) });
  } catch (err) { next(err); }
});

// GET /api/purchase-orders/:id — Single purchase order with items
router.get("/:id", async (req, res, next) => {
  try {
    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "po.owner_id = $2";
    const queryParams = isAdmin ? [req.params.id] : [req.params.id, req.ownerId];

    const { rows: [order] } = await pool.query(
      `SELECT po.*,
              s.name as supplier_name,
              s.phone as supplier_phone,
              s.email as supplier_email,
              s.address as supplier_address
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id
       WHERE po.id = $1 AND ${ownerWhere}`,
      queryParams
    );
    if (!order) return res.status(404).json({ error: "Purchase order not found" });

    const { rows: items } = await pool.query(
      `SELECT i.*, si.name as stock_item_name, si.unit, si.quantity as current_stock_qty
       FROM purchase_order_items i
       LEFT JOIN stock_items si ON si.id = i.stock_item_id
       WHERE i.order_id = $1`,
      [req.params.id]
    );
    res.json({ ...order, items });
  } catch (err) { next(err); }
});

// POST /api/purchase-orders — Create new purchase order
router.post("/", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { supplier_id, order_date, arrival_date, notes, status = "ordered", items = [] } = req.body;
    if (!supplier_id || !order_date) {
      return res.status(400).json({ error: "supplier_id and order_date are required" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "At least one item line is required for a purchase order." });
    }

    const cleanStatus = STATUS_FLOW.includes(status) ? status : "ordered";

    await client.query("BEGIN");

    const { rows: [order] } = await client.query(
      `INSERT INTO purchase_orders (supplier_id, order_date, arrival_date, notes, status, created_by, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [supplier_id, order_date, arrival_date || null, notes || null, cleanStatus, req.user.id, req.ownerId]
    );

    const insertedItems = [];
    for (const item of items) {
      const qty = parseInt(item.quantity, 10) || 1;
      const unitCost = parseInt(item.unit_cost_rwf, 10) || 0;
      const itemName = String(item.item_name || "").trim() || "Item";

      const { rows: [inserted] } = await client.query(
        `INSERT INTO purchase_order_items (order_id, stock_item_id, item_name, quantity, unit_cost_rwf)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [order.id, item.stock_item_id || null, itemName, qty, unitCost]
      );
      insertedItems.push(inserted);
    }

    // Fetch supplier info for response
    const { rows: [supplier] } = await client.query(
      `SELECT name, phone, email FROM suppliers WHERE id = $1`,
      [supplier_id]
    );

    await client.query("COMMIT");

    await logAudit(
      req.user.id,
      "PO_CREATED",
      "purchase_orders",
      order.id,
      null,
      { supplier_name: supplier?.name, items_count: items.length, status: cleanStatus },
      req.ip
    );

    res.status(201).json({
      ...order,
      supplier_name: supplier?.name,
      supplier_phone: supplier?.phone,
      supplier_email: supplier?.email,
      items: insertedItems
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// PUT /api/purchase-orders/:id/status — Advance PO status with atomic stocking
router.put("/:id/status", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { status } = req.body;
    if (!STATUS_FLOW.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${STATUS_FLOW.join(", ")}` });
    }

    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "owner_id = $2";
    const lockParams = isAdmin ? [req.params.id] : [req.params.id, req.ownerId];

    await client.query("BEGIN");

    const { rows: [order] } = await client.query(
      `SELECT * FROM purchase_orders WHERE id = $1 AND ${ownerWhere} FOR UPDATE`,
      lockParams
    );
    if (!order) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Purchase order not found" });
    }

    if (order.status === "stocked" && status === "stocked") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Purchase order is already stocked into inventory." });
    }

    const updateParams = isAdmin ? [status, req.params.id] : [status, req.params.id, req.ownerId];
    const { rows: [updated] } = await client.query(
      `UPDATE purchase_orders SET status = $1 WHERE id = $2 AND ${ownerWhere} RETURNING *`,
      updateParams
    );

    // Atomically increment stock quantities when transitioning to stocked
    if (status === "stocked" && order.status !== "stocked") {
      const { rows: items } = await client.query(
        `SELECT * FROM purchase_order_items WHERE order_id = $1 AND stock_item_id IS NOT NULL`,
        [order.id]
      );
      const stockOwnerWhere = isAdmin ? "1=1" : "owner_id = $3";
      for (const item of items) {
        const stkParams = isAdmin
          ? [item.quantity, item.stock_item_id]
          : [item.quantity, item.stock_item_id, req.ownerId];
        await client.query(
          `UPDATE stock_items SET quantity = quantity + $1 WHERE id = $2 AND ${stockOwnerWhere}`,
          stkParams
        );
      }
    }

    await client.query("COMMIT");

    const auditAction = status === "stocked" ? "PO_STOCKED" : "PO_STATUS_UPDATED";
    await logAudit(req.user.id, auditAction, "purchase_orders", order.id, order, { status }, req.ip);

    res.json(updated);
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// DELETE /api/purchase-orders/:id — Delete order if not yet stocked
router.delete("/:id", requireRole("admin", "sme_owner", "pulse_admin"), async (req, res, next) => {
  try {
    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "owner_id = $2";
    const queryParams = isAdmin ? [req.params.id] : [req.params.id, req.ownerId];

    const { rows: [order] } = await pool.query(
      `DELETE FROM purchase_orders WHERE id = $1 AND status != 'stocked' AND ${ownerWhere} RETURNING id`,
      queryParams
    );
    if (!order) {
      return res.status(404).json({ error: "Order not found or cannot be deleted once stocked." });
    }
    await logAudit(req.user.id, "PO_DELETED", "purchase_orders", req.params.id, null, null, req.ip);
    res.json({ message: "Purchase order deleted successfully." });
  } catch (err) { next(err); }
});

module.exports = router;
