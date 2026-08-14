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
    
    // Fetch user profile for fallback contact info
    const { rows: [userProfile] } = await pool.query(
      "SELECT id, name, email, phone, district, sector, currency FROM users WHERE id=$1",
      [ownerId || req.user.id]
    ).catch(() => ({ rows: [] }));

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

    // Merge registered user profile defaults if settings fields are empty
    const mergedSettings = {
      ...(settings || {}),
      shop_name: settings?.shop_name || (userProfile?.name ? `${userProfile.name}'s Shop` : "Inzira SME Store"),
      shop_address: settings?.shop_address || userProfile?.district || "Kigali, Rwanda",
      shop_phone: settings?.shop_phone || userProfile?.phone || "",
      shop_email: settings?.shop_email || userProfile?.email || "",
      currency: settings?.currency || userProfile?.currency || "RWF",
      has_ebm: settings?.has_ebm === true || (Boolean(settings?.tin_number) && settings?.tin_number !== "TIN Pending"),
      tin_number: settings?.tin_number || null,
      sdc_id: settings?.sdc_id || null,
      mrc_number: settings?.mrc_number || null,
      cashier_tin: settings?.cashier_tin || settings?.tin_number || null,
      vat_rate: settings?.vat_rate ? parseFloat(settings.vat_rate) : 18.0,
    };

    const { rows: rates } = await pool.query("SELECT * FROM exchange_rates ORDER BY from_currency").catch(() => ({ rows: [] }));
    res.json({ settings: mergedSettings, exchangeRates: rates });
  } catch (err) { next(err); }
});

router.put("/", requireRole("admin", "sme_owner", "pulse_admin"), async (req, res, next) => {
  try {
    const {
      shop_name, shop_address, shop_phone,
      default_low_stock_threshold, invoice_footer_text,
      language, sector_default, district_default,
      has_ebm, tin_number, sdc_id, mrc_number, shop_email, cashier_tin, vat_rate, currency
    } = req.body;

    const ownerId = req.ownerId || (req.user.role === 'sme_owner' ? req.user.id : null);
    const cleanPhone = shop_phone ? String(shop_phone).trim() : null;
    const cleanEmail = shop_email ? String(shop_email).trim().toLowerCase() : null;
    const cleanTin = tin_number ? String(tin_number).trim() : null;
    const cleanSdc = sdc_id ? String(sdc_id).trim() : null;
    const cleanMrc = mrc_number ? String(mrc_number).trim() : null;
    const isEbmActive = has_ebm === true || has_ebm === "true" || has_ebm === "Yes" || Boolean(cleanTin);

    let s;
    if (ownerId) {
      // Upsert user-scoped settings row
      const { rows: [row] } = await pool.query(
        `INSERT INTO settings (owner_id, shop_name, shop_address, shop_phone,
           default_low_stock_threshold, invoice_footer_text, language, sector_default, district_default,
           has_ebm, tin_number, sdc_id, mrc_number, shop_email, cashier_tin, vat_rate, currency)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (owner_id) DO UPDATE SET
           shop_name=$2, shop_address=$3, shop_phone=$4,
           default_low_stock_threshold=$5, invoice_footer_text=$6,
           language=$7, sector_default=$8, district_default=$9,
           has_ebm=$10, tin_number=$11, sdc_id=$12, mrc_number=$13, shop_email=$14, cashier_tin=$15, vat_rate=$16, currency=$17
         RETURNING *`,
        [
          ownerId,
          shop_name || "My Store",
          shop_address || "Kigali, Rwanda",
          cleanPhone,
          default_low_stock_threshold || 5,
          invoice_footer_text || null,
          language || 'en',
          sector_default || null,
          district_default || null,
          isEbmActive,
          cleanTin,
          cleanSdc,
          cleanMrc,
          cleanEmail,
          cashier_tin || cleanTin,
          parseFloat(vat_rate) || 18.0,
          currency || 'RWF'
        ]
      );
      s = row;

      // Sync phone and district back to users table if provided
      if (cleanPhone || shop_address) {
        await pool.query(
          "UPDATE users SET phone = COALESCE($1, phone), district = COALESCE($2, district) WHERE id = $3",
          [cleanPhone, shop_address, ownerId]
        ).catch(() => {});
      }
    } else {
      // Admin/pulse_admin update global row
      const { rows: [row] } = await pool.query(
        `UPDATE settings SET
          shop_name=$1, shop_address=$2, shop_phone=$3,
          default_low_stock_threshold=$4, invoice_footer_text=$5,
          language=$6, sector_default=$7, district_default=$8,
          has_ebm=$9, tin_number=$10, sdc_id=$11, mrc_number=$12, shop_email=$13, cashier_tin=$14, vat_rate=$15, currency=$16
         WHERE id=1 RETURNING *`,
        [
          shop_name,
          shop_address,
          cleanPhone,
          default_low_stock_threshold || 5,
          invoice_footer_text || null,
          language || 'en',
          sector_default || null,
          district_default || null,
          isEbmActive,
          cleanTin,
          cleanSdc,
          cleanMrc,
          cleanEmail,
          cashier_tin || cleanTin,
          parseFloat(vat_rate) || 18.0,
          currency || 'RWF'
        ]
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
