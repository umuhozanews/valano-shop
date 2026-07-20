const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit, paginate, notifyAdminsAndManagers } = require("../utils/helpers");
const { journalForExpense } = require("../utils/journal");
const { ensureTenantColumns, addOwnerFilter } = require("../utils/tenant");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, "../../uploads/receipts");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, `receipt-${Date.now()}${path.extname(file.originalname)}`),
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Images and PDFs only"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(verifyToken, requireRole("admin", "sme_owner", "manager", "accountant", "pulse_admin"));

router.get("/", async (req, res, next) => {
  try {
    await ensureTenantColumns();
    const { start_date, end_date, category, page, limit } = req.query;
    const { limit: lim, offset } = paginate(page, limit);
    const conds = ["1=1"]; const params = [];

    addOwnerFilter(conds, params, req.ownerId, 'e');

    if (category) { params.push(category); conds.push(`e.category=$${params.length}`); }
    if (start_date) { params.push(start_date); conds.push(`e.expense_date>=$${params.length}`); }
    if (end_date) { params.push(end_date); conds.push(`e.expense_date<=$${params.length}`); }
    params.push(lim); params.push(offset);
    const where = conds.join(" AND ");

    const [data, cnt, byCategory] = await Promise.all([
      pool.query(
        `SELECT e.*, u.name as recorder_name, s.name as supplier_name
         FROM expenses e
         LEFT JOIN users u ON u.id=e.recorded_by
         LEFT JOIN suppliers s ON s.id=e.supplier_id
         WHERE ${where} ORDER BY e.expense_date DESC
         LIMIT $${params.length-1} OFFSET $${params.length}`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as total_sum FROM expenses e WHERE ${where}`,
        params.slice(0,-2)
      ),
      pool.query(
        `SELECT category, COALESCE(SUM(amount),0) as total FROM expenses e WHERE ${where.replace(/LIMIT.*/, "")} GROUP BY category ORDER BY total DESC`,
        params.slice(0,-2)
      ),
    ]);

    res.json({
      data: data.rows,
      total: parseInt(cnt.rows[0].count),
      total_sum: parseFloat(cnt.rows[0].total_sum),
      byCategory: byCategory.rows,
    });
  } catch (err) { next(err); }
});

router.get("/summary", async (req, res, next) => {
  try {
    await ensureTenantColumns();
    const oid = req.ownerId;
    const oWhere = oid !== null && oid !== undefined ? ` AND owner_id = $1` : '';
    const oParam = oid !== null && oid !== undefined ? [oid] : [];
    // Monthly expense summary with % of revenue
    const { rows } = await pool.query(`
      WITH monthly_revenue AS (
        SELECT COALESCE(SUM(total_amount),0) as rev
        FROM sales WHERE DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW()) AND is_voided=false${oWhere}
      )
      SELECT e.category,
        SUM(CASE WHEN DATE_TRUNC('month',expense_date::timestamp)=DATE_TRUNC('month',NOW()) THEN e.amount ELSE 0 END) as this_month,
        SUM(CASE WHEN DATE_TRUNC('month',expense_date::timestamp)=DATE_TRUNC('month',NOW()-INTERVAL '1 month') THEN e.amount ELSE 0 END) as last_month,
        ROUND(
          100.0 * SUM(CASE WHEN DATE_TRUNC('month',expense_date::timestamp)=DATE_TRUNC('month',NOW()) THEN e.amount ELSE 0 END)
          / NULLIF((SELECT rev FROM monthly_revenue), 0), 1
        ) as pct_of_revenue
      FROM expenses e WHERE 1=1${oWhere} GROUP BY e.category ORDER BY this_month DESC`,
      oParam
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    await ensureTenantColumns();
    const { category, amount, description, expense_date, supplier_id } = req.body;
    if (!category || !amount || !expense_date)
      return res.status(400).json({ error: "category, amount and expense_date required" });

    const { rows: [exp] } = await pool.query(
      `INSERT INTO expenses (category, amount, description, recorded_by, expense_date, supplier_id, owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [category, amount, description || null, req.user.id, expense_date, supplier_id || null, req.ownerId]
    );

    // Check for expense spike (150% of prior month average)
    await checkExpenseSpike(req.user.id, req.ownerId);
    journalForExpense({
      expenseId: exp.id, amount, category,
      description: description || category,
      createdBy: req.user.id, expenseDate: expense_date,
      ownerId: req.ownerId,
    });
    await logAudit(req.user.id, "EXPENSE_ADDED", "expenses", exp.id, null, exp, req.ip);
    res.status(201).json(exp);
  } catch (err) { next(err); }
});

router.post("/:id/receipt", upload.single("receipt"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const url = `/uploads/receipts/${req.file.filename}`;
    const { rows: [exp] } = await pool.query(
      "UPDATE expenses SET receipt_url=$1 WHERE id=$2 RETURNING *",
      [url, req.params.id]
    );
    if (!exp) return res.status(404).json({ error: "Expense not found" });
    res.json({ url, expense: exp });
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { category, amount, description, expense_date, supplier_id } = req.body;
    const { rows: [exp] } = await pool.query(
      `UPDATE expenses SET category=$1, amount=$2, description=$3, expense_date=$4, supplier_id=$5
       WHERE id=$6 RETURNING *`,
      [category, amount, description, expense_date, supplier_id || null, req.params.id]
    );
    if (!exp) return res.status(404).json({ error: "Expense not found" });
    res.json(exp);
  } catch (err) { next(err); }
});

router.delete("/:id", requireRole("admin", "sme_owner", "accountant", "pulse_admin"), async (req, res, next) => {
  try {
    await pool.query("DELETE FROM expenses WHERE id=$1", [req.params.id]);
    res.json({ message: "Expense deleted" });
  } catch (err) { next(err); }
});

async function checkExpenseSpike(userId, ownerId) {
  try {
    const oWhere = ownerId !== null && ownerId !== undefined ? ` WHERE owner_id = $1` : '';
    const oParam = ownerId !== null && ownerId !== undefined ? [ownerId] : [];
    const { rows } = await pool.query(`
      SELECT
        SUM(CASE WHEN DATE_TRUNC('month',expense_date::timestamp)=DATE_TRUNC('month',NOW()) THEN amount ELSE 0 END) as this_month,
        SUM(CASE WHEN DATE_TRUNC('month',expense_date::timestamp)=DATE_TRUNC('month',NOW()-INTERVAL '1 month') THEN amount ELSE 0 END) as last_month
      FROM expenses${oWhere}`,
      oParam
    );
    const thisMonth = parseFloat(rows[0].this_month || 0);
    const lastMonth = parseFloat(rows[0].last_month || 0);
    if (lastMonth > 0 && thisMonth > lastMonth * 1.5) {
      await notifyAdminsAndManagers(
        "EXPENSE_SPIKE",
        "Expense Spike Alert",
        `Expenses this month (${Math.round(thisMonth).toLocaleString()} RWF) are ${Math.round((thisMonth/lastMonth-1)*100)}% higher than last month`
      );
    }
  } catch (_) {}
}

module.exports = router;
