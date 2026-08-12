const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit } = require("../utils/helpers");

router.use(verifyToken);
router.use(requireRole("databridge_advisor", "pulse_admin"));

// GET /v2/advisor/dashboard — overview KPIs & client portfolio summary for advisors
router.get("/dashboard", async (req, res, next) => {
  try {
    const advisorId = req.user.role === "pulse_admin"
      ? (req.query.advisor_id || req.user.id)
      : req.user.id;

    // Overview statistics from advisor_clients or consented SMEs
    const { rows: [overview] } = await pool.query(`
      SELECT
        COUNT(DISTINCT ac.sme_user_id) AS total_clients,
        COUNT(DISTINCT cs.user_id) FILTER (WHERE cs.band='red') AS red_count,
        COUNT(DISTINCT cs.user_id) FILTER (WHERE cs.band='amber') AS amber_count,
        COUNT(DISTINCT cs.user_id) FILTER (WHERE cs.band='green') AS green_count,
        ROUND(AVG(cs.score) FILTER (WHERE cs.score IS NOT NULL), 1) AS avg_score,
        (SELECT COUNT(*) FROM advisory_sessions WHERE advisor_id = $1 AND status IN ('scheduled','requested')) AS upcoming_sessions,
        (SELECT COUNT(*) FROM advisory_sessions WHERE advisor_id = $1 AND status = 'completed') AS completed_sessions
      FROM advisor_clients ac
      LEFT JOIN credit_scores cs ON cs.user_id = ac.sme_user_id
      WHERE ac.advisor_user_id = $1`, [advisorId]);

    // High-risk SMEs needing urgent advisory
    const { rows: atRisk } = await pool.query(`
      SELECT ac.sme_user_id, u.name, u.email, u.phone, u.sector, u.district, cs.score, cs.band, cs.factors, cs.calculated_at
      FROM advisor_clients ac
      JOIN users u ON u.id = ac.sme_user_id
      LEFT JOIN credit_scores cs ON cs.user_id = ac.sme_user_id
      WHERE ac.advisor_user_id = $1 AND (cs.band = 'red' OR cs.score < 40)
      ORDER BY cs.score ASC NULLS FIRST LIMIT 10`, [advisorId]);

    // Upcoming sessions
    const { rows: upcomingSessions } = await pool.query(`
      SELECT s.id, s.business_id, s.scheduled_at, s.status, s.notes, s.action_plan, s.follow_up_date,
             u.name as business_name, u.email as business_email, u.sector
      FROM advisory_sessions s
      JOIN users u ON u.id = s.business_id
      WHERE s.advisor_id = $1 AND s.status IN ('scheduled','requested')
      ORDER BY s.scheduled_at ASC NULLS LAST LIMIT 10`, [advisorId]);

    res.json({
      overview: {
        total_clients: parseInt(overview?.total_clients || 0),
        red_count: parseInt(overview?.red_count || 0),
        amber_count: parseInt(overview?.amber_count || 0),
        green_count: parseInt(overview?.green_count || 0),
        avg_score: overview?.avg_score ? parseFloat(overview.avg_score) : null,
        upcoming_sessions: parseInt(overview?.upcoming_sessions || 0),
        completed_sessions: parseInt(overview?.completed_sessions || 0),
      },
      atRisk,
      upcomingSessions,
    });
  } catch (err) { next(err); }
});

