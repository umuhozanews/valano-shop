require("dotenv").config();
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const path = require("path");
const logger = require("./src/middleware/logger");
const errorHandler = require("./src/middleware/errorHandler");
const routes = require("./src/routes/index.js");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(compression());
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000").split(",").map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    const allowed = !origin
      || origin.endsWith(".vercel.app")
      || origin.endsWith(".up.railway.app")
      || origin.endsWith(".pages.dev")
      || allowedOrigins.some(o => origin.startsWith(o));
    cb(null, allowed);
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Serve uploaded files & compiled static web app
const fs = require("fs");
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", async (req, res) => {
  const pool = require("./src/config/db");
  let dbStatus = "unknown";
  let dbError = null;
  let dbHost = "not_configured";
  try {
    const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || "";
    if (raw) {
      const match = raw.match(/@([^:\/]+)/);
      dbHost = match ? match[1] : "configured";
    }
    await pool.query("SELECT 1");
    dbStatus = "connected";
  } catch (e) {
    dbStatus = "error";
    dbError = e.message;
  }
  res.json({ status: "ok", dbStatus, dbHost, dbError, time: new Date().toISOString(), version: "2.0.0" });
});
app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString(), version: "2.0.0", app: "Inzira Insights" });
});

app.use("/api", routes);

// SPA fallback for all web routes (serves Inzira Insights frontend on Vercel .vercel.app domain)
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  const indexPath = path.join(publicPath, "index.html");
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  next();
});

app.use(errorHandler);

// Only start a long-running server (with cron + local backups) when this file
// is executed directly. Under serverless (Vercel), the app is imported by
// api/index.js instead, so we must NOT call listen(), cron, or filesystem
// backups here — those would crash on a read-only serverless filesystem.
if (require.main === module) {
  const { startCronJobs } = require("./src/cron");
  const { runDatabaseBackup } = require("./src/utils/backup");
  const { ensureDbReady } = require("./src/config/initDb");

  app.listen(PORT, async () => {
    console.log(`INZIRA INSIGHTS backend → http://localhost:${PORT} [${process.env.NODE_ENV || "development"}]`);
    try {
      await ensureDbReady();
    } catch (e) {
      console.error("[DB INIT ERROR] Could not initialize database:", e.message);
    }
    startCronJobs();
    runDatabaseBackup().catch(e => {
      console.error("[BACKUP ERROR] Startup database backup failed:", e.message);
    });
  });
}

module.exports = app;
