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
    const rawIdentifier = String(req.body.email || req.body.phone || req.body.identifier || "").trim();
    const password = String(req.body.password || "").trim();

    if (!rawIdentifier || !password) {
      return res.status(400).json({ error: "Email/Phone and password are required" });
    }

    const normalizedEmail = rawIdentifier.toLowerCase();
    const cleanPhone = rawIdentifier.replace(/\s+/g, "");
    const phoneFallbackEmail = `${cleanPhone.replace(/\D/g, "")}@inzira.rw`;

    // Query user by normalized email, phone, or phone fallback email
    const { rows } = await pool.query(
      `SELECT * FROM users
       WHERE LOWER(email) = $1 OR (phone IS NOT NULL AND phone = $2) OR email = $3`,
      [normalizedEmail, cleanPhone, phoneFallbackEmail]
    );
    const user = rows[0];

    // Generic error for security (do not disclose whether account exists)
    if (!user) {
      await logAudit(null, "LOGIN_FAILED", "users", null, null, { identifier: rawIdentifier }, req.ip);
      return res.status(401).json({ error: "Invalid email/phone or password" });
    }

    // Explicit check for deactivated accounts
    if (user.is_active === false) {
      await logAudit(user.id, "LOGIN_BLOCKED", "users", user.id, null, { reason: "account_deactivated" }, req.ip);
      return res.status(403).json({ error: "Your account has been deactivated. Please contact support." });
    }

    // Always compare using bcrypt against stored hash
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await logAudit(user.id, "LOGIN_FAILED", "users", user.id, null, { identifier: rawIdentifier }, req.ip);
      return res.status(401).json({ error: "Invalid email/phone or password" });
    }

    // For sme_owner: ownerId = own id. For workers: ownerId = their owner_id. For admin/pulse_admin: null
    const ownerId = ['pulse_admin','admin'].includes(user.role)
      ? null
      : (user.role === 'sme_owner' ? user.id : (user.owner_id || null));

    const payload = { id: user.id, email: user.email, role: user.role, ownerId };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    await logAudit(user.id, "LOGIN", "users", user.id, null, { identifier: rawIdentifier }, req.ip);

    sendLoginAlert(user.email, user.name, req.ip).catch(e => {
      console.error("[MAIL ERROR] Background email dispatch failed:", e.message);
    });

    const { password_hash, otp_code, otp_expires_at, ...safeUser } = user;
    res.json({ accessToken, refreshToken, user: safeUser });
  } catch (err) { next(err); }
});

const { OAuth2Client } = require("google-auth-library");
const { GOOGLE_CLIENT_ID } = require("../config/env");
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ─── Google Authentication ───────────────────────────────────────────────────
router.post("/google", async (req, res, next) => {
  try {
    const { idToken, credential } = req.body;
    const tokenToVerify = idToken || credential;

    if (!tokenToVerify) {
      return res.status(401).json({ error: "Google ID Token (credential) is required" });
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: tokenToVerify,
        audience: GOOGLE_CLIENT_ID || undefined,
      });
      payload = ticket.getPayload();
    } catch (tokenErr) {
      console.error("[AUTH ERROR] Google ID Token verification failed:", tokenErr.message);
      return res.status(401).json({ error: "Invalid or unverified Google ID token" });
    }

    if (!payload || !payload.email || payload.email_verified !== true) {
      return res.status(401).json({ error: "Google account email is unverified or missing" });
    }

    const cleanEmail = payload.email.toLowerCase().trim();
    const googleName = (payload.name || cleanEmail.split("@")[0]).trim();

    let { rows: [user] } = await pool.query("SELECT * FROM users WHERE email=$1", [cleanEmail]);

    if (!user) {
      const dummyPass = await bcrypt.hash("GoogleOAuth_" + Date.now(), 10);
      const { rows: [created] } = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, consent_status)
         VALUES ($1, $2, $3, 'sme_owner', 'granted') RETURNING *`,
        [googleName, cleanEmail, dummyPass]
      );
      user = created;

      await pool.query(
        `INSERT INTO settings (owner_id, shop_name, language)
         VALUES ($1, $2, 'en')
         ON CONFLICT (owner_id) DO NOTHING`,
        [user.id, `${googleName}'s Shop`]
      );
    }

    if (user.is_active === false) {
      return res.status(403).json({ error: "Your account has been deactivated. Please contact support." });
    }

    const ownerId = ['pulse_admin','admin'].includes(user.role) ? null : user.id;
    const userPayload = { id: user.id, email: user.email, role: user.role, ownerId };
    const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    await logAudit(user.id, "LOGIN_GOOGLE", "users", user.id, null, { email: cleanEmail }, req.ip);

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

    const refreshOwnerId = ['pulse_admin','admin'].includes(user.role)
      ? null
      : (user.role === 'sme_owner' ? user.id : (user.owner_id || null));
    const payload = { id: user.id, email: user.email, role: user.role, ownerId: refreshOwnerId };
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
    await pool.query(
      "UPDATE users SET token_version = COALESCE(token_version, 0) + 1 WHERE id=$1",
      [req.user.id]
    ).catch(() => {});
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

