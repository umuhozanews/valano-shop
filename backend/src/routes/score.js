const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { calculateScore } = require("../utils/scoring");
const { logAudit, createNotification } = require("../utils/helpers");

router.use(verifyToken);

// POST /v2/score/calculate — calculate and save score for the caller's business
router.post("/calculate", requireRole("sme_owner", "admin", "pulse_admin"), async (req, res, next) => {
  try {
    const targetId = req.body.business_id || req.user.id;

    // Only pulse_admin can score other businesses
    if (targetId !== req.user.id && req.user.role !== "pulse_admin") {
      return res.status(403).json({ error: "Cannot score other businesses" });
    }

    const result = await calculateScore(targetId);

    if (result.score === null) {
      return res.json({ score: null, band: null, message: "Consent withdrawn — scoring disabled" });
    }

    // Persist to health_score_log
    const { rows: [saved] } = await pool.query(
      `INSERT INTO health_score_log
         (user_id, score, band, factors, recommendations, advisory_token, model_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, created_at`,
      [
        targetId,
        result.score,
        result.band,
        JSON.stringify(result.factors),
        JSON.stringify(result.recommendations),
        result.advisoryToken,
        result.model_version,
      ]
    );

    // Persist / upsert to credit_scores
    await pool.query(
      `INSERT INTO credit_scores (user_id, score, band, model_version, calculated_at, advisory_token)
       VALUES ($1,$2,$3,$4,NOW(),$5)
       ON CONFLICT (user_id) DO UPDATE SET
         score=$2, band=$3, model_version=$4, calculated_at=NOW(), advisory_token=$5`,
      [targetId, result.score, result.band, result.model_version, result.advisoryToken]
    );

    // Notify the business owner on band change
    await createNotification(
      targetId,
      "health_score",
      `Your Health Score: ${result.score} (${result.band.toUpperCase()})`,
      result.recommendations[0]?.en || "Keep tracking your business."
    );

    await logAudit(req.user.id, "SCORE_CALCULATED", "health_score_log", saved.id, null, { score: result.score, band: result.band }, req.ip);

    res.json({ ...result, log_id: saved.id, created_at: saved.created_at });
  } catch (err) { next(err); }
});

