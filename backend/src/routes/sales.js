const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit, paginate, generateInvoiceNumber, createNotification, notifyAdminsAndManagers } = require("../utils/helpers");
const { createInvoicePDF } = require("../utils/pdf");

router.use(verifyToken);

router.get("/", async (req, res, next) => {
  try {
    const { start_date, end_date, branch_id, worker_id, payment_method, search, page, limit } = req.query;
    const { limit: lim, offset } = paginate(page, limit);
    const conds = ["s.is_voided=false"];
    const params = [];

    if (req.user.role === "worker") {
      params.push(req.user.id); conds.push(`s.worker_id=$${params.length}`);
    } else if (req.user.role === "manager") {
      params.push(req.user.branch_id); conds.push(`s.branch_id=$${params.length}`);
    }
    if (branch_id && req.user.role === "admin") { params.push(branch_id); conds.push(`s.branch_id=$${params.length}`); }
    if (worker_id) { params.push(worker_id); conds.push(`s.worker_id=$${params.length}`); }
    if (payment_method) { params.push(payment_method); conds.push(`s.payment_method=$${params.length}`); }
    if (start_date) { params.push(start_date); conds.push(`DATE(s.created_at)>=$${params.length}`); }
    if (end_date) { params.push(end_date); conds.push(`DATE(s.created_at)<=$${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conds.push(`(c.name ILIKE $${params.length} OR i.invoice_number ILIKE $${params.length})`);
    }

    const where = conds.join(" AND ");
    params.push(lim); params.push(offset);

    const q = `SELECT s.*, u.name as worker_name, b.name as branch_name,
        c.name as customer_name, i.invoice_number,
        (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as items_count
      FROM sales s
      LEFT JOIN users u ON u.id = s.worker_id
      LEFT JOIN branches b ON b.id = s.branch_id
      LEFT JOIN customers c ON c.id = s.customer_id
      LEFT JOIN invoices i ON i.sale_id = s.id
      WHERE ${where} ORDER BY s.created_at DESC
      LIMIT $${params.length-1} OFFSET $${params.length}`;

    const [data, cnt] = await Promise.all([
      pool.query(q, params),
      pool.query(`SELECT COUNT(*) FROM sales s LEFT JOIN customers c ON c.id=s.customer_id LEFT JOIN invoices i ON i.sale_id=s.id WHERE ${where}`, params.slice(0,-2)),
    ]);

    // Summary stats
    const statsWhere = conds.slice(0, conds.length).join(" AND ");
    const statsParams = params.slice(0, -2);
    const stats = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(s.total_amount),0) as revenue,
        COALESCE(AVG(s.total_amount),0) as avg_sale
       FROM sales s LEFT JOIN customers c ON c.id=s.customer_id LEFT JOIN invoices i ON i.sale_id=s.id
       WHERE ${statsWhere}`, statsParams
    );

    res.json({
      data: data.rows, total: parseInt(cnt.rows[0].count),
      page: parseInt(page) || 1, limit: lim,
      stats: stats.rows[0],
    });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const [sale, items] = await Promise.all([
      pool.query(`SELECT s.*, u.name as worker_name, b.name as branch_name, b.location as branch_location,
          b.phone as branch_phone, c.name as customer_name, c.phone as customer_phone,
          i.invoice_number, i.status as invoice_status
         FROM sales s
         LEFT JOIN users u ON u.id=s.worker_id LEFT JOIN branches b ON b.id=s.branch_id
         LEFT JOIN customers c ON c.id=s.customer_id LEFT JOIN invoices i ON i.sale_id=s.id
         WHERE s.id=$1`, [req.params.id]),
      pool.query(`SELECT si.*, stk.name as item_name, stk.size, stk.color, stk.barcode
         FROM sale_items si JOIN stock_items stk ON stk.id=si.stock_item_id
         WHERE si.sale_id=$1`, [req.params.id]),
    ]);
    if (!sale.rows[0]) return res.status(404).json({ error: "Sale not found" });
    res.json({ ...sale.rows[0], items: items.rows });
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { customer_id, customer_name, payment_method, items } = req.body;
    if (!items?.length) return res.status(400).json({ error: "No items" });
    if (!payment_method) return res.status(400).json({ error: "Payment method required" });

    await pool.query("BEGIN");

    // Validate stock & calculate total
    let total = 0;
    for (const item of items) {
      const { rows: [stk] } = await pool.query(
        "SELECT * FROM stock_items WHERE id=$1 AND is_active=true FOR UPDATE", [item.stock_item_id]
      );
      if (!stk) throw Object.assign(new Error(`Item ${item.stock_item_id} not found`), { status: 400 });
      if (stk.quantity < item.quantity) throw Object.assign(new Error(`Insufficient stock for ${stk.name}`), { status: 400 });
      item._cost = stk.cost_price_rwf;
      total += item.unit_price * item.quantity;
    }

    // Resolve customer
    let custId = customer_id;
    if (!custId && customer_name) {
      const { rows: [c] } = await pool.query(
        `INSERT INTO customers (name) VALUES ($1)
         ON CONFLICT DO NOTHING RETURNING id`, [customer_name]
      );
      custId = c?.id;
    }

    // Insert sale
    const { rows: [sale] } = await pool.query(
      `INSERT INTO sales (worker_id, branch_id, customer_id, payment_method, total_amount)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, req.user.branch_id, custId, payment_method, total]
    );

    // Insert items + deduct stock
    for (const item of items) {
      await pool.query(
        `INSERT INTO sale_items (sale_id, stock_item_id, quantity, unit_price, subtotal)
         VALUES ($1,$2,$3,$4,$5)`,
        [sale.id, item.stock_item_id, item.quantity, item.unit_price, item.unit_price * item.quantity]
      );
      await pool.query("UPDATE stock_items SET quantity = quantity - $1 WHERE id = $2", [item.quantity, item.stock_item_id]);

      // Check low stock
      const { rows: [updated] } = await pool.query("SELECT * FROM stock_items WHERE id=$1", [item.stock_item_id]);
      if (updated.quantity === 0) {
        await notifyAdminsAndManagers("OUT_OF_STOCK", "Out of Stock Alert", `${updated.name} is out of stock`);
      } else if (updated.quantity <= updated.low_stock_threshold) {
        await notifyAdminsAndManagers("LOW_STOCK", "Low Stock Alert", `${updated.name} has only ${updated.quantity} left`);
      }
    }

    // Create invoice
    const invNum = generateInvoiceNumber();
    const { rows: [invoice] } = await pool.query(
      `INSERT INTO invoices (sale_id, invoice_number, status, issued_at)
       VALUES ($1,$2,'paid',NOW()) RETURNING *`, [sale.id, invNum]
    );

    // Update customer stats / segment
    if (custId) {
      const { rows: [cs] } = await pool.query(
        "SELECT COUNT(*) as orders, SUM(total_amount) as spent FROM sales WHERE customer_id=$1 AND is_voided=false",
        [custId]
      );
      const seg = cs.spent > 500000 ? "vip" : cs.orders >= 3 ? "regular" : "new";
      await pool.query("UPDATE customers SET segment=$1 WHERE id=$2", [seg, custId]);
    }

    await pool.query("COMMIT");
    await logAudit(req.user.id, "SALE_CREATED", "sales", sale.id, null, { total, items: items.length }, req.ip);
    res.status(201).json({ ...sale, invoice_number: invNum, invoice_id: invoice.id });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    next(err);
  }
});

router.post("/:id/void", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    const { void_reason } = req.body;
    if (!void_reason) return res.status(400).json({ error: "Void reason required" });

    const { rows: [sale] } = await pool.query("SELECT * FROM sales WHERE id=$1", [req.params.id]);
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    if (sale.is_voided) return res.status(400).json({ error: "Already voided" });

    await pool.query("BEGIN");
    await pool.query("UPDATE sales SET is_voided=true, void_reason=$1, voided_by=$2 WHERE id=$3",
      [void_reason, req.user.id, sale.id]);
    await pool.query("UPDATE invoices SET status='voided' WHERE sale_id=$1", [sale.id]);

    // Restore stock
    const { rows: items } = await pool.query("SELECT * FROM sale_items WHERE sale_id=$1", [sale.id]);
    for (const item of items) {
      await pool.query("UPDATE stock_items SET quantity = quantity + $1 WHERE id = $2", [item.quantity, item.stock_item_id]);
    }
    await pool.query("COMMIT");

    await notifyAdminsAndManagers("SALE_VOIDED", "Sale Voided", `Sale #${sale.id} voided: ${void_reason}`);
    await logAudit(req.user.id, "SALE_VOIDED", "sales", sale.id, { is_voided: false }, { is_voided: true, void_reason }, req.ip);
    res.json({ message: "Sale voided" });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    next(err);
  }
});

module.exports = router;
