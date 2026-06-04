function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (err.code === "23505") {
    return res.status(409).json({ error: "Record already exists", code: "DUPLICATE" });
  }
  if (err.code === "23503") {
    return res.status(400).json({ error: "Referenced record not found", code: "FOREIGN_KEY" });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.expose ? err.message : (status < 500 ? err.message : "Internal server error");

  res.status(status).json({ error: message, code: err.code || "SERVER_ERROR" });
}

module.exports = errorHandler;
