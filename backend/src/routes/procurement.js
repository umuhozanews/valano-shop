const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit, notifyAdminsAndManagers, paginate } = require("../utils/helpers");

router.use(verifyToken, requireRole("admin", "manager"));

const STATUS_FLOW = ["ordered", "in_transit", "at_customs", "arrived", "stocked"];

router.get("/", async (req, res, next) => {
  try {
    const { page, limit, status } = req.query;
    const { limit: lim, offset } = paginate(page, limit);
    const conds = ["1=1"]; const params = [];
    if (status) { params.push(status); conds.push(`po.status=$${params.length}`); }
    params.push(lim); params.push(offset);
    const where = conds.join(" AND ");

    const [data, cnt, summary] = await Promise.all([
      pool.query(`SELECT po.*, s.name as supplier_name,
          (SELECT COUNT(*) FROM procurement_items pi WHERE pi.order_id=po.id) as items_count,
          (SELECT COALESCE(SUM(pi.quantity * pi.unit_cost),0) FROM procurement_items pi WHERE pi.order_id=po.id) as items_cost
         FROM procurement_orders po LEFT JOIN suppliers s ON s.id=po.supplier_id
         WHERE ${where} ORDER BY po.created_at DESC
         LIMIT $${params.length-1} OFFSET $${params.length}`, params),
      pool.query(`SELECT COUNT(*) FROM procurement_orders po WHERE ${where}`, params.slice(0,-2)),
      pool.query(`SELECT status, COUNT(*) as cnt FROM procurement_orders GROUP BY status`),
    ]);
    res.json({ data: data.rows, total: parseInt(cnt.rows[0].count), summary: summary.rows });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const [order, items] = await Promise.all([
      pool.query(`SELECT po.*, s.name as supplier_name, s.wechat, s.whatsapp,
          u.name as created_by_name
         FROM procurement_orders po
         LEFT JOIN suppliers s ON s.id=po.supplier_id
         LEFT JOIN users u ON u.id=po.created_by
         WHERE po.id=$1`, [req.params.id]),
      pool.query(`SELECT * FROM procurement_items WHERE order_id=$1`, [req.params.id]),
    ]);
    if (!order.rows[0]) return res.status(404).json({ error: "Order not found" });
    res.json({ ...order.rows[0], items: items.rows });
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { supplier_id, order_date, arrival_date, currency, exchange_rate,
            shipping_cost, customs_cost, notes, items } = req.body;

    await pool.query("BEGIN");
    const { rows: [order] } = await pool.query(
      `INSERT INTO procurement_orders (supplier_id, order_date, arrival_date, currency,
        exchange_rate, shipping_cost, customs_cost, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [supplier_id || null, order_date || null, arrival_date || null, currency || "CNY",
       exchange_rate || null, shipping_cost || 0, customs_cost || 0, notes || null, req.user.id]
    );
    for (const item of (items || [])) {
      await pool.query(
        `INSERT INTO procurement_items (order_id, item_name, category, size, color, quantity, unit_cost, currency)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          order.id,
          item.item_name || "Unnamed Item",
          item.category || null,
          item.size || null,
          item.color || null,
          parseInt(item.quantity) || 0,
          parseFloat(item.unit_cost) || 0,
          currency || "CNY"
        ]
      );
    }
    await pool.query("COMMIT");
    await logAudit(req.user.id, "PROCUREMENT_CREATED", "procurement_orders", order.id, null, order, req.ip);
    res.status(201).json(order);
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { supplier_id, arrival_date, currency, exchange_rate, shipping_cost, customs_cost, notes } = req.body;
    const { rows: [old] } = await pool.query("SELECT * FROM procurement_orders WHERE id=$1", [req.params.id]);
    const { rows: [order] } = await pool.query(
      `UPDATE procurement_orders SET supplier_id=$1, arrival_date=$2, currency=$3,
        exchange_rate=$4, shipping_cost=$5, customs_cost=$6, notes=$7
       WHERE id=$8 RETURNING *`,
      [supplier_id || null, arrival_date || null, currency || "CNY", exchange_rate || null, shipping_cost || 0, customs_cost || 0, notes || null, req.params.id]
    );
    await logAudit(req.user.id, "PROCUREMENT_UPDATED", "procurement_orders", order.id, old, order, req.ip);
    res.json(order);
  } catch (err) { next(err); }
});

