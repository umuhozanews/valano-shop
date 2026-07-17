const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit } = require("../utils/helpers");

router.use(verifyToken);
router.use(requireRole("pulse_admin"));

// GET /v2/admin/dashboard — platform-wide KPIs
router.get("/dashboard", async (req, res, next) => {
  try {
    const [smeStats, scoreStats, lenderStats, activityStats] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total_smes,
          COUNT(*) FILTER (WHERE created_at >= NOW()-INTERVAL '30 days') AS new_this_month,
          COUNT(*) FILTER (WHERE consent_status='consented') AS consented,
          COUNT(*) FILTER (WHERE consent_status='declined') AS declined,
          COUNT(*) FILTER (WHERE consent_status='withdrawn') AS withdrawn,
          COUNT(*) FILTER (WHERE is_active=false) AS inactive
        FROM users WHERE role='sme_owner'`),

      pool.query(`
        SELECT
          COUNT(*) AS total_scored,
          COUNT(*) FILTER (WHERE band='green') AS green,
          COUNT(*) FILTER (WHERE band='amber')  AS amber,
          COUNT(*) FILTER (WHERE band='red')    AS red,
          ROUND(AVG(score),1) AS avg_score,
          MIN(score) AS min_score,
          MAX(score) AS max_score
        FROM credit_scores`),

      pool.query(`
        SELECT COUNT(DISTINCT lender_user_id) AS total_lenders,
               COUNT(*) AS total_referrals,
               COUNT(*) FILTER (WHERE status='active') AS active_referrals
        FROM referrals`),

      pool.query(`
        SELECT COUNT(*) AS sales_30d,
               COALESCE(SUM(total_amount),0) AS revenue_30d
        FROM sales WHERE is_voided=false AND created_at >= NOW()-INTERVAL '30 days'`),
    ]);

    const { rows: scoreTrend } = await pool.query(`
      SELECT DATE(created_at) as day,
             ROUND(AVG(score),1) as avg_score,
             COUNT(*) as scored
      FROM health_score_log
      WHERE created_at >= NOW()-INTERVAL '30 days'
      GROUP BY DATE(created_at) ORDER BY day`);

    const { rows: sectorBreakdown } = await pool.query(`
      SELECT COALESCE(sector,'other') as sector, COUNT(*) as count,
             ROUND(AVG(cs.score),1) as avg_score
      FROM users u LEFT JOIN credit_scores cs ON cs.user_id=u.id
      WHERE u.role='sme_owner'
      GROUP BY sector ORDER BY count DESC`);

    res.json({
      smes: smeStats.rows[0],
      scores: scoreStats.rows[0],
      lenders: lenderStats.rows[0],
      activity: activityStats.rows[0],
      scoreTrend,
      sectorBreakdown,
    });
  } catch (err) { next(err); }
});

// GET /v2/admin/smes — list all SMEs with their scores
router.get("/smes", async (req, res, next) => {
  try {
    const { band, sector, consent, page = 1, limit = 50, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = ["u.role='sme_owner'"];
    const params = [];

    if (band) { params.push(band); conditions.push(`cs.band=$${params.length}`); }
    if (sector) { params.push(sector); conditions.push(`u.sector=$${params.length}`); }
    if (consent) { params.push(consent); conditions.push(`u.consent_status=$${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }

    const where = conditions.join(" AND ");

    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.email, u.phone, u.sector, u.district,
             u.consent_status, u.is_active, u.created_at,
             cs.score, cs.band, cs.calculated_at
      FROM users u
      LEFT JOIN credit_scores cs ON cs.user_id = u.id
      WHERE ${where}
      ORDER BY u.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]);

    const { rows: [cnt] } = await pool.query(
      `SELECT COUNT(*) FROM users u LEFT JOIN credit_scores cs ON cs.user_id=u.id WHERE ${where}`,
      params
    );

    res.json({ smes: rows, total: parseInt(cnt.count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /v2/admin/lenders — list all lender accounts
router.get("/lenders", async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.name, u.email, u.created_at,
             COUNT(DISTINCT lc.sme_user_id) AS portfolio_size,
             COUNT(DISTINCT ref.id) FILTER (WHERE ref.status='active') AS active_referrals,
             ROUND(AVG(cs.score),1) AS avg_portfolio_score
      FROM users u
      LEFT JOIN lender_clients lc ON lc.lender_user_id=u.id
      LEFT JOIN referrals ref ON ref.lender_user_id=u.id
      LEFT JOIN credit_scores cs ON cs.user_id=lc.sme_user_id
      WHERE u.role='lender'
      GROUP BY u.id, u.name, u.email, u.created_at
      ORDER BY portfolio_size DESC`);

    res.json(rows);
  } catch (err) { next(err); }
});

// GET /v2/admin/model/performance — distribution and quality metrics
router.get("/model/performance", async (req, res, next) => {
  try {
    const { rows: distribution } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE score BETWEEN 0  AND 19)  AS "0-19",
        COUNT(*) FILTER (WHERE score BETWEEN 20 AND 39)  AS "20-39",
        COUNT(*) FILTER (WHERE score BETWEEN 40 AND 54)  AS "40-54",
        COUNT(*) FILTER (WHERE score BETWEEN 55 AND 64)  AS "55-64",
        COUNT(*) FILTER (WHERE score BETWEEN 65 AND 79)  AS "65-79",
        COUNT(*) FILTER (WHERE score BETWEEN 80 AND 100) AS "80-100"
      FROM credit_scores`);

    const { rows: byModel } = await pool.query(`
      SELECT model_version, COUNT(*) as runs, ROUND(AVG(score),1) as avg_score
      FROM health_score_log GROUP BY model_version ORDER BY model_version`);

    const { rows: overTime } = await pool.query(`
      SELECT DATE_TRUNC('week', created_at)::date as week,
             COUNT(*) as scored,
             ROUND(AVG(score),1) as avg
      FROM health_score_log
      WHERE created_at >= NOW()-INTERVAL '90 days'
      GROUP BY DATE_TRUNC('week', created_at) ORDER BY week`);

    res.json({ distribution: distribution[0], byModel, overTime });
  } catch (err) { next(err); }
});

// GET /v2/admin/data-quality — coverage metrics
router.get("/data-quality", async (req, res, next) => {
  try {
    const { rows: [quality] } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role='sme_owner') AS total_smes,
        (SELECT COUNT(*) FROM users WHERE role='sme_owner' AND consent_status='consented') AS consented,
        (SELECT COUNT(DISTINCT user_id) FROM sales WHERE created_at >= NOW()-INTERVAL '30 days') AS active_sellers,
        (SELECT COUNT(DISTINCT user_id) FROM expenses WHERE expense_date::date >= CURRENT_DATE-30) AS have_expenses,
        (SELECT COUNT(*) FROM stock_items WHERE is_active=true) AS stock_items,
        (SELECT COUNT(*) FROM credit_scores) AS scored_businesses,
        (SELECT COUNT(*) FROM health_score_log WHERE created_at >= NOW()-INTERVAL '7 days') AS scored_this_week
    `);

    res.json(quality);
  } catch (err) { next(err); }
});

// PUT /v2/admin/users/:id/role — change a user's role
router.put("/users/:id/role", async (req, res, next) => {
  try {
    const { role } = req.body;
    const allowed = ["sme_owner", "manager", "accountant", "cashier", "lender", "databridge_advisor", "viewer", "admin"];
    if (!allowed.includes(role)) return res.status(400).json({ error: "Invalid role" });

    const { rows: [before] } = await pool.query("SELECT role FROM users WHERE id=$1", [req.params.id]);
    if (!before) return res.status(404).json({ error: "User not found" });

    await pool.query("UPDATE users SET role=$1 WHERE id=$2", [role, req.params.id]);

    await logAudit(req.user.id, "ROLE_CHANGED", "users", req.params.id, { role: before.role }, { role }, req.ip);

    res.json({ message: "Role updated", old_role: before.role, new_role: role });
  } catch (err) { next(err); }
});

// PUT /v2/admin/users/:id/activate — activate or deactivate
router.put("/users/:id/activate", async (req, res, next) => {
  try {
    const { is_active } = req.body;
    await pool.query("UPDATE users SET is_active=$1 WHERE id=$2", [!!is_active, req.params.id]);
    await logAudit(req.user.id, is_active ? "USER_ACTIVATED" : "USER_DEACTIVATED", "users", req.params.id, null, null, req.ip);
    res.json({ message: `User ${is_active ? "activated" : "deactivated"}` });
  } catch (err) { next(err); }
});

// GET /v2/admin/audit — platform audit log
router.get("/audit", async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, user_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    const params = [];
    if (action) { params.push(`%${action}%`); conditions.push(`al.action ILIKE $${params.length}`); }
    if (user_id) { params.push(user_id); conditions.push(`al.user_id=$${params.length}`); }

    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    const { rows } = await pool.query(`
      SELECT al.*, u.name as user_name, u.email, u.role
      FROM audit_log al JOIN users u ON u.id=al.user_id
      ${where} ORDER BY al.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), offset]);

    res.json({ audit: rows, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// POST /v2/admin/seed-mock-data — seed demo/mock data into the production DB
// Protected: pulse_admin only. Idempotent (safe to run multiple times).
router.post("/seed-mock-data", async (req, res, next) => {
  try {
    const { seedFast } = require("../../scripts/seedMockDataFast");
    const result = await seedFast();
    res.json({
      ok: true,
      message: "Mock data seeded successfully",
      accounts: result.allAccounts,
      log: result.log,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
      code: err.code,
      detail: err.detail,
    });
  }
});

// POST /v2/admin/backfill-journal — create journal entries for all existing sales + expenses
router.post("/backfill-journal", async (req, res, next) => {
  try {
    const { ensureJournalTables, journalForSale, journalForExpense } = require("../utils/journal");
    const pool = require("../config/db");
    await ensureJournalTables();

    // Skip sales that already have a journal entry
    const { rows: sales } = await pool.query(`
      SELECT s.id, s.total_amount, s.payment_method, s.created_at,
             i.invoice_number,
             s.total_amount - COALESCE(ar.amount, 0) as amount_paid
      FROM sales s
      LEFT JOIN invoices i ON i.sale_id = s.id
      LEFT JOIN accounts_receivable ar ON ar.sale_id = s.id AND ar.status != 'paid'
      WHERE s.is_voided = false
        AND NOT EXISTS (
          SELECT 1 FROM journal_entries je
          WHERE je.reference_type = 'sale' AND je.reference_id = s.id
        )
      ORDER BY s.created_at ASC
      LIMIT 500
    `);

    const { rows: expenses } = await pool.query(`
      SELECT id, amount, category, description, expense_date, recorded_by
      FROM expenses
      WHERE NOT EXISTS (
        SELECT 1 FROM journal_entries je
        WHERE je.reference_type = 'expense' AND je.reference_id = expenses.id
      )
      ORDER BY expense_date ASC
      LIMIT 500
    `);

    let saleCount = 0, expenseCount = 0;

    for (const s of sales) {
      await journalForSale({
        saleId: s.id,
        total: parseFloat(s.total_amount),
        amountPaid: parseFloat(s.amount_paid || s.total_amount),
        paymentMethod: s.payment_method,
        invoiceNumber: s.invoice_number,
        createdBy: null,
        saleDate: s.created_at,
      });
      saleCount++;
    }

    for (const e of expenses) {
      await journalForExpense({
        expenseId: e.id,
        amount: e.amount,
        category: e.category,
        description: e.description,
        createdBy: e.recorded_by,
        expenseDate: e.expense_date,
      });
      expenseCount++;
    }

    res.json({ ok: true, sales: saleCount, expenses: expenseCount });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
