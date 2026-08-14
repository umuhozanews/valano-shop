// Verified Git Commit Author: cyberninja-07 <outofthebo@gmail.com>
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { JWT_SECRET, JWT_REFRESH_SECRET } = require("../config/env");
const { verifyToken } = require("../middleware/auth");
const { logAudit } = require("../utils/helpers");
const { isValidEmail, validatePasswordStrength } = require("../utils/validation");
const { sendLoginAlert, sendWelcomeEmail, sendAdminSignupAlert, sendTestEmail } = require("../utils/mailer");

const VALID_ROLES = ['sme_owner','manager','cashier','accountant','databridge_advisor','lender','pulse_admin','admin'];

// ─── Login ────────────────────────────────────────────────────────────────────
router.post("/login", async (req, res, next) => {
  try {
    const rawIdentifier = String(req.body.email || req.body.phone || req.body.identifier || "").trim();
    const password = String(req.body.password || "").trim();

    if (!rawIdentifier || !password) {
      return res.status(400).json({ error: "Email/Phone and password are required" });
    }

    const cleanDigits = rawIdentifier.replace(/\D/g, "");
    const last9Digits = cleanDigits.length >= 9 ? cleanDigits.slice(-9) : cleanDigits;

    // Fast indexed query by email or phone
    const { rows } = await pool.query(
      `SELECT * FROM users
       WHERE LOWER(email) = LOWER($1)
          OR (phone IS NOT NULL AND phone = $1)
          OR (phone IS NOT NULL AND phone = $2)
          OR (phone IS NOT NULL AND RIGHT(phone, 9) = $3)
          OR (email IS NOT NULL AND LOWER(email) = LOWER($4))
       LIMIT 1`,
      [rawIdentifier, `+${cleanDigits}`, last9Digits, `${cleanDigits}@inzira.rw`]
    );
    const user = rows[0];

    // Generic error for security (do not disclose whether account exists)
    if (!user) {
      logAudit(null, "LOGIN_FAILED", "users", null, null, { identifier: rawIdentifier }, req.ip).catch(() => {});
      return res.status(401).json({ error: "Invalid email/phone or password" });
    }

    // Explicit check for deactivated accounts
    if (user.is_active === false) {
      logAudit(user.id, "LOGIN_BLOCKED", "users", user.id, null, { reason: "account_deactivated" }, req.ip).catch(() => {});
      return res.status(403).json({ error: "Your account has been deactivated. Please contact support." });
    }

    // Protection for Google-Only Accounts (password_hash is NULL)
    if (!user.password_hash) {
      logAudit(user.id, "LOGIN_FAILED_GOOGLE_ONLY", "users", user.id, null, { reason: "password_login_attempted_on_google_account" }, req.ip).catch(() => {});
      return res.status(400).json({
        error: "This account uses Google Sign-In. Please click 'Continue with Google' to log in.",
        code: "GOOGLE_AUTH_REQUIRED"
      });
    }

    // Always compare using bcrypt against stored hash
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      logAudit(user.id, "LOGIN_FAILED", "users", user.id, null, { identifier: rawIdentifier }, req.ip).catch(() => {});
      return res.status(401).json({ error: "Invalid email/phone or password" });
    }

    // For sme_owner: ownerId = own id. For workers: ownerId = their owner_id. For admin/pulse_admin: null
    const ownerId = ['pulse_admin','admin'].includes(user.role)
      ? null
      : (user.role === 'sme_owner' ? user.id : (user.owner_id || null));

    const payload = { id: user.id, email: user.email, role: user.role, ownerId };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    logAudit(user.id, "LOGIN", "users", user.id, null, { identifier: rawIdentifier }, req.ip).catch(() => {});

    sendLoginAlert(user.email, user.name, req.ip).catch(e => {
      console.error("[MAIL ERROR] Background email dispatch failed:", e.message);
    });

    const { password_hash, otp_code, otp_expires_at, ...safeUser } = user;
    res.json({ accessToken, refreshToken, user: safeUser });
  } catch (err) { next(err); }
});

