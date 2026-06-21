const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit } = require("../utils/helpers");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, "../../uploads");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`),
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Images only"));
  },
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.use(verifyToken);

router.get("/", async (req, res, next) => {
  try {
    const { rows: [settings] } = await pool.query("SELECT * FROM settings LIMIT 1");
    const { rows: branches } = await pool.query(
      `SELECT b.*, COUNT(u.id) as worker_count FROM branches b
       LEFT JOIN users u ON u.branch_id=b.id AND u.is_active=true GROUP BY b.id ORDER BY b.name`
    );
    const { rows: rates } = await pool.query("SELECT * FROM exchange_rates ORDER BY from_currency");
    res.json({ settings, branches, exchangeRates: rates });
  } catch (err) { next(err); }
});

router.put("/", requireRole("admin"), async (req, res, next) => {
  try {
    const { shop_name, shop_address, shop_phone, default_low_stock_threshold,
            default_commission_rate, invoice_footer_text } = req.body;
    const { rows: [s] } = await pool.query(
      `UPDATE settings SET shop_name=$1, shop_address=$2, shop_phone=$3,
        default_low_stock_threshold=$4, default_commission_rate=$5, invoice_footer_text=$6
       WHERE id=1 RETURNING *`,
      [shop_name, shop_address, shop_phone, default_low_stock_threshold, default_commission_rate, invoice_footer_text]
    );
    await logAudit(req.user.id, "SETTINGS_UPDATED", "settings", 1, null, req.body, req.ip);
    res.json(s);
  } catch (err) { next(err); }
});

router.post("/logo", requireRole("admin"), upload.single("logo"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    await pool.query("UPDATE settings SET logo_url=$1 WHERE id=1", [url]);
    res.json({ url });
  } catch (err) { next(err); }
});

// Branches
router.post("/branches", requireRole("admin"), async (req, res, next) => {
  try {
    const { name, location, phone } = req.body;
    const { rows: [b] } = await pool.query(
      "INSERT INTO branches (name, location, phone) VALUES ($1,$2,$3) RETURNING *", [name, location, phone]
    );
    res.status(201).json(b);
  } catch (err) { next(err); }
});

router.put("/branches/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const { name, location, phone } = req.body;
    const { rows: [b] } = await pool.query(
      "UPDATE branches SET name=$1, location=$2, phone=$3 WHERE id=$4 RETURNING *",
      [name, location, phone, req.params.id]
    );
    res.json(b);
  } catch (err) { next(err); }
});

router.post("/branches/:id/clone-stock", requireRole("admin"), async (req, res, next) => {
  try {
    const toBranchId = req.params.id;
    const { from_branch_id } = req.body;
    if (!from_branch_id) return res.status(400).json({ error: "Source branch required" });

    const { rows: sourceItems } = await pool.query(
      "SELECT * FROM stock_items WHERE branch_id=$1 AND is_active=true", [from_branch_id]
    );

    for (const item of sourceItems) {
      const newBarcode = `VLN${Date.now()}${Math.floor(Math.random() * 1000)}`;
      await pool.query(
        `INSERT INTO stock_items (name, category, size, color, barcode, branch_id, quantity, cost_price_rwf, sell_price_rwf, low_stock_threshold)
         VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9)`,
        [item.name, item.category, item.size, item.color, newBarcode, toBranchId, item.cost_price_rwf, item.sell_price_rwf, item.low_stock_threshold]
      );
    }

    res.json({ message: `Cloned ${sourceItems.length} items to branch successfully.` });
  } catch (err) { next(err); }
});

router.get("/backup", requireRole("admin"), async (req, res, next) => {
  try {
    const tables = ["branches", "users", "suppliers", "stock_items", "customers", "sales", "expenses", "exchange_rates"];
    const backup = {};
    for (const t of tables) {
      const { rows } = await pool.query(`SELECT * FROM ${t}`);
      backup[t] = rows;
    }
    backup.exported_at = new Date().toISOString();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=valano-backup.json");
    res.json(backup);
  } catch (err) { next(err); }
});

module.exports = router;
