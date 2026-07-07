const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { createReportPDF } = require("../utils/pdf");
const { exportToExcel } = require("../utils/excel");

router.use(verifyToken, requireRole("admin", "sme_owner", "manager", "accountant", "pulse_admin"));

function addDateFilter(params, conds, { start_date, end_date, col = "created_at" }) {
  if (start_date) { params.push(start_date); conds.push(`DATE(${col})>=$${params.length}`); }
  if (end_date) { params.push(end_date); conds.push(`DATE(${col})<=$${params.length}`); }
}

// ─── Sales report ─────────────────────────────────────────────────────────────
router.get("/sales", async (req, res, next) => {
  try {
    const { start_date, end_date, payment_method, export: exp } = req.query;
    const conds = ["s.is_voided=false"]; const params = [];
    if (payment_method) { params.push(payment_method); conds.push(`s.payment_method=$${params.length}`); }
    addDateFilter(params, conds, { start_date, end_date, col: "s.created_at" });

    const [sales, daily, byPayment, totals] = await Promise.all([
      pool.query(
        `SELECT s.*, u.name as cashier_name, c.name as customer_name, i.invoice_number
         FROM sales s LEFT JOIN users u ON u.id=s.user_id LEFT JOIN customers c ON c.id=s.customer_id
         LEFT JOIN invoices i ON i.sale_id=s.id WHERE ${conds.join(" AND ")} ORDER BY s.created_at DESC`,
        params
      ),
      pool.query(
        `SELECT DATE(s.created_at) as date, COUNT(*) as count, SUM(s.total_amount) as revenue
         FROM sales s WHERE ${conds.join(" AND ")} GROUP BY DATE(s.created_at) ORDER BY date`,
        params
      ),
      pool.query(
        `SELECT payment_method, COUNT(*) as count, SUM(total_amount) as revenue
         FROM sales s WHERE ${conds.join(" AND ")} GROUP BY payment_method`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) as total_sales, COALESCE(SUM(total_amount),0) as total_revenue,
          COALESCE(AVG(total_amount),0) as avg_sale FROM sales s WHERE ${conds.join(" AND ")}`,
        params
      ),
    ]);

    if (exp === "pdf") {
      return createReportPDF(res, {
        title: "Sales Report",
        dateRange: `${start_date || "All time"} – ${end_date || "Today"}`,
        columns: ["Date", "Transactions", "Revenue (RWF)"],
        rows: daily.rows.map(r => [r.date, r.count, parseInt(r.revenue).toLocaleString()]),
        totalsRow: ["TOTAL", totals.rows[0].total_sales, parseInt(totals.rows[0].total_revenue).toLocaleString()],
      });
    }
    if (exp === "excel") {
      return exportToExcel(res, [
        { name: "Daily", headers: ["Date", "Transactions", "Revenue"],
          rows: daily.rows.map(r => [r.date, r.count, r.revenue]) },
        { name: "By Payment", headers: ["Method", "Count", "Revenue"],
          rows: byPayment.rows.map(r => [r.payment_method, r.count, r.revenue]) },
      ]);
    }
    res.json({ sales: sales.rows, daily: daily.rows, byPayment: byPayment.rows, totals: totals.rows[0] });
  } catch (err) { next(err); }
});

// ─── Stock report ─────────────────────────────────────────────────────────────
router.get("/stock", async (req, res, next) => {
  try {
    const { export: exp } = req.query;
    const { rows } = await pool.query(
      `SELECT si.*,
        si.quantity * si.cost_price_rwf as total_cost_value,
        CASE WHEN si.quantity=0 THEN 'out_of_stock'
             WHEN si.quantity<=si.low_stock_threshold THEN 'low_stock'
             ELSE 'in_stock' END as stock_status
       FROM stock_items si WHERE si.is_active=true ORDER BY si.category, si.name`
    );
    const totals = rows.reduce((a, r) => ({
      items: a.items + 1,
      value: a.value + parseInt(r.total_cost_value || 0),
      low: a.low + (r.stock_status === "low_stock" ? 1 : 0),
      out: a.out + (r.stock_status === "out_of_stock" ? 1 : 0),
    }), { items: 0, value: 0, low: 0, out: 0 });

    if (exp === "excel") {
      return exportToExcel(res, [{
        name: "Stock",
        headers: ["Name", "Kinyarwanda", "Category", "Unit", "Qty", "Cost RWF", "Sell RWF", "Total Value", "Status"],
        rows: rows.map(r => [r.name, r.name_rw||"", r.category||"", r.unit||"pcs", r.quantity, r.cost_price_rwf, r.sell_price_rwf, r.total_cost_value, r.stock_status]),
        totals: ["TOTAL","","","","","","", totals.value,""],
      }]);
    }
    res.json({ data: rows, totals });
  } catch (err) { next(err); }
});

// ─── Financial P&L ────────────────────────────────────────────────────────────
router.get("/financial", async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    const conds = ["s.is_voided=false"]; const params = [];
    addDateFilter(params, conds, { start_date, end_date, col: "s.created_at" });

    const expConds = ["1=1"]; const expParams = [];
    addDateFilter(expParams, expConds, { start_date, end_date, col: "e.expense_date" });

    const [revenue, cogs, expenses] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(total_amount),0) as v FROM sales s WHERE ${conds.join(" AND ")}`, params),
      pool.query(
        `SELECT COALESCE(SUM(si.quantity * stk.cost_price_rwf),0) as v FROM sale_items si
         JOIN sales s ON s.id=si.sale_id JOIN stock_items stk ON stk.id=si.stock_item_id
         WHERE ${conds.join(" AND ")}`,
        params
      ),
      pool.query(
        `SELECT category, COALESCE(SUM(amount),0) as total FROM expenses e
         WHERE ${expConds.join(" AND ")} GROUP BY category ORDER BY total DESC`,
        expParams
      ),
    ]);

    const rev = parseInt(revenue.rows[0].v);
    const costOfGoods = parseInt(cogs.rows[0].v);
    const grossProfit = rev - costOfGoods;
    const totalExpenses = expenses.rows.reduce((s, r) => s + parseInt(r.total), 0);
    const netProfit = grossProfit - totalExpenses;

    res.json({
      revenue: rev,
      costOfGoods,
      grossProfit,
      grossMargin: rev > 0 ? Math.round((grossProfit / rev) * 100) : 0,
      expenses: expenses.rows,
      totalExpenses,
      netProfit,
      netMargin: rev > 0 ? Math.round((netProfit / rev) * 100) : 0,
    });
  } catch (err) { next(err); }
});

