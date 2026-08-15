// Enterprise-Grade Security Suite for INZIRA Gateway & DataBridge
// Features: Security Headers, Rate Limiting, Bot Protection, Field Tampering Guard,
// XSS Sanitization, File Upload Restrictions, Data Minimization (Trim Responses).

const crypto = require("crypto");
const multer = require("multer");

// ─── 1. Comprehensive Security Headers & Force HTTPS ─────────────────────────
function securityHeaders(req, res, next) {
  // Force HTTPS in production environments (e.g. Vercel, Railway, AWS)
  const isHttps = req.secure || req.headers["x-forwarded-proto"] === "https";
  if (!isHttps && process.env.NODE_ENV === "production") {
    // If request arrived via plain HTTP in production, redirect to HTTPS
    if (req.headers.host) {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  }

  // Set HSTS (HTTP Strict Transport Security)
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  // Prevent clickjacking & framing attacks
  res.setHeader("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // XSS Auditor filter
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer Policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Restrict browser device APIs
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");

  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-ancestors 'none';"
  );

  // Remove fingerprinting headers
  res.removeHeader("X-Powered-By");

  next();
}

// ─── 2. In-Memory Sliding Window Rate Limiter ────────────────────────────────
const rateLimitStore = new Map();

// Periodic cleanup to prevent memory leaks (runs every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

function createRateLimiter({ windowMs = 15 * 60 * 1000, maxRequests = 100, message = "Too many requests, please try again later." } = {}) {
  return (req, res, next) => {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown_ip";
    const key = `${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      rateLimitStore.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));

    if (record.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds);
      return res.status(429).json({
        error: message,
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: retryAfterSeconds,
      });
    }

    next();
  };
}

// Auth-specific strict limiter: 15 attempts per 15 minutes per IP
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  message: "Too many authentication attempts. Please wait 15 minutes before trying again.",
});

// General API limiter: 600 requests per 15 minutes per IP
const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 600,
  message: "API request rate limit exceeded. Please slow down your requests.",
});

// ─── 3. Bot & Vulnerability Scanner Protection ────────────────────────────────
const BLOCKED_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /dirbuster/i,
  /wpscan/i,
  /masscan/i,
  /acunetix/i,
  /havij/i,
  /nessus/i,
  /nmap/i,
  /zgrab/i,
];

function botProtection(req, res, next) {
  const ua = req.headers["user-agent"] || "";

  // 1. Block known automated malicious scanning tools
  if (BLOCKED_USER_AGENTS.some((pattern) => pattern.test(ua))) {
    return res.status(403).json({ error: "Access Forbidden", code: "BOT_DETECTED" });
  }

  // 2. Honeypot check: If a client fills in a hidden anti-spam field, reject silently
  if (req.body && (req.body._hp_check || req.body.__honeypot_field)) {
    return res.status(400).json({ error: "Invalid submission", code: "SPAM_REJECTED" });
  }

  next();
}

// ─── 4. Input Sanitization & XSS Defense ──────────────────────────────────────
function sanitizeValue(value) {
  if (typeof value === "string") {
    // Strip null bytes and dangerous script tags
    return value
      .replace(/\0/g, "")
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === "object") {
    const clean = {};
    for (const [k, v] of Object.entries(value)) {
      clean[k] = sanitizeValue(v);
    }
    return clean;
  }
  return value;
}

function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeValue(req.query);
  }
  next();
}

// ─── 5. Block Field Tampering & Mass Assignment Protection ────────────────────
const PROTECTED_FIELDS = [
  "password_hash",
  "is_admin",
  "role",
  "created_at",
  "synced_at",
  "__v",
  "owner_id", // users cannot forge another shop's owner_id
];

function blockFieldTampering(req, res, next) {
  if (req.body && typeof req.body === "object") {
    const isSystemAdmin = req.user && ["pulse_admin", "admin"].includes(req.user.role);

    // If regular user, delete protected fields so they cannot tamper with roles or owner IDs
    if (!isSystemAdmin) {
      for (const field of PROTECTED_FIELDS) {
        if (field in req.body) {
          delete req.body[field];
        }
      }
    }
  }
  next();
}

// ─── 6. Data Minimization (Trim API Responses) ────────────────────────────────
const SENSITIVE_RESPONSE_KEYS = new Set([
  "password_hash",
  "otp_code",
  "otp_expires_at",
  "token_secret",
  "api_secret",
  "private_key",
]);

function stripSensitiveKeys(data) {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(stripSensitiveKeys);

  const clean = {};
  for (const [key, val] of Object.entries(data)) {
    if (SENSITIVE_RESPONSE_KEYS.has(key)) {
      continue; // Skip sensitive database secrets
    }
    clean[key] = stripSensitiveKeys(val);
  }
  return clean;
}

function trimApiResponse(req, res, next) {
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    const sanitized = stripSensitiveKeys(body);
    return originalJson(sanitized);
  };
  next();
}

// ─── 7. Strict File Upload Security Configuration ────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const secureUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB maximum file upload size
    files: 5,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      const error = new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPG, PNG, WEBP, GIF, PDF.`);
      error.code = "INVALID_FILE_TYPE";
      return cb(error, false);
    }
    cb(null, true);
  },
});

module.exports = {
  securityHeaders,
  authRateLimiter,
  apiRateLimiter,
  botProtection,
  sanitizeInput,
  blockFieldTampering,
  trimApiResponse,
  secureUpload,
};
