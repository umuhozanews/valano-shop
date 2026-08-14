const { Pool } = require("pg");
require("dotenv").config();

// Hard startup guard: LOCAL_DEV_MODE must never be allowed in production
if (process.env.NODE_ENV === "production" && process.env.LOCAL_DEV_MODE === "true") {
  throw new Error("FATAL: LOCAL_DEV_MODE=true is strictly forbidden in production environments.");
}

// Read database connection string exclusively from process.env.DATABASE_URL
const connectionString = (process.env.DATABASE_URL || "").trim();

if (!connectionString) {
  console.warn("[DB CONFIG WARNING] DATABASE_URL environment variable is not set.");
}

const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);

// Shared singleton Pool across invocations
const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

function isTransient(err) {
  if (!err) return false;
  const msg = String(err.message || "").toLowerCase();
  const code = String(err.code || "").toLowerCase();
  return (
    msg.includes("econnreset") ||
    msg.includes("terminated") ||
    msg.includes("connection") ||
    msg.includes("closed") ||
    msg.includes("socket") ||
    msg.includes("timeout") ||
    msg.includes("broken") ||
    msg.includes("pipe") ||
    code.includes("econnreset") ||
    code.includes("57p") ||
    code.includes("080")
  );
}

async function query(text, params = []) {
  let lastErr = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      lastErr = err;
      const isTrans = isTransient(err);
      if (isTrans && attempt < 2) {
        console.warn(`[PG RETRY ${attempt}/2] Re-attempting query due to transient error:`, err.message);
        await new Promise((r) => setTimeout(r, 100 * attempt));
        continue;
      }
      break;
    }
  }

  // Never fall back to in-memory fake data. Throw the real error up to callers.
  console.error("[DB ERROR] Query execution failed:", lastErr?.message);
  throw lastErr;
}

pool.on("error", (err) => {
  console.error("[PG POOL ERROR] Unexpected idle client error:", err.message);
});

module.exports = {
  query,
  pool,
  on: (event, handler) => pool.on(event, handler),
  end: () => pool.end(),
};