// ─── Direct Database Diagnostic & Inspection Endpoints ───────────────────────
router.get("/inspect-user", async (req, res, next) => {
  try {
    const targetEmail = String(req.query.email || "umuhozanews@gmail.com").toLowerCase().trim();
    const { rows } = await pool.query(
      `SELECT id, email, name, role, profile_complete, google_linked, google_auth,
              password_hash IS NOT NULL AS has_password, created_at
       FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))`,
      [targetEmail]
    );
    const { rows: allUsers } = await pool.query(
      `SELECT id, email, name, role, profile_complete, google_linked, google_auth, created_at
       FROM users ORDER BY id DESC LIMIT 25`
    );
    res.json({ targetEmail, count: rows.length, rows, recentUsers: allUsers });
  } catch (err) { next(err); }
});

router.post("/fix-profile-complete", async (req, res, next) => {
  try {
    const targetEmail = String(req.body.email || "umuhozanews@gmail.com").toLowerCase().trim();
    const { rows } = await pool.query(
      `UPDATE users
       SET profile_complete = true, google_linked = true, google_auth = true
       WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
       RETURNING id, email, name, profile_complete, google_linked, google_auth`,
      [targetEmail]
    );
    res.json({ message: "Updated profile_complete", targetEmail, rows });
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
      const allowedAudiences = [
        GOOGLE_CLIENT_ID,
        "566140797459-hat4bt1lcl09inbi3gql5ekp2ilh1aom.apps.googleusercontent.com",
        "566140797459-iaml5c6201dh0qpvs86fnm1dtd25rd30.apps.googleusercontent.com",
      ].filter(Boolean);

      const ticket = await googleClient.verifyIdToken({
        idToken: tokenToVerify,
        audience: allowedAudiences.length > 0 ? allowedAudiences : undefined,
      });
      payload = ticket.getPayload();
    } catch (tokenErr) {
      console.error("[AUTH ERROR] Google ID Token verification failed:", tokenErr.message);
      return res.status(401).json({ error: "Invalid or unverified Google ID token: " + tokenErr.message });
    }

    if (!payload || !payload.email || payload.email_verified !== true) {
      return res.status(401).json({ error: "Google account email is unverified or missing" });
    }

    const cleanEmail = String(payload.email || "").toLowerCase().trim();
    const googleName = (payload.name || cleanEmail.split("@")[0]).trim();

    // Ensure database columns for Google OAuth & profile status exist
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_auth BOOLEAN DEFAULT false`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS google_linked BOOLEAN DEFAULT false`).catch(() => {});
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_complete BOOLEAN DEFAULT true`).catch(() => {});
    await pool.query(`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`).catch(() => {});

    // Lookup existing user by exact normalized trimmed email
    const existingUser = await pool.query(
      "SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1",
      [cleanEmail]
    );

    let user;
    let isNewRegistration = false;

    console.log("=== [GOOGLE AUTH DEBUG LOG START] ===");
    console.log("1. Verified Payload Email:", payload.email);
    console.log("2. Verified email_verified Flag:", payload.email_verified);
    console.log("3. Clean Normalized Email:", cleanEmail);
    console.log("4. Google User Full Name:", googleName);
    console.log("5. Existing DB User Record:", existingUser.rows[0] ? {
      id: existingUser.rows[0].id,
      name: existingUser.rows[0].name,
      email: existingUser.rows[0].email,
      role: existingUser.rows[0].role,
      profile_complete: existingUser.rows[0].profile_complete,
      google_auth: existingUser.rows[0].google_auth,
      google_linked: existingUser.rows[0].google_linked,
    } : "NONE_FOUND (Treating as new Google signup)");
    console.log("=== [GOOGLE AUTH DEBUG LOG END] ===");

    if (existingUser.rows[0]) {
      // EXISTING USER — log in directly, do not touch their data, do not send to setup
      user = existingUser.rows[0];
      isNewRegistration = false;

      if (!user.google_linked || !user.google_auth) {
        // First time using Google for an existing email/password account — link it
        await pool.query(
          "UPDATE users SET google_linked = true, google_auth = true WHERE id = $1",
          [user.id]
        ).catch(() => {});
        user.google_linked = true;
        user.google_auth = true;
      }

      // Existing accounts must retain profile_complete = true so they are never forced to setup
      if (user.profile_complete === null || user.profile_complete === undefined || user.password_hash) {
        user.profile_complete = true;
        await pool.query("UPDATE users SET profile_complete = true WHERE id = $1", [user.id]).catch(() => {});
      }

      logAudit(user.id, "LOGIN_GOOGLE", "users", user.id, null, { email: cleanEmail }, req.ip).catch(() => {});
    } else {
      // TRULY NEW USER — create account, THEN require shop setup
      isNewRegistration = true;
      try {
        const { rows: [created] } = await pool.query(
          `INSERT INTO users (name, email, password_hash, role, consent_status, google_auth, google_linked, profile_complete)
           VALUES ($1, $2, NULL, 'sme_owner', 'granted', true, true, false)
           RETURNING *`,
          [googleName, cleanEmail]
        );
        user = created;
      } catch (dbConflictErr) {
        // Fallback for concurrent registration race condition
        const { rows: [existing] } = await pool.query(
          "SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1",
          [cleanEmail]
        );
        user = existing;
      }
      if (user) {
        logAudit(user.id, "REGISTER_GOOGLE", "users", user.id, null, { email: cleanEmail }, req.ip).catch(() => {});
      }
    }

    if (!user) {
      return res.status(500).json({ error: "Failed to process Google authentication" });
    }

    if (user.is_active === false) {
      return res.status(403).json({ error: "Your account has been deactivated. Please contact support." });
    }

    const ownerId = ['pulse_admin','admin'].includes(user.role) ? null : user.id;
    const userPayload = { id: user.id, email: user.email, role: user.role, ownerId };
    const accessToken = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    // For returning Google users, send standard login alert
    if (!isNewRegistration) {
      sendLoginAlert(cleanEmail, user.name || googleName, req.ip).catch(e => {
        console.error("[MAIL ERROR] Background Google login alert failed:", e.message);
      });
    }

    const { password_hash, otp_code, otp_expires_at, ...safeUser } = user;
    res.json({ accessToken, refreshToken, user: safeUser, isNewRegistration });
  } catch (err) { next(err); }
});

// ─── Complete Shop Setup (Post-Google / Onboarding) ─────────────────────────
router.post("/complete-setup", verifyToken, async (req, res, next) => {
  try {
    const {
      shop_name,
      district,
      currency,
      phone,
      business_email,
      sector,
      referral_code
    } = req.body;

    const cleanShopName = String(shop_name || "").trim();
    const cleanDistrict = String(district || "").trim();
    const cleanCurrency = String(currency || "RWF").trim().toUpperCase();
    const cleanPhone = String(phone || "").trim();
    const cleanSector = String(sector || "General Retail").trim();
    const cleanReferral = referral_code ? String(referral_code).trim() : null;
    const cleanEmail = business_email ? String(business_email).toLowerCase().trim() : null;

    if (!cleanShopName) {
      return res.status(400).json({ error: "Business / Shop Name is required." });
    }
    if (!cleanDistrict) {
      return res.status(400).json({ error: "District / Location is required." });
    }
    if (!cleanPhone) {
      return res.status(400).json({ error: "Phone number is required." });
    }

    // 1. Update user row with complete shop profile
    await pool.query(
      `UPDATE users
       SET phone = $1, district = $2, currency = $3, sector = $4, referral_code = $5, profile_complete = true
       WHERE id = $6`,
      [cleanPhone, cleanDistrict, cleanCurrency, cleanSector, cleanReferral, req.user.id]
    );

    // 2. Upsert business settings
    await pool.query(
      `INSERT INTO settings (owner_id, shop_name, shop_address, shop_phone, shop_email, currency, language)
       VALUES ($1, $2, $3, $4, $5, $6, 'en')
       ON CONFLICT (owner_id) DO UPDATE SET
         shop_name = EXCLUDED.shop_name,
         shop_address = EXCLUDED.shop_address,
         shop_phone = EXCLUDED.shop_phone,
         shop_email = EXCLUDED.shop_email,
         currency = EXCLUDED.currency`,
      [req.user.id, cleanShopName, cleanDistrict, cleanPhone, cleanEmail || req.user.email, cleanCurrency]
    );

    // 3. Auto-link default advisor and lenders
    await pool.query(`
      INSERT INTO advisor_clients (advisor_user_id, sme_user_id, notes)
      SELECT a.id, $1, 'Assigned on Google Onboarding'
      FROM users a WHERE a.email = 'advisor@inzira.rw'
      ON CONFLICT (advisor_user_id, sme_user_id) DO NOTHING
    `, [req.user.id]).catch(() => {});

    // 4. Fetch updated safe user
    const { rows: [updatedUser] } = await pool.query("SELECT * FROM users WHERE id=$1", [req.user.id]);
    const { password_hash, otp_code, otp_expires_at, ...safeUser } = updatedUser || {};

    logAudit(req.user.id, "COMPLETE_SHOP_SETUP", "users", req.user.id, null, { shop_name: cleanShopName }, req.ip).catch(() => {});

    // Send Welcome & Admin Alert Emails (awaited with Promise.allSettled so serverless runtime doesn't terminate before dispatch)
    try {
      await Promise.allSettled([
        sendWelcomeEmail(safeUser.email, safeUser.name, cleanShopName, {
          sector: cleanSector,
          district: cleanDistrict,
          phone: cleanPhone,
          currency: cleanCurrency,
        }),
        sendAdminSignupAlert({
          name: safeUser.name,
          email: safeUser.email,
          phone: cleanPhone,
          shop_name: cleanShopName,
          sector: cleanSector,
          district: cleanDistrict,
          currency: cleanCurrency,
          role: safeUser.role || "sme_owner",
          ip: req.ip,
        })
      ]);
    } catch (mailErr) {
      console.error("[MAIL ERROR] Complete setup email dispatch exception:", mailErr.message);
    }

    res.json({
      message: "Shop setup completed successfully",
      user: safeUser
    });
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
    if (!user) return res.status(404).json({ error: "User not found" });

    // If user already has a password_hash, require current password match
    if (user.password_hash) {
      if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password_hash))) {
        return res.status(400).json({ error: "Current password incorrect" });
      }
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid)
      return res.status(400).json({ error: strength.error });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, req.user.id]);
    await logAudit(user.id, "SET_PASSWORD", "users", user.id, null, { initialSet: !user.password_hash }, req.ip);
    res.json({ message: "Password updated successfully" });
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

    // Clean and normalize phone number for robust duplicate matching across formats
    const rawPhone = phone ? String(phone).trim() : "";
    const cleanPhoneDigits = rawPhone.replace(/\D/g, "");
    const last9PhoneDigits = cleanPhoneDigits.length >= 9 ? cleanPhoneDigits.slice(-9) : cleanPhoneDigits;
    const phoneFallbackEmail = cleanPhoneDigits ? `${cleanPhoneDigits}@inzira.rw` : "";
    const last9FallbackEmail = last9PhoneDigits ? `${last9PhoneDigits}@inzira.rw` : "";

    // Query existing accounts matching either normalized email or phone number in any format
    const { rows: existingUsers } = await pool.query(
      `SELECT id, email, phone FROM users
       WHERE LOWER(email) = $1
          OR (phone IS NOT NULL AND phone = $2)
          OR ($3 <> '' AND RIGHT(REGEXP_REPLACE(COALESCE(phone, ''), '\\D', 'g'), 9) = $3)
          OR (email IS NOT NULL AND email = $4)
          OR (email IS NOT NULL AND email = $5)`,
      [normalizedEmail, rawPhone || null, last9PhoneDigits, phoneFallbackEmail, last9FallbackEmail]
    );

    if (existingUsers.length > 0) {
      const emailMatches = existingUsers.some(u => u.email && u.email.toLowerCase() === normalizedEmail);
      const phoneMatches = rawPhone && existingUsers.some(u => {
        const uDigits = (u.phone || "").replace(/\D/g, "");
        const uLast9 = uDigits.length >= 9 ? uDigits.slice(-9) : uDigits;
        return (u.phone && u.phone === rawPhone) || (last9PhoneDigits && uLast9 === last9PhoneDigits);
      });

      if (emailMatches && phoneMatches) {
        return res.status(409).json({
          error: "An account with this email address and phone number is already registered. Please log in.",
          code: "ACCOUNT_EXISTS",
          field: "both",
        });
      }

      if (emailMatches) {
        return res.status(409).json({
          error: "This email address is already registered. Please log in or use a different email.",
          code: "EMAIL_EXISTS",
          field: "email",
        });
      }

      if (phoneMatches) {
        return res.status(409).json({
          error: "This phone number is already registered to an account. Please log in with your phone number.",
          code: "PHONE_EXISTS",
          field: "phone",
        });
      }

      return res.status(409).json({
        error: "An account with this email or phone is already registered. Please log in.",
        code: "ACCOUNT_EXISTS",
      });
    }

    // Ensure schema columns exist
    await pool.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS owner_id INT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS owner_id INT`);

    const sectorStr = Array.isArray(sectors) && sectors.length
      ? sectors.join(", ")
      : (businessType || sectors || null);

    const hash = await bcrypt.hash(password, 10);
    let user;
    try {
      const { rows: [createdUser] } = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, phone, language, sector, district, consent_status, profile_complete)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'granted', true)
         RETURNING *`,
        [fullName, normalizedEmail, hash, targetRole, rawPhone || null, language || 'en', sectorStr, district || null]
      );
      user = createdUser;
    } catch (insertErr) {
      // Handle race-condition unique violations (PostgreSQL error code 23505)
      if (insertErr.code === "23505") {
        const detail = (insertErr.detail || "").toLowerCase();
        if (detail.includes("email") || insertErr.constraint?.includes("email")) {
          return res.status(409).json({
            error: "This email address is already registered. Please log in.",
            code: "EMAIL_EXISTS",
            field: "email",
          });
        }
        if (detail.includes("phone") || insertErr.constraint?.includes("phone")) {
          return res.status(409).json({
            error: "This phone number is already registered. Please log in.",
            code: "PHONE_EXISTS",
            field: "phone",
          });
        }
        return res.status(409).json({
          error: "An account with these details is already registered. Please log in.",
          code: "ACCOUNT_EXISTS",
        });
      }
      throw insertErr;
    }

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

    // Send Welcome & Admin Alert Emails (awaited with Promise.allSettled so serverless function keeps execution alive)
    try {
      await Promise.allSettled([
        sendWelcomeEmail(normalizedEmail, fullName, orgOrBusinessName, {
          currency: req.body.currency || "RWF",
          sector: sectorStr,
          district,
          phone: phone ? String(phone).trim() : null,
        }),
        sendAdminSignupAlert({
          name: fullName,
          email: normalizedEmail,
          phone: phone ? String(phone).trim() : "N/A",
          shop_name: orgOrBusinessName,
          sector: sectorStr,
          district: district || null,
          location: req.body.location || district || null,
          currency: req.body.currency || "RWF",
          referralCode: req.body.referralCode || "DIRECT",
          role: targetRole,
          ip: req.ip,
        })
      ]);
    } catch (mailErr) {
      console.error("[MAIL ERROR] Registration email dispatch exception:", mailErr.message);
    }

    const { password_hash, otp_code, otp_expires_at, ...safe } = user;
    res.status(201).json({ accessToken, refreshToken, user: safe, businessName: orgOrBusinessName });
  } catch (err) { next(err); }
};

router.post("/register", handleRegister);
router.post("/signup", handleRegister);

router.post("/send-welcome-email", async (req, res, next) => {
  try {
    const { email, name, shop_name, ...rest } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: "Valid email required" });
    }
    const result = await sendWelcomeEmail(email.toLowerCase().trim(), name || "Merchant", shop_name || "My Business", rest);
    res.json({ message: "Welcome email dispatched", result });
  } catch (err) { next(err); }
});

router.post("/send-test-email", async (req, res, next) => {
  try {
    const targetEmail = req.body.email ? String(req.body.email).trim() : undefined;
    const result = await sendTestEmail(targetEmail);
    res.json({ message: "Test email dispatched successfully", result });
  } catch (err) { next(err); }
});

router.post("/test-admin-alert", async (req, res, next) => {
  try {
    const sampleData = {
      name: req.body.name || "Test Merchant",
      email: req.body.email || "merchant@example.com",
      phone: req.body.phone || "+250 788 123 456",
      shop_name: req.body.shop_name || "Kigali Test Mart",
      sector: req.body.sector || "Retail & Supermarket",
      location: req.body.location || "Kigali, Rwanda",
      currency: req.body.currency || "RWF",
      referralCode: req.body.referralCode || "TEST_FLOW",
      role: "sme_owner",
      ip: req.ip,
    };
    const result = await sendAdminSignupAlert(sampleData);
    res.json({ message: "Admin alert test dispatched successfully", result });
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
