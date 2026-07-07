const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { JWT_SECRET, JWT_REFRESH_SECRET } = require("../config/env");
const { verifyToken } = require("../middleware/auth");
const { logAudit } = require("../utils/helpers");
const { isValidEmail, validatePasswordStrength } = require("../utils/validation");
const { sendLoginAlert } = require("../utils/mailer");

const VALID_ROLES = ['sme_owner','manager','cashier','accountant','databridge_advisor','lender','pulse_admin','admin'];

// ─── Login ────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    if (!isValidEmail(email))
      return res.status(400).json({ error: "Invalid email format" });

    const { rows } = await pool.query(
      "SELECT * FROM users WHERE email=$1 AND is_active=true",
      [email.toLowerCase().trim()]
    );
    const user = rows[0];

    if (!user) {
      await logAudit(null, "LOGIN_FAILED", "users", null, null, { email }, req.ip);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await logAudit(null, "LOGIN_FAILED", "users", user.id, null, { email }, req.ip);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    await logAudit(user.id, "LOGIN", "users", user.id, null, { email }, req.ip);

    sendLoginAlert(user.email, user.name, req.ip).catch(e => {
      console.error("[MAIL ERROR] Background email dispatch failed:", e.message);
    });

    const { password_hash, otp_code, otp_expires_at, ...safeUser } = user;
    res.json({ accessToken, refreshToken, user: safeUser });
  } catch (err) { next(err); }
});

// ─── Refresh token ────────────────────────────────────────────────────────────
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "Refresh token required" });

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE id=$1 AND is_active=true", [decoded.id]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "User not found" });

    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
    res.json({ accessToken });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError")
      return res.status(401).json({ error: "Invalid refresh token" });
    next(err);
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post("/logout", verifyToken, async (req, res, next) => {
  try {
    await logAudit(req.user.id, "LOGOUT", "users", req.user.id, null, null, req.ip);
    res.json({ message: "Logged out" });
  } catch (err) { next(err); }
});

// ─── Me ───────────────────────────────────────────────────────────────────────
router.get("/me", verifyToken, async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE id=$1", [req.user.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });
    const { password_hash, otp_code, otp_expires_at, ...safe } = user;
    res.json(safe);
  } catch (err) { next(err); }
});

// ─── Change password ──────────────────────────────────────────────────────────
router.put("/me/password", verifyToken, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { rows } = await pool.query("SELECT * FROM users WHERE id=$1", [req.user.id]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash)))
      return res.status(400).json({ error: "Current password incorrect" });

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid)
      return res.status(400).json({ error: strength.error });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, req.user.id]);
    res.json({ message: "Password updated" });
  } catch (err) { next(err); }
});

// ─── Update profile ───────────────────────────────────────────────────────────
router.put("/me/profile", verifyToken, async (req, res, next) => {
  try {
    const { name, email, phone, language, sector, district } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Name and email required" });

    const { rows: existing } = await pool.query(
      "SELECT id FROM users WHERE email=$1 AND id!=$2",
      [email.toLowerCase().trim(), req.user.id]
    );
    if (existing.length) return res.status(400).json({ error: "Email is already in use" });

    const { rows: [updated] } = await pool.query(
      `UPDATE users SET name=$1, email=$2, phone=$3, language=$4, sector=$5, district=$6
       WHERE id=$7 RETURNING *`,
      [name, email.toLowerCase().trim(), phone || null, language || 'en', sector || null, district || null, req.user.id]
    );

    const { password_hash, otp_code, otp_expires_at, ...safe } = updated;
    res.json(safe);
  } catch (err) { next(err); }
});

