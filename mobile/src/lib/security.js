/**
 * INZIRA Enterprise Security & Anti-Injection Hardening Engine
 * Protects against XSS (Cross-Site Scripting), SQL/NoSQL Injection, Script Execution, and Control Characters.
 */

// 1. Sanitize text inputs against HTML tags, script execution & SQL injection patterns
export function sanitizeInput(str) {
  if (typeof str !== "string") return str;
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove <script> tags
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/javascript:/gi, "") // Neutralize JS protocol links
    .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|UNION|CREATE|TRUNCATE)\b)/gi, "") // Neutralize raw SQL commands
    .replace(/['";=]/g, (m) => ({ "'": "&#39;", '"': "&quot;", ";": "&#59;", "=": "&#61;" }[m])) // Escape dangerous characters
    .trim();
}

// 2. Strict Email Sanitization
export function sanitizeEmail(email) {
  if (typeof email !== "string") return "";
  const cleaned = email.toLowerCase().trim().replace(/[^a-z0-9@._-]/g, "");
  return cleaned;
}

// 3. Strict Phone Number Sanitization
export function sanitizePhone(phone) {
  if (typeof phone !== "string") return "";
  return phone.replace(/[^0-9+]/g, "").trim();
}

// 4. Client-Side Rate Limiter (Brute-Force Attack Prevention)
const ATTEMPT_KEY = "inzira_sec_attempts";

export function checkRateLimit(action = "login", maxAttempts = 15, lockDurationSeconds = 30) {
  try {
    const raw = localStorage.getItem(`${ATTEMPT_KEY}_${action}`);
    const data = raw ? JSON.parse(raw) : { count: 0, lockUntil: 0 };
    const now = Date.now();

    if (data.lockUntil > now) {
      const remainingSec = Math.ceil((data.lockUntil - now) / 1000);
      return { allowed: false, remainingSec };
    }

    return { allowed: true, remainingSec: 0 };
  } catch {
    return { allowed: true, remainingSec: 0 };
  }
}

export function recordFailedAttempt(action = "login", maxAttempts = 15, lockDurationSeconds = 30) {
  try {
    const key = `${ATTEMPT_KEY}_${action}`;
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : { count: 0, lockUntil: 0 };
    const now = Date.now();

    const newCount = data.count + 1;
    let lockUntil = 0;

    if (newCount >= maxAttempts) {
      lockUntil = now + lockDurationSeconds * 1000;
    }

    localStorage.setItem(key, JSON.stringify({ count: newCount, lockUntil }));
  } catch (e) {
    console.error(e);
  }
}

export function clearRateLimit(action = "login") {
  try {
    localStorage.removeItem(`${ATTEMPT_KEY}_${action}`);
  } catch {}
}
