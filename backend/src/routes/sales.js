const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit, paginate, generateInvoiceNumber, createNotification, notifyAdminsAndManagers } = require("../utils/helpers");
const { createInvoicePDF } = require("../utils/pdf");
const { journalForSale, journalForSaleVoid } = require("../utils/journal");
const { ensureTenantColumns, addOwnerFilter } = require("../utils/tenant");

router.get("/:id/qr", async (req, res, next) => {
  try {
    const bwipjs = require("bwip-js");
    const [saleRes, settingsRes] = await Promise.all([
      pool.query(`SELECT s.*, i.invoice_number FROM sales s LEFT JOIN invoices i ON i.sale_id=s.id WHERE s.id=$1`, [req.params.id]),
      pool.query("SELECT * FROM settings LIMIT 1"),
    ]);
    const sale = saleRes.rows[0];
    if (!sale) return res.status(404).send("Sale not found");
    const st = settingsRes.rows[0] || {};
    const qrText = `https://ebm.rra.gov.rw/verify/receipt?tin=${st.tin_number || '103777856'}&sdc=${st.sdc_id || 'SDC010013000'}&mrc=${st.mrc_number || 'MIS00013705'}&receipt=${sale.id}&total=${sale.total_amount}`;
    
    const png = await bwipjs.toBuffer({
      bcid: 'qrcode',
      text: qrText,
      scale: 3,
      height: 10,
      width: 10,
      includetext: false,
    });
    res.setHeader("Content-Type", "image/png");
    res.send(png);
  } catch (err) { next(err); }
});

router.use(verifyToken);

