const { Pool } = require("pg");
require("dotenv").config();

// Accept the common connection-string env names used by hosted Postgres
// providers (Vercel/Neon inject POSTGRES_URL; others use DATABASE_URL).
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

// Enable SSL for public remote databases only.
// Railway internal connections (.railway.internal) are on a private network and don't need SSL.
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString || "");
const isRailwayInternal = /\.railway\.internal/.test(connectionString || "");
const useSsl = !isLocal && !isRailwayInternal;

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.PG_POOL_MAX || "10", 10),
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: false,
});

pool.on("error", (err) => {
  // Don't crash the process on an idle client error in serverless.
  console.error("Unexpected PostgreSQL client error:", err.message);
});

module.exports = pool;
