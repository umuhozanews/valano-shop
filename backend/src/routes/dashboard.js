const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken } = require("../middleware/auth");

router.use(verifyToken);

router.get("/stats", async (req, res, next) => {
  try {
    const [stockVal, todayRev, todayTx, monthRev, lowStock, outStock, todayExp, monthExp, lastMonthRev] = await Promise.all([
      pool.query("SELECT COALESCE(SUM(quantity*cost_price_rwf),0) as v FROM stock_items WHERE is_active=true"),
      pool.query("SELECT COALESCE(SUM(total_amount),0) as v FROM sales WHERE DATE(created_at)=CURRENT_DATE AND is_voided=false"),
      pool.query("SELECT COUNT(*) as v FROM sales WHERE DATE(created_at)=CURRENT_DATE AND is_voided=false"),
      pool.query("SELECT COALESCE(SUM(total_amount),0) as v FROM sales WHERE DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW()) AND is_voided=false"),
      pool.query("SELECT COUNT(*) as v FROM stock_items WHERE is_active=true AND quantity>0 AND quantity<=low_stock_threshold"),
      pool.query("SELECT COUNT(*) as v FROM stock_items WHERE is_active=true AND quantity=0"),
      pool.query("SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE DATE(expense_date)=CURRENT_DATE"),
      pool.query("SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE DATE_TRUNC('month',expense_date::timestamp)=DATE_TRUNC('month',NOW())"),
      pool.query("SELECT COALESCE(SUM(total_amount),0) as v FROM sales WHERE DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW()-INTERVAL '1 month') AND is_voided=false"),
    ]);

    // Month-on-month sales change
    const thisMonth = parseInt(monthRev.rows[0].v);
    const lastMonth = parseInt(lastMonthRev.rows[0].v);
    const salesChangePct = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;

    // Net cash position today
    const netCash = parseInt(todayRev.rows[0].v) - parseInt(todayExp.rows[0].v);

    // COGS this month
    const { rows: [cogs] } = await pool.query(
      `SELECT COALESCE(SUM(si.quantity*stk.cost_price_rwf),0) as v
       FROM sale_items si JOIN sales s ON s.id=si.sale_id JOIN stock_items stk ON stk.id=si.stock_item_id
       WHERE DATE_TRUNC('month',s.created_at)=DATE_TRUNC('month',NOW()) AND s.is_voided=false`
    );

    // Top product today
    const { rows: topProduct } = await pool.query(
      `SELECT stk.name, SUM(si.quantity) as qty_sold, SUM(si.subtotal) as revenue
       FROM sale_items si JOIN sales s ON s.id=si.sale_id JOIN stock_items stk ON stk.id=si.stock_item_id
       WHERE DATE(s.created_at)=CURRENT_DATE AND s.is_voided=false
       GROUP BY stk.id, stk.name ORDER BY revenue DESC LIMIT 1`
    );

    // Latest health score
    const { rows: [healthScore] } = await pool.query(
      "SELECT score, band FROM health_score_log WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1",
      [req.user.id]
    );

    // Alerts
    const alerts = [];
    if (parseInt(lowStock.rows[0].v) > 0)
      alerts.push({ type: "low_stock", message: `${lowStock.rows[0].v} product(s) running low on stock` });
    if (salesChangePct !== null && salesChangePct <= -60)
      alerts.push({ type: "sales_drop", message: `Sales down ${Math.abs(salesChangePct)}% vs last month` });

    // Expense spike: this month vs last month
    const { rows: [lastMonthExp] } = await pool.query(
      "SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE DATE_TRUNC('month',expense_date::timestamp)=DATE_TRUNC('month',NOW()-INTERVAL '1 month')"
    );
    if (parseInt(lastMonthExp.v) > 0 && parseInt(monthExp.rows[0].v) > parseInt(lastMonthExp.v) * 1.5)
      alerts.push({ type: "expense_spike", message: "Expenses this month are 50%+ higher than last month" });

    if (healthScore && healthScore.score < 50)
      alerts.push({ type: "health_score", message: `Your business health score is ${healthScore.score}/100 — action needed` });

    res.json({
      totalStockValue: parseInt(stockVal.rows[0].v),
      todayRevenue: parseInt(todayRev.rows[0].v),
      todayTransactions: parseInt(todayTx.rows[0].v),
      netCashToday: netCash,
      monthlyRevenue: thisMonth,
      monthlyExpenses: parseInt(monthExp.rows[0].v),
      monthlyProfit: thisMonth - parseInt(cogs.v) - parseInt(monthExp.rows[0].v),
      salesChangePct,
      lowStockCount: parseInt(lowStock.rows[0].v),
      outOfStockCount: parseInt(outStock.rows[0].v),
      topProductToday: topProduct[0] || null,
      healthScore: healthScore || null,
      alerts,
    });
  } catch (err) { next(err); }
});

router.get("/sales-trend", async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 90);
    const { rows } = await pool.query(
      `SELECT DATE(created_at) as date,
        SUM(total_amount) as revenue,
        COUNT(*) as transactions
       FROM sales
       WHERE created_at >= NOW() - ($1 || ' days')::INTERVAL AND is_voided=false
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [days]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/top-items", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT stk.name, stk.category, stk.unit,
        SUM(si.quantity) as total_sold, SUM(si.subtotal) as revenue
       FROM sale_items si
       JOIN stock_items stk ON stk.id=si.stock_item_id
       JOIN sales s ON s.id=si.sale_id
       WHERE s.is_voided=false AND DATE_TRUNC('month',s.created_at)=DATE_TRUNC('month',NOW())
       GROUP BY stk.id, stk.name, stk.category, stk.unit
       ORDER BY revenue DESC LIMIT 5`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/stock-health", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE quantity>low_stock_threshold) as in_stock,
        COUNT(*) FILTER (WHERE quantity>0 AND quantity<=low_stock_threshold) as low_stock,
        COUNT(*) FILTER (WHERE quantity=0) as out_of_stock
       FROM stock_items WHERE is_active=true`
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get("/low-stock-alerts", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM stock_items
       WHERE is_active=true AND quantity<=low_stock_threshold
       ORDER BY quantity ASC LIMIT 20`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/worker-leaderboard", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.role,
        COUNT(s.id) as sales_count,
        COALESCE(SUM(s.total_amount),0) as revenue
       FROM users u
       LEFT JOIN sales s ON s.user_id=u.id
         AND DATE_TRUNC('month',s.created_at)=DATE_TRUNC('month',NOW())
         AND s.is_voided=false
       WHERE u.role IN ('sme_owner','manager','cashier','admin') AND u.is_active=true
       GROUP BY u.id, u.name, u.role
       ORDER BY revenue DESC LIMIT 10`
    );
    // Add a monthly_target placeholder so the frontend progress bar renders
    res.json(rows.map(r => ({ ...r, monthly_target: 0 })));
  } catch (err) { next(err); }
});

router.get("/activity-feed", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT al.*, u.name as user_name, u.role as user_role
       FROM audit_log al LEFT JOIN users u ON u.id=al.user_id
       ORDER BY al.created_at DESC LIMIT 15`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