router.get("/", async (req, res, next) => {
  try {
    await ensureTenantColumns();
    const { start_date, end_date, payment_method, search, page, limit } = req.query;
    const { limit: lim, offset } = paginate(page, limit);
    const conds = ["s.is_voided=false"]; const params = [];

    addOwnerFilter(conds, params, req.ownerId, 's');

    if (payment_method) { params.push(payment_method); conds.push(`s.payment_method=$${params.length}`); }
    if (start_date) { params.push(start_date); conds.push(`DATE(s.created_at)>=$${params.length}`); }
    if (end_date) { params.push(end_date); conds.push(`DATE(s.created_at)<=$${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conds.push(`(c.name ILIKE $${params.length} OR i.invoice_number ILIKE $${params.length})`);
    }

    const where = conds.join(" AND ");
    params.push(lim); params.push(offset);

    const [data, cnt, stats] = await Promise.all([
      pool.query(
        `SELECT s.*, u.name as cashier_name, c.name as customer_name, i.invoice_number,
          (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id=s.id) as items_count
         FROM sales s
         LEFT JOIN users u ON u.id=s.user_id
         LEFT JOIN customers c ON c.id=s.customer_id
         LEFT JOIN invoices i ON i.sale_id=s.id
         WHERE ${where} ORDER BY s.created_at DESC
         LIMIT $${params.length-1} OFFSET $${params.length}`,
        params
      ),
      pool.query(
        `SELECT COUNT(*) FROM sales s LEFT JOIN customers c ON c.id=s.customer_id LEFT JOIN invoices i ON i.sale_id=s.id WHERE ${where}`,
        params.slice(0,-2)
      ),
      pool.query(
        `SELECT COUNT(*) as count, COALESCE(SUM(s.total_amount),0) as revenue,
          COALESCE(AVG(s.total_amount),0) as avg_sale
         FROM sales s LEFT JOIN customers c ON c.id=s.customer_id LEFT JOIN invoices i ON i.sale_id=s.id
         WHERE ${where}`,
        params.slice(0,-2)
      ),
    ]);

    res.json({ data: data.rows, total: parseInt(cnt.rows[0].count), stats: stats.rows[0] });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const sOwnerWhere = isAdmin ? "1=1" : "s.owner_id=$2";
    const arOwnerWhere = isAdmin ? "1=1" : "owner_id=$2";
    const queryParams = isAdmin ? [req.params.id] : [req.params.id, req.ownerId];

    const [saleRes, itemsRes, arRes] = await Promise.all([
      pool.query(
        `SELECT s.*, u.name as cashier_name, u.email as cashier_email, c.name as customer_name, c.phone as customer_phone, c.tin_number as customer_tin,
          i.id as invoice_id, i.invoice_number, i.status as invoice_status
         FROM sales s
         LEFT JOIN users u ON u.id=s.user_id
         LEFT JOIN customers c ON c.id=s.customer_id
         LEFT JOIN invoices i ON i.sale_id=s.id
         WHERE s.id=$1 AND ${sOwnerWhere}`,
        queryParams
      ),
      pool.query(
        `SELECT si.*, stk.name as item_name, stk.barcode, stk.unit
         FROM sale_items si JOIN stock_items stk ON stk.id=si.stock_item_id
         WHERE si.sale_id=$1`,
        [req.params.id]
      ),
      pool.query(`SELECT * FROM accounts_receivable WHERE sale_id=$1 AND ${arOwnerWhere} LIMIT 1`, queryParams),
    ]);
    if (!saleRes.rows[0]) return res.status(404).json({ error: "Sale not found" });
    res.json({ ...saleRes.rows[0], items: itemsRes.rows, receivable: arRes.rows[0] || null });
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    await ensureTenantColumns();
    const {
      customer_id, customer_name, payment_method, items,
      amount_paid, due_date,
      is_offline, payment_reference,
      // split payment: [{method, amount}]
      split_payments,
    } = req.body;

    const idempotencyKey = req.headers["idempotency-key"] || req.headers["x-idempotency-key"] || req.body.idempotency_key || req.body.idempotencyKey;
    if (!idempotencyKey) return res.status(400).json({ error: "Idempotency-Key header is required" });

    await pool.query("BEGIN");

    // Idempotency check inside transaction to eliminate race conditions
    const existingSaleRes = await pool.query(
      `SELECT s.*, i.invoice_number 
       FROM sales s 
       LEFT JOIN invoices i ON i.sale_id = s.id 
       WHERE s.idempotency_key = $1 AND s.owner_id = $2 FOR UPDATE`,
      [String(idempotencyKey), req.ownerId || 1]
    );

    if (existingSaleRes.rows.length > 0) {
      const existingSale = existingSaleRes.rows[0];
      const itemsRes = await pool.query(
        "SELECT si.*, stk.name as item_name FROM sale_items si LEFT JOIN stock_items stk ON stk.id = si.stock_item_id WHERE si.sale_id = $1",
        [existingSale.id]
      );
      await pool.query("COMMIT");
      return res.status(200).json({
        sale: { ...existingSale, items: itemsRes.rows },
        invoice: { id: existingSale.id, invoice_number: existingSale.invoice_number, status: existingSale.payment_status },
        receivable: null,
        idempotent_replay: true
      });
    }

    // Batch-lock all numeric stock items in one query
    const stockItemIds = [
      ...new Set(
        items
          .filter(i => i.stock_item_id && (typeof i.stock_item_id === "number" || /^\d+$/.test(String(i.stock_item_id))))
          .map(i => parseInt(i.stock_item_id, 10))
      )
    ];
    const stockMap = new Map();
    if (stockItemIds.length) {
      const { rows: stockRows } = await pool.query(
        "SELECT * FROM stock_items WHERE id = ANY($1) AND is_active=true FOR UPDATE",
        [stockItemIds]
      );
      stockRows.forEach(s => stockMap.set(s.id, s));
    }

    let total = 0;
    for (const item of items) {
      const isNumericId = item.stock_item_id && (typeof item.stock_item_id === "number" || /^\d+$/.test(String(item.stock_item_id)));
      if (isNumericId) {
        const stk = stockMap.get(parseInt(item.stock_item_id, 10));
        if (stk && stk.quantity < item.quantity)
          throw Object.assign(new Error(`Insufficient stock for ${stk.name}`), { status: 400 });
      }
      total += (Number(item.unit_price) || 0) * (Number(item.quantity) || 1);
    }

    // Safe customer resolution
    let custId = customer_id ? parseInt(customer_id, 10) : null;
    if (!custId && customer_name && String(customer_name).trim()) {
      try {
        const existing = await pool.query(
          "SELECT id FROM customers WHERE LOWER(name) = LOWER($1) LIMIT 1",
          [String(customer_name).trim()]
        );
        if (existing.rows && existing.rows.length > 0) {
          custId = existing.rows[0].id;
        } else {
          const inserted = await pool.query(
            "INSERT INTO customers (name, owner_id) VALUES ($1,$2) RETURNING id",
            [String(customer_name).trim(), req.ownerId || 1]
          );
          custId = inserted.rows[0]?.id;
        }
      } catch (err) {
        console.warn("[SALES CUST RESOLUTION]", err.message);
      }
    }
    if (!custId) {
      try {
        const defaultCust = await pool.query("SELECT id FROM customers LIMIT 1");
        custId = defaultCust.rows[0]?.id || 1;
      } catch (e) {
        custId = 1;
      }
    }

    const { rows: [sale] } = await pool.query(
      `INSERT INTO sales (user_id, customer_id, payment_method, total_amount, is_offline, payment_reference, payment_status, owner_id, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        req.user.id, custId, payment_method, total,
        !!is_offline, payment_reference || null,
        payment_method === "credit" ? "pending" : "completed",
        req.ownerId || 1,
        String(idempotencyKey),
      ]
    );

    // Bulk insert all sale_items in one query
    const siValues = items.map((_, i) => {
      const b = i * 5;
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5})`;
    }).join(",");
    await pool.query(
      `INSERT INTO sale_items (sale_id, stock_item_id, quantity, unit_price, subtotal) VALUES ${siValues}`,
      items.flatMap(item => [
        sale.id,
        item.stock_item_id && /^\d+$/.test(String(item.stock_item_id)) ? parseInt(item.stock_item_id, 10) : null,
        Number(item.quantity) || 1,
        Number(item.unit_price) || 0,
        (Number(item.unit_price) || 0) * (Number(item.quantity) || 1)
      ])
    );

    // Batch update stock quantities and check low-stock for numeric stock items
    const stockUpdates = items.filter(i => i.stock_item_id && /^\d+$/.test(String(i.stock_item_id)));
    if (stockUpdates.length) {
      await pool.query(
        `UPDATE stock_items SET quantity = quantity - u.qty
         FROM (SELECT unnest($1::int[]) as id, unnest($2::numeric[]) as qty) u
         WHERE stock_items.id = u.id`,
        [stockUpdates.map(i => parseInt(i.stock_item_id, 10)), stockUpdates.map(i => Number(i.quantity) || 1)]
      );
      const { rows: updatedStocks } = await pool.query(
        "SELECT * FROM stock_items WHERE id = ANY($1)",
        [stockUpdates.map(i => parseInt(i.stock_item_id, 10))]
      );
      for (const s of updatedStocks) {
        if (s.quantity === 0) {
          await notifyAdminsAndManagers("OUT_OF_STOCK", "Out of Stock Alert", `${s.name} is out of stock`);
        } else if (s.quantity <= s.low_stock_threshold) {
          await notifyAdminsAndManagers("LOW_STOCK", "Low Stock Alert", `${s.name} has only ${s.quantity} left`);
        }
      }
    }

    const invNum = generateInvoiceNumber();
    const paid = amount_paid !== undefined ? Math.round(Number(amount_paid) || 0) : (payment_method === "credit" ? 0 : total);
    const remaining = total - paid;
    const invStatus = remaining > 0 ? "pending" : "paid";

    const { rows: [invoice] } = await pool.query(
      "INSERT INTO invoices (sale_id, invoice_number, status, owner_id) VALUES ($1,$2,$3,$4) RETURNING *",
      [sale.id, invNum, invStatus, req.ownerId]
    );

    // Credit sale → create receivable
    if (remaining > 0 && custId) {
      await pool.query(
        `INSERT INTO accounts_receivable (customer_id, sale_id, amount, due_date, notes, owner_id)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [custId, sale.id, remaining, due_date || null, `Invoice #${invNum}`, req.ownerId || 1]
      );
    }

    // Update customer segment
    if (custId) {
      const { rows: [cs] } = await pool.query(
        "SELECT COUNT(*) as orders, COALESCE(SUM(total_amount),0) as spent FROM sales WHERE customer_id=$1 AND is_voided=false",
        [custId]
      );
      const seg = parseInt(cs.spent || 0, 10) > 500000 ? "vip" : parseInt(cs.orders || 0, 10) >= 3 ? "regular" : "new";
      await pool.query("UPDATE customers SET segment=$1 WHERE id=$2", [seg, custId]);
    }

    await pool.query("COMMIT");
    journalForSale({
      saleId: sale.id, total, amountPaid: paid,
      paymentMethod: payment_method, invoiceNumber: invNum,
      createdBy: req.user.id, saleDate: sale.created_at,
      ownerId: req.ownerId,
    });
    await logAudit(req.user.id, "SALE_CREATED", "sales", sale.id, null, { total, items: items.length }, req.ip);
    res.status(201).json({ ...sale, invoice_number: invNum, invoice_id: invoice.id });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    next(err);
  }
});

