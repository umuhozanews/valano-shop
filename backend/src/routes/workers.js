const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { verifyToken, requireRole } = require("../middleware/auth");
const { logAudit, createNotification, paginate } = require("../utils/helpers");
const { isValidEmail, validatePasswordStrength } = require("../utils/validation");

router.use(verifyToken, requireRole("admin", "manager"));

router.get("/", async (req, res, next) => {
  try {
    const { branch_id, role, search, page, limit } = req.query;
    const { limit: lim, offset } = paginate(page, limit);
    const conds = ["u.role IN ('manager','worker')"]; const params = [];
    if (req.user.role === "manager") { params.push(req.user.branch_id); conds.push(`u.branch_id=$${params.length}`); }
    else if (branch_id) { params.push(branch_id); conds.push(`u.branch_id=$${params.length}`); }
    if (role) { params.push(role); conds.push(`u.role=$${params.length}`); }
    if (search) { params.push(`%${search}%`); conds.push(`u.name ILIKE $${params.length}`); }
    params.push(lim); params.push(offset);
    const where = conds.join(" AND ");

    const { rows } = await pool.query(
      `SELECT u.*, b.name as branch_name,
        (SELECT COUNT(*) FROM sales s WHERE s.worker_id=u.id
          AND DATE_TRUNC('month',s.created_at)=DATE_TRUNC('month',NOW()) AND s.is_voided=false) as monthly_sales,
        (SELECT COALESCE(SUM(s.total_amount),0) FROM sales s WHERE s.worker_id=u.id
          AND DATE_TRUNC('month',s.created_at)=DATE_TRUNC('month',NOW()) AND s.is_voided=false) as monthly_revenue
       FROM users u LEFT JOIN branches b ON b.id=u.branch_id
       WHERE ${where} ORDER BY u.name
       LIMIT $${params.length-1} OFFSET $${params.length}`, params
    );
    res.json(rows.map(({ password_hash, ...u }) => u));
  } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.*, b.name as branch_name FROM users u LEFT JOIN branches b ON b.id=u.branch_id WHERE u.id=$1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Worker not found" });
    const { password_hash, ...user } = rows[0];
    res.json(user);
  } catch (err) { next(err); }
});

router.get("/:id/performance", async (req, res, next) => {
  try {
    const id = req.params.id;
    const [total, monthly, target, topItems, dailyTrend, byCategory] = await Promise.all([
      pool.query(`SELECT COUNT(*) as sales, COALESCE(SUM(total_amount),0) as revenue,
        COALESCE(AVG(total_amount),0) as avg_sale FROM sales WHERE worker_id=$1 AND is_voided=false`, [id]),
      pool.query(`SELECT COUNT(*) as sales, COALESCE(SUM(total_amount),0) as revenue
        FROM sales WHERE worker_id=$1 AND is_voided=false
        AND DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW())`, [id]),
      pool.query(`SELECT monthly_target, commission_rate FROM users WHERE id=$1`, [id]),
      pool.query(`SELECT stk.name, stk.category, SUM(si.quantity) as units, SUM(si.subtotal) as revenue
        FROM sale_items si JOIN stock_items stk ON stk.id=si.stock_item_id
        JOIN sales s ON s.id=si.sale_id WHERE s.worker_id=$1 AND s.is_voided=false
        GROUP BY stk.id, stk.name, stk.category ORDER BY revenue DESC LIMIT 5`, [id]),
      pool.query(`SELECT DATE(created_at) as date, COALESCE(SUM(total_amount),0) as revenue
        FROM sales WHERE worker_id=$1 AND is_voided=false
        AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at) ORDER BY date`, [id]),
      pool.query(`SELECT stk.category, SUM(si.subtotal) as revenue
        FROM sale_items si JOIN stock_items stk ON stk.id=si.stock_item_id
        JOIN sales s ON s.id=si.sale_id WHERE s.worker_id=$1 AND s.is_voided=false
        GROUP BY stk.category`, [id]),
    ]);

    const monthlyRev = parseFloat(monthly.rows[0].revenue);
    const target_ = parseFloat(target.rows[0]?.monthly_target || 0);
    const commRate = parseFloat(target.rows[0]?.commission_rate || 0);

    res.json({
      totalSales: parseInt(total.rows[0].sales),
      totalRevenue: parseFloat(total.rows[0].revenue),
      avgSaleValue: parseFloat(total.rows[0].avg_sale),
      salesThisMonth: parseInt(monthly.rows[0].sales),
      monthlyRevenue: monthlyRev,
      monthlyTarget: target_,
      targetProgress: target_ > 0 ? Math.min(100, Math.round((monthlyRev / target_) * 100)) : 0,
      commissionEarned: Math.round((monthlyRev * commRate) / 100),
      topItems: topItems.rows,
      dailyTrend: dailyTrend.rows,
      byCategory: byCategory.rows,
    });
  } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, email, phone, role, branch_id, monthly_target, commission_rate, password } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const passToValidate = password || "Worker@123";
    const strength = validatePasswordStrength(passToValidate);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.error });
    }

    const hash = await bcrypt.hash(passToValidate, 10);
    const { rows: [user] } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, branch_id, phone, monthly_target, commission_rate)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, email.toLowerCase().trim(), hash, role || "worker", branch_id, phone, monthly_target || 0, commission_rate || 5]
    );
    await logAudit(req.user.id, "WORKER_CREATED", "users", user.id, null, { name, email, role }, req.ip);
    const { password_hash, ...safe } = user;
    res.status(201).json(safe);
  } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { name, phone, role, branch_id, monthly_target, commission_rate, is_active } = req.body;
    const old = await pool.query("SELECT * FROM users WHERE id=$1", [req.params.id]);
    const { rows: [user] } = await pool.query(
      `UPDATE users SET name=$1, phone=$2, role=$3, branch_id=$4, monthly_target=$5,
        commission_rate=$6, is_active=$7 WHERE id=$8 RETURNING *`,
      [name, phone, role, branch_id, monthly_target, commission_rate, is_active ?? true, req.params.id]
    );
    await logAudit(req.user.id, "WORKER_UPDATED", "users", user.id, old.rows[0], user, req.ip);
    const { password_hash, ...safe } = user;
    res.json(safe);
  } catch (err) { next(err); }
});

router.put("/:id/deactivate", requireRole("admin", "manager"), async (req, res, next) => {
  try {
    if (req.user.role === "manager") {
      const { rows: [worker] } = await pool.query("SELECT * FROM users WHERE id=$1", [req.params.id]);
      if (!worker) return res.status(404).json({ error: "Worker not found" });
      if (worker.branch_id !== req.user.branch_id) {
        return res.status(403).json({ error: "Unauthorized branch" });
      }
    }
    await pool.query("UPDATE users SET is_active=false WHERE id=$1", [req.params.id]);
    await logAudit(req.user.id, "WORKER_DEACTIVATED", "users", req.params.id, null, null, req.ip);
    res.json({ message: "Worker deactivated" });
  } catch (err) { next(err); }
});

router.post("/:id/attendance", async (req, res, next) => {
  try {
    const { check_in, check_out, date } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO attendance (user_id, check_in, check_out, date)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, date) DO UPDATE SET check_in=EXCLUDED.check_in, check_out=EXCLUDED.check_out
       RETURNING *`,
      [req.params.id, check_in, check_out, date || new Date().toISOString().slice(0, 10)]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
