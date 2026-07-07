const pool = require("../config/db");

const MODEL_VERSION = "1.0.0-rules";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const sigmoid = (x) => 1 / (1 + Math.exp(-x));

function stddev(arr) {
  if (!arr.length) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

// ─── Pull all data needed from DB for one business ───────────────────────────
async function fetchBusinessData(userId) {
  const [userRow, salesData, dailySales, expenseData, stockData, supplierDebt, arData] = await Promise.all([
    // Business age + consent
    pool.query("SELECT created_at, consent_status, sector FROM users WHERE id=$1", [userId]),

    // Revenue windows
    pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN created_at >= NOW()-INTERVAL '30 days' THEN total_amount ELSE 0 END),0)  AS s30,
        COALESCE(SUM(CASE WHEN created_at BETWEEN NOW()-INTERVAL '60 days' AND NOW()-INTERVAL '30 days' THEN total_amount ELSE 0 END),0) AS s_prev30,
        COALESCE(SUM(CASE WHEN created_at >= NOW()-INTERVAL '90 days' THEN total_amount ELSE 0 END),0)  AS s90,
        COALESCE(SUM(CASE WHEN created_at BETWEEN NOW()-INTERVAL '180 days' AND NOW()-INTERVAL '90 days' THEN total_amount ELSE 0 END),0) AS s_prev90,
        COALESCE(SUM(CASE WHEN created_at >= NOW()-INTERVAL '60 days' THEN total_amount ELSE 0 END),0)  AS s60,
        COALESCE(SUM(CASE WHEN created_at BETWEEN NOW()-INTERVAL '120 days' AND NOW()-INTERVAL '60 days' THEN total_amount ELSE 0 END),0) AS s_prev60,
        COUNT(*) FILTER (WHERE created_at >= NOW()-INTERVAL '30 days') AS tx30,
        MAX(created_at) AS last_sale,
        COUNT(*) FILTER (WHERE created_at >= NOW()-INTERVAL '30 days' AND payment_method NOT IN ('cash','credit')) AS digital_tx,
        COUNT(*) FILTER (WHERE created_at >= NOW()-INTERVAL '30 days') AS total_tx
      FROM sales WHERE is_voided=false AND user_id=$1`, [userId]),

    // Daily sales for volatility (last 30 days)
    pool.query(`
      SELECT DATE(created_at) as day, SUM(total_amount) as rev
      FROM sales WHERE is_voided=false AND user_id=$1 AND created_at >= NOW()-INTERVAL '30 days'
      GROUP BY DATE(created_at) ORDER BY day`, [userId]),

    // Expenses
    pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month',expense_date::timestamp)=DATE_TRUNC('month',NOW()) THEN amount ELSE 0 END),0) AS exp_this,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month',expense_date::timestamp)=DATE_TRUNC('month',NOW()-INTERVAL '1 month') THEN amount ELSE 0 END),0) AS exp_last,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month',expense_date::timestamp)=DATE_TRUNC('month',NOW()-INTERVAL '2 months') THEN amount ELSE 0 END),0) AS exp_2m
      FROM expenses WHERE recorded_by=$1`, [userId]),

    // Stock
    pool.query(`
      SELECT
        COALESCE(SUM(quantity * cost_price_rwf),0) AS inv_value,
        COALESCE(SUM(quantity * sell_price_rwf),0) AS sell_value,
        COUNT(*) FILTER (WHERE quantity=0) AS out_count,
        COUNT(*) as total_items
      FROM stock_items WHERE is_active=true`, []),

    // Supplier outstanding balance
    pool.query("SELECT COALESCE(SUM(outstanding_balance),0) AS sup_debt FROM suppliers", []),

    // Accounts receivable overdue
    pool.query(`
      SELECT COALESCE(SUM(amount-amount_paid),0) AS ar_outstanding
      FROM accounts_receivable WHERE status IN ('pending','partial','overdue')`, []),
  ]);

  // COGS last 30 days
  const { rows: [cogsRow] } = await pool.query(`
    SELECT COALESCE(SUM(si.quantity * stk.cost_price_rwf),0) AS cogs30
    FROM sale_items si JOIN sales s ON s.id=si.sale_id JOIN stock_items stk ON stk.id=si.stock_item_id
    WHERE s.is_voided=false AND s.user_id=$1 AND s.created_at >= NOW()-INTERVAL '30 days'`, [userId]);

  return {
    user: userRow.rows[0],
    sales: salesData.rows[0],
    dailySales: dailySales.rows,
    expenses: expenseData.rows[0],
    stock: stockData.rows[0],
    supplierDebt: supplierDebt.rows[0],
    ar: arData.rows[0],
    cogs30: cogsRow,
  };
}

