const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit } = require("../utils/helpers");

router.use(verifyToken);

router.get("/", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { search } = req.query;
    const conds = ["1=1"]; const params = [];
    if (search) { params.push(`%${search}%`); conds.push(`s.name ILIKE $${params.length}`); }

    const { rows } = await pool.query(
      `SELECT s.*,
        COUNT(po.id) as orders_count,
        COALESCE(SUM(pi.quantity * pi.unit_cost * COALESCE(po.exchange_rate,190)),0) as total_rwf,
        ROUND(
          100.0 * COUNT(CASE WHEN po.status='stocked' AND po.arrival_date <= NOW() THEN 1 END)
          / NULLIF(COUNT(po.id), 0), 0
        ) as reliability_pct
       FROM suppliers s
       LEFT JOIN procurement_orders po ON po.supplier_id=s.id
       LEFT JOIN procurement_items pi ON pi.order_id=po.id
       WHERE ${conds.join(" AND ")} GROUP BY s.id ORDER BY s.name`, params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/:id", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const [sup, orders] = await Promise.all([
      pool.query("SELECT * FROM suppliers WHERE id=$1", [req.params.id]),
      pool.query(`SELECT po.* FROM procurement_orders po WHERE po.supplier_id=$1 ORDER BY po.created_at DESC LIMIT 10`, [req.params.id]),
    ]);
    if (!sup.rows[0]) return res.status(404).json({ error: "Supplier not found" });
    res.json({ ...sup.rows[0], orders: orders.rows });
  } catch (err) { next(err); }
});

router.post("/", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { name, wechat, whatsapp, city, country, specialty, notes } = req.body;
    const { rows: [s] } = await pool.query(
      `INSERT INTO suppliers (name, wechat, whatsapp, city, country, specialty, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, wechat, whatsapp, city, country || "China", specialty, notes]
    );
    await logAudit(req.user.id, "SUPPLIER_CREATED", "suppliers", s.id, null, s, req.ip);
    res.status(201).json(s);
  } catch (err) { next(err); }
});

router.put("/:id", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { name, wechat, whatsapp, city, country, specialty, notes } = req.body;
    const { rows: [s] } = await pool.query(
      `UPDATE suppliers SET name=$1, wechat=$2, whatsapp=$3, city=$4, country=$5, specialty=$6, notes=$7
       WHERE id=$8 RETURNING *`,
      [name, wechat, whatsapp, city, country, specialty, notes, req.params.id]
    );
    res.json(s);
  } catch (err) { next(err); }
});

router.delete("/:id", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    await pool.query("DELETE FROM suppliers WHERE id=$1", [req.params.id]);
    res.json({ message: "Supplier deleted" });
  } catch (err) { next(err); }
});

module.exports = router;
