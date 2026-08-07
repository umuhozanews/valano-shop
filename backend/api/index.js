const { ensureDbReady } = require("../src/config/initDb");
const app = require("../server");

module.exports = async (req, res) => {
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  try {
    await ensureDbReady();
  } catch (err) {
    console.error("[DB INIT WARNING]", err.message);
  }
  return app(req, res);
};
