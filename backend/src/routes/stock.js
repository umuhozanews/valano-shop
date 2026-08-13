const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit, paginate, notifyAdminsAndManagers } = require("../utils/helpers");
const { generateBarcodeBuffer } = require("../utils/barcode");
const { ensureTenantColumns, addOwnerFilter } = require("../utils/tenant");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.use(verifyToken);

router.get("/", async (req, res, next) => {
  try {
    await ensureTenantColumns();
    const { category, unit, status, search, page, limit } = req.query;
    const { limit: lim, offset } = paginate(page, limit);
    const conds = ["si.is_active=true"]; const params = [];

    addOwnerFilter(conds, params, req.ownerId, 'si');

    if (category) { params.push(category); conds.push(`si.category=$${params.length}`); }
    if (unit) { params.push(unit); conds.push(`si.unit=$${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conds.push(`(si.name ILIKE $${params.length} OR si.name_rw ILIKE $${params.length} OR si.barcode ILIKE $${params.length})`);
    }
    if (status === "out_of_stock") conds.push("si.quantity=0");
    else if (status === "low_stock") conds.push("si.quantity>0 AND si.quantity<=si.low_stock_threshold");
    else if (status === "in_stock") conds.push("si.quantity>si.low_stock_threshold");

    const where = conds.join(" AND ");
    params.push(lim); params.push(offset);

    const [data, cnt] = await Promise.all([
      pool.query(
        `SELECT si.*,
          CASE WHEN si.quantity=0 THEN 'out_of_stock'
               WHEN si.quantity<=si.low_stock_threshold THEN 'low_stock'
               ELSE 'in_stock' END as stock_status,
          CASE WHEN si.cost_price_rwf>0
               THEN ROUND(((si.sell_price_rwf-si.cost_price_rwf)::numeric/si.cost_price_rwf)*100,1)
               ELSE 0 END as margin_pct
         FROM stock_items si
         WHERE ${where} ORDER BY si.name ASC
         LIMIT $${params.length-1} OFFSET $${params.length}`,
        params
      ),
      pool.query(`SELECT COUNT(*) FROM stock_items si WHERE ${where}`, params.slice(0,-2)),
    ]);

    res.json({ data: data.rows, total: parseInt(cnt.rows[0].count) });
  } catch (err) { next(err); }
});

router.get("/categories", async (req, res, next) => {
  try {
    await ensureTenantColumns();
    const conds = ["is_active=true", "category IS NOT NULL"]; const params = [];
    addOwnerFilter(conds, params, req.ownerId);
    const { rows } = await pool.query(
      `SELECT DISTINCT category FROM stock_items WHERE ${conds.join(" AND ")} ORDER BY category`,
      params
    );
    res.json(rows.map(r => r.category));
  } catch (err) { next(err); }
});

router.get("/valuation", requireRole("admin", "sme_owner", "accountant", "pulse_admin"), async (req, res, next) => {
  try {
    await ensureTenantColumns();
    const vConds = ["is_active=true"]; const vParams = [];
    addOwnerFilter(vConds, vParams, req.ownerId);
    const vWhere = vConds.join(" AND ");
    // AVCO stock valuation
    const { rows } = await pool.query(
      `SELECT
        COALESCE(SUM(quantity * cost_price_rwf),0) as total_cost_value,
        COALESCE(SUM(quantity * sell_price_rwf),0) as total_sell_value,
        COUNT(*) as total_items,
        COUNT(*) FILTER (WHERE quantity=0) as out_of_stock,
        COUNT(*) FILTER (WHERE quantity>0 AND quantity<=low_stock_threshold) as low_stock,
        COUNT(*) FILTER (WHERE quantity>low_stock_threshold) as in_stock
       FROM stock_items WHERE ${vWhere}`,
      vParams
    );
    const bConds = ["is_active=true", "category IS NOT NULL"]; const bParams = [];
    addOwnerFilter(bConds, bParams, req.ownerId);
    const byCategory = await pool.query(
      `SELECT category,
        COALESCE(SUM(quantity*cost_price_rwf),0) as cost_value,
        COALESCE(SUM(quantity*sell_price_rwf),0) as sell_value,
        SUM(quantity) as total_qty
       FROM stock_items WHERE ${bConds.join(" AND ")}
       GROUP BY category ORDER BY cost_value DESC`,
      bParams
    );
    res.json({ summary: rows[0], byCategory: byCategory.rows });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "si.owner_id=$2";
    const queryParams = isAdmin ? [req.params.id] : [req.params.id, req.ownerId];

    const { rows } = await pool.query(
      `SELECT si.*,
        CASE WHEN si.quantity=0 THEN 'out_of_stock'
             WHEN si.quantity<=si.low_stock_threshold THEN 'low_stock'
             ELSE 'in_stock' END as stock_status
       FROM stock_items si WHERE si.id=$1 AND ${ownerWhere}`,
      queryParams
    );
    if (!rows[0]) return res.status(404).json({ error: "Item not found" });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get("/:id/barcode", async (req, res, next) => {
  try {
    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "owner_id=$2";
    const queryParams = isAdmin ? [req.params.id] : [req.params.id, req.ownerId];

    const { rows } = await pool.query(`SELECT barcode FROM stock_items WHERE id=$1 AND ${ownerWhere}`, queryParams);
    if (!rows[0]?.barcode) return res.status(404).json({ error: "No barcode" });
    const buf = await generateBarcodeBuffer(rows[0].barcode);
    res.setHeader("Content-Type", "image/png");
    res.send(buf);
  } catch (err) { next(err); }
});

router.get("/:id/history", async (req, res, next) => {
  try {
    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "s.owner_id=$2";
    const queryParams = isAdmin ? [req.params.id] : [req.params.id, req.ownerId];

    const { rows } = await pool.query(
      `SELECT 'sale' as type, s.created_at as date, si.quantity, u.name as done_by
       FROM sale_items si
       JOIN sales s ON s.id=si.sale_id
       LEFT JOIN users u ON u.id=s.user_id
       WHERE si.stock_item_id=$1 AND ${ownerWhere}
       ORDER BY date DESC LIMIT 50`,
      queryParams
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.get("/print-labels", async (req, res, next) => {
  try {
    const { ids } = req.query;
    const idList = String(ids).split(",").map(Number).filter(Boolean);
    if (!idList.length) return res.status(400).json({ error: "No item IDs" });

    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "owner_id=$2";
    const queryParams = isAdmin ? [idList] : [idList, req.ownerId];

    const { rows } = await pool.query(
      `SELECT * FROM stock_items WHERE id=ANY($1::int[]) AND ${ownerWhere} AND is_active=true`, queryParams
    );

    const sOwnerWhere = isAdmin ? "1=1" : "owner_id=$1";
    const sParams = isAdmin ? [] : [req.ownerId];
    const { rows: [settings] } = await pool.query(`SELECT shop_name FROM settings WHERE ${sOwnerWhere} LIMIT 1`, sParams);
    const shopName = settings?.shop_name || "Inzira Insights";

    const doc = new PDFDocument({ margin: 10, size: [170, 100] });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=labels.pdf");
    doc.pipe(res);

    for (let i = 0; i < rows.length; i++) {
      const item = rows[i];
      if (i > 0) doc.addPage();
      try {
        const barBuf = await generateBarcodeBuffer(item.barcode);
        doc.image(barBuf, 10, 5, { width: 150, height: 40 });
      } catch (_) {}
      doc.fontSize(7).font("Helvetica-Bold").text(shopName, 10, 50, { align: "center", width: 150 });
      doc.fontSize(8).font("Helvetica").text(item.name, 10, 60, { align: "center", width: 150 });
      if (item.name_rw) doc.fontSize(7).text(`(${item.name_rw})`, 10, 68, { align: "center", width: 150 });
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#10B981")
         .text(`${new Intl.NumberFormat("en-RW").format(item.sell_price_rwf)} RWF`, 10, 76, { align: "center", width: 150 });
    }
    doc.end();
  } catch (err) { next(err); }
});

router.post("/", requireRole("admin", "sme_owner", "manager", "pulse_admin"), async (req, res, next) => {
  try {
    await ensureTenantColumns();
    const { name, name_rw, category, unit, quantity, cost_price_rwf, sell_price_rwf, low_stock_threshold, image_url } = req.body;
    if (!name) return res.status(400).json({ error: "Product name required" });

    const barcode = `INZ${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const { rows: [item] } = await pool.query(
      `INSERT INTO stock_items (name, name_rw, category, unit, barcode, image_url, quantity, cost_price_rwf, sell_price_rwf, low_stock_threshold, owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        name, name_rw || null, category || null, unit || "pcs",
        barcode, image_url || null,
        parseInt(quantity) || 0,
        parseInt(cost_price_rwf) || 0,
        parseInt(sell_price_rwf) || 0,
        parseInt(low_stock_threshold) || 5,
        req.ownerId,
      ]
    );
    await logAudit(req.user.id, "STOCK_CREATED", "stock_items", item.id, null, item, req.ip);
    res.status(201).json(item);
  } catch (err) { next(err); }
});

router.put("/:id", requireRole("admin", "sme_owner", "manager", "pulse_admin"), async (req, res, next) => {
  try {
    const { name, name_rw, category, unit, quantity, cost_price_rwf, sell_price_rwf, low_stock_threshold, image_url } = req.body;
    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "owner_id=$2";
    const queryParams = isAdmin ? [req.params.id] : [req.params.id, req.ownerId];

    const { rows: [old] } = await pool.query(`SELECT * FROM stock_items WHERE id=$1 AND ${ownerWhere}`, queryParams);
    if (!old) return res.status(404).json({ error: "Item not found" });

    const updateOwnerWhere = isAdmin ? "1=1" : "owner_id=$11";
    const updateParams = [
      name || old.name,
      name_rw !== undefined ? name_rw : old.name_rw,
      category !== undefined ? category : old.category,
      unit || old.unit || "pcs",
      quantity !== undefined ? parseInt(quantity) : old.quantity,
      cost_price_rwf !== undefined ? parseInt(cost_price_rwf) : old.cost_price_rwf,
      sell_price_rwf !== undefined ? parseInt(sell_price_rwf) : old.sell_price_rwf,
      low_stock_threshold !== undefined ? parseInt(low_stock_threshold) : old.low_stock_threshold,
      image_url || null,
      req.params.id,
    ];
    if (!isAdmin) updateParams.push(req.ownerId);

    const { rows: [item] } = await pool.query(
      `UPDATE stock_items SET name=$1, name_rw=$2, category=$3, unit=$4,
        quantity=$5, cost_price_rwf=$6, sell_price_rwf=$7, low_stock_threshold=$8,
        image_url=COALESCE($9, image_url)
       WHERE id=$10 AND ${updateOwnerWhere} RETURNING *`,
      updateParams
    );
    await logAudit(req.user.id, "STOCK_UPDATED", "stock_items", item.id, old, item, req.ip);
    res.json(item);
  } catch (err) { next(err); }
});

// Adjust stock quantity with mandatory reason
router.post("/:id/adjust", requireRole("admin", "sme_owner", "manager", "pulse_admin"), async (req, res, next) => {
  try {
    const { adjustment, reason } = req.body;
    if (adjustment === undefined) return res.status(400).json({ error: "adjustment amount required" });
    if (!reason) return res.status(400).json({ error: "Reason is required for stock adjustment" });

    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "owner_id=$2";
    const queryParams = isAdmin ? [req.params.id] : [req.params.id, req.ownerId];

    const { rows: [old] } = await pool.query(`SELECT * FROM stock_items WHERE id=$1 AND ${ownerWhere}`, queryParams);
    if (!old) return res.status(404).json({ error: "Item not found" });

    const newQty = Math.max(0, old.quantity + parseInt(adjustment));
    const updateOwnerWhere = isAdmin ? "1=1" : "owner_id=$3";
    const updateParams = isAdmin ? [newQty, req.params.id] : [newQty, req.params.id, req.ownerId];

    const { rows: [item] } = await pool.query(
      `UPDATE stock_items SET quantity=$1 WHERE id=$2 AND ${updateOwnerWhere} RETURNING *`,
      updateParams
    );

    if (item.quantity === 0) {
      await notifyAdminsAndManagers("OUT_OF_STOCK", "Out of Stock", `${item.name} is now out of stock`);
    } else if (item.quantity <= item.low_stock_threshold) {
      await notifyAdminsAndManagers("LOW_STOCK", "Low Stock Alert", `${item.name} has only ${item.quantity} left`);
    }

    await logAudit(req.user.id, "STOCK_ADJUSTED", "stock_items", item.id, old, { quantity: newQty, reason }, req.ip);
    res.json(item);
  } catch (err) { next(err); }
});

router.delete("/:id", requireRole("admin", "sme_owner", "pulse_admin"), async (req, res, next) => {
  try {
    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "owner_id=$2";
    const queryParams = isAdmin ? [req.params.id] : [req.params.id, req.ownerId];

    const { rows: [item] } = await pool.query(`SELECT id FROM stock_items WHERE id=$1 AND ${ownerWhere}`, queryParams);
    if (!item) return res.status(404).json({ error: "Item not found" });

    await pool.query(`UPDATE stock_items SET is_active=false WHERE id=$1 AND ${ownerWhere}`, queryParams);
    await logAudit(req.user.id, "STOCK_DELETED", "stock_items", req.params.id, null, null, req.ip);
    res.json({ message: "Item removed" });
  } catch (err) { next(err); }
});

module.exports = router;