const handleRegister = async (req, res, next) => {
  try {
    const {
      firstName, lastName, name,
      businessName, shop_name,
      accountType, role: reqRole,
      sectors, businessType, district,
      phone, email, password, language
    } = req.body;

    const targetRole = reqRole || accountType || 'sme_owner';
    const allowedSelfReg = ['sme_owner', 'lender', 'databridge_advisor'];
    if (!allowedSelfReg.includes(targetRole)) {
      return res.status(400).json({ error: "Invalid account type. Allowed: SME Business, Lender, Advisor" });
    }

    const fullName = (name || `${firstName || ''} ${lastName || ''}`).trim();
    const orgOrBusinessName = (shop_name || businessName || fullName).trim();

    const normalizedEmail = (email || (phone ? `${String(phone).replace(/\D/g, "")}@inzira.rw` : "")).toLowerCase().trim();

    if (!fullName || !normalizedEmail || !password || !orgOrBusinessName) {
      return res.status(400).json({ error: "Name, organization/business name, email/phone and password are required" });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.error });
    }

    const { rows: existing } = await pool.query(
      "SELECT id FROM users WHERE email=$1 OR (phone IS NOT NULL AND phone=$2)",
      [normalizedEmail, phone ? String(phone).trim() : null]
    );
    if (existing.length) {
      return res.status(409).json({ error: "An account with this email or phone is already registered" });
    }

    // Ensure schema columns exist
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS owner_id INT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_id INT`);

    const sectorStr = Array.isArray(sectors) && sectors.length
      ? sectors.join(", ")
      : (businessType || sectors || null);

    const hash = await bcrypt.hash(password, 10);
    const { rows: [user] } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone, language, sector, district, consent_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'granted')
       RETURNING *`,
      [fullName, normalizedEmail, hash, targetRole, phone ? String(phone).trim() : null, language || 'en', sectorStr, district || null]
    );

    // Create settings row for SMEs
    if (targetRole === 'sme_owner') {
      await pool.query(
        `INSERT INTO settings (owner_id, shop_name, language)
         VALUES ($1, $2, $3)
         ON CONFLICT (owner_id) DO UPDATE SET shop_name=EXCLUDED.shop_name`,
        [user.id, orgOrBusinessName, language || 'en']
      );
    }

    const ownerId = targetRole === 'sme_owner' ? user.id : null;
    const payload = { id: user.id, email: user.email, role: user.role, ownerId };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    await logAudit(user.id, "REGISTER", "users", user.id, null, { email: normalizedEmail, role: targetRole, businessName: orgOrBusinessName }, req.ip);

    const { password_hash, otp_code, otp_expires_at, ...safe } = user;
    res.status(201).json({ accessToken, refreshToken, user: safe, businessName: orgOrBusinessName });
  } catch (err) { next(err); }
};

router.post("/register", handleRegister);
router.post("/signup", handleRegister);

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
    const { status, consent_status, lender_sharing } = req.body;
    const finalStatus = consent_status || status;
    if (!['consented','granted','declined','withdrawn'].includes(finalStatus))
      return res.status(400).json({ error: "Status must be consented, granted, declined, or withdrawn" });

    // Normalise: "granted" → "consented"
    const normalised = finalStatus === "granted" ? "consented" : finalStatus;

    const sets = ["consent_status=$1", "consent_date=NOW()"];
    const params = [normalised, req.user.id];
    if (lender_sharing !== undefined) {
      sets.push(`lender_sharing=$${params.length - 1 + 1}`);
      params.splice(params.length - 1, 0, lender_sharing);
    }

    const { rows: [user] } = await pool.query(
      `UPDATE users SET ${sets.join(", ")} WHERE id=$${params.length} RETURNING *`,
      params
    );

    await logAudit(req.user.id, "CONSENT_UPDATED", "users", req.user.id, null, { status: normalised, lender_sharing }, req.ip);

    const { password_hash, otp_code, otp_expires_at, ...safe } = user;
    res.json({ message: `Consent ${normalised}`, user: safe });
  } catch (err) { next(err); }
});

// ─── SME owner: list their own team ───────────────────────────────────────────
router.get("/team", verifyToken, async (req, res, next) => {
  try {
    if (!['sme_owner','admin','pulse_admin'].includes(req.user.role))
      return res.status(403).json({ error: "Insufficient permissions" });

    const ownerId = ['pulse_admin','admin'].includes(req.user.role)
      ? (req.query.owner_id || null)
      : req.user.id;

    const { rows } = await pool.query(
      `SELECT id, name, email, role, phone, is_active, created_at
       FROM users
       WHERE owner_id=$1
       ORDER BY created_at DESC`,
      [ownerId]
    );
    res.json(rows);
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
    // owner_id links this worker back to the SME owner who created them
    const ownerId = ['pulse_admin','admin'].includes(req.user.role) ? null : req.user.id;
    const { rows: [user] } = await pool.query(
      "INSERT INTO users (name, email, password_hash, role, phone, owner_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [name, email.toLowerCase().trim(), hash, role, phone || null, ownerId]
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
