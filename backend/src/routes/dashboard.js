const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");

router.use(verifyToken);

const branchFilter = (user) => user.role === "admin" ? "" : "AND branch_id = $1";
const branchParams = (user, extra = []) => user.role === "admin" ? extra : [user.branch_id, ...extra];

router.get("/stats", async (req, res, next) => {
  try {
    const u = req.user;
    const bf = u.role === "admin" ? "1=1" : "branch_id = $1";
    const bp = u.role === "admin" ? [] : [u.branch_id];
    const idx = bp.length + 1;

    const [stockVal, todayRev, monthRev, workers, lowStock, outStock] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(quantity * cost_price_rwf),0) as v FROM stock_items WHERE is_active=true AND ${bf}`, bp),
      pool.query(`SELECT COALESCE(SUM(total_amount),0) as v FROM sales WHERE DATE(created_at)=CURRENT_DATE AND is_voided=false AND ${bf}`, bp),
      pool.query(`SELECT COALESCE(SUM(total_amount),0) as v FROM sales WHERE DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW()) AND is_voided=false AND ${bf}`, bp),
      pool.query(`SELECT COUNT(*) as v FROM users WHERE is_active=true AND role='worker' AND ${bf}`, bp),
      pool.query(`SELECT COUNT(*) as v FROM stock_items WHERE is_active=true AND quantity > 0 AND quantity <= low_stock_threshold AND ${bf}`, bp),
      pool.query(`SELECT COUNT(*) as v FROM stock_items WHERE is_active=true AND quantity = 0 AND ${bf}`, bp),
    ]);

    // Monthly profit = revenue - COGS - expenses
    const [cogs, expenses] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(si.quantity * stk.cost_price_rwf),0) as v FROM sale_items si
        JOIN sales s ON s.id = si.sale_id JOIN stock_items stk ON stk.id = si.stock_item_id
        WHERE DATE_TRUNC('month',s.created_at)=DATE_TRUNC('month',NOW()) AND s.is_voided=false AND ${bf.replace(/branch_id/g,'s.branch_id')}`, bp),
      pool.query(`SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE DATE_TRUNC('month',expense_date::timestamp)=DATE_TRUNC('month',NOW()) AND ${bf.replace(/branch_id/g, 'branch_id')}`, bp),
    ]);

    res.json({
      totalStockValue: parseInt(stockVal.rows[0].v),
      todayRevenue: parseInt(todayRev.rows[0].v),
      monthlyRevenue: parseInt(monthRev.rows[0].v),
      monthlyProfit: parseInt(monthRev.rows[0].v) - parseInt(cogs.rows[0].v) - parseInt(expenses.rows[0].v),
      activeWorkers: parseInt(workers.rows[0].v),
      lowStockCount: parseInt(lowStock.rows[0].v),
      outOfStockCount: parseInt(outStock.rows[0].v),
    });
  } catch (err) { next(err); }
});

router.get("/sales-trend", async (req, res, next) => {
  try {
    const u = req.user;
    const bf = u.role === "admin" ? "1=1" : "s.branch_id = $2";
    const bp = u.role === "admin" ? [] : [u.branch_id];
    const days = parseInt(req.query.days) || 30;
    const { rows } = await pool.query(`
      SELECT DATE(s.created_at) as date,
             SUM(s.total_amount) as revenue,
             SUM(CASE WHEN s.branch_id=1 THEN s.total_amount ELSE 0 END) as branch1,
             SUM(CASE WHEN s.branch_id=2 THEN s.total_amount ELSE 0 END) as branch2
      FROM sales s
      WHERE s.created_at >= NOW() - ($1 || ' days')::INTERVAL
        AND s.is_voided = false AND ${bf}
      GROUP BY DATE(s.created_at)
      ORDER BY date`, [days, ...bp]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/branch-comparison", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.name as branch, COALESCE(SUM(s.total_amount),0) as revenue,
             COUNT(s.id) as sales_count
      FROM branches b LEFT JOIN sales s ON s.branch_id = b.id
        AND DATE_TRUNC('month',s.created_at)=DATE_TRUNC('month',NOW())
        AND s.is_voided=false
      GROUP BY b.id, b.name ORDER BY revenue DESC`);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/top-items", async (req, res, next) => {
  try {
    const u = req.user;
    const bf = u.role === "admin" ? "1=1" : "s.branch_id = $2";
    const bp = u.role === "admin" ? [] : [u.branch_id];
    const limit = parseInt(req.query.limit) || 10;
    const { rows } = await pool.query(`
      SELECT stk.name, stk.category,
             SUM(si.quantity) as total_sold,
             SUM(si.subtotal) as revenue
      FROM sale_items si
      JOIN stock_items stk ON stk.id = si.stock_item_id
      JOIN sales s ON s.id = si.sale_id
      WHERE s.is_voided=false
        AND DATE_TRUNC('month',s.created_at)=DATE_TRUNC('month',NOW())
        AND ${bf}
      GROUP BY stk.id, stk.name, stk.category
      ORDER BY revenue DESC LIMIT $1`, [limit, ...bp]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/stock-health", async (req, res, next) => {
  try {
    const u = req.user;
    const bf = u.role === "admin" ? "1=1" : "branch_id = $1";
    const bp = u.role === "admin" ? [] : [u.branch_id];
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE quantity > low_stock_threshold) as in_stock,
        COUNT(*) FILTER (WHERE quantity > 0 AND quantity <= low_stock_threshold) as low_stock,
        COUNT(*) FILTER (WHERE quantity = 0) as out_of_stock
      FROM stock_items WHERE is_active=true AND ${bf}`, bp);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get("/activity-feed", async (req, res, next) => {
  try {
    const u = req.user;
    const bf = u.role === "admin" ? "1=1" : "u.branch_id = $1";
    const bp = u.role === "admin" ? [] : [u.branch_id];
    const { rows } = await pool.query(`
      SELECT al.*, u.name as user_name, u.role as user_role
      FROM audit_log al LEFT JOIN users u ON u.id = al.user_id
      WHERE ${bf}
      ORDER BY al.created_at DESC LIMIT 10`, bp);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/worker-leaderboard", async (req, res, next) => {
  try {
    const u = req.user;
    const bf = u.role === "admin" ? "1=1" : "u.branch_id = $1";
    const bp = u.role === "admin" ? [] : [u.branch_id];
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.avatar_url, b.name as branch,
             COUNT(s.id) as sales_count,
             COALESCE(SUM(s.total_amount),0) as revenue,
             u.monthly_target
      FROM users u
      JOIN branches b ON b.id = u.branch_id
      LEFT JOIN sales s ON s.worker_id = u.id
        AND DATE_TRUNC('month',s.created_at)=DATE_TRUNC('month',NOW())
        AND s.is_voided=false
      WHERE u.role='worker' AND u.is_active=true AND ${bf}
      GROUP BY u.id, u.name, u.avatar_url, b.name, u.monthly_target
      ORDER BY revenue DESC LIMIT 3`, bp);
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/low-stock-alerts", async (req, res, next) => {
  try {
    const u = req.user;
    const bf = u.role === "admin" ? "1=1" : "branch_id = $1";
    const bp = u.role === "admin" ? [] : [u.branch_id];
    const { rows } = await pool.query(`
      SELECT si.*, b.name as branch_name FROM stock_items si
      JOIN branches b ON b.id = si.branch_id
      WHERE si.is_active=true AND si.quantity <= si.low_stock_threshold AND ${bf}
      ORDER BY si.quantity ASC LIMIT 10`, bp);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