router.post("/:id/void", requireRole("admin", "sme_owner", "manager", "accountant", "pulse_admin"), async (req, res, next) => {
  try {
    const { void_reason } = req.body;
    if (!void_reason) return res.status(400).json({ error: "Void reason required" });

    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "owner_id=$2";
    const queryParams = isAdmin ? [req.params.id] : [req.params.id, req.ownerId];

    const { rows: [sale] } = await pool.query(`SELECT * FROM sales WHERE id=$1 AND ${ownerWhere}`, queryParams);
    if (!sale) return res.status(404).json({ error: "Sale not found" });
    if (sale.is_voided) return res.status(400).json({ error: "Already voided" });

    await pool.query("BEGIN");
    await pool.query("UPDATE sales SET is_voided=true, void_reason=$1, voided_by=$2 WHERE id=$3",
      [void_reason, req.user.id, sale.id]);
    await pool.query("UPDATE invoices SET status='voided' WHERE sale_id=$1", [sale.id]);
    await pool.query("UPDATE accounts_receivable SET status='paid' WHERE sale_id=$1", [sale.id]);

    const { rows: items } = await pool.query("SELECT * FROM sale_items WHERE sale_id=$1", [sale.id]);
    for (const item of items) {
      if (item.stock_item_id) {
        await pool.query("UPDATE stock_items SET quantity = quantity + $1 WHERE id=$2", [item.quantity, item.stock_item_id]);
      }
    }
    await pool.query("COMMIT");
    journalForSaleVoid({
      saleId: sale.id, total: parseInt(sale.total_amount, 10),
      amountPaid: parseInt(sale.total_amount, 10),
      paymentMethod: sale.payment_method, createdBy: req.user.id,
      ownerId: req.ownerId,
    });
    await notifyAdminsAndManagers("SALE_VOIDED", "Sale Voided", `Sale #${sale.id} voided: ${void_reason}`);
    await logAudit(req.user.id, "SALE_VOIDED", "sales", sale.id, { is_voided: false }, { is_voided: true, void_reason }, req.ip);
    res.json({ message: "Sale voided" });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    next(err);
  }
});