// ─── Feature engineering ──────────────────────────────────────────────────────
function buildFeatures(data) {
  const { user, sales, dailySales, expenses, stock, supplierDebt, cogs30 } = data;

  const s30     = Number(sales.s30);
  const sPrev30 = Number(sales.s_prev30);
  const s90     = Number(sales.s90);
  const sPrev90 = Number(sales.s_prev90);
  const s60     = Number(sales.s60);
  const sPrev60 = Number(sales.s_prev60);
  const expThis = Number(expenses.exp_this);
  const expLast = Number(expenses.exp_last);
  const exp2m   = Number(expenses.exp_2m);
  const invVal  = Number(stock.inv_value);
  const cogs    = Number(cogs30.cogs30);

  // Business age in months
  const ageMs = user ? Date.now() - new Date(user.created_at).getTime() : 0;
  const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30);

  // 1. Sales trend 30d: change vs prior period, normalized via sigmoid
  const trend30Raw = sPrev30 > 0 ? (s30 - sPrev30) / sPrev30 : (s30 > 0 ? 1 : 0);
  const salesTrend30 = clamp(sigmoid(trend30Raw * 3) * 1.2 - 0.1);

  // 2. Sales trend 90d
  const trend90Raw = sPrev90 > 0 ? (s90 - sPrev90) / sPrev90 : (s90 > 0 ? 0.5 : 0);
  const salesTrend90 = clamp(sigmoid(trend90Raw * 2));

  // 3. Sales volatility (lower CV = more consistent = better score)
  const dailyRevs = dailySales.map(r => Number(r.rev));
  const meanRev = dailyRevs.length ? dailyRevs.reduce((s, v) => s + v, 0) / dailyRevs.length : 0;
  const cv = meanRev > 0 ? stddev(dailyRevs) / meanRev : 1;
  const salesVolatility = clamp(1 - cv / 2); // CV of 0 = score 1.0, CV of 2+ = score 0

  // 4. Gross margin ratio
  const grossMargin = s30 > 0 ? clamp((s30 - cogs) / s30) : 0;

  // 5. Expense ratio (lower is better, >0.95 is danger zone)
  const expRatio = s30 > 0 ? clamp(expenses.exp_this / s30) : 1;
  const expenseRatioScore = clamp(1 - expRatio);

  // 6. Stock turnover (annualised: cogs30 * 12 / invVal)
  const annualCogs = cogs * 12;
  const stockTurnover = invVal > 0 ? clamp(annualCogs / invVal / 12) : 0; // normalise: 12 turns/yr = 1.0

  // 7. Inventory coverage days (ideal 15-60 days)
  const dailyCogs = cogs / 30;
  const coverageDays = dailyCogs > 0 ? invVal / dailyCogs : 0;
  // Score peaks at 30 days, drops toward 0 or 90+
  const inventoryCoverage = coverageDays > 0
    ? clamp(1 - Math.abs(coverageDays - 30) / 60)
    : 0;

  // 8. Payment method mix (digital payments signal formality)
  const digitalPct = Number(sales.total_tx) > 0
    ? Number(sales.digital_tx) / Number(sales.total_tx)
    : 0;
  const paymentMix = clamp(digitalPct);

  // 9. Business age maturity (2 years = fully mature = 1.0)
  const businessAge = clamp(ageMonths / 24);

  // 10. Sales consistency (% of last 30 days with at least one sale)
  const consistency = clamp(dailySales.length / 30);

  return {
    salesTrend30,
    salesTrend90,
    salesVolatility,
    grossMargin,
    expenseRatioScore,
    stockTurnover,
    inventoryCoverage,
    paymentMix,
    businessAge,
    consistency,
    // Raw values for hard rules
    _raw: {
      ageMonths,
      lastSale: sales.last_sale,
      s30, sPrev30, s60, sPrev60, expThis, expLast, exp2m,
      outOfStockCount: Number(stock.out_count),
      supplierDebt: Number(supplierDebt.sup_debt),
      consentStatus: user?.consent_status,
    },
  };
}

