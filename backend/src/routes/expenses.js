const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit, paginate } = require("../utils/helpers");

router.use(verifyToken, requireRole("admin", "manager"));

router.get("/", async (req, res, next) => {
  try {
    const { start_date, end_date, category, branch_id, page, limit } = req.query;
    const { limit: lim, offset } = paginate(page, limit);
    const conds = ["1=1"]; const params = [];
    if (req.user.role === "manager") { params.push(req.user.branch_id); conds.push(`e.branch_id=$${params.length}`); }
    else if (branch_id) { params.push(branch_id); conds.push(`e.branch_id=$${params.length}`); }
    if (category) { params.push(category); conds.push(`e.category=$${params.length}`); }
    if (start_date) { params.push(start_date); conds.push(`e.expense_date>=$${params.length}`); }
    if (end_date) { params.push(end_date); conds.push(`e.expense_date<=$${params.length}`); }
    params.push(lim); params.push(offset);
    const where = conds.join(" AND ");

    const [data, cnt, summary] = await Promise.all([
      pool.query(`SELECT e.*, b.name as branch_name, u.name as recorder_name
         FROM expenses e LEFT JOIN branches b ON b.id=e.branch_id LEFT JOIN users u ON u.id=e.recorded_by
         WHERE ${where} ORDER BY e.expense_date DESC
         LIMIT $${params.length-1} OFFSET $${params.length}`, params),
      pool.query(`SELECT COUNT(*) FROM expenses e WHERE ${where}`, params.slice(0,-2)),
      pool.query(`SELECT category, COALESCE(SUM(amount),0) as total FROM expenses e
         WHERE ${where.replace(/LIMIT.*/, "")} GROUP BY category`, params.slice(0,-2)),
    ]);
    res.json({ data: data.rows, total: parseInt(cnt.rows[0].count), byCategory: summary.rows });
  } catch (err) { next(err); }
});

router.get("/summary", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT category,
        SUM(CASE WHEN DATE_TRUNC('month',expense_date::timestamp)=DATE_TRUNC('month',NOW()) THEN amount ELSE 0 END) as this_month,
        SUM(CASE WHEN expense_date >= NOW() - INTERVAL '6 months' THEN amount ELSE 0 END) as six_months
      FROM expenses GROUP BY category`);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { category, amount, description, branch_id, expense_date } = req.body;
    const { rows: [exp] } = await pool.query(
      `INSERT INTO expenses (category, amount, description, branch_id, recorded_by, expense_date)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [category, amount, description, branch_id || req.user.branch_id, req.user.id, expense_date]
    );
    await logAudit(req.user.id, "EXPENSE_ADDED", "expenses", exp.id, null, exp, req.ip);
    res.status(201).json(exp);
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { category, amount, description, expense_date } = req.body;
    const { rows: [exp] } = await pool.query(
      `UPDATE expenses SET category=$1, amount=$2, description=$3, expense_date=$4 WHERE id=$5 RETURNING *`,
      [category, amount, description, expense_date, req.params.id]
    );
    res.json(exp);
  } catch (err) { next(err); }
});

router.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    await pool.query("DELETE FROM expenses WHERE id=$1", [req.params.id]);
    res.json({ message: "Expense deleted" });
  } catch (err) { next(err); }
});

module.exports = router;
