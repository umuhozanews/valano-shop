const { Pool } = require("pg");
require("dotenv").config();

// Accept the common connection-string env names used by hosted Postgres
// providers (Vercel/Neon inject POSTGRES_URL; others use DATABASE_URL).
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

// Enable SSL for any remote/hosted database. Local dev (localhost) stays plain.
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString || "");
const useSsl = !isLocal && (process.env.NODE_ENV === "production" || !!connectionString && !isLocal);

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  // Keep the pool small — friendly to serverless and Neon connection limits.
  max: parseInt(process.env.PG_POOL_MAX || "3", 10),
});

pool.on("error", (err) => {
  // Don't crash the process on an idle client error in serverless.
  console.error("Unexpected PostgreSQL client error:", err.message);
});

module.exports = pool;