// ─── Weighted base score ──────────────────────────────────────────────────────
const WEIGHTS = {
  salesTrend30:      0.22,
  salesTrend90:      0.10,
  salesVolatility:   0.10,
  grossMargin:       0.15,
  expenseRatioScore: 0.15,
  stockTurnover:     0.10,
  inventoryCoverage: 0.04,
  paymentMix:        0.04,
  businessAge:       0.05,
  consistency:       0.05,
};

function weightedScore(features) {
  let score = 0;
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    score += (features[key] ?? 0) * weight;
  }
  return Math.round(score * 100); // 0–100
}

// ─── Hard rules ───────────────────────────────────────────────────────────────
function applyHardRules(baseScore, raw) {
  let score = baseScore;
  const flags = [];

  // HRD-08: consent withdrawn → null
  if (raw.consentStatus === "withdrawn") {
    return { score: null, band: null, flags: ["HRD-08: consent withdrawn"] };
  }

  // HRD-01: business < 3 months
  if (raw.ageMonths < 3) {
    score = Math.min(score, 40);
    flags.push("HRD-01: business less than 3 months old");
  }

  // HRD-02: no sales in 30 days
  const lastSale = raw.lastSale ? new Date(raw.lastSale) : null;
  const daysSinceLastSale = lastSale
    ? (Date.now() - lastSale.getTime()) / (1000 * 60 * 60 * 24)
    : 999;
  if (daysSinceLastSale > 30) {
    score = Math.min(score, 30);
    flags.push("HRD-02: no sales in the last 30 days");
  }

  // HRD-03: expenses > 95% revenue for 2 consecutive months
  const rev30 = raw.s30 > 0 ? raw.s30 : 1;
  const prevRev = raw.s60 - raw.s30 > 0 ? raw.s60 - raw.s30 : 1;
  if (raw.expThis / rev30 > 0.95 && raw.expLast / prevRev > 0.95) {
    score -= 20;
    flags.push("HRD-03: expenses exceeded 95% of revenue for 2 months");
  }

  // HRD-04: 3+ products at zero stock
  if (raw.outOfStockCount >= 3) {
    score -= 15;
    flags.push(`HRD-04: ${raw.outOfStockCount} products out of stock`);
  }

  // HRD-05: supplier balance > 3 months revenue
  const threeMonthRevenue = raw.s30 * 3;
  if (threeMonthRevenue > 0 && raw.supplierDebt > threeMonthRevenue) {
    score -= 10;
    flags.push("HRD-05: supplier debt exceeds 3 months of revenue");
  }

  // HRD-07: sales drop > 60% vs prior 30 days
  if (raw.sPrev30 > 0 && raw.s30 < raw.sPrev30 * 0.4) {
    score -= 15;
    flags.push("HRD-07: sales dropped more than 60% vs previous month");
  }

  score = Math.max(0, Math.min(100, score));

  const band = score < 40 ? "red" : score < 65 ? "amber" : "green";
  return { score, band, flags };
}