// ─── Register (SME onboarding) ────────────────────────────────────────────────
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, phone, password, language, sector, district } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Name, email and password required" });

    if (!isValidEmail(email))
      return res.status(400).json({ error: "Invalid email format" });

    const strength = validatePasswordStrength(password);
    if (!strength.valid)
      return res.status(400).json({ error: strength.error });

    const { rows: existing } = await pool.query(
      "SELECT id FROM users WHERE email=$1", [email.toLowerCase().trim()]
    );
    if (existing.length)
      return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 10);
    const { rows: [user] } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone, language, sector, district, consent_status)
       VALUES ($1,$2,$3,'sme_owner',$4,$5,$6,$7,'pending')
       RETURNING *`,
      [name, email.toLowerCase().trim(), hash, phone || null, language || 'en', sector || null, district || null]
    );

    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    await logAudit(user.id, "REGISTER", "users", user.id, null, { email }, req.ip);

    const { password_hash, otp_code, otp_expires_at, ...safe } = user;
    res.status(201).json({ accessToken, refreshToken, user: safe });
  } catch (err) { next(err); }
});

// ─── OTP: send ────────────────────────────────────────────────────────────────
router.post("/otp/send", async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number required" });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await pool.query(
      "UPDATE users SET otp_code=$1, otp_expires_at=$2 WHERE phone=$3",
      [code, expires, phone]
    );

    // TODO: integrate Twilio SMS here
    // await twilioClient.messages.create({ to: phone, from: process.env.TWILIO_FROM, body: `Your Inzira Insights code: ${code}` });

    if (process.env.NODE_ENV !== "production") {
      console.log(`[OTP] Code for ${phone}: ${code}`);
    }

    res.json({ message: "OTP sent" });
  } catch (err) { next(err); }
});

// ─── OTP: verify ─────────────────────────────────────────────────────────────
router.post("/otp/verify", async (req, res, next) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: "Phone and code required" });

    const { rows } = await pool.query(
      "SELECT * FROM users WHERE phone=$1 AND otp_code=$2 AND otp_expires_at > NOW()",
      [phone, code]
    );
    if (!rows.length)
      return res.status(400).json({ error: "Invalid or expired OTP" });

    const user = rows[0];
    await pool.query(
      "UPDATE users SET otp_code=NULL, otp_expires_at=NULL, is_active=true WHERE id=$1",
      [user.id]
    );

    const payload = { id: user.id, email: user.email, role: user.role };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    const { password_hash, otp_code, otp_expires_at, ...safe } = user;
    res.json({ accessToken, refreshToken, user: safe, verified: true });
  } catch (err) { next(err); }
});

// ─── Consent management ───────────────────────────────────────────────────────
router.put("/consent", verifyToken, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['consented','declined','withdrawn'].includes(status))
      return res.status(400).json({ error: "Status must be consented, declined, or withdrawn" });

    const { rows: [user] } = await pool.query(
      `UPDATE users SET consent_status=$1, consent_date=NOW() WHERE id=$2 RETURNING *`,
      [status, req.user.id]
    );

    await logAudit(req.user.id, "CONSENT_UPDATED", "users", req.user.id, null, { status }, req.ip);

    const { password_hash, otp_code, otp_expires_at, ...safe } = user;
    res.json({ message: `Consent ${status}`, user: safe });
  } catch (err) { next(err); }
});

// ─── Admin: list users ────────────────────────────────────────────────────────
router.get("/users", verifyToken, async (req, res, next) => {
  try {
    if (!['pulse_admin','admin'].includes(req.user.role))
      return res.status(403).json({ error: "Insufficient permissions" });

    const { role, search } = req.query;
    const conds = ["1=1"]; const params = [];
    if (role) { params.push(role); conds.push(`role=$${params.length}`); }
    if (search) { params.push(`%${search}%`); conds.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`); }

    const { rows } = await pool.query(
      `SELECT id, name, email, role, phone, language, sector, district, consent_status, is_active, created_at
       FROM users WHERE ${conds.join(" AND ")} ORDER BY name`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// ─── Admin: create user ───────────────────────────────────────────────────────
router.post("/users", verifyToken, async (req, res, next) => {
  try {
    if (!['pulse_admin','admin','sme_owner'].includes(req.user.role))
      return res.status(403).json({ error: "Insufficient permissions" });

    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ error: "Name, email, password and role required" });

    if (!VALID_ROLES.includes(role))
      return res.status(400).json({ error: "Invalid role" });

    if (!isValidEmail(email))
      return res.status(400).json({ error: "Invalid email format" });

    const { rows: existing } = await pool.query("SELECT id FROM users WHERE email=$1", [email.toLowerCase().trim()]);
    if (existing.length) return res.status(409).json({ error: "Email already in use" });

    const hash = await bcrypt.hash(password, 10);
    const { rows: [user] } = await pool.query(
      "INSERT INTO users (name, email, password_hash, role, phone) VALUES ($1,$2,$3,$4,$5) RETURNING *",
      [name, email.toLowerCase().trim(), hash, role, phone || null]
    );

    await logAudit(req.user.id, "USER_CREATED", "users", user.id, null, { name, email, role }, req.ip);
    const { password_hash, otp_code, otp_expires_at, ...safe } = user;
    res.status(201).json(safe);
  } catch (err) { next(err); }
});

// ─── Admin: update user ───────────────────────────────────────────────────────
router.put("/users/:id", verifyToken, async (req, res, next) => {
  try {
    if (!['pulse_admin','admin','sme_owner'].includes(req.user.role))
      return res.status(403).json({ error: "Insufficient permissions" });

    const { name, role, phone, is_active } = req.body;
    if (role && !VALID_ROLES.includes(role))
      return res.status(400).json({ error: "Invalid role" });

    const { rows: [user] } = await pool.query(
      `UPDATE users SET name=COALESCE($1,name), role=COALESCE($2,role),
        phone=COALESCE($3,phone), is_active=COALESCE($4,is_active)
       WHERE id=$5 RETURNING *`,
      [name || null, role || null, phone || null, is_active ?? null, req.params.id]
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    await logAudit(req.user.id, "USER_UPDATED", "users", user.id, null, req.body, req.ip);
    const { password_hash, otp_code, otp_expires_at, ...safe } = user;
    res.json(safe);
  } catch (err) { next(err); }
});

module.exports = router;
