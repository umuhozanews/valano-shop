// Shared helpers for turning a raw score/band into UI-friendly color + label.
export function bandColor(band, score) {
  if (score === null || score === undefined) return "#9CA3AF";
  if (band === "green" || score >= 80) return "#10B981";
  if (band === "amber" || score >= 50) return "#F59E0B";
  if (band === "red" || (typeof score === "number" && score < 50)) return "#EF4444";
  return "#6B7280";
}

export function bandKey(band, score) {
  if (score === null || score === undefined) return "band_amber";
  const b = band || (score >= 80 ? "green" : score >= 50 ? "amber" : "red");
  if (b === "green") return "band_green";
  if (b === "amber") return "band_amber";
  return "band_red";
}

export function parseMaybeJSON(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// Interconnected Dynamic Health Score calculation engine based strictly on user data
export function computeHealthScoreFromData({ sales = [], expenses = [], stock = [] }) {
  if (!sales || sales.length === 0) {
    return {
      score: null,
      band: "neutral",
      factors: {
        positive: [],
        negative: [
          {
            label_en: "No sales recorded yet for this user account",
            label_rw: "Nta igurisha rirandikwa kuri konti y'umukoresha",
          },
        ],
      },
      recommendations: [
        {
          en: "Record your first sale at the POS counter (/sell) to start computing your Business Health Score.",
          rw: "Andika igurisha ryawe rya mbere ku igurishiro (/sell) kugira ngo utangire kubara amanota yawe.",
        },
      ],
    };
  }

  const totalRevenue = sales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount_rwf || e.amount) || 0), 0);
  const netCash = totalRevenue - totalExpenses;
  const salesCount = sales.length;
  const stockCount = stock.length;
  const lowStockCount = stock.filter((i) => (Number(i.quantity) || 0) <= (Number(i.low_stock_threshold) || 5)).length;

  let score = 50;

  const positive = [];
  const negative = [];
  const recommendations = [];

  // 1. Revenue Volume (35%)
  if (totalRevenue >= 100000) {
    score += 20;
    positive.push({
      label_en: "Strong total sales revenue recorded (Above 100,000 RWF)",
      label_rw: "Inyungu z'igicuruzo ziri ku rwego rwiza (Sura 100,000 RWF)",
    });
  } else if (totalRevenue > 0) {
    score += 12;
    positive.push({
      label_en: "Active daily sales entries logged",
      label_rw: "Ibikorwa byo kugurisha byatangiye neza",
    });
  }

  // 2. Profit Margin & Cashflow (30%)
  if (netCash > 0) {
    score += 15;
    positive.push({
      label_en: "Positive net cashflow & profit margin",
      label_rw: "Umusaruro mwiza n'ubwiyongere bw'ingano y'amafaranga",
    });
  } else if (totalExpenses > 0) {
    score -= 10;
    negative.push({
      label_en: "Operating expenses exceed current recorded revenue",
      label_rw: "Ibyasohotse biraruta ibyarenze ku nyungu",
    });
    recommendations.push({
      en: "Review high monthly operating expenses to maintain positive working capital.",
      rw: "Genzura ibyasohotse buri kwezi kugira ngo ukomeze ube ufite inyungu.",
    });
  }

  // 3. Inventory Stock Control (20%)
  if (stockCount > 0 && lowStockCount === 0) {
    score += 10;
    positive.push({
      label_en: "Healthy inventory stock levels with zero low-stock alerts",
      label_rw: "Ububiko buhagije ntasoko yarangiye",
    });
  } else if (lowStockCount > 0) {
    score -= 8;
    negative.push({
      label_en: `${lowStockCount} product(s) are running critically low in stock`,
      label_rw: `Ibibikwa ${lowStockCount} biri hafi gushira mu bubiko`,
    });
    recommendations.push({
      en: "Restock fast-moving items before they go completely out of stock.",
      rw: "Wongere gushyiramo ibintu bigurishwa cyane mbere yuko bishira.",
    });
  }

  // 4. Record Frequency (15%)
  if (salesCount >= 5) {
    score += 8;
    positive.push({
      label_en: "High transaction record frequency (5+ sales entries logged)",
      label_rw: "Ibikorwa byinshi byanditse neza",
    });
  } else {
    recommendations.push({
      en: "Consistently log transactions daily to improve your SACCO credit score rating.",
      rw: "Komeza kwandika buri munsi kugira ngo urebe uburyo bwo kubona inguzanyo muri SACCO.",
    });
  }

  score = Math.max(30, Math.min(99, score));
  const band = score >= 80 ? "green" : score >= 50 ? "amber" : "red";

  return {
    score,
    band,
    factors: { positive, negative },
    recommendations,
  };
}
