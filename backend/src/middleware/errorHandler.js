function isDbConnectionError(err) {
  if (!err) return false;
  const msg = String(err.message || "").toLowerCase();
  const code = String(err.code || "").toLowerCase();
  return (
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("terminated") ||
    msg.includes("connection") ||
    msg.includes("closed") ||
    msg.includes("socket") ||
    msg.includes("timeout") ||
    msg.includes("broken") ||
    msg.includes("pipe") ||
    code.startsWith("08") ||
    code.startsWith("57p")
  );
}

function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.code === "23505") {
    return res.status(409).json({ error: "Record already exists", code: "DUPLICATE" });
  }
  if (err.code === "23503") {
    return res.status(400).json({ error: "Referenced record not found", code: "FOREIGN_KEY" });
  }

  if (isDbConnectionError(err)) {
    return res.status(503).json({
      error: "Service temporarily unavailable, please try again",
      code: "DATABASE_UNAVAILABLE"
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.expose ? err.message : (status < 500 ? err.message : "Internal server error");

  res.status(status).json({ error: message, code: err.code || "SERVER_ERROR" });
}

module.exports = errorHandler;
