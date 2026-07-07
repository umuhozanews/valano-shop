const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit } = require("../utils/helpers");
const crypto = require("crypto");

router.use(verifyToken);
router.use(requireRole("lender", "pulse_admin"));

// GET /v2/lender/dashboard — portfolio KPIs
router.get("/dashboard", async (req, res, next) => {
  try {
    const lenderId = req.user.role === "pulse_admin"
      ? (req.query.lender_id || req.user.id)
      : req.user.id;

    const { rows: [overview] } = await pool.query(`
      SELECT
        COUNT(lc.id) AS total_clients,
        COUNT(cs.user_id) FILTER (WHERE cs.band='green') AS green_count,
        COUNT(cs.user_id) FILTER (WHERE cs.band='amber')  AS amber_count,
        COUNT(cs.user_id) FILTER (WHERE cs.band='red')    AS red_count,
        COUNT(cs.user_id) FILTER (WHERE cs.score IS NULL) AS unscored,
        ROUND(AVG(cs.score) FILTER (WHERE cs.score IS NOT NULL),1) AS avg_score
      FROM lender_clients lc
      LEFT JOIN credit_scores cs ON cs.user_id = lc.sme_user_id
      WHERE lc.lender_user_id = $1`, [lenderId]);

    const { rows: recentlyScored } = await pool.query(`
      SELECT u.name, u.sector, cs.score, cs.band, cs.calculated_at
      FROM lender_clients lc
      JOIN users u ON u.id = lc.sme_user_id
      JOIN credit_scores cs ON cs.user_id = lc.sme_user_id
      WHERE lc.lender_user_id = $1
      ORDER BY cs.calculated_at DESC LIMIT 5`, [lenderId]);

    const { rows: atRisk } = await pool.query(`
      SELECT u.name, u.email, u.sector, cs.score, cs.band
      FROM lender_clients lc
      JOIN users u ON u.id = lc.sme_user_id
      JOIN credit_scores cs ON cs.user_id = lc.sme_user_id
      WHERE lc.lender_user_id = $1 AND cs.band = 'red'
      ORDER BY cs.score ASC LIMIT 10`, [lenderId]);

    res.json({ overview, recentlyScored, atRisk });
  } catch (err) { next(err); }
});

// GET /v2/lender/clients — list all referred SME clients
router.get("/clients", async (req, res, next) => {
  try {
    const lenderId = req.user.role === "pulse_admin"
      ? (req.query.lender_id || req.user.id)
      : req.user.id;

    const { band, sector, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = ["lc.lender_user_id = $1"];
    const params = [lenderId];
    if (band)   { params.push(band);   conditions.push(`cs.band = $${params.length}`); }
    if (sector) { params.push(sector); conditions.push(`u.sector = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`); }

    const where = conditions.join(" AND ");

    const { rows } = await pool.query(`
      SELECT lc.id, lc.sme_user_id, lc.notes, lc.created_at,
             u.name, u.email, u.phone, u.sector,
             cs.score, cs.band, cs.calculated_at,
             ref.referral_code, ref.status as referral_status
      FROM lender_clients lc
      JOIN users u ON u.id = lc.sme_user_id
      LEFT JOIN credit_scores cs ON cs.user_id = lc.sme_user_id
      LEFT JOIN referrals ref ON ref.sme_user_id = lc.sme_user_id AND ref.lender_user_id = lc.lender_user_id
      WHERE ${where}
      ORDER BY cs.score DESC NULLS LAST
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]);

    const { rows: [cnt] } = await pool.query(
      `SELECT COUNT(*) FROM lender_clients lc JOIN users u ON u.id=lc.sme_user_id
       LEFT JOIN credit_scores cs ON cs.user_id=lc.sme_user_id WHERE ${where}`,
      params
    );

    res.json({ data: rows, total: parseInt(cnt.count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /v2/lender/clients/:sme_id — detailed SME view for the lender
router.get("/clients/:sme_id", async (req, res, next) => {
  try {
    const lenderId = req.user.role === "pulse_admin"
      ? (req.query.lender_id || req.user.id)
      : req.user.id;

    const { sme_id } = req.params;

    const { rows: [client] } = await pool.query(`
      SELECT lc.*, u.name, u.email, u.phone, u.sector, u.created_at as member_since,
             cs.score, cs.band, cs.advisory_token, cs.calculated_at
      FROM lender_clients lc
      JOIN users u ON u.id = lc.sme_user_id
      LEFT JOIN credit_scores cs ON cs.user_id = lc.sme_user_id
      WHERE lc.lender_user_id=$1 AND lc.sme_user_id=$2`, [lenderId, sme_id]);

    if (!client) return res.status(404).json({ error: "Client not found in your portfolio" });

    const { rows: scoreHistory } = await pool.query(`
      SELECT score, band, created_at FROM health_score_log
      WHERE user_id=$1 ORDER BY created_at DESC LIMIT 6`, [sme_id]);

    res.json({ ...client, scoreHistory: scoreHistory.reverse() });
  } catch (err) { next(err); }
});

// POST /v2/lender/referral — create a referral code for an SME (accepts sme_user_id or sme_email)
router.post("/referral", async (req, res, next) => {
  try {
    let { sme_user_id, sme_email, notes } = req.body;

    // Allow lookup by email
    if (!sme_user_id && sme_email) {
      const { rows: [found] } = await pool.query(
        "SELECT id FROM users WHERE email=$1 AND role IN ('sme_owner','admin','manager','cashier','accountant')",
        [sme_email.toLowerCase().trim()]
      );
      if (!found) return res.status(404).json({ error: `No SME account found with email: ${sme_email}` });
      sme_user_id = found.id;
    }
    if (!sme_user_id) return res.status(400).json({ error: "sme_user_id or sme_email required" });

    const code = "REF-" + crypto.randomBytes(4).toString("hex").toUpperCase();

    const { rows: [ref] } = await pool.query(
      `INSERT INTO referrals (lender_user_id, sme_user_id, referral_code, status, notes)
       VALUES ($1,$2,$3,'pending',$4) RETURNING *`,
      [req.user.id, sme_user_id, code, notes || null]
    );

    // Also add to lender_clients if not already there
    await pool.query(
      `INSERT INTO lender_clients (lender_user_id, sme_user_id, notes)
       VALUES ($1,$2,$3) ON CONFLICT (lender_user_id, sme_user_id) DO NOTHING`,
      [req.user.id, sme_user_id, notes || null]
    );

    await logAudit(req.user.id, "REFERRAL_CREATED", "referrals", ref.id, null, { sme_user_id, code }, req.ip);

    res.status(201).json(ref);
  } catch (err) { next(err); }
});

// PUT /v2/lender/referral/:id — update referral status
router.put("/referral/:id", async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const allowed = ["pending", "active", "closed", "rejected"];
    if (!allowed.includes(status)) return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });

    const { rows: [updated] } = await pool.query(
      `UPDATE referrals SET status=$1, notes=COALESCE($2,notes), updated_at=NOW()
       WHERE id=$3 AND lender_user_id=$4 RETURNING *`,
      [status, notes, req.params.id, req.user.id]
    );

    if (!updated) return res.status(404).json({ error: "Referral not found" });

    await logAudit(req.user.id, "REFERRAL_UPDATED", "referrals", updated.id, null, { status }, req.ip);

    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;
