const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit } = require("../utils/helpers");
const multer = require("multer");
const { uploadToCloudinary } = require("../utils/cloudinary");

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Images only"));
  },
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.use(verifyToken);

router.get("/", async (req, res, next) => {
  try {
    let settings = null;
    const ownerId = req.ownerId || (['sme_owner'].includes(req.user.role) ? req.user.id : null);
    if (ownerId) {
      const result = await pool.query(
        "SELECT * FROM settings WHERE owner_id=$1 LIMIT 1", [ownerId]
      ).catch(() => ({ rows: [] }));
      settings = result.rows[0] || null;
    }
    if (!settings && ['pulse_admin', 'admin'].includes(req.user.role)) {
      const { rows: [global] } = await pool.query(
        "SELECT * FROM settings WHERE id=1 LIMIT 1"
      ).catch(() => pool.query("SELECT * FROM settings LIMIT 1"));
      settings = global || null;
    }
    const { rows: rates } = await pool.query("SELECT * FROM exchange_rates ORDER BY from_currency");
    res.json({ settings, exchangeRates: rates });
  } catch (err) { next(err); }
});

router.put("/", requireRole("admin", "sme_owner", "pulse_admin"), async (req, res, next) => {
  try {
    const {
      shop_name, shop_address, shop_phone,
      default_low_stock_threshold, invoice_footer_text,
      language, sector_default, district_default,
      tin_number, sdc_id, mrc_number, shop_email, cashier_tin, vat_rate,
    } = req.body;

    const ownerId = req.ownerId || (req.user.role === 'sme_owner' ? req.user.id : null);
    let s;
    if (ownerId) {
      // Upsert user-scoped settings row
      const { rows: [row] } = await pool.query(
        `INSERT INTO settings (owner_id, shop_name, shop_address, shop_phone,
           default_low_stock_threshold, invoice_footer_text, language, sector_default, district_default,
           tin_number, sdc_id, mrc_number, shop_email, cashier_tin, vat_rate)
         VALUES ($9,$1,$2,$3,$4,$5,$6,$7,$8,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (owner_id) DO UPDATE SET
           shop_name=$1, shop_address=$2, shop_phone=$3,
           default_low_stock_threshold=$4, invoice_footer_text=$5,
           language=$6, sector_default=$7, district_default=$8,
           tin_number=$10, sdc_id=$11, mrc_number=$12, shop_email=$13, cashier_tin=$14, vat_rate=$15
         RETURNING *`,
        [shop_name, shop_address, shop_phone, default_low_stock_threshold, invoice_footer_text,
         language || 'en', sector_default || null, district_default || null, ownerId,
         tin_number || '103777856', sdc_id || 'SDC010013000', mrc_number || 'MIS00013705',
         shop_email || 'andrenikobatuye@gmail.com', cashier_tin || '103777856', parseFloat(vat_rate) || 18.0]
      );
      s = row;
    } else {
      // Admin/pulse_admin update global row
      const { rows: [row] } = await pool.query(
        `UPDATE settings SET
          shop_name=$1, shop_address=$2, shop_phone=$3,
          default_low_stock_threshold=$4, invoice_footer_text=$5,
          language=$6, sector_default=$7, district_default=$8,
          tin_number=$9, sdc_id=$10, mrc_number=$11, shop_email=$12, cashier_tin=$13, vat_rate=$14
         WHERE id=1 RETURNING *`,
        [shop_name, shop_address, shop_phone, default_low_stock_threshold, invoice_footer_text,
         language || 'en', sector_default || null, district_default || null,
         tin_number || '103777856', sdc_id || 'SDC010013000', mrc_number || 'MIS00013705',
         shop_email || 'andrenikobatuye@gmail.com', cashier_tin || '103777856', parseFloat(vat_rate) || 18.0]
      );
      s = row;
    }
    await logAudit(req.user.id, "SETTINGS_UPDATED", "settings", s?.id, null, req.body, req.ip);
    res.json(s);
  } catch (err) { next(err); }
});

router.post("/logo", requireRole("admin", "sme_owner", "pulse_admin"), upload.single("logo"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const url = await uploadToCloudinary(req.file.buffer, "inzira_logos");
    const ownerId = req.ownerId || (req.user.role === 'sme_owner' ? req.user.id : null);
    if (ownerId) {
      await pool.query(
        `INSERT INTO settings (owner_id, logo_url) VALUES ($1, $2)
         ON CONFLICT (owner_id) DO UPDATE SET logo_url=$2`,
        [ownerId, url]
      );
    } else {
      await pool.query("UPDATE settings SET logo_url=$1 WHERE id=1", [url]);
    }
    res.json({ url });
  } catch (err) { next(err); }
});

// Exchange rates
router.put("/exchange-rates", requireRole("admin", "sme_owner", "pulse_admin"), async (req, res, next) => {
  try {
    const { from_currency, to_currency, rate } = req.body;
    if (!from_currency || !to_currency || !rate)
      return res.status(400).json({ error: "from_currency, to_currency and rate required" });

    const { rows: [r] } = await pool.query(
      `INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_by)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (from_currency, to_currency)
       DO UPDATE SET rate=$3, updated_at=NOW(), updated_by=$4
       RETURNING *`,
      [from_currency.toUpperCase(), to_currency.toUpperCase(), rate, req.user.id]
    );
    res.json(r);
  } catch (err) { next(err); }
});

// Data backup (Inzira tables)
router.get("/backup", requireRole("admin", "pulse_admin"), async (req, res, next) => {
  try {
    const tables = ["users", "suppliers", "stock_items", "customers", "sales", "expenses", "exchange_rates", "purchase_orders"];
    const backup = {};
    for (const t of tables) {
      const { rows } = await pool.query(`SELECT * FROM ${t}`);
      backup[t] = rows;
    }
    backup.exported_at = new Date().toISOString();
    backup.app = "Inzira Insights";
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=inzira-backup.json");
    res.json(backup);
  } catch (err) { next(err); }
});

module.exports = router;