// GET /v2/advisor/clients — list all client SMEs under advice
router.get("/clients", async (req, res, next) => {
  try {
    const advisorId = req.user.role === "pulse_admin"
      ? (req.query.advisor_id || req.user.id)
      : req.user.id;

    const { band, sector, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = ["ac.advisor_user_id = $1"];
    const params = [advisorId];
    if (band)   { params.push(band);   conditions.push(`cs.band = $${params.length}`); }
    if (sector) { params.push(sector); conditions.push(`u.sector = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`); }

    const where = conditions.join(" AND ");

    const { rows } = await pool.query(`
      SELECT ac.id, ac.sme_user_id, ac.notes as client_notes, ac.created_at as linked_at,
             u.name, u.email, u.phone, u.sector, u.district, u.created_at as member_since,
             cs.score, cs.band, cs.advisory_token, cs.calculated_at,
             (SELECT MAX(scheduled_at) FROM advisory_sessions WHERE business_id = ac.sme_user_id AND advisor_id = ac.advisor_user_id) as last_session_at,
             (SELECT COUNT(*) FROM advisory_sessions WHERE business_id = ac.sme_user_id AND advisor_id = ac.advisor_user_id) as total_sessions
      FROM advisor_clients ac
      JOIN users u ON u.id = ac.sme_user_id
      LEFT JOIN credit_scores cs ON cs.user_id = ac.sme_user_id
      WHERE ${where}
      ORDER BY cs.score ASC NULLS FIRST, ac.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]);

    const { rows: [cnt] } = await pool.query(
      `SELECT COUNT(*) FROM advisor_clients ac JOIN users u ON u.id=ac.sme_user_id
       LEFT JOIN credit_scores cs ON cs.user_id=ac.sme_user_id WHERE ${where}`,
      params
    );

    res.json({ data: rows, total: parseInt(cnt.count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /v2/advisor/clients/:sme_id — detailed SME advisory view
router.get("/clients/:sme_id", async (req, res, next) => {
  try {
    const advisorId = req.user.role === "pulse_admin"
      ? (req.query.advisor_id || req.user.id)
      : req.user.id;

    const { sme_id } = req.params;

    const { rows: [client] } = await pool.query(`
      SELECT ac.id as link_id, ac.notes as client_notes, ac.created_at as linked_at,
             u.id as sme_user_id, u.name, u.email, u.phone, u.sector, u.district, u.created_at as member_since,
             cs.score, cs.band, cs.factors, cs.risk_flags, cs.advisory_token, cs.calculated_at
      FROM advisor_clients ac
      JOIN users u ON u.id = ac.sme_user_id
      LEFT JOIN credit_scores cs ON cs.user_id = ac.sme_user_id
      WHERE ac.advisor_user_id=$1 AND ac.sme_user_id=$2`, [advisorId, sme_id]);

    if (!client) return res.status(404).json({ error: "SME client not found in your advisor portfolio" });

    // Financial quick stats (30 days)
    const [revRes, expRes, stockRes] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(total_amount),0) as revenue_30d, COUNT(*) as sales_count FROM sales WHERE owner_id=$1 AND is_voided=false AND created_at >= NOW()-INTERVAL '30 days'`, [sme_id]),
      pool.query(`SELECT COALESCE(SUM(amount),0) as expenses_30d FROM expenses WHERE owner_id=$1 AND expense_date >= CURRENT_DATE-30`, [sme_id]),
      pool.query(`SELECT COUNT(*) as active_items, COUNT(*) FILTER (WHERE quantity <= low_stock_threshold) as low_stock_items FROM stock_items WHERE owner_id=$1 AND is_active=true`, [sme_id]),
    ]);

    // Historical health score logs
    const { rows: scoreHistory } = await pool.query(`
      SELECT score, band, created_at FROM health_score_log
      WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10`, [sme_id]);

    // Past & upcoming advisory sessions for this SME
    const { rows: sessions } = await pool.query(`
      SELECT id, scheduled_at, status, notes, action_plan, follow_up_date, created_at
      FROM advisory_sessions
      WHERE business_id=$1 AND (advisor_id=$2 OR advisor_id IS NULL)
      ORDER BY scheduled_at DESC NULLS LAST, created_at DESC`, [sme_id, advisorId]);

    res.json({
      ...client,
      stats: {
        revenue_30d: parseInt(revRes.rows[0]?.revenue_30d || 0),
        sales_count: parseInt(revRes.rows[0]?.sales_count || 0),
        expenses_30d: parseInt(expRes.rows[0]?.expenses_30d || 0),
        net_cash_30d: parseInt(revRes.rows[0]?.revenue_30d || 0) - parseInt(expRes.rows[0]?.expenses_30d || 0),
        active_items: parseInt(stockRes.rows[0]?.active_items || 0),
        low_stock_items: parseInt(stockRes.rows[0]?.low_stock_items || 0),
      },
      scoreHistory: scoreHistory.reverse(),
      sessions,
    });
  } catch (err) { next(err); }
});

// POST /v2/advisor/clients — connect/link SME to advisor portfolio (by email or token)
router.post("/clients", async (req, res, next) => {
  try {
    let { sme_email, advisory_token, notes } = req.body;
    let sme_user_id = null;

    if (advisory_token) {
      const { rows: [found] } = await pool.query(
        "SELECT user_id FROM credit_scores WHERE advisory_token=$1",
        [advisory_token.trim()]
      );
      if (found) sme_user_id = found.user_id;
    }

    if (!sme_user_id && sme_email) {
      const { rows: [found] } = await pool.query(
        "SELECT id FROM users WHERE email=$1",
        [sme_email.toLowerCase().trim()]
      );
      if (found) sme_user_id = found.id;
    }

    if (!sme_user_id) {
      return res.status(404).json({ error: "No matching SME business found with that email or advisory link token." });
    }

    const { rows: [link] } = await pool.query(
      `INSERT INTO advisor_clients (advisor_user_id, sme_user_id, notes)
       VALUES ($1, $2, $3)
       ON CONFLICT (advisor_user_id, sme_user_id)
       DO UPDATE SET notes = COALESCE(EXCLUDED.notes, advisor_clients.notes)
       RETURNING *`,
      [req.user.id, sme_user_id, notes || null]
    );

    await logAudit(req.user.id, "ADVISOR_CLIENT_LINKED", "advisor_clients", link.id, null, { sme_user_id }, req.ip);

    res.status(201).json({ message: "SME client connected successfully", link });
  } catch (err) { next(err); }
});

