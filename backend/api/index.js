const { ensureDbReady } = require("../src/config/initDb");
const app = require("../server");

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
