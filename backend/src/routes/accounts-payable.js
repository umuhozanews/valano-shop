const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit, paginate } = require("../utils/helpers");
const { ensureTenantColumns, addOwnerFilter } = require("../utils/tenant");

router.use(verifyToken, requireRole("admin", "sme_owner", "manager", "accountant", "pulse_admin"));

// List payables
router.get("/", async (req, res, next) => {
  try {
    await ensureTenantColumns();
    const { page, limit, status, supplier_id } = req.query;
    const { limit: lim, offset } = paginate(page, limit);
    const conds = ["1=1"]; const params = [];
    if (status)      { params.push(status);      conds.push(`ap.status=$${params.length}`); }
    if (supplier_id) { params.push(supplier_id); conds.push(`ap.supplier_id=$${params.length}`); }
    addOwnerFilter(conds, params, req.ownerId, 'ap');
    params.push(lim); params.push(offset);

    const sumConds = ["1=1"]; const sumParams = [];
    addOwnerFilter(sumConds, sumParams, req.ownerId);

    const [data, cnt, summary] = await Promise.all([
      pool.query(
        `SELECT ap.*, s.name as supplier_name, s.phone as supplier_phone
         FROM accounts_payable ap LEFT JOIN suppliers s ON s.id=ap.supplier_id
         WHERE ${conds.join(" AND ")} ORDER BY ap.created_at DESC
         LIMIT $${params.length-1} OFFSET $${params.length}`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) FROM accounts_payable ap WHERE ${conds.join(" AND ")}`,
        params.slice(0, -2)
      ),
      pool.query(
        `SELECT
          COALESCE(SUM(amount - amount_paid),0) as total_outstanding,
          COUNT(*) FILTER (WHERE status='overdue') as overdue_count,
          COUNT(*) FILTER (WHERE due_date <= NOW() + INTERVAL '7 days' AND status IN ('pending','partial')) as due_soon
         FROM accounts_payable
         WHERE ${sumConds.join(" AND ")}`,
        sumParams
      ),
    ]);

    res.json({
      data: data.rows,
      total: parseInt(cnt.rows[0].count),
      summary: summary.rows[0],
    });
  } catch (err) { next(err); }
});

// Create
router.post("/", async (req, res, next) => {
  try {
    const { supplier_id, amount, due_date, notes } = req.body;
    if (!amount) return res.status(400).json({ error: "amount is required" });

    const { rows: [ap] } = await pool.query(
      `INSERT INTO accounts_payable (supplier_id, amount, due_date, notes, owner_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [supplier_id || null, amount, due_date || null, notes || null, req.ownerId]
    );
    await logAudit(req.user.id, "AP_CREATED", "accounts_payable", ap.id, null, req.body, req.ip);
    res.status(201).json(ap);
  } catch (err) { next(err); }
});

// Record payment
router.post("/:id/payment", async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0)
      return res.status(400).json({ error: "Valid payment amount required" });

    const { rows: [existing] } = await pool.query(
      "SELECT * FROM accounts_payable WHERE id=$1", [req.params.id]
    );
    if (!existing) return res.status(404).json({ error: "Record not found" });

    const newPaid  = Math.min(Number(existing.amount_paid) + Number(amount), Number(existing.amount));
    const newStatus = newPaid >= existing.amount ? "paid" : "partial";

    const { rows: [ap] } = await pool.query(
      `UPDATE accounts_payable SET amount_paid=$1, status=$2 WHERE id=$3 RETURNING *`,
      [newPaid, newStatus, req.params.id]
    );
    await logAudit(req.user.id, "AP_PAYMENT", "accounts_payable", ap.id, null, { amount, newPaid, newStatus }, req.ip);
    res.json(ap);
  } catch (err) { next(err); }
});

module.exports = router;