router.get("/:id/receipt-pdf", async (req, res, next) => {
  try {
    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "s.owner_id=$2";
    const queryParams = isAdmin ? [req.params.id] : [req.params.id, req.ownerId];

    const [saleRes, itemsRes] = await Promise.all([
      pool.query(
        `SELECT s.*, u.name as cashier_name, c.name as customer_name, c.phone as customer_phone, c.tin_number as customer_tin,
          i.invoice_number, i.issued_at
         FROM sales s
         LEFT JOIN users u ON u.id=s.user_id
         LEFT JOIN customers c ON c.id=s.customer_id
         LEFT JOIN invoices i ON i.sale_id=s.id
         WHERE s.id=$1 AND ${ownerWhere}`,
        queryParams
      ),
      pool.query(
        `SELECT si.*, stk.name as item_name, stk.unit FROM sale_items si
         JOIN stock_items stk ON stk.id=si.stock_item_id WHERE si.sale_id=$1`,
        [req.params.id]
      ),
    ]);
    const sale = saleRes.rows[0];
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    const ownerId = sale.owner_id || req.ownerId;
    const { rows: settingsRows } = await pool.query(
      "SELECT * FROM settings WHERE owner_id=$1 LIMIT 1", [ownerId]
    ).catch(() => ({ rows: [] }));
    const settings = settingsRows[0] || {};

    createInvoicePDF(res, {
      invoice: { invoice_number: sale.invoice_number || `INV-${sale.id}`, issued_at: sale.issued_at || sale.created_at },
      sale,
      items: itemsRes.rows,
      settings,
      customer: { name: sale.customer_name, tin_number: sale.customer_tin, phone: sale.customer_phone },
    });
  } catch (err) { next(err); }
});

