const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { paginate } = require("../utils/helpers");
const { createInvoicePDF } = require("../utils/pdf");

router.use(verifyToken);

router.get("/", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { status, start_date, end_date, page, limit } = req.query;
    const { limit: lim, offset } = paginate(page, limit);
    const conds = ["1=1"]; const params = [];
    if (status) { params.push(status); conds.push(`i.status=$${params.length}`); }
    if (start_date) { params.push(start_date); conds.push(`DATE(i.issued_at)>=$${params.length}`); }
    if (end_date) { params.push(end_date); conds.push(`DATE(i.issued_at)<=$${params.length}`); }
    params.push(lim); params.push(offset);
    const where = conds.join(" AND ");

    const [data, cnt, summary] = await Promise.all([
      pool.query(`SELECT i.*, s.total_amount, c.name as customer_name, b.name as branch_name
         FROM invoices i JOIN sales s ON s.id=i.sale_id
         LEFT JOIN customers c ON c.id=s.customer_id LEFT JOIN branches b ON b.id=s.branch_id
         WHERE ${where} ORDER BY i.issued_at DESC
         LIMIT $${params.length-1} OFFSET $${params.length}`, params),
      pool.query(`SELECT COUNT(*) FROM invoices i WHERE ${where}`, params.slice(0,-2)),
      pool.query(`SELECT status, COUNT(*) as cnt, COALESCE(SUM(s.total_amount),0) as total
         FROM invoices i JOIN sales s ON s.id=i.sale_id GROUP BY status`),
    ]);
    res.json({ data: data.rows, total: parseInt(cnt.rows[0].count), summary: summary.rows });
  } catch (err) { next(err); }
});

router.get("/:id", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { rows: [inv] } = await pool.query(
      `SELECT i.*, s.* FROM invoices i JOIN sales s ON s.id=i.sale_id WHERE i.id=$1`, [req.params.id]
    );
    if (!inv) return res.status(404).json({ error: "Invoice not found" });
    res.json(inv);
  } catch (err) { next(err); }
});

router.get("/:id/pdf", async (req, res, next) => {
  try {
    const { rows: [invoice] } = await pool.query(
      `SELECT i.*, s.total_amount, s.payment_method FROM invoices i JOIN sales s ON s.id=i.sale_id WHERE i.id=$1`,
      [req.params.id]
    );
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const [items, branch, customer, settings] = await Promise.all([
      pool.query(`SELECT si.*, stk.name as item_name FROM sale_items si
        JOIN stock_items stk ON stk.id=si.stock_item_id WHERE si.sale_id=$1`, [invoice.sale_id]),
      pool.query(`SELECT b.* FROM sales s JOIN branches b ON b.id=s.branch_id WHERE s.id=$1`, [invoice.sale_id]),
      pool.query(`SELECT c.* FROM sales s LEFT JOIN customers c ON c.id=s.customer_id WHERE s.id=$1`, [invoice.sale_id]),
      pool.query("SELECT * FROM settings LIMIT 1"),
    ]);

    createInvoicePDF(res, {
      invoice,
      sale: invoice,
      items: items.rows,
      branch: branch.rows[0],
      customer: customer.rows[0],
      settings: settings.rows[0],
    });
  } catch (err) { next(err); }
});

router.put("/:id/status", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { status } = req.body;
    const { rows: [inv] } = await pool.query(
      "UPDATE invoices SET status=$1, paid_at=CASE WHEN $1='paid' THEN NOW() ELSE paid_at END WHERE id=$2 RETURNING *",
      [status, req.params.id]
    );
    res.json(inv);
  } catch (err) { next(err); }
});

module.exports = router;
