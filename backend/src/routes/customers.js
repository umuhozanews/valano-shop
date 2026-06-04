const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { paginate } = require("../utils/helpers");

router.use(verifyToken);

router.get("/", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { search, type, segment, page, limit } = req.query;
    const { limit: lim, offset } = paginate(page, limit);
    const conds = ["1=1"]; const params = [];
    if (search) { params.push(`%${search}%`); conds.push(`(c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`); }
    if (type) { params.push(type); conds.push(`c.type=$${params.length}`); }
    if (segment) { params.push(segment); conds.push(`c.segment=$${params.length}`); }
    params.push(lim); params.push(offset);
    const where = conds.join(" AND ");

    const [data, cnt, summary] = await Promise.all([
      pool.query(`SELECT c.*,
          COUNT(s.id) as total_orders,
          COALESCE(SUM(s.total_amount),0) as total_spent,
          MAX(s.created_at) as last_purchase
         FROM customers c LEFT JOIN sales s ON s.customer_id=c.id AND s.is_voided=false
         WHERE ${where} GROUP BY c.id
         ORDER BY total_spent DESC LIMIT $${params.length-1} OFFSET $${params.length}`, params),
      pool.query(`SELECT COUNT(*) FROM customers c WHERE ${where}`, params.slice(0,-2)),
      pool.query(`SELECT segment, COUNT(*) as cnt FROM customers GROUP BY segment`),
    ]);
    res.json({ data: data.rows, total: parseInt(cnt.rows[0].count), summary: summary.rows });
  } catch (err) { next(err); }
});

router.get("/top", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, COUNT(s.id) as orders, COALESCE(SUM(s.total_amount),0) as spent
      FROM customers c LEFT JOIN sales s ON s.customer_id=c.id AND s.is_voided=false
      GROUP BY c.id ORDER BY spent DESC LIMIT 10`);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/:id", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const [customer, sales] = await Promise.all([
      pool.query(`SELECT c.*, COUNT(s.id) as total_orders, COALESCE(SUM(s.total_amount),0) as total_spent,
          MAX(s.created_at) as last_purchase
         FROM customers c LEFT JOIN sales s ON s.customer_id=c.id AND s.is_voided=false
         WHERE c.id=$1 GROUP BY c.id`, [req.params.id]),
      pool.query(`SELECT s.*, i.invoice_number, b.name as branch_name,
          (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id=s.id) as items_count
         FROM sales s LEFT JOIN invoices i ON i.sale_id=s.id LEFT JOIN branches b ON b.id=s.branch_id
         WHERE s.customer_id=$1 AND s.is_voided=false ORDER BY s.created_at DESC LIMIT 20`, [req.params.id]),
    ]);
    if (!customer.rows[0]) return res.status(404).json({ error: "Customer not found" });
    res.json({ ...customer.rows[0], sales: sales.rows });
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, phone, location, type, notes } = req.body;
    const { rows: [c] } = await pool.query(
      `INSERT INTO customers (name, phone, location, type, notes) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, phone, location, type || "retailer", notes]
    );
    res.status(201).json(c);
  } catch (err) { next(err); }
});

router.put("/:id", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { name, phone, location, type, segment, notes } = req.body;
    const { rows: [c] } = await pool.query(
      `UPDATE customers SET name=$1, phone=$2, location=$3, type=$4, segment=$5, notes=$6 WHERE id=$7 RETURNING *`,
      [name, phone, location, type, segment, notes, req.params.id]
    );
    res.json(c);
  } catch (err) { next(err); }
});

module.exports = router;
