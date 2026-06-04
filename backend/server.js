require("dotenv").config();
const express = require("express");
const cors = require("cors");
const compression = require("compression");
const path = require("path");
const logger = require("./src/middleware/logger");
const errorHandler = require("./src/middleware/errorHandler");
const routes = require("./src/routes");
const { startCronJobs } = require("./src/cron");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(compression());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString(), version: "1.0.0" });
});

app.use("/api", routes);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`VALANO SHOP backend → http://localhost:${PORT} [${process.env.NODE_ENV || "development"}]`);
  startCronJobs();
});

module.exports = app;
