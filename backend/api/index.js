// Vercel serverless entry point for the KNOTTY SYSTEM backend.
// It ensures the database schema/seed exist (once per warm instance) and then
// hands the request to the Express app.
const app = require("../server");
const { ensureDbReady } = require("../src/config/initDb");

module.exports = async (req, res) => {
  try {
    await ensureDbReady();
  } catch (err) {
    console.error("[DB INIT ERROR]", err.message);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Database not ready", detail: err.message }));
  }
  return app(req, res);
};
