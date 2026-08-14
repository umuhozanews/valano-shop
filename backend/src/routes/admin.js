const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit } = require("../utils/helpers");
const { validatePasswordStrength } = require("../utils/validation");

router.use(verifyToken);
router.use(requireRole("admin", "pulse_admin"));

// ─── 1. Platform Overview KPIs ────────────────────────────────────────────────
router.get(["/overview", "/dashboard", "/kpis"], async (req, res, next) => {
  try {
    const [smeStats, salesStats, scoreStats, activityStats, recentSignups, sectorStats, districtStats] = await Promise.all([
      // Total SMEs, new this week, new this month, active vs inactive
      pool.query(`
        SELECT
          COUNT(*) AS total_smes,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS new_this_week,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_this_month,
          COUNT(*) FILTER (WHERE is_active = true) AS active_smes,
          COUNT(*) FILTER (WHERE is_active = false) AS deactivated_smes,
          COUNT(*) FILTER (WHERE consent_status = 'consented' OR consent_status = 'granted') AS consented_smes
        FROM users WHERE role IN ('sme_owner', 'admin') AND role NOT IN ('pulse_admin', 'databridge_advisor', 'lender')
      `),

      // Platform-wide GMV sales volume across ALL SMEs combined
      pool.query(`
        SELECT
          COALESCE(SUM(total_amount), 0)::bigint AS all_time_volume,
          COUNT(*)::integer AS all_time_transactions,
          COALESCE(SUM(total_amount) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days'), 0)::bigint AS volume_30d,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::integer AS transactions_30d,
          COALESCE(SUM(total_amount) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'), 0)::bigint AS volume_7d,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::integer AS transactions_7d,
          COALESCE(AVG(total_amount), 0)::bigint AS avg_transaction_size
        FROM sales WHERE is_voided = false
      `),

      // Platform-wide health / SACCO credit score distribution
      pool.query(`
        SELECT
          COUNT(*)::integer AS total_scored,
          COUNT(*) FILTER (WHERE band = 'green')::integer AS green_count,
          COUNT(*) FILTER (WHERE band = 'amber')::integer AS amber_count,
          COUNT(*) FILTER (WHERE band = 'red')::integer AS red_count,
          ROUND(AVG(score), 1) AS avg_score,
          MIN(score) AS min_score,
          MAX(score) AS max_score
        FROM credit_scores
      `),

      // Active vs Inactive / Churned SMEs (Active = made sale or expense in last 30d)
      pool.query(`
        SELECT
          COUNT(DISTINCT u.id) FILTER (
            WHERE s.id IS NOT NULL OR e.id IS NOT NULL
          )::integer AS active_merchants_30d,
          COUNT(DISTINCT u.id) FILTER (
            WHERE s.id IS NULL AND e.id IS NULL AND u.created_at < NOW() - INTERVAL '30 days'
          )::integer AS churned_merchants
        FROM users u
        LEFT JOIN sales s ON s.owner_id = u.id AND s.created_at >= NOW() - INTERVAL '30 days' AND s.is_voided = false
        LEFT JOIN expenses e ON e.owner_id = u.id AND e.expense_date >= CURRENT_DATE - 30
        WHERE u.role IN ('sme_owner', 'admin') AND u.role NOT IN ('pulse_admin', 'databridge_advisor', 'lender')
      `),

      // Recent 10 Signups Feed
      pool.query(`
        SELECT u.id, u.name, u.email, u.phone, u.sector, u.district, u.created_at, u.is_active, COALESCE(u.profile_complete, true) AS profile_complete,
               COALESCE(sett.shop_name, u.name || '''s Shop') AS shop_name
        FROM users u
        LEFT JOIN settings sett ON sett.owner_id = u.id
        WHERE u.role IN ('sme_owner', 'admin') AND u.role NOT IN ('pulse_admin', 'databridge_advisor', 'lender')
        ORDER BY u.created_at DESC LIMIT 10
      `),

      // Sector Breakdown
      pool.query(`
        SELECT COALESCE(u.sector, 'General Retail') AS sector,
               COUNT(u.id)::integer AS count,
               COALESCE(SUM(s.total_amount), 0)::bigint AS total_volume
        FROM users u
        LEFT JOIN sales s ON s.owner_id = u.id AND s.is_voided = false
        WHERE u.role IN ('sme_owner', 'admin') AND u.role NOT IN ('pulse_admin', 'databridge_advisor', 'lender')
        GROUP BY 1 ORDER BY count DESC LIMIT 8
      `),

      // District Breakdown
      pool.query(`
        SELECT COALESCE(u.district, 'Kigali (Gasabo)') AS district,
               COUNT(u.id)::integer AS count
        FROM users u
        WHERE u.role IN ('sme_owner', 'admin') AND u.role NOT IN ('pulse_admin', 'databridge_advisor', 'lender')
        GROUP BY 1 ORDER BY count DESC LIMIT 8
      `),
    ]);

    const smes = smeStats.rows[0] || {};
    const sales = salesStats.rows[0] || {};
    const scores = scoreStats.rows[0] || {};
    const activity = activityStats.rows[0] || {};

    // Estimated Platform Revenue (e.g. 5,000 RWF/mo per active SME + 0.5% transaction commission)
    const activeCount = parseInt(activity.active_merchants_30d || smes.active_smes || 0, 10);
    const volume30d = parseInt(sales.volume_30d || 0, 10);
    const estimatedSubscriptionRevenue = activeCount * 5000;
    const estimatedCommissionRevenue = Math.round(volume30d * 0.005);
    const estimatedTotalRevenue = estimatedSubscriptionRevenue + estimatedCommissionRevenue;

    res.json({
      smes: {
        total: parseInt(smes.total_smes || 0, 10),
        new_this_week: parseInt(smes.new_this_week || 0, 10),
        new_this_month: parseInt(smes.new_this_month || 0, 10),
        active: parseInt(smes.active_smes || 0, 10),
        deactivated: parseInt(smes.deactivated_smes || 0, 10),
        consented: parseInt(smes.consented_smes || 0, 10),
        active_30d: activeCount,
        churned: parseInt(activity.churned_merchants || 0, 10),
      },
      sales: {
        all_time_volume: parseInt(sales.all_time_volume || 0, 10),
        all_time_transactions: parseInt(sales.all_time_transactions || 0, 10),
        volume_30d: volume30d,
        transactions_30d: parseInt(sales.transactions_30d || 0, 10),
        volume_7d: parseInt(sales.volume_7d || 0, 10),
        transactions_7d: parseInt(sales.transactions_7d || 0, 10),
        avg_transaction_size: parseInt(sales.avg_transaction_size || 0, 10),
      },
      estimatedRevenue: {
        monthlySubscription: estimatedSubscriptionRevenue,
        commissionFee: estimatedCommissionRevenue,
        totalMonthly: estimatedTotalRevenue,
        currency: "RWF",
      },
      scores: {
        total_scored: parseInt(scores.total_scored || 0, 10),
        green: parseInt(scores.green_count || 0, 10),
        amber: parseInt(scores.amber_count || 0, 10),
        red: parseInt(scores.red_count || 0, 10),
        avg_score: scores.avg_score ? parseFloat(scores.avg_score) : 74,
      },
      recentSignups: recentSignups.rows,
      sectorBreakdown: sectorStats.rows,
      districtBreakdown: districtStats.rows,
    });
  } catch (err) { next(err); }
});