// ─── Daily summary ────────────────────────────────────────────────────────────
router.get("/daily", async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().split("T")[0];

    const [sales, expenses, topItems, stockAlerts] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as tx_count, COALESCE(SUM(total_amount),0) as revenue,
          payment_method, COUNT(*) as method_count
         FROM sales WHERE DATE(created_at)=$1 AND is_voided=false
         GROUP BY payment_method`,
        [date]
      ),
      pool.query(
        "SELECT category, COALESCE(SUM(amount),0) as total FROM expenses WHERE expense_date=$1 GROUP BY category",
        [date]
      ),
      pool.query(
        `SELECT stk.name, SUM(si.quantity) as qty, SUM(si.subtotal) as revenue
         FROM sale_items si JOIN sales s ON s.id=si.sale_id JOIN stock_items stk ON stk.id=si.stock_item_id
         WHERE DATE(s.created_at)=$1 AND s.is_voided=false GROUP BY stk.id, stk.name ORDER BY revenue DESC LIMIT 5`,
        [date]
      ),
      pool.query("SELECT name, quantity, low_stock_threshold FROM stock_items WHERE is_active=true AND quantity<=low_stock_threshold ORDER BY quantity ASC LIMIT 10"),
    ]);

    const totalRevenue = sales.rows.reduce((s, r) => s + parseInt(r.revenue), 0);
    const totalExpenses = expenses.rows.reduce((s, r) => s + parseInt(r.total), 0);

    res.json({
      date,
      totalRevenue,
      totalExpenses,
      netCash: totalRevenue - totalExpenses,
      transactions: sales.rows,
      expenseByCategory: expenses.rows,
      topItems: topItems.rows,
      stockAlerts: stockAlerts.rows,
    });
  } catch (err) { next(err); }
});

// ─── Weekly report ────────────────────────────────────────────────────────────
router.get("/weekly", async (req, res, next) => {
  try {
    const [thisWeek, lastWeek, byDay, topItems] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(total_amount),0) as revenue, COUNT(*) as tx
         FROM sales WHERE created_at>=DATE_TRUNC('week',NOW()) AND is_voided=false`
      ),
      pool.query(
        `SELECT COALESCE(SUM(total_amount),0) as revenue, COUNT(*) as tx
         FROM sales WHERE created_at>=DATE_TRUNC('week',NOW()-INTERVAL '1 week')
           AND created_at<DATE_TRUNC('week',NOW()) AND is_voided=false`
      ),
      pool.query(
        `SELECT DATE(created_at) as date, SUM(total_amount) as revenue, COUNT(*) as tx
         FROM sales WHERE created_at>=NOW()-INTERVAL '7 days' AND is_voided=false
         GROUP BY DATE(created_at) ORDER BY date`
      ),
      pool.query(
        `SELECT stk.name, SUM(si.quantity) as qty_sold, SUM(si.subtotal) as revenue
         FROM sale_items si JOIN sales s ON s.id=si.sale_id JOIN stock_items stk ON stk.id=si.stock_item_id
         WHERE s.created_at>=NOW()-INTERVAL '7 days' AND s.is_voided=false
         GROUP BY stk.id, stk.name ORDER BY revenue DESC LIMIT 5`
      ),
    ]);

    const thisRev = parseInt(thisWeek.rows[0].revenue);
    const lastRev = parseInt(lastWeek.rows[0].revenue);

    res.json({
      thisWeek: { revenue: thisRev, transactions: parseInt(thisWeek.rows[0].tx) },
      lastWeek: { revenue: lastRev, transactions: parseInt(lastWeek.rows[0].tx) },
      weekOnWeekChange: lastRev > 0 ? Math.round(((thisRev - lastRev) / lastRev) * 100) : null,
      byDay: byDay.rows,
      topItems: topItems.rows,
    });
  } catch (err) { next(err); }
});

