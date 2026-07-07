require("dotenv").config();

const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

// JWT secrets should be set via env in production. Fall back to stable defaults
// so a fresh deployment still works out-of-the-box; a warning is logged so the
// operator knows to set real secrets for production security.
const JWT_SECRET = process.env.JWT_SECRET || "inzira_default_access_secret_change_me";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "inzira_default_refresh_secret_change_me";

if (!DATABASE_URL) {
  console.error("[ENV] No database connection string found (set DATABASE_URL or POSTGRES_URL).");
}
if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.warn("[ENV] JWT secrets are using insecure defaults. Set JWT_SECRET and JWT_REFRESH_SECRET for production.");
}

module.exports = {
  DATABASE_URL,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
};