// ─── 2. SME Directory (List, Search & Filter) ─────────────────────────────────
router.get("/smes", async (req, res, next) => {
  try {
    const { search, status, sector, district, band, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = ["(u.role IN ('sme_owner', 'admin') AND u.role NOT IN ('pulse_admin', 'databridge_advisor', 'lender'))"];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(
        u.name ILIKE $${params.length} OR
        u.email ILIKE $${params.length} OR
        u.phone ILIKE $${params.length} OR
        sett.shop_name ILIKE $${params.length} OR
        u.district ILIKE $${params.length} OR
        u.sector ILIKE $${params.length}
      )`);
    }

    if (status === "active") {
      conditions.push("u.is_active = true");
    } else if (status === "deactivated" || status === "suspended") {
      conditions.push("u.is_active = false");
    }

    if (sector && sector !== "all") {
      params.push(sector);
      conditions.push(`u.sector = $${params.length}`);
    }

    if (district && district !== "all") {
      params.push(district);
      conditions.push(`u.district = $${params.length}`);
    }

    if (band && band !== "all") {
      params.push(band);
      conditions.push(`cs.band = $${params.length}`);
    }

    const whereClause = conditions.join(" AND ");

    const [dataRes, countRes] = await Promise.all([
      pool.query(`
        SELECT
          u.id, u.name, u.email, u.phone, u.sector, u.district, u.currency,
          u.is_active, u.consent_status, u.created_at, COALESCE(u.profile_complete, true) AS profile_complete,
          COALESCE(sett.shop_name, u.name || '''s Shop') AS shop_name,
          sett.shop_address, sett.shop_phone, sett.tin_number,
          cs.score, cs.band, cs.calculated_at,
          COALESCE(stk.items_count, 0)::integer AS items_count,
          COALESCE(sls.total_sales, 0)::bigint AS total_sales,
          COALESCE(sls.sales_count, 0)::integer AS sales_count,
          GREATEST(u.created_at, sls.last_sale, exp.last_expense, stk.last_stock) AS last_activity_at
        FROM users u
        LEFT JOIN settings sett ON sett.owner_id = u.id
        LEFT JOIN credit_scores cs ON cs.user_id = u.id
        LEFT JOIN (
          SELECT owner_id, COUNT(id) AS items_count, MAX(created_at) AS last_stock
          FROM stock_items WHERE is_active = true GROUP BY owner_id
        ) stk ON stk.owner_id = u.id
        LEFT JOIN (
          SELECT owner_id, SUM(total_amount) AS total_sales, COUNT(id) AS sales_count, MAX(created_at) AS last_sale
          FROM sales WHERE is_voided = false GROUP BY owner_id
        ) sls ON sls.owner_id = u.id
        LEFT JOIN (
          SELECT owner_id, MAX(created_at) AS last_expense
          FROM expenses GROUP BY owner_id
        ) exp ON exp.owner_id = u.id
        WHERE ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, parseInt(limit), offset]),

      pool.query(`
        SELECT COUNT(DISTINCT u.id) AS total
        FROM users u
        LEFT JOIN settings sett ON sett.owner_id = u.id
        LEFT JOIN credit_scores cs ON cs.user_id = u.id
        WHERE ${whereClause}
      `, params),
    ]);

    res.json({
      smes: dataRes.rows,
      total: parseInt(countRes.rows[0]?.total || 0, 10),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) { next(err); }
});

// ─── 3. "Visit Shop" — View Individual SME Data (READ-ONLY, Audited) ─────────
router.get("/smes/:id/shop-view", async (req, res, next) => {
  try {
    const smeId = parseInt(req.params.id, 10);
    if (!smeId) return res.status(400).json({ error: "Valid SME ID required" });

    // 1. Fetch SME user profile
    const { rows: [smeUser] } = await pool.query(
      "SELECT id, name, email, phone, role, is_active, sector, district, currency, created_at FROM users WHERE id=$1",
      [smeId]
    );
    if (!smeUser) return res.status(404).json({ error: "SME business account not found" });

    // 2. CRITICAL: Traceable Audit Log
    await logAudit(
      req.user.id,
      "ADMIN_VIEWED_SME_DATA",
      "users",
      smeId,
      null,
      {
        sme_id: smeId,
        sme_name: smeUser.name,
        sme_email: smeUser.email,
        admin_id: req.user.id,
        admin_email: req.user.email,
        access_type: "READ_ONLY_SHOP_MONITORING",
      },
      req.ip
    );

    // 3. Parallel fetch of all business data for this SME
    const [settingsRes, stockRes, salesRes, customersRes, expensesRes, scoreRes, arRes, pnlRes] = await Promise.all([
      // Settings
      pool.query("SELECT * FROM settings WHERE owner_id=$1 LIMIT 1", [smeId]),

      // Stock items (up to 100)
      pool.query(
        `SELECT id, name, name_rw, category, unit, quantity, cost_price_rwf, sell_price_rwf, low_stock_threshold, is_active, created_at
         FROM stock_items WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 100`,
        [smeId]
      ),

      // Sales & Invoices (up to 100)
      pool.query(
        `SELECT s.id, s.total_amount, s.payment_method, s.payment_status, s.is_voided, s.created_at,
                c.name AS customer_name, i.invoice_number, i.status AS invoice_status,
                (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id=s.id) AS items_count
         FROM sales s
         LEFT JOIN customers c ON c.id = s.customer_id
         LEFT JOIN invoices i ON i.sale_id = s.id
         WHERE s.owner_id=$1 ORDER BY s.created_at DESC LIMIT 100`,
        [smeId]
      ),

      // Customers
      pool.query(
        `SELECT c.id, c.name, c.phone, c.location, c.type, c.segment, c.created_at,
                COUNT(s.id) AS total_orders,
                COALESCE(SUM(s.total_amount), 0) AS total_spent
         FROM customers c
         LEFT JOIN sales s ON s.customer_id = c.id AND s.is_voided = false
         WHERE c.owner_id=$1
         GROUP BY c.id ORDER BY total_spent DESC LIMIT 50`,
        [smeId]
      ),

      // Expenses
      pool.query(
        `SELECT id, category, amount, description, expense_date, created_at
         FROM expenses WHERE owner_id=$1 ORDER BY expense_date DESC LIMIT 50`,
        [smeId]
      ),

      // Credit Score & Health
      pool.query(
        `SELECT score, band, factors, calculated_at, advisory_token
         FROM credit_scores WHERE user_id=$1 LIMIT 1`,
        [smeId]
      ),

      // Accounts Receivable
      pool.query(
        `SELECT ar.id, ar.amount, ar.amount_paid, ar.status, ar.due_date, c.name AS customer_name
         FROM accounts_receivable ar
         LEFT JOIN customers c ON c.id = ar.customer_id
         WHERE ar.owner_id=$1 ORDER BY ar.created_at DESC LIMIT 20`,
        [smeId]
      ),

      // Quick P&L snapshot for this SME
      pool.query(
        `SELECT
          COALESCE(SUM(s.total_amount), 0)::bigint AS total_revenue,
          COALESCE(SUM(si.quantity * stk.cost_price_rwf), 0)::bigint AS total_cogs,
          (SELECT COALESCE(SUM(amount), 0)::bigint FROM expenses WHERE owner_id=$1) AS total_expenses
         FROM sales s
         LEFT JOIN sale_items si ON si.sale_id = s.id
         LEFT JOIN stock_items stk ON stk.id = si.stock_item_id
         WHERE s.owner_id=$1 AND s.is_voided = false`,
        [smeId]
      ),
    ]);

    const pnl = pnlRes.rows[0] || {};
    const rev = parseInt(pnl.total_revenue || 0, 10);
    const cogs = parseInt(pnl.total_cogs || 0, 10);
    const exp = parseInt(pnl.total_expenses || 0, 10);
    const grossProfit = rev - cogs;
    const netProfit = grossProfit - exp;

    res.json({
      readOnly: true,
      auditedAccess: true,
      sme: smeUser,
      settings: settingsRes.rows[0] || { shop_name: `${smeUser.name}'s Shop` },
      stock: stockRes.rows,
      sales: salesRes.rows,
      customers: customersRes.rows,
      expenses: expensesRes.rows,
      receivables: arRes.rows,
      score: scoreRes.rows[0] || null,
      financialSummary: {
        revenue: rev,
        costOfGoods: cogs,
        grossProfit,
        expenses: exp,
        netProfit,
        grossMargin: rev > 0 ? Math.round((grossProfit / rev) * 100) : 0,
        netMargin: rev > 0 ? Math.round((netProfit / rev) * 100) : 0,
      },
    });
  } catch (err) { next(err); }
});

// ─── 4. Account Management & Moderation ───────────────────────────────────────

// 4a. Deactivate / Reactivate SME Account
router.put("/smes/:id/status", async (req, res, next) => {
  try {
    const smeId = parseInt(req.params.id, 10);
    const { is_active } = req.body;
    if (typeof is_active !== "boolean") {
      return res.status(400).json({ error: "is_active (boolean) is required" });
    }

    const { rows: [updated] } = await pool.query(
      "UPDATE users SET is_active=$1 WHERE id=$2 RETURNING id, name, email, is_active",
      [is_active, smeId]
    );
    if (!updated) return res.status(404).json({ error: "SME user not found" });

    await logAudit(
      req.user.id,
      is_active ? "ADMIN_USER_ACTIVATED" : "ADMIN_USER_DEACTIVATED",
      "users",
      smeId,
      null,
      { is_active, target_email: updated.email, admin_id: req.user.id },
      req.ip
    );

    res.json({
      message: `Account "${updated.name}" successfully ${is_active ? "activated" : "deactivated"}.`,
      user: updated,
    });
  } catch (err) { next(err); }
});

// 4b. Admin Password Reset for Locked-out Merchant
router.post("/smes/:id/reset-password", async (req, res, next) => {
  try {
    const smeId = parseInt(req.params.id, 10);
    const { new_password } = req.body;

    const passwordToSet = new_password && new_password.trim().length >= 6
      ? new_password.trim()
      : `Inzira@${Math.floor(100000 + Math.random() * 900000)}`;

    const strength = validatePasswordStrength(passwordToSet);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.error });
    }

    const hash = await bcrypt.hash(passwordToSet, 10);

    const { rows: [user] } = await pool.query(
      "UPDATE users SET password_hash=$1, is_active=true WHERE id=$2 RETURNING id, name, email",
      [hash, smeId]
    );
    if (!user) return res.status(404).json({ error: "SME user not found" });

    await logAudit(
      req.user.id,
      "ADMIN_PASSWORD_RESET",
      "users",
      smeId,
      null,
      { target_email: user.email, admin_id: req.user.id },
      req.ip
    );

    res.json({
      message: `Password reset successfully for ${user.email}`,
      temporaryPassword: passwordToSet,
      user,
    });
  } catch (err) { next(err); }
});

// 4c. Specific Audit Log for this SME
router.get("/smes/:id/audit", async (req, res, next) => {
  try {
    const smeId = parseInt(req.params.id, 10);
    const { limit = 50 } = req.query;

    const { rows } = await pool.query(
      `SELECT al.*, u.name AS user_name, u.email AS user_email
       FROM audit_log al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE al.user_id = $1 OR al.target_id = $1
       ORDER BY al.created_at DESC LIMIT $2`,
      [smeId, parseInt(limit)]
    );

    res.json({ audit: rows, count: rows.length });
  } catch (err) { next(err); }
});

// ─── 5. Platform-Wide Analytics ───────────────────────────────────────────────
router.get("/analytics", async (req, res, next) => {
  try {
    const [dailyTrends, monthlyTrends, topSmes, sectorShares, signupVelocity] = await Promise.all([
      // Combined Daily Sales Trend across all SMEs (last 30 days)
      pool.query(`
        WITH dates AS (
          SELECT generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day')::date AS day
        ),
        daily_s AS (
          SELECT DATE(created_at) AS day,
                 COALESCE(SUM(total_amount), 0)::bigint AS volume,
                 COUNT(*)::integer AS transactions
          FROM sales WHERE is_voided = false AND created_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY 1
        )
        SELECT d.day::text,
               COALESCE(s.volume, 0)::bigint AS volume,
               COALESCE(s.transactions, 0)::integer AS transactions
        FROM dates d
        LEFT JOIN daily_s s ON s.day = d.day
        ORDER BY d.day ASC
      `),

      // Monthly Trend (last 12 months)
      pool.query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month_label,
          DATE_TRUNC('month', created_at)::date AS month_date,
          COALESCE(SUM(total_amount), 0)::bigint AS volume,
          COUNT(*)::integer AS transactions,
          COUNT(DISTINCT owner_id)::integer AS active_merchants
        FROM sales
        WHERE is_voided = false AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY 1, 2 ORDER BY 2 ASC
      `),

      // Top-Performing SMEs Leaderboard
      pool.query(`
        SELECT u.id, u.name, u.email, u.phone, u.sector, u.district,
               COALESCE(sett.shop_name, u.name || '''s Shop') AS shop_name,
               COALESCE(SUM(s.total_amount), 0)::bigint AS total_volume,
               COUNT(s.id)::integer AS total_transactions,
               COALESCE(cs.score, 75) AS health_score,
               COALESCE(cs.band, 'green') AS health_band
        FROM users u
        LEFT JOIN settings sett ON sett.owner_id = u.id
        LEFT JOIN sales s ON s.owner_id = u.id AND s.is_voided = false
        LEFT JOIN credit_scores cs ON cs.user_id = u.id
        WHERE u.role = 'sme_owner'
        GROUP BY u.id, u.name, u.email, u.phone, u.sector, u.district, sett.shop_name, cs.score, cs.band
        ORDER BY total_volume DESC LIMIT 10
      `),

      // Sector & District Market Share
      pool.query(`
        SELECT COALESCE(u.sector, 'Retail') AS sector,
               COUNT(DISTINCT u.id)::integer AS merchant_count,
               COALESCE(SUM(s.total_amount), 0)::bigint AS total_sales
        FROM users u
        LEFT JOIN sales s ON s.owner_id = u.id AND s.is_voided = false
        WHERE u.role = 'sme_owner'
        GROUP BY 1 ORDER BY total_sales DESC
      `),

      // New Signups Growth Velocity
      pool.query(`
        SELECT DATE_TRUNC('month', created_at)::date AS month,
               COUNT(*)::integer AS signups
        FROM users WHERE role = 'sme_owner' AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY 1 ORDER BY 1 ASC
      `),
    ]);

    res.json({
      dailyTrends: dailyTrends.rows,
      monthlyTrends: monthlyTrends.rows,
      topSmes: topSmes.rows,
      sectorShares: sectorShares.rows,
      signupVelocity: signupVelocity.rows,
    });
  } catch (err) { next(err); }
});

// ─── 6. Master Audit Log Search ───────────────────────────────────────────────
router.get("/audit", async (req, res, next) => {
  try {
    const { action, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    const params = [];

    if (action) {
      params.push(`%${action}%`);
      conditions.push(`al.action ILIKE $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR al.action ILIKE $${params.length} OR al.entity_type ILIKE $${params.length})`);
    }

    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

    const [auditRes, countRes] = await Promise.all([
      pool.query(`
        SELECT al.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
        FROM audit_log al
        LEFT JOIN users u ON u.id = al.user_id
        ${where}
        ORDER BY al.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, parseInt(limit), offset]),

      pool.query(`
        SELECT COUNT(*) AS total
        FROM audit_log al
        LEFT JOIN users u ON u.id = al.user_id
        ${where}
      `, params),
    ]);

    res.json({
      audit: auditRes.rows,
      total: parseInt(countRes.rows[0]?.total || 0, 10),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) { next(err); }
});

module.exports = router;
