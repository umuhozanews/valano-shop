const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit, paginate } = require("../utils/helpers");

router.use(verifyToken, requireRole("admin", "sme_owner", "manager", "accountant", "pulse_admin"));

// List receivables
router.get("/", async (req, res, next) => {
  try {
    const { page, limit, status, customer_id } = req.query;
    const { limit: lim, offset } = paginate(page, limit);
    const conds = ["1=1"]; const params = [];
    if (status) { params.push(status); conds.push(`ar.status=$${params.length}`); }
    if (customer_id) { params.push(customer_id); conds.push(`ar.customer_id=$${params.length}`); }
    params.push(lim); params.push(offset);

    const [data, cnt, summary] = await Promise.all([
      pool.query(
        `SELECT ar.*, c.name as customer_name, c.phone as customer_phone
         FROM accounts_receivable ar LEFT JOIN customers c ON c.id=ar.customer_id
         WHERE ${conds.join(" AND ")} ORDER BY ar.created_at DESC
         LIMIT $${params.length-1} OFFSET $${params.length}`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) FROM accounts_receivable ar WHERE ${conds.join(" AND ")}`,
        params.slice(0, -2)
      ),
      pool.query(
        `SELECT
          COALESCE(SUM(amount - amount_paid),0) as total_outstanding,
          COUNT(*) FILTER (WHERE status='overdue') as overdue_count,
          COUNT(*) FILTER (WHERE due_date <= NOW() + INTERVAL '7 days' AND status IN ('pending','partial')) as due_soon
         FROM accounts_receivable`
      ),
    ]);

    res.json({
      data: data.rows,
      total: parseInt(cnt.rows[0].count),
      summary: summary.rows[0],
    });
  } catch (err) { next(err); }
});

// Aged receivables report
router.get("/aged", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        c.name as customer_name, c.phone,
        COALESCE(SUM(CASE WHEN NOW()-ar.created_at <= INTERVAL '30 days' THEN ar.amount-ar.amount_paid ELSE 0 END),0) as "0_30",
        COALESCE(SUM(CASE WHEN NOW()-ar.created_at BETWEEN INTERVAL '31 days' AND INTERVAL '60 days' THEN ar.amount-ar.amount_paid ELSE 0 END),0) as "31_60",
        COALESCE(SUM(CASE WHEN NOW()-ar.created_at BETWEEN INTERVAL '61 days' AND INTERVAL '90 days' THEN ar.amount-ar.amount_paid ELSE 0 END),0) as "61_90",
        COALESCE(SUM(CASE WHEN NOW()-ar.created_at > INTERVAL '90 days' THEN ar.amount-ar.amount_paid ELSE 0 END),0) as "90_plus",
        COALESCE(SUM(ar.amount-ar.amount_paid),0) as total
       FROM accounts_receivable ar
       JOIN customers c ON c.id=ar.customer_id
       WHERE ar.status IN ('pending','partial','overdue')
       GROUP BY c.id, c.name, c.phone
       HAVING SUM(ar.amount-ar.amount_paid) > 0
       ORDER BY total DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Get single
router.get("/:id", async (req, res, next) => {
  try {
    const { rows: [ar] } = await pool.query(
      `SELECT ar.*, c.name as customer_name FROM accounts_receivable ar
       LEFT JOIN customers c ON c.id=ar.customer_id WHERE ar.id=$1`,
      [req.params.id]
    );
    if (!ar) return res.status(404).json({ error: "Record not found" });
    res.json(ar);
  } catch (err) { next(err); }
});

// Create
router.post("/", async (req, res, next) => {
  try {
    const { customer_id, sale_id, amount, due_date, notes } = req.body;
    if (!customer_id || !amount)
      return res.status(400).json({ error: "customer_id and amount required" });

    const { rows: [ar] } = await pool.query(
      `INSERT INTO accounts_receivable (customer_id, sale_id, amount, due_date, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [customer_id, sale_id || null, amount, due_date || null, notes || null]
    );
    await logAudit(req.user.id, "AR_CREATED", "accounts_receivable", ar.id, null, req.body, req.ip);
    res.status(201).json(ar);
  } catch (err) { next(err); }
});

// Record payment
router.post("/:id/payment", async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0)
      return res.status(400).json({ error: "Valid payment amount required" });

    const { rows: [existing] } = await pool.query(
      "SELECT * FROM accounts_receivable WHERE id=$1", [req.params.id]
    );
    if (!existing) return res.status(404).json({ error: "Record not found" });

    const newPaid = Math.min(Number(existing.amount_paid) + Number(amount), Number(existing.amount));
    const newStatus = newPaid >= existing.amount ? "paid" : "partial";

    const { rows: [ar] } = await pool.query(
      `UPDATE accounts_receivable SET amount_paid=$1, status=$2 WHERE id=$3 RETURNING *`,
      [newPaid, newStatus, req.params.id]
    );
    await logAudit(req.user.id, "AR_PAYMENT", "accounts_receivable", ar.id, null, { amount, newPaid, newStatus }, req.ip);
    res.json(ar);
  } catch (err) { next(err); }
});

// Mark overdue (can be called by cron)
router.post("/mark-overdue", requireRole("admin", "pulse_admin"), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `UPDATE accounts_receivable SET status='overdue'
       WHERE due_date < CURRENT_DATE AND status IN ('pending','partial')
       RETURNING id`
    );
    res.json({ updated: rows.length });
  } catch (err) { next(err); }
});

module.exports = router;
