const express = require("express");
const router = express.Router();

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

module.exports = router;
