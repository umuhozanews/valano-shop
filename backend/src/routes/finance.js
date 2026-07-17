const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit } = require("../utils/helpers");
const { createReportPDF } = require("../utils/pdf");
const { exportToExcel } = require("../utils/excel");

router.use(verifyToken);

router.get("/pnl", requireRole("admin", "sme_owner", "manager", "accountant", "pulse_admin"), async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const oid = req.ownerId;
    const bfSales    = oid != null ? "AND s.owner_id = $2"  : "";
    const bfExpenses = oid != null ? "AND owner_id = $2"    : "";
    const monthlyParams = oid != null ? [year, oid] : [year];

    const query = `
      WITH month_series AS (
        SELECT generate_series(
          ($1 || '-01-01')::date,
          ($1 || '-12-31')::date,
          '1 month'::interval
        )::date AS month_start
      ),
      monthly_sales AS (
        SELECT 
          DATE_TRUNC('month', s.created_at) AS month_start,
          COALESCE(SUM(s.total_amount), 0) AS revenue,
          COALESCE(SUM(si.quantity * stk.cost_price_rwf), 0) AS cogs,
          COUNT(DISTINCT s.id) AS sales_count,
          COUNT(DISTINCT s.customer_id) AS customers_count
        FROM sales s
        LEFT JOIN sale_items si ON si.sale_id = s.id
        LEFT JOIN stock_items stk ON stk.id = si.stock_item_id
        WHERE s.is_voided = false
          AND EXTRACT(YEAR FROM s.created_at) = CAST($1 AS INTEGER)
          ${bfSales}
        GROUP BY DATE_TRUNC('month', s.created_at)
      ),
      monthly_expenses AS (
        SELECT 
          DATE_TRUNC('month', expense_date::timestamp) AS month_start,
          COALESCE(SUM(amount), 0) AS expenses_total
        FROM expenses
        WHERE EXTRACT(YEAR FROM expense_date) = CAST($1 AS INTEGER)
          ${bfExpenses}
        GROUP BY DATE_TRUNC('month', expense_date::timestamp)
      ),
      monthly_procurements AS (
        SELECT 
          DATE_TRUNC('month', po.order_date::timestamp) AS month_start,
          COALESCE(SUM(po.shipping_cost + po.customs_cost + COALESCE(items.items_cost, 0)), 0) AS procurement_total,
          COUNT(DISTINCT po.id) AS procurements_count,
          COUNT(DISTINCT po.supplier_id) AS suppliers_count
        FROM procurement_orders po
        LEFT JOIN (
          SELECT order_id, SUM(quantity * unit_cost) * COALESCE(exchange_rate, 190) AS items_cost
          FROM procurement_items pi
          JOIN procurement_orders po2 ON po2.id = pi.order_id
          GROUP BY order_id, exchange_rate
        ) items ON items.order_id = po.id
        WHERE EXTRACT(YEAR FROM po.order_date) = CAST($1 AS INTEGER)
        GROUP BY DATE_TRUNC('month', po.order_date::timestamp)
      )
      SELECT 
        TO_CHAR(ms.month_start, 'Mon YYYY') AS month,
        ms.month_start::text AS month_date,
        COALESCE(ms_s.revenue, 0)::bigint AS revenue,
        COALESCE(ms_s.cogs, 0)::bigint AS cogs,
        COALESCE(ms_e.expenses_total, 0)::bigint AS expenses,
        COALESCE(ms_p.procurement_total, 0)::bigint AS procurement,
        COALESCE(ms_s.sales_count, 0)::integer AS sales_count,
        COALESCE(ms_s.customers_count, 0)::integer AS customers_count,
        COALESCE(ms_p.procurements_count, 0)::integer AS procurements_count,
        COALESCE(ms_p.suppliers_count, 0)::integer AS suppliers_count
      FROM month_series ms
      LEFT JOIN monthly_sales ms_s ON ms_s.month_start = ms.month_start
      LEFT JOIN monthly_expenses ms_e ON ms_e.month_start = ms.month_start
      LEFT JOIN monthly_procurements ms_p ON ms_p.month_start = ms.month_start
      ORDER BY ms.month_start ASC;
    `;

    const { rows: monthly } = await pool.query(query, monthlyParams);

    const totals = monthly.reduce((acc, m) => ({
      revenue: acc.revenue + parseFloat(m.revenue),
      cogs: acc.cogs + parseFloat(m.cogs),
      expenses: acc.expenses + parseFloat(m.expenses),
      procurement: acc.procurement + parseFloat(m.procurement),
      sales_count: acc.sales_count + m.sales_count,
      customers_count: acc.customers_count + m.customers_count,
      procurements_count: acc.procurements_count + m.procurements_count,
      suppliers_count: acc.suppliers_count + m.suppliers_count,
    }), { revenue: 0, cogs: 0, expenses: 0, procurement: 0, sales_count: 0, customers_count: 0, procurements_count: 0, suppliers_count: 0 });

    totals.grossProfit = totals.revenue - totals.cogs;
    totals.grossMargin = totals.revenue > 0 ? ((totals.grossProfit / totals.revenue) * 100).toFixed(1) : 0;
    totals.netProfit = totals.grossProfit - totals.expenses;
    totals.netMargin = totals.revenue > 0 ? ((totals.netProfit / totals.revenue) * 100).toFixed(1) : 0;

    res.json({ byMonth: monthly, totals });
  } catch (err) { next(err); }
});

