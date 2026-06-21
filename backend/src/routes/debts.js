const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit } = require("../utils/helpers");

router.use(verifyToken);

// GET all debts
router.get("/", async (req, res, next) => {
  try {
    const params = [];
    const conds = [];

    if (req.user.role === "worker" || req.user.role === "manager") {
      params.push(req.user.branch_id);
      conds.push(`branch_id = $${params.length}`);
    }

    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const query = `SELECT * FROM debts ${where} ORDER BY created_at DESC`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

// POST create debt
router.post("/", async (req, res, next) => {
  try {
    const { person_name, amount, type, due_date, notes } = req.body;
    if (!person_name || !amount || !type) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { rows: [debt] } = await pool.query(
      `INSERT INTO debts (person_name, amount, type, due_date, notes, branch_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [person_name, amount, type, due_date || null, notes || null, req.user.branch_id]
    );

    await logAudit(req.user.id, "DEBT_CREATED", "debts", debt.id, null, debt, req.ip);
    res.status(201).json(debt);
  } catch (err) { next(err); }
});

// PUT pay debt
router.put("/:id/pay", async (req, res, next) => {
  try {
    const { rows: [debt] } = await pool.query("SELECT * FROM debts WHERE id = $1", [req.params.id]);
    if (!debt) return res.status(404).json({ error: "Debt not found" });

    const { rows: [updated] } = await pool.query(
      "UPDATE debts SET status = 'paid' WHERE id = $1 RETURNING *",
      [req.params.id]
    );

    // Sync: If the debt is associated with a sale, update the corresponding invoice's status to 'paid'
    if (updated.sale_id) {
      await pool.query(
        "UPDATE invoices SET status = 'paid', paid_at = NOW() WHERE sale_id = $1",
        [updated.sale_id]
      );
    }

    await logAudit(req.user.id, "DEBT_PAID", "debts", updated.id, debt, updated, req.ip);
    res.json(updated);
  } catch (err) { next(err); }
});

// DELETE debt
router.delete("/:id", async (req, res, next) => {
  try {
    const { rows: [debt] } = await pool.query("SELECT * FROM debts WHERE id = $1", [req.params.id]);
    if (!debt) return res.status(404).json({ error: "Debt not found" });

    await pool.query("DELETE FROM debts WHERE id = $1", [req.params.id]);
    await logAudit(req.user.id, "DEBT_DELETED", "debts", req.params.id, debt, null, req.ip);
    res.json({ message: "Debt deleted" });
  } catch (err) { next(err); }
});

module.exports = router;
