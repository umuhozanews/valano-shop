const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { paginate } = require("../utils/helpers");
const { ensureTenantColumns, addOwnerFilter } = require("../utils/tenant");

router.use(verifyToken);

router.get("/", requireRole("admin", "sme_owner", "manager", "accountant", "pulse_admin"), async (req, res, next) => {
  try {
    await ensureTenantColumns();
    const { search, type, segment, page, limit } = req.query;
    const { limit: lim, offset } = paginate(page, limit);
    const conds = ["1=1"]; const params = [];
    addOwnerFilter(conds, params, req.ownerId, 'c');
    if (search) {
      params.push(`%${search}%`);
      conds.push(`(c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`);
    }
    if (type) { params.push(type); conds.push(`c.type=$${params.length}`); }
    if (segment) { params.push(segment); conds.push(`c.segment=$${params.length}`); }
    params.push(lim); params.push(offset);
    const where = conds.join(" AND ");

    const summaryParams = params.slice(0, -2);
    const [data, cnt, summary] = await Promise.all([
      pool.query(
        `SELECT c.*,
          COUNT(s.id) as total_orders,
          COALESCE(SUM(s.total_amount),0) as total_spent,
          MAX(s.created_at) as last_purchase,
          CASE
            WHEN COALESCE(SUM(s.total_amount),0) >= 500000 THEN 'vip'
            WHEN COALESCE(SUM(s.total_amount),0) >= 100000 OR COUNT(s.id) >= 3 THEN 'regular'
            ELSE 'new'
          END as segment,
          COALESCE(SUM(ar.amount - ar.amount_paid) FILTER (WHERE ar.status IN ('pending','partial','overdue')),0) as outstanding_balance
         FROM customers c
         LEFT JOIN sales s ON s.customer_id=c.id AND s.is_voided=false
         LEFT JOIN accounts_receivable ar ON ar.customer_id=c.id
         WHERE ${where} GROUP BY c.id
         ORDER BY total_spent DESC
         LIMIT $${params.length-1} OFFSET $${params.length}`,
        params
      ),
      pool.query(`SELECT COUNT(*) FROM customers c WHERE ${where}`, summaryParams),
      pool.query(
        `WITH stats AS (
           SELECT c.id,
                  COALESCE(SUM(s.total_amount),0) as total_spent,
                  COUNT(s.id) as total_orders
           FROM customers c
           LEFT JOIN sales s ON s.customer_id=c.id AND s.is_voided=false
           WHERE ${where}
           GROUP BY c.id
         )
         SELECT
           CASE
             WHEN total_spent >= 500000 THEN 'vip'
             WHEN total_spent >= 100000 OR total_orders >= 3 THEN 'regular'
             ELSE 'new'
           END as segment,
           COUNT(*)::text as cnt
         FROM stats
         GROUP BY 1`,
        params
      ),
    ]);
    res.json({ data: data.rows, total: parseInt(cnt.rows[0].count), summary: summary.rows });
  } catch (err) { next(err); }
});

router.get("/top", requireRole("admin", "sme_owner", "manager", "accountant", "pulse_admin"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, COUNT(s.id) as orders, COALESCE(SUM(s.total_amount),0) as spent
       FROM customers c LEFT JOIN sales s ON s.customer_id=c.id AND s.is_voided=false
       GROUP BY c.id ORDER BY spent DESC LIMIT 10`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/:id", requireRole("admin", "sme_owner", "manager", "accountant", "pulse_admin"), async (req, res, next) => {
  try {
    const [customer, sales, receivables] = await Promise.all([
      pool.query(
        `SELECT c.*, COUNT(s.id) as total_orders,
          COALESCE(SUM(s.total_amount),0) as total_spent,
          MAX(s.created_at) as last_purchase
         FROM customers c LEFT JOIN sales s ON s.customer_id=c.id AND s.is_voided=false
         WHERE c.id=$1 GROUP BY c.id`,
        [req.params.id]
      ),
      pool.query(
        `SELECT s.*, i.invoice_number,
          (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id=s.id) as items_count
         FROM sales s LEFT JOIN invoices i ON i.sale_id=s.id
         WHERE s.customer_id=$1 AND s.is_voided=false ORDER BY s.created_at DESC LIMIT 20`,
        [req.params.id]
      ),
      pool.query(
        "SELECT * FROM accounts_receivable WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 10",
        [req.params.id]
      ),
    ]);
    if (!customer.rows[0]) return res.status(404).json({ error: "Customer not found" });
    res.json({ ...customer.rows[0], sales: sales.rows, receivables: receivables.rows });
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    await ensureTenantColumns();
    const { name, phone, location, type, notes, credit_limit } = req.body;
    if (!name) return res.status(400).json({ error: "Customer name required" });
    const { rows: [c] } = await pool.query(
      "INSERT INTO customers (name, phone, location, type, notes, credit_limit, owner_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [name, phone || null, location || null, type || "retailer", notes || null, credit_limit || 0, req.ownerId]
    );
    res.status(201).json(c);
  } catch (err) { next(err); }
});

router.put("/:id", requireRole("admin", "sme_owner", "manager", "accountant", "pulse_admin"), async (req, res, next) => {
  try {
    const { name, phone, location, type, segment, notes, credit_limit } = req.body;
    const { rows: [c] } = await pool.query(
      `UPDATE customers SET name=$1, phone=$2, location=$3, type=$4, segment=$5, notes=$6, credit_limit=$7
       WHERE id=$8 RETURNING *`,
      [name, phone || null, location || null, type, segment, notes || null, credit_limit || 0, req.params.id]
    );
    if (!c) return res.status(404).json({ error: "Customer not found" });
    res.json(c);
  } catch (err) { next(err); }
});

router.delete("/:id", requireRole("admin", "sme_owner", "pulse_admin"), async (req, res, next) => {
  try {
    await pool.query("DELETE FROM customers WHERE id=$1", [req.params.id]);
    res.json({ message: "Customer deleted" });
  } catch (err) { next(err); }
});

module.exports = router;