// ─── Monthly business report ──────────────────────────────────────────────────
router.get("/monthly", async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const startDate = `${month}-01`;
    const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0)
      .toISOString().split("T")[0];

    const [revenue, cogs, expenses, stockVal, arSummary, healthScore, topItems] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(total_amount),0) as v, COUNT(*) as tx FROM sales
         WHERE DATE(created_at) BETWEEN $1 AND $2 AND is_voided=false`,
        [startDate, endDate]
      ),
      pool.query(
        `SELECT COALESCE(SUM(si.quantity*stk.cost_price_rwf),0) as v
         FROM sale_items si JOIN sales s ON s.id=si.sale_id JOIN stock_items stk ON stk.id=si.stock_item_id
         WHERE DATE(s.created_at) BETWEEN $1 AND $2 AND s.is_voided=false`,
        [startDate, endDate]
      ),
      pool.query(
        `SELECT category, SUM(amount) as total FROM expenses
         WHERE expense_date BETWEEN $1 AND $2 GROUP BY category ORDER BY total DESC`,
        [startDate, endDate]
      ),
      pool.query("SELECT COALESCE(SUM(quantity*cost_price_rwf),0) as v FROM stock_items WHERE is_active=true"),
      pool.query(
        `SELECT COALESCE(SUM(amount-amount_paid),0) as outstanding,
          COUNT(*) FILTER (WHERE status='overdue') as overdue_count
         FROM accounts_receivable WHERE status IN ('pending','partial','overdue')`
      ),
      pool.query(
        "SELECT score, band, factors FROM health_score_log WHERE user_id=$1 ORDER BY calculated_at DESC LIMIT 1",
        [req.user.id]
      ),
      pool.query(
        `SELECT stk.name, SUM(si.quantity) as qty_sold, SUM(si.subtotal) as revenue
         FROM sale_items si JOIN sales s ON s.id=si.sale_id JOIN stock_items stk ON stk.id=si.stock_item_id
         WHERE DATE(s.created_at) BETWEEN $1 AND $2 AND s.is_voided=false
         GROUP BY stk.id, stk.name ORDER BY revenue DESC LIMIT 10`,
        [startDate, endDate]
      ),
    ]);

    const rev = parseInt(revenue.rows[0].v);
    const costOfGoods = parseInt(cogs.rows[0].v);
    const totalExp = expenses.rows.reduce((s, r) => s + parseInt(r.total), 0);

    res.json({
      period: { month, startDate, endDate },
      revenue: rev,
      transactions: parseInt(revenue.rows[0].tx),
      costOfGoods,
      grossProfit: rev - costOfGoods,
      grossMargin: rev > 0 ? Math.round(((rev - costOfGoods) / rev) * 100) : 0,
      expenses: expenses.rows,
      totalExpenses: totalExp,
      netProfit: rev - costOfGoods - totalExp,
      netMargin: rev > 0 ? Math.round(((rev - costOfGoods - totalExp) / rev) * 100) : 0,
      stockValue: parseInt(stockVal.rows[0].v),
      accountsReceivable: arSummary.rows[0],
      healthScore: healthScore.rows[0] || null,
      topItems: topItems.rows,
    });
  } catch (err) { next(err); }
});

// ─── VAT Tax Report (Rwanda 18%) ──────────────────────────────────────────────
router.get("/tax/vat", async (req, res, next) => {
  try {
    const { start_date, end_date, export: exp } = req.query;
    const conds = ["s.is_voided=false"]; const params = [];
    addDateFilter(params, conds, { start_date, end_date, col: "s.created_at" });

    const VAT_RATE = 0.18;
    const { rows } = await pool.query(
      `SELECT
        DATE_TRUNC('month', s.created_at) as month,
        COUNT(*) as transactions,
        COALESCE(SUM(s.total_amount),0) as gross_sales,
        ROUND(COALESCE(SUM(s.total_amount),0) / (1+$${params.length+1})) as net_sales,
        ROUND(COALESCE(SUM(s.total_amount),0) - COALESCE(SUM(s.total_amount),0) / (1+$${params.length+1})) as vat_collected
       FROM sales s WHERE ${conds.join(" AND ")}
       GROUP BY DATE_TRUNC('month', s.created_at)
       ORDER BY month`,
      [...params, VAT_RATE]
    );

    const totals = rows.reduce((a, r) => ({
      transactions: a.transactions + parseInt(r.transactions),
      gross_sales: a.gross_sales + parseInt(r.gross_sales),
      net_sales: a.net_sales + parseInt(r.net_sales),
      vat_collected: a.vat_collected + parseInt(r.vat_collected),
    }), { transactions: 0, gross_sales: 0, net_sales: 0, vat_collected: 0 });

    if (exp === "excel") {
      return exportToExcel(res, [{
        name: "VAT Report",
        headers: ["Month", "Transactions", "Gross Sales (RWF)", "Net Sales (RWF)", "VAT Collected (RWF)"],
        rows: rows.map(r => [r.month?.toISOString().slice(0,7), r.transactions, r.gross_sales, r.net_sales, r.vat_collected]),
        totals: ["TOTAL", totals.transactions, totals.gross_sales, totals.net_sales, totals.vat_collected],
      }]);
    }

    res.json({
      vat_rate: VAT_RATE,
      period: { start_date, end_date },
      byMonth: rows,
      totals,
    });
  } catch (err) { next(err); }
});

// ─── RSSB Contribution Report ─────────────────────────────────────────────────
// Rwanda Social Security: employee 3% + employer 5% of gross salary
router.get("/tax/rssb", async (req, res, next) => {
  try {
    const { start_date, end_date, export: exp } = req.query;
    const conds = ["1=1"]; const params = [];
    addDateFilter(params, conds, { start_date, end_date, col: "e.expense_date" });
    conds.push(`e.category='Salaries'`);

    const { rows } = await pool.query(
      `SELECT
        DATE_TRUNC('month', e.expense_date::timestamp) as month,
        SUM(e.amount) as gross_salaries,
        ROUND(SUM(e.amount) * 0.03) as employee_contribution,
        ROUND(SUM(e.amount) * 0.05) as employer_contribution,
        ROUND(SUM(e.amount) * 0.08) as total_rssb
       FROM expenses e WHERE ${conds.join(" AND ")}
       GROUP BY DATE_TRUNC('month', e.expense_date::timestamp)
       ORDER BY month`,
      params
    );

    const totals = rows.reduce((a, r) => ({
      gross_salaries: a.gross_salaries + parseInt(r.gross_salaries || 0),
      employee_contribution: a.employee_contribution + parseInt(r.employee_contribution || 0),
      employer_contribution: a.employer_contribution + parseInt(r.employer_contribution || 0),
      total_rssb: a.total_rssb + parseInt(r.total_rssb || 0),
    }), { gross_salaries: 0, employee_contribution: 0, employer_contribution: 0, total_rssb: 0 });

    if (exp === "excel") {
      return exportToExcel(res, [{
        name: "RSSB Report",
        headers: ["Month", "Gross Salaries (RWF)", "Employee 3% (RWF)", "Employer 5% (RWF)", "Total RSSB (RWF)"],
        rows: rows.map(r => [r.month?.toISOString().slice(0,7), r.gross_salaries, r.employee_contribution, r.employer_contribution, r.total_rssb]),
        totals: ["TOTAL", totals.gross_salaries, totals.employee_contribution, totals.employer_contribution, totals.total_rssb],
      }]);
    }

    res.json({ period: { start_date, end_date }, byMonth: rows, totals });
  } catch (err) { next(err); }
});

module.exports = router;