// ─── Factor breakdown (plain language) ────────────────────────────────────────
function buildFactors(features, hardFlags) {
  const items = [
    { key: "salesTrend30",      label_en: "Monthly sales trend",       label_rw: "Inyungu y'ibikorwa by'ukwezi", value: features.salesTrend30 },
    { key: "salesTrend90",      label_en: "Quarterly sales trend",     label_rw: "Inyungu y'ibikorwa by'igihembwe", value: features.salesTrend90 },
    { key: "salesVolatility",   label_en: "Sales consistency",         label_rw: "Gukomera kw'ibikorwa", value: features.salesVolatility },
    { key: "grossMargin",       label_en: "Gross profit margin",       label_rw: "Inyungu nyayo", value: features.grossMargin },
    { key: "expenseRatioScore", label_en: "Expense control",           label_rw: "Kugenzura indangagaciro", value: features.expenseRatioScore },
    { key: "stockTurnover",     label_en: "Stock turnover rate",       label_rw: "Umubare wo gusubiramo ibicuruzwa", value: features.stockTurnover },
    { key: "consistency",       label_en: "Daily sales consistency",   label_rw: "Buri munsi gucuruza", value: features.consistency },
    { key: "businessAge",       label_en: "Business maturity",         label_rw: "Imyaka y'ubucuruzi", value: features.businessAge },
  ];

  items.sort((a, b) => b.value - a.value);
  const positive = items.slice(0, 3).map(i => ({ ...i, impact: "positive" }));
  const negative = items.slice(-3).reverse().map(i => ({ ...i, impact: "negative" }));

  return { positive, negative, hardFlags };
}

// ─── Recommendations ──────────────────────────────────────────────────────────
function buildRecommendations(score, features, raw) {
  const recs = [];

  if (features.expenseRatioScore < 0.4) {
    recs.push({ priority: 1, en: "Your expenses are too high relative to sales. Review and cut non-essential costs.", rw: "Indangagaciro zawe ni nyinshi ugereranije n'ibyacurujwe. Suzuma no gukonjesha ibyakoreshejwe." });
  }
  if (features.salesTrend30 < 0.4) {
    recs.push({ priority: 2, en: "Sales are declining. Consider promotions, expanding your product range, or reaching new customers.", rw: "Ibyacurujwe bigenda bigabanuka. Tekereza ibihe, kongera ibicuruzwa, cyangwa gushakira abakiriya bashya." });
  }
  if (raw.outOfStockCount >= 2) {
    recs.push({ priority: 3, en: `You have ${raw.outOfStockCount} products out of stock. Restock quickly to avoid losing sales.`, rw: `Ufite ibicuruzwa ${raw.outOfStockCount} bisa nta makoro. Subiramo vuba kugira ngo wirinde gukora akagwa.` });
  }
  if (features.consistency < 0.5) {
    recs.push({ priority: 4, en: "You are not selling every day. Try to open your business consistently to build customer habits.", rw: "Ntabwo ucuruza buri munsi. Gerageza gufungura ubucuruzi bwawe buri gihe kugira ngo abaguzi bayiterere." });
  }
  if (features.grossMargin < 0.3) {
    recs.push({ priority: 5, en: "Your profit margins are low. Review your pricing or reduce your cost of goods.", rw: "Inyungu zawe ni nke. Suzuma igiciro cy'ibicuruzwa byawe cyangwa ugabanya amafaranga yo kugura." });
  }
  if (!recs.length) {
    recs.push({ priority: 1, en: "Your business is performing well. Keep up the momentum and consider expanding to grow further.", rw: "Ubucuruzi bwawe bugenda neza. Komeza no gutekereza kongera ubucuruzi bwawe." });
  }

  return recs.slice(0, 3);
}

// ─── Main entry point ─────────────────────────────────────────────────────────
async function calculateScore(userId) {
  const data = await fetchBusinessData(userId);

  if (!data.user) throw new Error("Business not found");

  const features = buildFeatures(data);
  const base = weightedScore(features);
  const { score, band, flags } = applyHardRules(base, features._raw);

  if (score === null) {
    return { score: null, band: null, factors: null, recommendations: null, model_version: MODEL_VERSION };
  }

  const factors = buildFactors(features, flags);
  const recommendations = buildRecommendations(score, features, features._raw);

  // Generate shareable advisory token
  const crypto = require("crypto");
  const advisoryToken = crypto.randomBytes(16).toString("hex");

  return {
    score,
    band,
    factors,
    recommendations,
    advisoryToken,
    model_version: MODEL_VERSION,
    calculated_at: new Date().toISOString(),
  };
}

module.exports = { calculateScore, MODEL_VERSION };
