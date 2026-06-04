const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit } = require("../utils/helpers");
const { createReportPDF } = require("../utils/pdf");
const { exportToExcel } = require("../utils/excel");

router.use(verifyToken);

router.get("/pnl", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { year = new Date().getFullYear(), period = "monthly", branch_id } = req.query;
    const bf = req.user.role === "admin"
      ? (branch_id ? `AND s.branch_id=${parseInt(branch_id)}` : "")
      : `AND s.branch_id=${req.user.branch_id}`;

    const { rows: monthly } = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', s.created_at), 'Mon YYYY') as month,
        DATE_TRUNC('month', s.created_at) as month_date,
        COALESCE(SUM(s.total_amount) FILTER (WHERE NOT s.is_voided), 0) as revenue,
        COALESCE(SUM(si.quantity * stk.cost_price_rwf) FILTER (WHERE NOT s.is_voided), 0) as cogs,
        COALESCE((SELECT SUM(e.amount) FROM expenses e
          WHERE DATE_TRUNC('month',e.expense_date::timestamp)=DATE_TRUNC('month',s.created_at)
          ${req.user.role !== "admin" ? `AND e.branch_id=${req.user.branch_id}` : ""}), 0) as expenses
      FROM sales s
      LEFT JOIN sale_items si ON si.sale_id=s.id
      LEFT JOIN stock_items stk ON stk.id=si.stock_item_id
      WHERE EXTRACT(YEAR FROM s.created_at) = $1 ${bf}
      GROUP BY DATE_TRUNC('month', s.created_at)
      ORDER BY month_date`, [year]
    );

    const totals = monthly.reduce((acc, m) => ({
      revenue: acc.revenue + parseFloat(m.revenue),
      cogs: acc.cogs + parseFloat(m.cogs),
      expenses: acc.expenses + parseFloat(m.expenses),
    }), { revenue: 0, cogs: 0, expenses: 0 });

    totals.grossProfit = totals.revenue - totals.cogs;
    totals.grossMargin = totals.revenue > 0 ? ((totals.grossProfit / totals.revenue) * 100).toFixed(1) : 0;
    totals.netProfit = totals.grossProfit - totals.expenses;
    totals.netMargin = totals.revenue > 0 ? ((totals.netProfit / totals.revenue) * 100).toFixed(1) : 0;

    res.json({ byMonth: monthly, totals });
  } catch (err) { next(err); }
});

router.get("/exchange-rates", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT er.*, u.name as updated_by_name FROM exchange_rates er
      LEFT JOIN users u ON u.id=er.updated_by ORDER BY er.from_currency`);
    res.json(rows);
  } catch (err) { next(err); }
});

router.put("/exchange-rates", requireRole("admin"), async (req, res, next) => {
  try {
    const { rates } = req.body; // [{ from_currency, to_currency, rate }]
    for (const r of rates) {
      await pool.query(
        `INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at, updated_by)
         VALUES ($1,$2,$3,NOW(),$4)
         ON CONFLICT (from_currency, to_currency) DO UPDATE SET rate=$3, updated_at=NOW(), updated_by=$4`,
        [r.from_currency, r.to_currency, r.rate, req.user.id]
      );
    }
    await logAudit(req.user.id, "RATE_UPDATED", "exchange_rates", null, null, rates, req.ip);
    res.json({ message: "Rates updated" });
  } catch (err) { next(err); }
});

module.exports = router;