// GET /v2/score/portfolio/:lender_id — portfolio view for a lender
router.get("/portfolio/:lender_id", requireRole("lender", "pulse_admin"), async (req, res, next) => {
  try {
    const { lender_id } = req.params;

    // Lenders can only see their own portfolio
    if (req.user.role === "lender" && String(req.user.id) !== String(lender_id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { rows } = await pool.query(`
      SELECT lc.*, u.name as business_name, u.email, u.sector,
             cs.score, cs.band, cs.calculated_at,
             ref.referral_code, ref.status as referral_status
      FROM lender_clients lc
      JOIN users u ON u.id = lc.sme_user_id
      LEFT JOIN credit_scores cs ON cs.user_id = lc.sme_user_id
      LEFT JOIN referrals ref ON ref.sme_user_id = lc.sme_user_id AND ref.lender_user_id = lc.lender_user_id
      WHERE lc.lender_user_id = $1
      ORDER BY cs.score DESC NULLS LAST`, [lender_id]);

    const summary = {
      total: rows.length,
      green: rows.filter(r => r.band === "green").length,
      amber:  rows.filter(r => r.band === "amber").length,
      red:    rows.filter(r => r.band === "red").length,
      unscored: rows.filter(r => r.score === null).length,
      avgScore: rows.filter(r => r.score !== null).reduce((s, r) => s + r.score, 0) /
               (rows.filter(r => r.score !== null).length || 1),
    };

    res.json({ portfolio: rows, summary });
  } catch (err) { next(err); }
});

// GET /v2/score/:business_id/latest — most recent score for a business
router.get("/:business_id/latest", requireRole("sme_owner", "admin", "pulse_admin", "lender", "databridge_advisor"), async (req, res, next) => {
  try {
    const { business_id } = req.params;

    // SME owners can only see their own
    if (req.user.role === "sme_owner" && String(req.user.id) !== String(business_id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Lenders can only see their referred clients
    if (req.user.role === "lender") {
      const { rows: clientCheck } = await pool.query(
        "SELECT id FROM lender_clients WHERE lender_user_id=$1 AND sme_user_id=$2",
        [req.user.id, business_id]
      );
      if (!clientCheck.length) return res.status(403).json({ error: "Not in your portfolio" });
    }

    const { rows: [latest] } = await pool.query(`
      SELECT hsl.*, u.name as business_name, u.sector
      FROM health_score_log hsl
      JOIN users u ON u.id = hsl.user_id
      WHERE hsl.user_id = $1
      ORDER BY hsl.created_at DESC LIMIT 1`, [business_id]);

    if (!latest) return res.status(404).json({ error: "No score found" });

    res.json(latest);
  } catch (err) { next(err); }
});

// GET /v2/score/:business_id/history — score trend
router.get("/:business_id/history", requireRole("sme_owner", "admin", "pulse_admin", "lender"), async (req, res, next) => {
  try {
    const { business_id } = req.params;
    const { limit = 12 } = req.query;

    if (req.user.role === "sme_owner" && String(req.user.id) !== String(business_id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { rows } = await pool.query(`
      SELECT id, score, band, model_version, created_at
      FROM health_score_log WHERE user_id=$1
      ORDER BY created_at DESC LIMIT $2`, [business_id, parseInt(limit)]);

    const trend = rows.length >= 2
      ? rows[0].score - rows[rows.length - 1].score
      : 0;

    res.json({ history: rows.reverse(), trend, count: rows.length });
  } catch (err) { next(err); }
});

// POST /v2/score/batch — score all consented businesses (pulse_admin only)
router.post("/batch", requireRole("pulse_admin"), async (req, res, next) => {
  try {
    const { rows: businesses } = await pool.query(`
      SELECT id FROM users
      WHERE role='sme_owner' AND is_active=true AND consent_status='consented'`);

    const results = [];
    let succeeded = 0;
    let failed = 0;

    for (const biz of businesses) {
      try {
        const result = await calculateScore(biz.id);

        if (result.score !== null) {
          await pool.query(
            `INSERT INTO health_score_log (user_id, score, band, factors, recommendations, advisory_token, model_version)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [biz.id, result.score, result.band, JSON.stringify(result.factors),
             JSON.stringify(result.recommendations), result.advisoryToken, result.model_version]
          );
          await pool.query(
            `INSERT INTO credit_scores (user_id, score, band, model_version, calculated_at, advisory_token)
             VALUES ($1,$2,$3,$4,NOW(),$5)
             ON CONFLICT (user_id) DO UPDATE SET score=$2, band=$3, model_version=$4, calculated_at=NOW(), advisory_token=$5`,
            [biz.id, result.score, result.band, result.model_version, result.advisoryToken]
          );
        }

        results.push({ user_id: biz.id, score: result.score, band: result.band });
        succeeded++;
      } catch (e) {
        results.push({ user_id: biz.id, error: e.message });
        failed++;
      }
    }

    await logAudit(req.user.id, "BATCH_SCORE", "credit_scores", null, null, { succeeded, failed }, req.ip);

    res.json({
      message: `Batch scoring complete: ${succeeded} succeeded, ${failed} failed`,
      succeeded,
      failed,
      results,
    });
  } catch (err) { next(err); }
});

// GET /v2/score/advisory/:token — public advisory share link
router.get("/advisory/:token", async (req, res, next) => {
  try {
    const { rows: [log] } = await pool.query(`
      SELECT hsl.score, hsl.band, hsl.recommendations, hsl.created_at,
             u.name as business_name, u.sector
      FROM health_score_log hsl
      JOIN users u ON u.id = hsl.user_id
      WHERE hsl.advisory_token = $1`, [req.params.token]);

    if (!log) return res.status(404).json({ error: "Invalid or expired advisory link" });

    res.json({
      business_name: log.business_name,
      sector: log.sector,
      score: log.score,
      band: log.band,
      recommendations: log.recommendations,
      scored_at: log.created_at,
    });
  } catch (err) { next(err); }
});

module.exports = router;
