const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { JWT_SECRET, JWT_REFRESH_SECRET } = require("../config/env");
const { verifyToken } = require("../middleware/auth");
const { logAudit } = require("../utils/helpers");

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password required" });

    const { rows } = await pool.query(
      "SELECT * FROM users WHERE email = $1 AND is_active = true",
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

    const payload = { id: user.id, email: user.email, role: user.role, branch_id: user.branch_id };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    await logAudit(user.id, "LOGIN", "users", user.id, null, { email }, req.ip);

    const { password_hash, ...safeUser } = user;
    res.json({ accessToken, refreshToken, user: safeUser });
  } catch (err) { next(err); }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "Refresh token required" });

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE id = $1 AND is_active = true", [decoded.id]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: "User not found" });

    const payload = { id: user.id, email: user.email, role: user.role, branch_id: user.branch_id };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
    res.json({ accessToken });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Invalid refresh token" });
    }
    next(err);
  }
});

router.post("/logout", verifyToken, async (req, res, next) => {
  try {
    await logAudit(req.user.id, "LOGOUT", "users", req.user.id, null, null, req.ip);
    res.json({ message: "Logged out" });
  } catch (err) { next(err); }
});

router.get("/me", verifyToken, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.*, b.name as branch_name FROM users u
       LEFT JOIN branches b ON b.id = u.branch_id
       WHERE u.id = $1`, [req.user.id]
    );
    const { password_hash, ...user } = rows[0] || {};
    if (!user.id) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) { next(err); }
});

router.put("/me/password", verifyToken, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [req.user.id]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash)))
      return res.status(400).json({ error: "Current password incorrect" });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, req.user.id]);
    res.json({ message: "Password updated" });
  } catch (err) { next(err); }
});

router.put("/me/profile", verifyToken, async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    if (!name || !email) return res.status(400).json({ error: "Name and email required" });
    
    const { rows: existing } = await pool.query("SELECT * FROM users WHERE email=$1 AND id!=$2", [email.toLowerCase().trim(), req.user.id]);
    if (existing.length) return res.status(400).json({ error: "Email is already in use" });

    const { rows: [updated] } = await pool.query(
      `UPDATE users SET name=$1, email=$2, phone=$3 WHERE id=$4 RETURNING *`,
      [name, email.toLowerCase().trim(), phone || null, req.user.id]
    );

    const { password_hash, ...safe } = updated;
    res.json(safe);
  } catch (err) { next(err); }
});

module.exports = router;
