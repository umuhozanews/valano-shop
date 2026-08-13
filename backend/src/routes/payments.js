const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");
const pool = require("../config/db");
const { verifyToken } = require("../middleware/auth");
const { logAudit, createNotification, notifyAdminsAndManagers } = require("../utils/helpers");

const FLW_BASE = "https://api.flutterwave.com/v3";
const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY;
const FLW_WEBHOOK_SECRET = process.env.FLUTTERWAVE_WEBHOOK_SECRET;

function flwHeaders() {
  return { Authorization: `Bearer ${FLW_SECRET}`, "Content-Type": "application/json" };
}

// ─── Initiate payment ─────────────────────────────────────────────────────────
// Supports: mtn_momo, airtel, card
router.post("/initiate", verifyToken, async (req, res, next) => {
  try {
    if (!FLW_SECRET) return res.status(503).json({ error: "Payment gateway not configured" });

    const { sale_id, amount, currency = "RWF", payment_method, phone, email, redirect_url } = req.body;
    if (!sale_id || !amount || !payment_method)
      return res.status(400).json({ error: "sale_id, amount and payment_method required" });

    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "owner_id=$2";
    const queryParams = isAdmin ? [sale_id] : [sale_id, req.ownerId];

    const { rows: [sale] } = await pool.query(`SELECT * FROM sales WHERE id=$1 AND ${ownerWhere}`, queryParams);
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    const tx_ref = `INZ-${sale_id}-${Date.now()}`;

    let payload;
    let endpoint;

    if (payment_method === "mtn_momo") {
      endpoint = "/charges?type=mobile_money_rwanda";
      payload = {
        tx_ref,
        amount,
        currency,
        order_id: `sale-${sale_id}`,
        email: email || "customer@inzira.rw",
        phone_number: phone,
        fullname: "Customer",
        network: "MTN",
      };
    } else if (payment_method === "airtel") {
      endpoint = "/charges?type=mobile_money_rwanda";
      payload = {
        tx_ref,
        amount,
        currency,
        order_id: `sale-${sale_id}`,
        email: email || "customer@inzira.rw",
        phone_number: phone,
        fullname: "Customer",
        network: "AIRTEL",
      };
    } else if (payment_method === "card") {
      endpoint = "/payments";
      payload = {
        tx_ref,
        amount,
        currency,
        redirect_url: redirect_url || process.env.FRONTEND_URL + "/payment/callback",
        customer: { email: email || "customer@inzira.rw", phonenumber: phone },
        customizations: {
          title: "Inzira Insights",
          description: `Payment for Sale #${sale_id}`,
        },
      };
    } else {
      return res.status(400).json({ error: "payment_method must be mtn_momo, airtel, or card" });
    }

    const { data } = await axios.post(`${FLW_BASE}${endpoint}`, payload, { headers: flwHeaders() });

    // Store reference on sale
    await pool.query(
      "UPDATE sales SET payment_reference=$1, payment_status='pending' WHERE id=$2",
      [tx_ref, sale_id]
    );

    await logAudit(req.user.id, "PAYMENT_INITIATED", "sales", sale_id, null, { tx_ref, payment_method, amount }, req.ip);
    res.json({ tx_ref, data: data.data || data });
  } catch (err) {
    if (err.response?.data) return res.status(err.response.status || 502).json({ error: err.response.data.message || "Payment gateway error" });
    next(err);
  }
});

// ─── Check payment status ─────────────────────────────────────────────────────
router.get("/status/:tx_ref", verifyToken, async (req, res, next) => {
  try {
    if (!FLW_SECRET) return res.status(503).json({ error: "Payment gateway not configured" });

    const { data } = await axios.get(
      `${FLW_BASE}/transactions?tx_ref=${req.params.tx_ref}`,
      { headers: flwHeaders() }
    );
    const tx = data.data?.[0];
    if (!tx) return res.status(404).json({ error: "Transaction not found" });

    res.json({ status: tx.status, amount: tx.amount, currency: tx.currency, tx_ref: tx.tx_ref });
  } catch (err) {
    if (err.response?.data) return res.status(err.response.status || 502).json({ error: err.response.data.message });
    next(err);
  }
});

