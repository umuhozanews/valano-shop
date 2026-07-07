const express = require("express");
const router = express.Router();

// ── Core SME routes ───────────────────────────────────────────────────────────
router.use("/auth",               require("./auth"));
router.use("/dashboard",          require("./dashboard"));
router.use("/stock",              require("./stock"));
router.use("/sales",              require("./sales"));
router.use("/customers",          require("./customers"));
router.use("/suppliers",          require("./suppliers"));
router.use("/invoices",           require("./invoices"));
router.use("/expenses",           require("./expenses"));
router.use("/finance",            require("./finance"));
router.use("/reports",            require("./reports"));
router.use("/notifications",      require("./notifications"));
router.use("/audit",              require("./audit"));
router.use("/settings",           require("./settings"));
router.use("/purchase-orders",    require("./purchase-orders"));
router.use("/accounts-receivable",require("./accounts-receivable"));
router.use("/payments",           require("./payments"));

// ── v2: Health Score, Lender, Pulse Admin ────────────────────────────────────
router.use("/v2/score",           require("./score"));
router.use("/v2/lender",          require("./lender"));
router.use("/v2/admin",           require("./admin"));

module.exports = router;