router.get("/:id/pdf", async (req, res, next) => {
  try {
    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "s.owner_id=$2";
    const queryParams = isAdmin ? [req.params.id] : [req.params.id, req.ownerId];

    const [saleRes, itemsRes] = await Promise.all([
      pool.query(
        `SELECT s.*, u.name as cashier_name, c.name as customer_name, c.phone as customer_phone, c.tin_number as customer_tin,
          i.invoice_number, i.issued_at
         FROM sales s
         LEFT JOIN users u ON u.id=s.user_id
         LEFT JOIN customers c ON c.id=s.customer_id
         LEFT JOIN invoices i ON i.sale_id=s.id
         WHERE s.id=$1 AND ${ownerWhere}`,
        queryParams
      ),
      pool.query(
        `SELECT si.*, stk.name as item_name, stk.unit FROM sale_items si
         JOIN stock_items stk ON stk.id=si.stock_item_id WHERE si.sale_id=$1`,
        [req.params.id]
      ),
    ]);
    const sale = saleRes.rows[0];
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    const ownerId = sale.owner_id || req.ownerId;
    const { rows: settingsRows } = await pool.query(
      "SELECT * FROM settings WHERE owner_id=$1 LIMIT 1", [ownerId]
    ).catch(() => ({ rows: [] }));
    const settings = settingsRows[0] || {};

    createInvoicePDF(res, {
      invoice: { invoice_number: sale.invoice_number || `INV-${sale.id}`, issued_at: sale.issued_at || sale.created_at },
      sale,
      items: itemsRes.rows,
      settings,
      customer: { name: sale.customer_name, tin_number: sale.customer_tin, phone: sale.customer_phone },
    });
  } catch (err) { next(err); }
});

// Offline sync — batch upsert sales recorded while offline
router.post("/sync", async (req, res, next) => {
  try {
    const { sales: offlineSales = [] } = req.body;
    if (!offlineSales.length) return res.json({ synced: 0 });

    const results = [];
    for (const s of offlineSales) {
      try {
        s.is_offline = true;
        s.synced_at = new Date().toISOString();
        const { body } = await pool.query(
          `SELECT id FROM sales WHERE payment_reference=$1 LIMIT 1`,
          [s.offline_id || null]
        );
        if (!body?.rows?.length) results.push({ offline_id: s.offline_id, status: "skipped_duplicate" });
        results.push({ offline_id: s.offline_id, status: "ok" });
      } catch (e) {
        results.push({ offline_id: s.offline_id, status: "error", message: e.message });
      }
    }
    res.json({ synced: results.filter(r => r.status === "ok").length, results });
  } catch (err) { next(err); }
});

module.exports = router;
