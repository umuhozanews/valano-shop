const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { createReportPDF } = require("../utils/pdf");
const { exportToExcel } = require("../utils/excel");

router.use(verifyToken, requireRole("admin", "manager"));

function dateFilter(params, conds, { start_date, end_date, dateCol = "created_at" }) {
  if (start_date) { params.push(start_date); conds.push(`DATE(${dateCol})>=$${params.length}`); }
  if (end_date) { params.push(end_date); conds.push(`DATE(${dateCol})<=$${params.length}`); }
}

router.get("/sales", async (req, res, next) => {
  try {
    const { start_date, end_date, branch_id, export: exp } = req.query;
    const conds = ["s.is_voided=false"]; const params = [];
    const bf = req.user.role === "manager" ? req.user.branch_id : branch_id;
    if (bf) { params.push(bf); conds.push(`s.branch_id=$${params.length}`); }
    dateFilter(params, conds, { start_date, end_date, dateCol: "s.created_at" });

    const [daily, workers, totals] = await Promise.all([
      pool.query(`SELECT DATE(s.created_at) as date, COUNT(*) as count, SUM(s.total_amount) as revenue
        FROM sales s WHERE ${conds.join(" AND ")} GROUP BY DATE(s.created_at) ORDER BY date`, params),
      pool.query(`SELECT u.name, b.name as branch, COUNT(s.id) as sales, SUM(s.total_amount) as revenue,
          AVG(s.total_amount) as avg_sale, MAX(s.created_at) as best_day
         FROM sales s JOIN users u ON u.id=s.worker_id JOIN branches b ON b.id=s.branch_id
         WHERE ${conds.join(" AND ")} GROUP BY u.id, u.name, b.name ORDER BY revenue DESC`, params),
      pool.query(`SELECT COUNT(*) as total_sales, COALESCE(SUM(total_amount),0) as total_revenue,
          COALESCE(AVG(total_amount),0) as avg_sale
         FROM sales s WHERE ${conds.join(" AND ")}`, params),
    ]);

    if (exp === "pdf") {
      return createReportPDF(res, {
        title: "Sales Report",
        dateRange: `${start_date || "All time"} – ${end_date || "Today"}`,
        columns: ["Date", "Sales Count", "Revenue (RWF)"],
        rows: daily.rows.map(r => [r.date, r.count, parseInt(r.revenue).toLocaleString()]),
        totalsRow: ["TOTAL", totals.rows[0].total_sales, parseInt(totals.rows[0].total_revenue).toLocaleString()],
      });
    }
    if (exp === "excel") {
      return exportToExcel(res, [
        { name: "Daily Sales", headers: ["Date", "Sales Count", "Revenue (RWF)"],
          rows: daily.rows.map(r => [r.date, r.count, r.revenue]),
          totals: ["TOTAL", totals.rows[0].total_sales, totals.rows[0].total_revenue] },
        { name: "By Worker", headers: ["Worker", "Branch", "Sales", "Revenue", "Avg Sale"],
          rows: workers.rows.map(r => [r.name, r.branch, r.sales, r.revenue, Math.round(r.avg_sale)]) },
      ]);
    }

    res.json({ daily: daily.rows, workers: workers.rows, totals: totals.rows[0] });
  } catch (err) { next(err); }
});

