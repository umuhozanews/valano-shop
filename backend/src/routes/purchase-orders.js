const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit, paginate } = require("../utils/helpers");

router.use(verifyToken, requireRole("admin", "sme_owner", "manager", "accountant", "pulse_admin"));

const STATUS_FLOW = ["ordered", "in_transit", "arrived", "stocked"];

router.get("/", async (req, res, next) => {
  try {
    const { page, limit, status, supplier_id } = req.query;
    const { limit: lim, offset } = paginate(page, limit);
    const conds = ["1=1"]; const params = [];
    if (status) { params.push(status); conds.push(`po.status=$${params.length}`); }
    if (supplier_id) { params.push(supplier_id); conds.push(`po.supplier_id=$${params.length}`); }
    params.push(lim); params.push(offset);

    const [data, cnt] = await Promise.all([
      pool.query(
        `SELECT po.*, s.name as supplier_name,
          (SELECT COUNT(*) FROM purchase_order_items i WHERE i.order_id=po.id) as items_count,
          (SELECT COALESCE(SUM(i.quantity * i.unit_cost_rwf),0) FROM purchase_order_items i WHERE i.order_id=po.id) as total_cost_rwf
         FROM purchase_orders po LEFT JOIN suppliers s ON s.id=po.supplier_id
         WHERE ${conds.join(" AND ")} ORDER BY po.created_at DESC
         LIMIT $${params.length-1} OFFSET $${params.length}`,
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

router.get("/:id", async (req, res, next) => {
  try {
    const { rows: [order] } = await pool.query(
      `SELECT po.*, s.name as supplier_name FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id=po.supplier_id WHERE po.id=$1`,
      [req.params.id]
    );
    if (!order) return res.status(404).json({ error: "Order not found" });

    const { rows: items } = await pool.query(
      `SELECT i.*, si.name as stock_item_name FROM purchase_order_items i
       LEFT JOIN stock_items si ON si.id=i.stock_item_id WHERE i.order_id=$1`,
      [req.params.id]
    );
    res.json({ ...order, items });
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { supplier_id, order_date, arrival_date, notes, items = [] } = req.body;
    if (!supplier_id || !order_date)
      return res.status(400).json({ error: "supplier_id and order_date required" });

    const { rows: [order] } = await pool.query(
      `INSERT INTO purchase_orders (supplier_id, order_date, arrival_date, notes, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [supplier_id, order_date, arrival_date || null, notes || null, req.user.id]
    );

    for (const item of items) {
      await pool.query(
        `INSERT INTO purchase_order_items (order_id, stock_item_id, item_name, quantity, unit_cost_rwf)
         VALUES ($1,$2,$3,$4,$5)`,
        [order.id, item.stock_item_id || null, item.item_name, item.quantity, item.unit_cost_rwf]
      );
    }

    await logAudit(req.user.id, "PO_CREATED", "purchase_orders", order.id, null, req.body, req.ip);
    res.status(201).json(order);
  } catch (err) { next(err); }
});

router.put("/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!STATUS_FLOW.includes(status))
      return res.status(400).json({ error: `Status must be one of: ${STATUS_FLOW.join(", ")}` });

    const { rows: [order] } = await pool.query(
      `UPDATE purchase_orders SET status=$1 WHERE id=$2 RETURNING *`,
      [status, req.params.id]
    );
    if (!order) return res.status(404).json({ error: "Order not found" });

    // When stocked, update stock quantities
    if (status === "stocked") {
      const { rows: items } = await pool.query(
        "SELECT * FROM purchase_order_items WHERE order_id=$1 AND stock_item_id IS NOT NULL",
        [order.id]
      );
      for (const item of items) {
        await pool.query(
          "UPDATE stock_items SET quantity = quantity + $1 WHERE id=$2",
          [item.quantity, item.stock_item_id]
        );
      }
    }

    await logAudit(req.user.id, "PO_STATUS_UPDATED", "purchase_orders", order.id, null, { status }, req.ip);
    res.json(order);
  } catch (err) { next(err); }
});

router.delete("/:id", requireRole("admin", "sme_owner", "pulse_admin"), async (req, res, next) => {
  try {
    const { rows: [order] } = await pool.query(
      "DELETE FROM purchase_orders WHERE id=$1 AND status='ordered' RETURNING id",
      [req.params.id]
    );
    if (!order) return res.status(404).json({ error: "Order not found or cannot be deleted" });
    await logAudit(req.user.id, "PO_DELETED", "purchase_orders", req.params.id, null, null, req.ip);
    res.json({ message: "Deleted" });
  } catch (err) { next(err); }
});

module.exports = router;
