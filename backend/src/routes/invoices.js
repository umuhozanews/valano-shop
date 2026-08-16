const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { paginate } = require("../utils/helpers");
const { createInvoicePDF } = require("../utils/pdf");
const { ensureTenantColumns, addOwnerFilter } = require("../utils/tenant");
const { logDeletion } = require("../utils/deletion");

router.use(verifyToken);

router.get("/", requireRole("admin", "sme_owner", "manager", "accountant", "cashier", "pulse_admin"), async (req, res, next) => {
  try {
    await ensureTenantColumns();
    const { status, start_date, end_date, page, limit } = req.query;
    const { limit: lim, offset } = paginate(page, limit);
    const conds = ["1=1"]; const params = [];
    if (status) { params.push(status); conds.push(`i.status=$${params.length}`); }
    if (start_date) { params.push(start_date); conds.push(`DATE(i.issued_at)>=$${params.length}`); }
    if (end_date) { params.push(end_date); conds.push(`DATE(i.issued_at)<=$${params.length}`); }
    addOwnerFilter(conds, params, req.ownerId, 's');
    params.push(lim); params.push(offset);
    const where = conds.join(" AND ");

    const [data, cnt, summary] = await Promise.all([
      pool.query(`SELECT i.*, s.total_amount, c.name as customer_name
         FROM invoices i JOIN sales s ON s.id=i.sale_id
         LEFT JOIN customers c ON c.id=s.customer_id
         WHERE ${where} ORDER BY i.issued_at DESC
         LIMIT $${params.length-1} OFFSET $${params.length}`, params),
      pool.query(`SELECT COUNT(*) FROM invoices i JOIN sales s ON s.id=i.sale_id WHERE ${where}`, params.slice(0,-2)),
      pool.query(`SELECT i.status, COUNT(*) as cnt, COALESCE(SUM(s.total_amount),0) as total
         FROM invoices i JOIN sales s ON s.id=i.sale_id WHERE ${where} GROUP BY i.status`, params.slice(0,-2)),
    ]);
    res.json({ data: data.rows, total: parseInt(cnt.rows[0].count), summary: summary.rows });
  } catch (err) { next(err); }
});

router.get("/:id", requireRole("admin", "manager", "accountant"), async (req, res, next) => {
  try {
    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "s.owner_id=$2";
    const queryParams = isAdmin ? [req.params.id] : [req.params.id, req.ownerId];

    const { rows: [inv] } = await pool.query(
      `SELECT i.*, s.* FROM invoices i JOIN sales s ON s.id=i.sale_id WHERE i.id=$1 AND ${ownerWhere}`, queryParams
    );
    if (!inv) return res.status(404).json({ error: "Invoice not found" });
    res.json(inv);
  } catch (err) { next(err); }
});

router.get("/:id/pdf", async (req, res, next) => {
  try {
    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "s.owner_id=$2";
    const queryParams = isAdmin ? [req.params.id] : [req.params.id, req.ownerId];

    const { rows: [invoice] } = await pool.query(
      `SELECT i.*, s.total_amount, s.payment_method, s.customer_name, s.user_id, s.owner_id
       FROM invoices i JOIN sales s ON s.id=i.sale_id
       WHERE i.id=$1 AND ${ownerWhere}`,
      queryParams
    );
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const ownerId = invoice.owner_id || invoice.user_id;

    const [items, customer, settings, smeUser, debtRes] = await Promise.all([
      pool.query(`SELECT si.*, stk.name as item_name FROM sale_items si
        JOIN stock_items stk ON stk.id=si.stock_item_id WHERE si.sale_id=$1`, [invoice.sale_id]),
      pool.query(`SELECT c.* FROM sales s LEFT JOIN customers c ON c.id=s.customer_id WHERE s.id=$1`, [invoice.sale_id]),
      pool.query("SELECT * FROM settings WHERE owner_id=$1 LIMIT 1", [ownerId]).catch(() => ({ rows: [] })),
      pool.query("SELECT id, name, email, phone, sector FROM users WHERE id=$1 LIMIT 1", [ownerId]).catch(() => ({ rows: [] })),
      pool.query("SELECT * FROM accounts_receivable WHERE sale_id=$1", [invoice.sale_id]),
    ]);

    const activeSettings = settings.rows[0] || {};
    const ownerProfile = smeUser.rows[0] || {};

    createInvoicePDF(res, {
      invoice,
      sale: invoice,
      items: items.rows,
      customer: customer.rows[0],
      settings: {
        ...activeSettings,
        shop_name: activeSettings.shop_name || (ownerProfile.name ? `${ownerProfile.name}'s Shop` : "Inzira SME Store"),
        shop_address: activeSettings.shop_address || (ownerProfile.sector ? `${ownerProfile.sector}, Rwanda` : "Kigali, Rwanda"),
        shop_phone: activeSettings.shop_phone || ownerProfile.phone || "",
        shop_email: activeSettings.shop_email || ownerProfile.email || "",
      },
      debt: debtRes.rows[0] || null,
    });
  } catch (err) { next(err); }
});