router.put("/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!STATUS_FLOW.includes(status)) return res.status(400).json({ error: "Invalid status" });
    const { rows: [order] } = await pool.query(
      "UPDATE procurement_orders SET status=$1 WHERE id=$2 RETURNING *", [status, req.params.id]
    );
    if (status === "arrived") {
      await notifyAdminsAndManagers("PROCUREMENT_ARRIVED", "Order Arrived",
        `Procurement order #${order.id} has arrived and is ready for stocking`);
    }
    res.json(order);
  } catch (err) { next(err); }
});

router.post("/:id/stock-in", async (req, res, next) => {
  try {
    const { branch_id, items } = req.body;
    const { rows: [order] } = await pool.query("SELECT * FROM procurement_orders WHERE id=$1", [req.params.id]);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Calculate landed cost factor
    const { rows: piRows } = await pool.query(
      "SELECT COALESCE(SUM(quantity * unit_cost),0) as total FROM procurement_items WHERE order_id=$1", [order.id]
    );
    const itemsCostCNY = parseFloat(piRows[0].total);
    const rate = parseFloat(order.exchange_rate) || 190;
    const itemsCostRWF = itemsCostCNY * rate;
    const extraCosts = parseFloat(order.shipping_cost || 0) + parseFloat(order.customs_cost || 0);
    const totalUnits = items.reduce((s, i) => s + parseInt(i.actual_qty), 0);
    const extraPerUnit = totalUnits > 0 ? Math.round(extraCosts / totalUnits) : 0;

    await pool.query("BEGIN");
    for (const item of items) {
      const { rows: [pi] } = await pool.query("SELECT * FROM procurement_items WHERE id=$1", [item.procurement_item_id]);
      if (!pi) continue;
      const unitCostRWF = Math.round(pi.unit_cost * rate) + extraPerUnit;

      // Upsert stock
      const { rows: existing } = await pool.query(
        `SELECT id FROM stock_items WHERE name=$1 AND size=$2 AND color=$3 AND branch_id=$4 AND is_active=true LIMIT 1`,
        [pi.item_name, pi.size, pi.color, branch_id]
      );
      if (existing[0]) {
        await pool.query(
          `UPDATE stock_items SET quantity=quantity+$1, cost_price_rwf=$2 WHERE id=$3`,
          [item.actual_qty, unitCostRWF, existing[0].id]
        );
      } else {
        const barcode = `VLN${Date.now()}${Math.floor(Math.random() * 1000)}`;
        await pool.query(
          `INSERT INTO stock_items (name,category,size,color,barcode,branch_id,quantity,cost_price_rwf,sell_price_rwf,low_stock_threshold)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,5)`,
          [pi.item_name, pi.category, pi.size, pi.color, barcode, branch_id, item.actual_qty, unitCostRWF, Math.round(unitCostRWF * 1.5)]
        );
      }
    }
    await pool.query("UPDATE procurement_orders SET status='stocked' WHERE id=$1", [order.id]);
    await pool.query("COMMIT");
    await logAudit(req.user.id, "STOCK_CREATED", "procurement_orders", order.id, null, { branch_id, items_count: items.length }, req.ip);
    res.json({ message: "Stocked in successfully" });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    next(err);
  }
});

router.delete("/:id", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { rows } = await pool.query("DELETE FROM procurement_orders WHERE id=$1 RETURNING *", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Order not found" });
    await logAudit(req.user.id, "PROCUREMENT_DELETED", "procurement_orders", req.params.id, null, null, req.ip);
    res.json({ message: "Order deleted successfully" });
  } catch (err) { next(err); }
});

module.exports = router;
