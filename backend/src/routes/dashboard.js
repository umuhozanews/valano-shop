const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const { ensureTenantColumns } = require("../utils/tenant");

router.use(verifyToken);

router.get("/stats", async (req, res, next) => {
  try {
    await ensureTenantColumns();
    const oid = req.ownerId;
    const oWhere = oid !== null && oid !== undefined ? ` AND owner_id = $1` : '';
    const oParam = oid !== null && oid !== undefined ? [oid] : [];

    const [stockVal, todayRev, todayTx, monthRev, lowStock, outStock, todayExp, monthExp, lastMonthRev] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(quantity*cost_price_rwf),0) as v FROM stock_items WHERE is_active=true${oWhere}`, oParam),
      pool.query(`SELECT COALESCE(SUM(total_amount),0) as v FROM sales WHERE DATE(created_at)=CURRENT_DATE AND is_voided=false${oWhere}`, oParam),
      pool.query(`SELECT COUNT(*) as v FROM sales WHERE DATE(created_at)=CURRENT_DATE AND is_voided=false${oWhere}`, oParam),
      pool.query(`SELECT COALESCE(SUM(total_amount),0) as v FROM sales WHERE DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW()) AND is_voided=false${oWhere}`, oParam),
      pool.query(`SELECT COUNT(*) as v FROM stock_items WHERE is_active=true AND quantity>0 AND quantity<=low_stock_threshold${oWhere}`, oParam),
      pool.query(`SELECT COUNT(*) as v FROM stock_items WHERE is_active=true AND quantity=0${oWhere}`, oParam),
      pool.query(`SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE DATE(expense_date)=CURRENT_DATE${oWhere}`, oParam),
      pool.query(`SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE DATE_TRUNC('month',expense_date::timestamp)=DATE_TRUNC('month',NOW())${oWhere}`, oParam),
      pool.query(`SELECT COALESCE(SUM(total_amount),0) as v FROM sales WHERE DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW()-INTERVAL '1 month') AND is_voided=false${oWhere}`, oParam),
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
       WHERE DATE_TRUNC('month',s.created_at)=DATE_TRUNC('month',NOW()) AND s.is_voided=false${oWhere.replace('owner_id', 's.owner_id')}`,
      oParam
    );

    // Top product today
    const { rows: topProduct } = await pool.query(
      `SELECT stk.name, SUM(si.quantity) as qty_sold, SUM(si.subtotal) as revenue
       FROM sale_items si JOIN sales s ON s.id=si.sale_id JOIN stock_items stk ON stk.id=si.stock_item_id
       WHERE DATE(s.created_at)=CURRENT_DATE AND s.is_voided=false${oWhere.replace('owner_id', 's.owner_id')}
       GROUP BY stk.id, stk.name ORDER BY revenue DESC LIMIT 1`,
      oParam
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
      `SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE DATE_TRUNC('month',expense_date::timestamp)=DATE_TRUNC('month',NOW()-INTERVAL '1 month')${oWhere}`,
      oParam
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
    const oid = req.ownerId;
    const sOwner = oid !== null && oid !== undefined ? ` AND s.owner_id = $2` : '';
    const eOwner = oid !== null && oid !== undefined ? ` AND owner_id = $2` : '';
    const oParam = oid !== null && oid !== undefined ? [days, oid] : [days];

    const { rows } = await pool.query(
      `WITH dates AS (
         SELECT generate_series(CURRENT_DATE - ($1 || ' days')::INTERVAL + INTERVAL '1 day', CURRENT_DATE, '1 day')::date AS date
       ),
       d_sales AS (
         SELECT DATE(created_at) as date, COALESCE(SUM(total_amount),0) as revenue, COUNT(*) as transactions
         FROM sales s WHERE created_at >= CURRENT_DATE - ($1 || ' days')::INTERVAL AND is_voided=false ${sOwner}
         GROUP BY DATE(created_at)
       ),
       d_cogs AS (
         SELECT DATE(s.created_at) as date, COALESCE(SUM(si.quantity * stk.cost_price_rwf),0) as cogs
         FROM sale_items si
         JOIN sales s ON s.id = si.sale_id
         JOIN stock_items stk ON stk.id = si.stock_item_id
         WHERE s.created_at >= CURRENT_DATE - ($1 || ' days')::INTERVAL AND s.is_voided=false ${sOwner}
         GROUP BY DATE(s.created_at)
       ),
       d_expenses AS (
         SELECT DATE(expense_date) as date, COALESCE(SUM(amount),0) as expenses
         FROM expenses
         WHERE expense_date >= CURRENT_DATE - ($1 || ' days')::INTERVAL ${eOwner}
         GROUP BY DATE(expense_date)
       )
       SELECT 
         d.date::text,
         COALESCE(s.revenue, 0)::bigint as revenue,
         COALESCE(s.transactions, 0)::integer as transactions,
         COALESCE(c.cogs, 0)::bigint as cogs,
         COALESCE(e.expenses, 0)::bigint as expenses,
         (COALESCE(s.revenue, 0) - COALESCE(c.cogs, 0) - COALESCE(e.expenses, 0))::bigint as net_profit
       FROM dates d
       LEFT JOIN d_sales s ON s.date = d.date
       LEFT JOIN d_cogs c ON c.date = d.date
       LEFT JOIN d_expenses e ON e.date = d.date
       ORDER BY d.date ASC`,
      oParam
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/top-items", async (req, res, next) => {
  try {
    const oid = req.ownerId;
    const oWhere = oid !== null && oid !== undefined ? ` AND s.owner_id = $1` : '';
    const oParam = oid !== null && oid !== undefined ? [oid] : [];
    const { rows } = await pool.query(
      `SELECT stk.name, stk.category, stk.unit,
        SUM(si.quantity) as total_sold, SUM(si.subtotal) as revenue
       FROM sale_items si
       JOIN stock_items stk ON stk.id=si.stock_item_id
       JOIN sales s ON s.id=si.sale_id
       WHERE s.is_voided=false AND DATE_TRUNC('month',s.created_at)=DATE_TRUNC('month',NOW())${oWhere}
       GROUP BY stk.id, stk.name, stk.category, stk.unit
       ORDER BY revenue DESC LIMIT 5`,
      oParam
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/stock-health", async (req, res, next) => {
  try {
    const oid = req.ownerId;
    const oWhere = oid !== null && oid !== undefined ? ` AND owner_id = $1` : '';
    const oParam = oid !== null && oid !== undefined ? [oid] : [];
    const { rows } = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE quantity>low_stock_threshold) as in_stock,
        COUNT(*) FILTER (WHERE quantity>0 AND quantity<=low_stock_threshold) as low_stock,
        COUNT(*) FILTER (WHERE quantity=0) as out_of_stock
       FROM stock_items WHERE is_active=true${oWhere}`,
      oParam
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get("/low-stock-alerts", async (req, res, next) => {
  try {
    const oid = req.ownerId;
    const oWhere = oid !== null && oid !== undefined ? ` AND owner_id = $1` : '';
    const oParam = oid !== null && oid !== undefined ? [oid] : [];
    const { rows } = await pool.query(
      `SELECT * FROM stock_items
       WHERE is_active=true AND quantity<=low_stock_threshold${oWhere}
       ORDER BY quantity ASC LIMIT 20`,
      oParam
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/worker-leaderboard", async (req, res, next) => {
  try {
    const oid = req.ownerId;
    const oWhere = oid !== null && oid !== undefined ? ` AND s.owner_id = $1` : '';
    const oParam = oid !== null && oid !== undefined ? [oid] : [];
    // Filter users to only this owner's team when ownerId is set
    const userFilter = oid !== null && oid !== undefined
      ? ` AND (u.id = $1 OR u.owner_id = $1)`
      : '';
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.role,
        COUNT(s.id) as sales_count,
        COALESCE(SUM(s.total_amount),0) as revenue
       FROM users u
       LEFT JOIN sales s ON s.user_id=u.id
         AND DATE_TRUNC('month',s.created_at)=DATE_TRUNC('month',NOW())
         AND s.is_voided=false${oWhere}
       WHERE u.role IN ('sme_owner','manager','cashier','admin') AND u.is_active=true${userFilter}
       GROUP BY u.id, u.name, u.role
       ORDER BY revenue DESC LIMIT 10`,
      oParam
    );
    // Add a monthly_target placeholder so the frontend progress bar renders
    res.json(rows.map(r => ({ ...r, monthly_target: 0 })));
  } catch (err) { next(err); }
});

router.get("/activity-feed", async (req, res, next) => {
  try {
    const oid = req.ownerId;
    let query, params;
    if (oid != null) {
      query = `SELECT al.*, u.name as user_name, u.role as user_role
               FROM audit_log al LEFT JOIN users u ON u.id=al.user_id
               WHERE al.user_id IN (
                 SELECT id FROM users WHERE id=$1 OR owner_id=$1
               )
               ORDER BY al.created_at DESC LIMIT 15`;
      params = [oid];
    } else {
      query = `SELECT al.*, u.name as user_name, u.role as user_role
               FROM audit_log al LEFT JOIN users u ON u.id=al.user_id
               ORDER BY al.created_at DESC LIMIT 15`;
      params = [];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