router.put("/:id/status", requireRole("admin", "manager", "accountant"), async (req, res, next) => {
  try {
    const { status } = req.body;
    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const invOwnerWhere = isAdmin ? "1=1" : "owner_id=$3";
    const invParams = isAdmin ? [status, req.params.id] : [status, req.params.id, req.ownerId];

    const { rows: [inv] } = await pool.query(
      `UPDATE invoices SET status=$1, paid_at=CASE WHEN $1='paid' THEN NOW() ELSE paid_at END WHERE id=$2 AND ${invOwnerWhere} RETURNING *`,
      invParams
    );

    // Sync: If the invoice is marked as 'paid', mark any corresponding receivable as 'paid'
    if (status === "paid" && inv) {
      const arOwnerWhere = isAdmin ? "1=1" : "owner_id=$2";
      const arParams = isAdmin ? [inv.sale_id] : [inv.sale_id, req.ownerId];
      await pool.query(
        `UPDATE accounts_receivable SET status = 'paid' WHERE sale_id = $1 AND ${arOwnerWhere}`,
        arParams
      );
    }

    res.json(inv);
  } catch (err) { next(err); }
});

router.delete("/:id", requireRole("admin", "sme_owner", "manager", "accountant", "pulse_admin"), async (req, res, next) => {
  try {
    const reason = req.body?.reason || req.query?.reason || "Deleted by merchant";

    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "s.owner_id=$2";
    const queryParams = isAdmin ? [req.params.id] : [req.params.id, req.ownerId];

    const { rows: [invoice] } = await pool.query(
      `SELECT i.*, s.total_amount, s.customer_name, s.id as sale_id, s.owner_id as sale_owner_id
       FROM invoices i JOIN sales s ON s.id=i.sale_id
       WHERE i.id=$1 AND ${ownerWhere}`,
      queryParams
    );
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    // Fetch related records for full snapshot
    const [itemsRes, arRes] = await Promise.all([
      pool.query("SELECT si.*, stk.name as item_name, stk.unit, stk.barcode FROM sale_items si LEFT JOIN stock_items stk ON stk.id=si.stock_item_id WHERE si.sale_id=$1", [invoice.sale_id]),
      pool.query("SELECT * FROM accounts_receivable WHERE sale_id=$1", [invoice.sale_id]),
    ]);

    const snapshot = {
      invoice,
      sale_id: invoice.sale_id,
      items: itemsRes.rows,
      accounts_receivable: arRes.rows[0] || null,
    };

    // Log permanent snapshot into deletion_logs
    await logDeletion({
      entity_type: "invoice",
      entity_id: invoice.id,
      deleted_data: snapshot,
      deleted_by: req.user.id,
      owner_id: invoice.owner_id || invoice.sale_owner_id || req.ownerId,
      reason: String(reason).trim(),
    });

    await pool.query("BEGIN");
    await pool.query("UPDATE invoices SET status='voided' WHERE id=$1", [invoice.id]);
    await pool.query(
      "UPDATE sales SET is_voided=true, void_reason=$1, voided_by=$2 WHERE id=$3",
      [String(reason).trim(), req.user.id, invoice.sale_id]
    );
    await pool.query("UPDATE accounts_receivable SET status='voided' WHERE sale_id=$1", [invoice.sale_id]);

    // Restore stock item quantities
    for (const item of itemsRes.rows) {
      if (item.stock_item_id && /^\d+$/.test(String(item.stock_item_id))) {
        await pool.query("UPDATE stock_items SET quantity = quantity + $1 WHERE id=$2", [item.quantity, parseInt(item.stock_item_id, 10)]);
      }
    }
    await pool.query("COMMIT");

    const { logAudit } = require("../utils/helpers");
    await logAudit(
      req.user.id,
      "INVOICE_VOIDED",
      "invoices",
      invoice.id,
      invoice,
      { invoice_number: invoice.invoice_number, void_reason: String(reason).trim(), total_amount: invoice.total_amount },
      req.ip
    );

    res.json({
      success: true,
      message: `Invoice ${invoice.invoice_number} deleted, stock restored, and recorded in permanent deletion logs.`,
      id: invoice.id,
    });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    next(err);
  }
});

module.exports = router;