// ─── Verify and confirm payment ───────────────────────────────────────────────
router.post("/verify/:transaction_id", verifyToken, async (req, res, next) => {
  try {
    if (!FLW_SECRET) return res.status(503).json({ error: "Payment gateway not configured" });

    const { data } = await axios.get(
      `${FLW_BASE}/transactions/${req.params.transaction_id}/verify`,
      { headers: flwHeaders() }
    );
    const tx = data.data;
    if (tx.status !== "successful") return res.status(400).json({ error: `Payment ${tx.status}` });

    // Update sale
    const { rows } = await pool.query(
      "UPDATE sales SET payment_status='completed' WHERE payment_reference=$1 RETURNING id, user_id",
      [tx.tx_ref]
    );
    if (rows[0]) {
      await notifyAdminsAndManagers(
        "PAYMENT_CONFIRMED",
        "Payment Confirmed",
        `Payment of ${tx.amount} ${tx.currency} confirmed for Sale #${rows[0].id}`
      );
      // Also notify the cashier who made the sale
      if (rows[0].user_id) {
        await createNotification(
          rows[0].user_id,
          "PAYMENT_CONFIRMED",
          "Payment Confirmed",
          `Your sale #${rows[0].id} payment of ${tx.amount} ${tx.currency} was confirmed`
        );
      }
      await logAudit(req.user.id, "PAYMENT_VERIFIED", "sales", rows[0].id, null, { tx_ref: tx.tx_ref }, req.ip);
    }

    res.json({ verified: true, transaction: tx });
  } catch (err) {
    if (err.response?.data) return res.status(err.response.status || 502).json({ error: err.response.data.message });
    next(err);
  }
});

// ─── Flutterwave webhook (no auth — Flutterwave calls this) ──────────────────
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    // Verify webhook signature
    if (FLW_WEBHOOK_SECRET) {
      const signature = req.headers["verif-hash"];
      if (signature !== FLW_WEBHOOK_SECRET) {
        console.warn("[WEBHOOK] Invalid signature");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const event = JSON.parse(req.body);
    const { event: eventType, data: tx } = event;

    console.log(`[WEBHOOK] ${eventType} — ${tx?.tx_ref} — ${tx?.status}`);

    if (eventType === "charge.completed" && tx?.status === "successful") {
      // Find sale by payment reference
      const { rows } = await pool.query(
        "UPDATE sales SET payment_status='completed' WHERE payment_reference=$1 AND payment_status!='completed' RETURNING id, user_id",
        [tx.tx_ref]
      );

      if (rows[0]) {
        const sale = rows[0];

        // Mark receivable as paid if exists
        await pool.query(
          `UPDATE accounts_receivable SET status='paid', amount_paid=amount
           WHERE sale_id=$1 AND status IN ('pending','partial')`,
          [sale.id]
        );

        // Notify
        await notifyAdminsAndManagers(
          "PAYMENT_CONFIRMED",
          "Payment Confirmed via Mobile Money",
          `Sale #${sale.id} — ${tx.amount} ${tx.currency} confirmed (${tx.payment_type})`
        );
        if (sale.user_id) {
          await createNotification(
            sale.user_id,
            "PAYMENT_CONFIRMED",
            "MoMo Payment Confirmed",
            `Sale #${sale.id} payment of ${tx.amount} ${tx.currency} confirmed`
          );
        }
        await logAudit(null, "WEBHOOK_PAYMENT", "sales", sale.id, null, { tx_ref: tx.tx_ref, amount: tx.amount }, null);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[WEBHOOK ERROR]", err.message);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// ─── Split payment record ─────────────────────────────────────────────────────
router.post("/split", verifyToken, async (req, res, next) => {
  try {
    const { sale_id, payments } = req.body;
    // payments: [{ method: "cash", amount: 5000 }, { method: "mtn_momo", amount: 3000 }]
    if (!sale_id || !payments?.length)
      return res.status(400).json({ error: "sale_id and payments array required" });

    const isAdmin = ['pulse_admin', 'admin'].includes(req.user.role);
    const ownerWhere = isAdmin ? "1=1" : "owner_id=$2";
    const queryParams = isAdmin ? [sale_id] : [sale_id, req.ownerId];

    const { rows: [sale] } = await pool.query(`SELECT * FROM sales WHERE id=$1 AND ${ownerWhere}`, queryParams);
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const remaining = sale.total_amount - totalPaid;

    await pool.query(
      "UPDATE sales SET payment_method='split', payment_status=$1 WHERE id=$2",
      [remaining <= 0 ? "completed" : "partial", sale_id]
    );

    if (remaining > 0) {
      // Create/update receivable for remainder
      await pool.query(
        `INSERT INTO accounts_receivable (customer_id, sale_id, amount, notes)
         SELECT customer_id, $1, $2, 'Split payment remainder'
         FROM sales WHERE id=$1
         ON CONFLICT DO NOTHING`,
        [sale_id, remaining]
      );
    }

    await logAudit(req.user.id, "SPLIT_PAYMENT", "sales", sale_id, null, { payments, remaining }, req.ip);
    res.json({ sale_id, totalPaid, remaining, payments });
  } catch (err) { next(err); }
});

module.exports = router;