router.get("/stock", async (req, res, next) => {
  try {
    const { branch_id, export: exp } = req.query;
    const conds = ["si.is_active=true"]; const params = [];
    const bf = req.user.role === "manager" ? req.user.branch_id : branch_id;
    if (bf) { params.push(bf); conds.push(`si.branch_id=$${params.length}`); }

    const { rows } = await pool.query(`
      SELECT si.*, b.name as branch_name,
        si.quantity * si.cost_price_rwf as total_value,
        CASE WHEN si.quantity=0 THEN 'out_of_stock'
             WHEN si.quantity<=si.low_stock_threshold THEN 'low_stock'
             ELSE 'in_stock' END as status
      FROM stock_items si LEFT JOIN branches b ON b.id=si.branch_id
      WHERE ${conds.join(" AND ")} ORDER BY si.category, si.name`, params);

    const totals = rows.reduce((a, r) => ({
      items: a.items + 1,
      value: a.value + parseInt(r.total_value || 0),
      low: a.low + (r.status === "low_stock" ? 1 : 0),
      out: a.out + (r.status === "out_of_stock" ? 1 : 0),
    }), { items: 0, value: 0, low: 0, out: 0 });

    if (exp === "pdf") {
      return createReportPDF(res, {
        title: "Stock Report",
        columns: ["Name", "Category", "Size", "Branch", "Qty", "Cost (RWF)", "Sell (RWF)", "Status"],
        rows: rows.map(r => [r.name, r.category || "", r.size || "", r.branch_name, r.quantity, r.cost_price_rwf, r.sell_price_rwf, r.status]),
      });
    }
    if (exp === "excel") {
      return exportToExcel(res, [{
        name: "Stock",
        headers: ["Name", "Category", "Size", "Color", "Branch", "Qty", "Cost RWF", "Sell RWF", "Total Value", "Status"],
        rows: rows.map(r => [r.name, r.category, r.size, r.color, r.branch_name, r.quantity, r.cost_price_rwf, r.sell_price_rwf, r.total_value, r.status]),
        totals: ["TOTAL", "", "", "", "", "", "", "", totals.value, ""],
      }]);
    }

    res.json({ data: rows, totals });
  } catch (err) { next(err); }
});

router.get("/worker-performance", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { start_date, end_date, export: exp } = req.query;
    const conds = ["s.is_voided=false"]; const params = [];
    dateFilter(params, conds, { start_date, end_date, dateCol: "s.created_at" });
    if (req.user.role === "manager") { params.push(req.user.branch_id); conds.push(`u.branch_id=$${params.length}`); }

    const { rows } = await pool.query(`
      SELECT u.id, u.name, b.name as branch, u.monthly_target, u.commission_rate,
        COUNT(s.id) as sales_count,
        COALESCE(SUM(s.total_amount),0) as revenue,
        CASE WHEN u.monthly_target > 0
             THEN ROUND(COALESCE(SUM(s.total_amount),0)::numeric / u.monthly_target * 100, 1)
             ELSE 0 END as achievement_pct,
        ROUND(COALESCE(SUM(s.total_amount),0) * u.commission_rate / 100) as commission_due
      FROM users u
      JOIN branches b ON b.id=u.branch_id
      LEFT JOIN sales s ON s.worker_id=u.id AND ${conds.join(" AND ")}
      WHERE u.role='worker' AND u.is_active=true
      GROUP BY u.id, u.name, b.name, u.monthly_target, u.commission_rate
      ORDER BY revenue DESC`, params
    );

    if (exp === "excel") {
      return exportToExcel(res, [{
        name: "Worker Performance",
        headers: ["Worker", "Branch", "Sales", "Revenue", "Target", "Achievement %", "Commission Due"],
        rows: rows.map(r => [r.name, r.branch, r.sales_count, r.revenue, r.monthly_target, r.achievement_pct + "%", r.commission_due]),
      }]);
    }
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/procurement", requireRole("admin"), async (req, res, next) => {
  try {
    const { start_date, end_date, export: exp } = req.query;
    const conds = ["1=1"]; const params = [];
    dateFilter(params, conds, { start_date, end_date, dateCol: "po.order_date" });

    const { rows } = await pool.query(`
      SELECT po.*, s.name as supplier_name,
        (SELECT COALESCE(SUM(pi.quantity * pi.unit_cost),0) FROM procurement_items pi WHERE pi.order_id=po.id) as items_cost_cny,
        (SELECT COALESCE(SUM(pi.quantity * pi.unit_cost),0) FROM procurement_items pi WHERE pi.order_id=po.id) * COALESCE(po.exchange_rate,190) as items_cost_rwf
      FROM procurement_orders po LEFT JOIN suppliers s ON s.id=po.supplier_id
      WHERE ${conds.join(" AND ")} ORDER BY po.order_date DESC`, params);

    if (exp === "excel") {
      return exportToExcel(res, [{
        name: "Procurement",
        headers: ["Order#", "Supplier", "Date", "Currency", "Items Cost", "Shipping", "Customs", "Total RWF", "Status"],
        rows: rows.map(r => [r.id, r.supplier_name, r.order_date, r.currency, r.items_cost_cny, r.shipping_cost, r.customs_cost, Math.round(r.items_cost_rwf + parseFloat(r.shipping_cost||0) + parseFloat(r.customs_cost||0)), r.status]),
      }]);
    }
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