router.get("/pnl/daily", requireRole("admin", "sme_owner", "manager", "accountant", "pulse_admin"), async (req, res, next) => {
  try {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const oidD = req.ownerId;
    const bfSales    = oidD != null ? "AND s.owner_id = $3"  : "";
    const bfExpenses = oidD != null ? "AND owner_id = $3"    : "";
    const dailyParams = oidD != null ? [startDate, endDate, oidD] : [startDate, endDate];

    const query = `
      WITH date_series AS (
        SELECT generate_series(
          $1::date,
          $2::date,
          '1 day'::interval
        )::date AS day
      ),
      daily_sales AS (
        SELECT 
          DATE(s.created_at) AS day,
          COALESCE(SUM(s.total_amount), 0) AS revenue,
          COALESCE(SUM(si.quantity * stk.cost_price_rwf), 0) AS cogs,
          COUNT(DISTINCT s.id) AS sales_count,
          COUNT(DISTINCT s.customer_id) AS customers_count
        FROM sales s
        LEFT JOIN sale_items si ON si.sale_id = s.id
        LEFT JOIN stock_items stk ON stk.id = si.stock_item_id
        WHERE s.is_voided = false
          AND DATE(s.created_at) >= $1 AND DATE(s.created_at) <= $2
          ${bfSales}
        GROUP BY DATE(s.created_at)
      ),
      daily_expenses AS (
        SELECT 
          expense_date AS day,
          COALESCE(SUM(amount), 0) AS expenses_total
        FROM expenses
        WHERE expense_date >= $1 AND expense_date <= $2
          ${bfExpenses}
        GROUP BY expense_date
      ),
      daily_procurements AS (
        SELECT 
          po.order_date AS day,
          COALESCE(SUM(po.shipping_cost + po.customs_cost + COALESCE(items.items_cost, 0)), 0) AS procurement_total,
          COUNT(DISTINCT po.id) AS procurements_count,
          COUNT(DISTINCT po.supplier_id) AS suppliers_count
        FROM procurement_orders po
        LEFT JOIN (
          SELECT order_id, SUM(quantity * unit_cost) * COALESCE(exchange_rate, 190) AS items_cost
          FROM procurement_items pi
          JOIN procurement_orders po2 ON po2.id = pi.order_id
          GROUP BY order_id, exchange_rate
        ) items ON items.order_id = po.id
        WHERE po.order_date >= $1 AND po.order_date <= $2
        GROUP BY po.order_date
      )
      SELECT 
        ds.day::text AS date,
        COALESCE(ds_s.revenue, 0)::bigint AS revenue,
        COALESCE(ds_s.cogs, 0)::bigint AS cogs,
        COALESCE(ds_e.expenses_total, 0)::bigint AS expenses,
        COALESCE(ds_p.procurement_total, 0)::bigint AS procurement,
        COALESCE(ds_s.sales_count, 0)::integer AS sales_count,
        COALESCE(ds_s.customers_count, 0)::integer AS customers_count,
        COALESCE(ds_p.procurements_count, 0)::integer AS procurements_count,
        COALESCE(ds_p.suppliers_count, 0)::integer AS suppliers_count
      FROM date_series ds
      LEFT JOIN daily_sales ds_s ON ds_s.day = ds.day
      LEFT JOIN daily_expenses ds_e ON ds_e.day = ds.day
      LEFT JOIN daily_procurements ds_p ON ds_p.day = ds.day
      ORDER BY ds.day DESC;
    `;

    const { rows: daily } = await pool.query(query, dailyParams);

    const totals = daily.reduce((acc, r) => ({
      revenue: acc.revenue + parseFloat(r.revenue),
      cogs: acc.cogs + parseFloat(r.cogs),
      expenses: acc.expenses + parseFloat(r.expenses),
      procurement: acc.procurement + parseFloat(r.procurement),
      sales_count: acc.sales_count + r.sales_count,
      customers_count: acc.customers_count + r.customers_count,
      procurements_count: acc.procurements_count + r.procurements_count,
      suppliers_count: acc.suppliers_count + r.suppliers_count,
    }), { revenue: 0, cogs: 0, expenses: 0, procurement: 0, sales_count: 0, customers_count: 0, procurements_count: 0, suppliers_count: 0 });

    totals.grossProfit = totals.revenue - totals.cogs;
    totals.grossMargin = totals.revenue > 0 ? ((totals.grossProfit / totals.revenue) * 100).toFixed(1) : 0;
    totals.netProfit = totals.grossProfit - totals.expenses;
    totals.netMargin = totals.revenue > 0 ? ((totals.netProfit / totals.revenue) * 100).toFixed(1) : 0;

    res.json({ daily, totals });
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

router.put("/exchange-rates", requireRole("admin", "sme_owner", "pulse_admin"), async (req, res, next) => {
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