// GET /v2/advisor/sessions — list advisory sessions
router.get("/sessions", async (req, res, next) => {
  try {
    const advisorId = req.user.role === "pulse_admin"
      ? (req.query.advisor_id || req.user.id)
      : req.user.id;

    const { sme_id, status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = ["s.advisor_id = $1"];
    const params = [advisorId];

    if (sme_id) { params.push(sme_id); conditions.push(`s.business_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`s.status = $${params.length}`); }

    const where = conditions.join(" AND ");

    const { rows } = await pool.query(`
      SELECT s.id, s.business_id, s.scheduled_at, s.status, s.notes, s.action_plan, s.follow_up_date, s.created_at,
             u.name as business_name, u.email as business_email, u.phone as business_phone, u.sector, u.district,
             cs.score, cs.band
      FROM advisory_sessions s
      JOIN users u ON u.id = s.business_id
      LEFT JOIN credit_scores cs ON cs.user_id = s.business_id
      WHERE ${where}
      ORDER BY s.scheduled_at DESC NULLS LAST, s.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]);

    const { rows: [cnt] } = await pool.query(
      `SELECT COUNT(*) FROM advisory_sessions s WHERE ${where}`,
      params
    );

    res.json({ data: rows, total: parseInt(cnt.count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// POST /v2/advisor/sessions — create / log an advisory session
router.post("/sessions", async (req, res, next) => {
  try {
    const { sme_user_id, scheduled_at, status = "scheduled", notes, action_plan, follow_up_date } = req.body;

    if (!sme_user_id) return res.status(400).json({ error: "sme_user_id is required" });

    // Ensure link exists in advisor_clients
    await pool.query(
      `INSERT INTO advisor_clients (advisor_user_id, sme_user_id)
       VALUES ($1, $2) ON CONFLICT (advisor_user_id, sme_user_id) DO NOTHING`,
      [req.user.id, sme_user_id]
    );

    const { rows: [session] } = await pool.query(
      `INSERT INTO advisory_sessions (business_id, advisor_id, scheduled_at, status, notes, action_plan, follow_up_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [sme_user_id, req.user.id, scheduled_at || new Date(), status, notes || null, action_plan || null, follow_up_date || null]
    );

    await logAudit(req.user.id, "ADVISORY_SESSION_CREATED", "advisory_sessions", session.id, null, { sme_user_id, status }, req.ip);

    res.status(201).json(session);
  } catch (err) { next(err); }
});

// PUT /v2/advisor/sessions/:id — update an advisory session
router.put("/sessions/:id", async (req, res, next) => {
  try {
    const { status, notes, action_plan, follow_up_date, scheduled_at, cause_code, intervention, outcome } = req.body;

    const { rows: [session] } = await pool.query(
      `UPDATE advisory_sessions
       SET status = COALESCE($1, status),
           notes = COALESCE($2, notes),
           action_plan = COALESCE($3, action_plan),
           follow_up_date = COALESCE($4, follow_up_date),
           scheduled_at = COALESCE($5, scheduled_at)
       WHERE id = $6 AND (advisor_id = $7 OR $8 = 'pulse_admin')
       RETURNING *`,
      [status || null, notes || null, action_plan || null, follow_up_date || null, scheduled_at || null, req.params.id, req.user.id, req.user.role]
    );

    if (!session) return res.status(404).json({ error: "Session not found or access denied" });

    if (cause_code || intervention || outcome) {
      await pool.query(
        `INSERT INTO advisory_outcomes (session_id, cause_code, intervention, outcome)
         VALUES ($1, $2, $3, $4)`,
        [session.id, cause_code || null, intervention || null, outcome || null]
      );
    }

    await logAudit(req.user.id, "ADVISORY_SESSION_UPDATED", "advisory_sessions", session.id, null, { status }, req.ip);

    res.json(session);
  } catch (err) { next(err); }
});

module.exports = router;
