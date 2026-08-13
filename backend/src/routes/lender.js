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
        COUNT(u.id) AS total_clients,
        COUNT(cs.user_id) FILTER (WHERE cs.band='green') AS green_count,
        COUNT(cs.user_id) FILTER (WHERE cs.band='amber')  AS amber_count,
        COUNT(cs.user_id) FILTER (WHERE cs.band='red')    AS red_count,
        COUNT(u.id) FILTER (WHERE cs.score IS NULL) AS unscored,
        ROUND(AVG(cs.score) FILTER (WHERE cs.score IS NOT NULL),1) AS avg_score
      FROM users u
      LEFT JOIN credit_scores cs ON cs.user_id = u.id
      WHERE u.role IN ('sme_owner','admin')`);

    const { rows: recentlyScored } = await pool.query(`
      SELECT u.name, u.sector, cs.score, cs.band, cs.calculated_at
      FROM users u
      JOIN credit_scores cs ON cs.user_id = u.id
      WHERE u.role IN ('sme_owner','admin')
      ORDER BY cs.calculated_at DESC LIMIT 5`);

    const { rows: atRisk } = await pool.query(`
      SELECT u.id as sme_user_id, u.name, u.email, u.sector, cs.score, cs.band
      FROM users u
      LEFT JOIN credit_scores cs ON cs.user_id = u.id
      WHERE u.role IN ('sme_owner','admin') AND (cs.band = 'red' OR cs.score < 40 OR cs.score IS NULL)
      ORDER BY cs.score ASC NULLS FIRST LIMIT 10`);

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

    const conditions = ["u.role IN ('sme_owner','admin')"];
    const params = [];

    if (band)   { params.push(band);   conditions.push(`cs.band = $${params.length}`); }
    if (sector) { params.push(sector); conditions.push(`u.sector = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`); }

    const where = conditions.join(" AND ");

    const { rows } = await pool.query(`
      SELECT COALESCE(lc.id, u.id) as id, u.id as sme_user_id, lc.notes, COALESCE(lc.created_at, u.created_at) as created_at,
             u.name, u.email, u.phone, u.sector,
             cs.score, cs.band, cs.calculated_at,
             ref.referral_code, COALESCE(ref.status, 'active') as referral_status
      FROM users u
      LEFT JOIN lender_clients lc ON lc.sme_user_id = u.id AND lc.lender_user_id = $1
      LEFT JOIN credit_scores cs ON cs.user_id = u.id
      LEFT JOIN referrals ref ON ref.sme_user_id = u.id AND ref.lender_user_id = $1
      WHERE ${where}
      ORDER BY cs.score DESC NULLS LAST
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [lenderId, ...params, parseInt(limit), offset]);

    const { rows: [cnt] } = await pool.query(
      `SELECT COUNT(*) FROM users u LEFT JOIN credit_scores cs ON cs.user_id=u.id WHERE ${where}`,
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
      SELECT COALESCE(lc.id, u.id) as id, u.id as sme_user_id, lc.notes, u.name, u.email, u.phone, u.sector, u.created_at as member_since,
             cs.score, cs.band, cs.advisory_token, cs.calculated_at
      FROM users u
      LEFT JOIN lender_clients lc ON lc.sme_user_id = u.id AND lc.lender_user_id = $1
      LEFT JOIN credit_scores cs ON cs.user_id = u.id
      WHERE u.id=$2 AND (lc.id IS NOT NULL OR $3 = 'pulse_admin')`, [lenderId, sme_id, req.user.role]);

    if (!client) return res.status(404).json({ error: "Client not found in portfolio" });

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
