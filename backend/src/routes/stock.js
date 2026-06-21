const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit, paginate, notifyAdminsAndManagers } = require("../utils/helpers");
const { generateBarcodeBuffer, generateBarcodeDataURL } = require("../utils/barcode");
const { createReportPDF } = require("../utils/pdf");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

router.use(verifyToken);

const STOCK_SELECT = `
  SELECT si.*, b.name as branch_name,
    CASE WHEN si.quantity = 0 THEN 'out_of_stock'
         WHEN si.quantity <= si.low_stock_threshold THEN 'low_stock'
         ELSE 'in_stock' END as status,
    CASE WHEN si.cost_price_rwf > 0
         THEN ROUND(((si.sell_price_rwf - si.cost_price_rwf)::numeric / si.cost_price_rwf) * 100, 1)
         ELSE 0 END as margin_pct
  FROM stock_items si LEFT JOIN branches b ON b.id = si.branch_id
  WHERE si.is_active = true`;

router.get("/", async (req, res, next) => {
  try {
    const { branch_id, category, status, search, page, limit } = req.query;
    const { limit: lim, offset } = paginate(page, limit);
    const conditions = ["si.is_active = true"];
    const params = [];

    if (req.user.role !== "admin" && req.user.branch_id) {
      params.push(req.user.branch_id);
      conditions.push(`si.branch_id = $${params.length}`);
    } else if (branch_id) {
      params.push(branch_id);
      conditions.push(`si.branch_id = $${params.length}`);
    }
    if (category) { params.push(category); conditions.push(`si.category = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(si.name ILIKE $${params.length} OR si.barcode ILIKE $${params.length})`);
    }
    if (status === "out_of_stock") conditions.push("si.quantity = 0");
    else if (status === "low_stock") conditions.push("si.quantity > 0 AND si.quantity <= si.low_stock_threshold");
    else if (status === "in_stock") conditions.push("si.quantity > si.low_stock_threshold");

    const where = conditions.join(" AND ");
    params.push(lim); params.push(offset);

    const [data, count] = await Promise.all([
      pool.query(`SELECT si.*, b.name as branch_name,
        CASE WHEN si.quantity = 0 THEN 'out_of_stock'
             WHEN si.quantity <= si.low_stock_threshold THEN 'low_stock'
             ELSE 'in_stock' END as status,
        CASE WHEN si.cost_price_rwf > 0
             THEN ROUND(((si.sell_price_rwf - si.cost_price_rwf)::numeric / si.cost_price_rwf) * 100, 1)
             ELSE 0 END as margin_pct
        FROM stock_items si LEFT JOIN branches b ON b.id = si.branch_id
        WHERE ${where} ORDER BY si.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params),
      pool.query(`SELECT COUNT(*) FROM stock_items si WHERE ${where}`, params.slice(0, -2)),
    ]);

    res.json({ data: data.rows, total: parseInt(count.rows[0].count), page: parseInt(page) || 1, limit: lim });
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT si.*, b.name as branch_name,
        CASE WHEN si.quantity = 0 THEN 'out_of_stock'
             WHEN si.quantity <= si.low_stock_threshold THEN 'low_stock'
             ELSE 'in_stock' END as status
        FROM stock_items si LEFT JOIN branches b ON b.id = si.branch_id
        WHERE si.id = $1`, [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Item not found" });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get("/:id/barcode", async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT barcode FROM stock_items WHERE id = $1", [req.params.id]);
    if (!rows[0]?.barcode) return res.status(404).json({ error: "No barcode" });
    const buf = await generateBarcodeBuffer(rows[0].barcode);
    res.setHeader("Content-Type", "image/png");
    res.send(buf);
  } catch (err) { next(err); }
});

router.get("/:id/history", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT 'transfer' as type, st.transferred_at as date,
        st.quantity, u.name as done_by,
        fb.name as from_branch, tb.name as to_branch, st.notes
      FROM stock_transfers st
      LEFT JOIN users u ON u.id = st.transferred_by
      LEFT JOIN branches fb ON fb.id = st.from_branch
      LEFT JOIN branches tb ON tb.id = st.to_branch
      WHERE st.item_id = $1
      UNION ALL
      SELECT 'sale' as type, s.created_at as date,
        si.quantity, u.name as done_by, NULL, NULL, NULL
      FROM sale_items si JOIN sales s ON s.id = si.sale_id
      JOIN users u ON u.id = s.worker_id
      WHERE si.stock_item_id = $1
      ORDER BY date DESC LIMIT 50`, [req.params.id]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post("/", requireRole("admin", "manager", "worker"), async (req, res, next) => {
  try {
    const { name, category, size, color, branch_id, quantity, cost_price_rwf,
            sell_price_rwf, low_stock_threshold, image_url } = req.body;

    const barcode = `VLN${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const { rows } = await pool.query(
      `INSERT INTO stock_items (name, category, size, color, barcode, image_url,
        branch_id, quantity, cost_price_rwf, sell_price_rwf, low_stock_threshold)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        name,
        category,
        size || null,
        color || null,
        barcode,
        image_url || null,
        branch_id ? parseInt(branch_id) : null,
        parseInt(quantity) || 0,
        parseInt(cost_price_rwf) || 0,
        parseInt(sell_price_rwf) || 0,
        parseInt(low_stock_threshold) || 5
      ]
    );
    await logAudit(req.user.id, "STOCK_CREATED", "stock_items", rows[0].id, null, rows[0], req.ip);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.put("/:id", requireRole("admin", "manager", "worker"), async (req, res, next) => {
  try {
    const { name, category, size, color, branch_id, quantity, cost_price_rwf,
            sell_price_rwf, low_stock_threshold, image_url } = req.body;

    const old = await pool.query("SELECT * FROM stock_items WHERE id = $1", [req.params.id]);
    const { rows } = await pool.query(
      `UPDATE stock_items SET name=$1, category=$2, size=$3, color=$4, branch_id=$5,
        quantity=$6, cost_price_rwf=$7, sell_price_rwf=$8, low_stock_threshold=$9,
        image_url=COALESCE($10, image_url)
       WHERE id = $11 RETURNING *`,
      [
        name,
        category,
        size || null,
        color || null,
        branch_id ? parseInt(branch_id) : null,
        parseInt(quantity) || 0,
        parseInt(cost_price_rwf) || 0,
        parseInt(sell_price_rwf) || 0,
        parseInt(low_stock_threshold) || 5,
        image_url || null,
        req.params.id
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: "Item not found" });
    await logAudit(req.user.id, "STOCK_UPDATED", "stock_items", rows[0].id, old.rows[0], rows[0], req.ip);
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete("/:id", requireRole("admin", "manager", "worker"), async (req, res, next) => {
  try {
    await pool.query("BEGIN");
    await pool.query("DELETE FROM stock_transfers WHERE item_id = $1", [req.params.id]);
    await pool.query("DELETE FROM stock_items WHERE id = $1", [req.params.id]);
    await pool.query("COMMIT");
    await logAudit(req.user.id, "STOCK_DELETED", "stock_items", req.params.id, null, null, req.ip);
    res.json({ message: "Item deleted" });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    next(err);
  }
});

router.post("/transfer", requireRole("admin", "manager", "worker"), async (req, res, next) => {
  try {
    const { item_id, from_branch, to_branch, quantity, notes } = req.body;
    const { rows: [item] } = await pool.query("SELECT * FROM stock_items WHERE id=$1", [item_id]);
    if (!item) return res.status(404).json({ error: "Item not found" });
    if (item.quantity < quantity) return res.status(400).json({ error: "Insufficient stock" });

    await pool.query("BEGIN");
    await pool.query("UPDATE stock_items SET quantity = quantity - $1 WHERE id = $2", [quantity, item_id]);
    // Find or create destination item
    let { rows: [dest] } = await pool.query(
      `SELECT id FROM stock_items WHERE name=$1 AND size=$2 AND color=$3 AND branch_id=$4 AND is_active=true`,
      [item.name, item.size, item.color, to_branch]
    );
    if (!dest) {
      const { rows: [newItem] } = await pool.query(
        `INSERT INTO stock_items (name,category,size,color,barcode,branch_id,quantity,cost_price_rwf,sell_price_rwf,low_stock_threshold)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [item.name, item.category, item.size, item.color, `VLN${Date.now()}`, to_branch,
         0, item.cost_price_rwf, item.sell_price_rwf, item.low_stock_threshold]
      );
      dest = newItem;
    }
    await pool.query("UPDATE stock_items SET quantity = quantity + $1 WHERE id = $2", [quantity, dest.id]);
    await pool.query(
      `INSERT INTO stock_transfers (item_id, from_branch, to_branch, quantity, transferred_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [item_id, from_branch, to_branch, quantity, req.user.id, notes]
    );
    await pool.query("COMMIT");
    await logAudit(req.user.id, "STOCK_TRANSFER", "stock_transfers", item_id, null, { quantity, from_branch, to_branch }, req.ip);
    res.json({ message: "Transfer complete" });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    next(err);
  }
});

router.get("/print-labels", async (req, res, next) => {
  try {
    const { ids } = req.query;
    const idList = String(ids).split(",").map(Number).filter(Boolean);
    if (!idList.length) return res.status(400).json({ error: "No item IDs" });

    const { rows } = await pool.query(
      `SELECT * FROM stock_items WHERE id = ANY($1::int[]) AND is_active=true`, [idList]
    );

    const PDFDocument = require("pdfkit");
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
      doc.fontSize(7).font("Helvetica-Bold").text("VALANO SHOP", 10, 50, { align: "center", width: 150 });
      doc.fontSize(8).font("Helvetica").text(`${item.name} ${item.size || ""} ${item.color || ""}`.trim(), 10, 60, { align: "center", width: 150 });
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#10B981")
         .text(`${new Intl.NumberFormat("en-RW").format(item.sell_price_rwf)} RWF`, 10, 74, { align: "center", width: 150 });
    }
    doc.end();
  } catch (err) { next(err); }
});

module.exports = router;
