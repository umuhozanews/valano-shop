/**
 * Inzira Insights — Comprehensive Mock Data Seed
 * Creates 5 SMEs (green/amber/red bands), 2 lenders, 1 advisor,
 * 90 days of transactions, referrals, advisory sessions, full score history.
 *
 * Run: node scripts/seedMockData.js
 */

const pool     = require("../src/config/db");
const bcrypt   = require("bcryptjs");
const crypto   = require("crypto");
const { calculateScore } = require("../src/utils/scoring");

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rnd     = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick    = (arr)      => arr[Math.floor(Math.random() * arr.length)];
const daysAgo = (n, hourJitter = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(rnd(7, 20) + hourJitter, rnd(0, 59), 0, 0);
  return d.toISOString();
};
const dateOnly = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

// ─── Password hash (inzira2024, cost=10) ──────────────────────────────────────
const HASH = "$2a$10$2JnEksJLQ2Uq5qKqhtPxsumIp4RA/7WuqQeItum/RFcwp4//7nN.S";

// ─── SME Profiles ─────────────────────────────────────────────────────────────
// Each profile drives how many sales/day, revenue trend, expense ratio, payment mix
const SME_PROFILES = [
  {
    email:   "amani.grocery@inzira.rw",
    name:    "Amani Grocery Store",
    sector:  "Retail Shop",
    district:"Gasabo",
    phone:   "+250788201001",
    targetBand: "green",
    // Revenue per day: rises over 90 days
    revPerDay:    { old: [4000,8000],  mid: [7000,12000], recent: [10000,18000] },
    txPerDay:     [3, 6],
    skipDayChance: 0.06,   // sells almost every day
    expenseRatio:  0.38,   // 38% of revenue on expenses
    digitalPct:    0.40,   // 40% digital payments
    ageMonths:     8,
  },
  {
    email:   "grace.restaurant@inzira.rw",
    name:    "Chez Grace Restaurant",
    sector:  "Restaurant / Food",
    district:"Kicukiro",
    phone:   "+250788201002",
    targetBand: "amber",
    revPerDay:    { old: [8000,14000], mid: [7000,12000], recent: [6000,11000] },
    txPerDay:     [2, 4],
    skipDayChance: 0.12,
    expenseRatio:  0.68,   // high food costs
    digitalPct:    0.20,
    ageMonths:     14,
  },
  {
    email:   "pierre.hardware@inzira.rw",
    name:    "Pierre Hardware",
    sector:  "Hardware",
    district:"Nyarugenge",
    phone:   "+250788201003",
    targetBand: "amber",
    revPerDay:    { old: [5000,10000], mid: [6000,11000], recent: [8000,14000] },
    txPerDay:     [2, 4],
    skipDayChance: 0.18,
    expenseRatio:  0.55,
    digitalPct:    0.25,
    ageMonths:     5,
  },
  {
    email:   "claudine.salon@inzira.rw",
    name:    "Claudine Beauty Salon",
    sector:  "Salon / Beauty",
    district:"Musanze",
    phone:   "+250788201004",
    targetBand: "red",
    // Declining fast — HRD-07 will fire
    revPerDay:    { old: [6000,10000], mid: [3000,6000],  recent: [1000,2500] },
    txPerDay:     [1, 3],
    skipDayChance: 0.45,   // many closed days
    expenseRatio:  0.92,   // nearly all revenue eaten by expenses
    digitalPct:    0.05,
    ageMonths:     3,
  },
  {
    email:   "nsanzimana.agri@inzira.rw",
    name:    "Nsanzimana Agribusiness",
    sector:  "Agribusiness",
    district:"Bugesera",
    phone:   "+250788201005",
    targetBand: "amber",
    revPerDay:    { old: [3000,7000],  mid: [5000,9000],  recent: [7000,12000] },
    txPerDay:     [2, 5],
    skipDayChance: 0.22,
    expenseRatio:  0.50,
    digitalPct:    0.30,
    ageMonths:     11,
  },
];

const LENDERS = [
  { email:"equity.bank@inzira.rw",  name:"Equity Bank Rwanda",   phone:"+250788300001" },
  { email:"bk.group@inzira.rw",     name:"BK Group (Bank of Kigali)", phone:"+250788300002" },
];

const ADVISOR = {
  email:"advisor@inzira.rw", name:"DataBridge Advisor", phone:"+250788400001",
};

const EXTRA_STAFF = [
  { email:"manager@inzira.rw",    name:"Shop Manager",     role:"manager" },
  { email:"accountant@inzira.rw", name:"Business Accountant", role:"accountant" },
];

// Additional stock items for richer catalog
const EXTRA_STOCK = [
  { name:"Flour 1kg",       name_rw:"Ufu 1kg",         category:"Groceries", unit:"kg",     qty:60,  cost:600,  sell:800,  low:15 },
  { name:"Salt 500g",       name_rw:"Umunyo 500g",      category:"Groceries", unit:"pcs",    qty:80,  cost:200,  sell:300,  low:20 },
  { name:"Tea Leaves 100g", name_rw:"Icyayi 100g",      category:"Beverages", unit:"pcs",    qty:50,  cost:500,  sell:700,  low:10 },
  { name:"Matchbox",        name_rw:"Ibirimi",          category:"Hygiene",   unit:"pcs",    qty:200, cost:50,   sell:100,  low:50 },
  { name:"Milk 1L",         name_rw:"Amata 1L",         category:"Beverages", unit:"litre",  qty:40,  cost:800,  sell:1000, low:10 },
  { name:"Tomato Paste",    name_rw:"Pasita y'inyanya", category:"Groceries", unit:"pcs",    qty:70,  cost:400,  sell:600,  low:15 },
  { name:"Bleach 1L",       name_rw:"Amazi yo gukanika",category:"Hygiene",   unit:"litre",  qty:30,  cost:700,  sell:1000, low:5  },
  { name:"Notebook A4",     name_rw:"Akayabo A4",       category:"Stationery",unit:"pcs",    qty:100, cost:600,  sell:900,  low:20 },
  { name:"Cement 50kg",     name_rw:"Sima 50kg",        category:"Hardware",  unit:"sack",   qty:20,  cost:12000,sell:14000,low:5  },
  { name:"Paint Bucket 4L", name_rw:"Penti 4L",         category:"Hardware",  unit:"pcs",    qty:15,  cost:8000, sell:10500,low:3  },
];

const EXPENSE_CATS  = ["Rent","Utilities","Salaries","Transport","Supplies","Maintenance"];
const PAY_METHODS   = ["cash","cash","cash","mtn_momo","airtel","card","bank_transfer"];

// ─── Core helpers ──────────────────────────────────────────────────────────────
async function upsertUser({ name, email, phone, role, sector, district, ageMonths = 6 }) {
  const created_at = new Date(Date.now() - ageMonths * 30 * 24 * 60 * 60 * 1000).toISOString();
  const { rows: [u] } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, phone, sector, district, consent_status, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'consented',$8)
     ON CONFLICT (email) DO UPDATE SET
       name=$1, password_hash=$3, role=$4, phone=$5,
       sector=$6, district=$7, consent_status='consented', created_at=$8
     RETURNING id`,
    [name, email, HASH, role || "sme_owner", phone, sector || null, district || null, created_at]
  );
  return u.id;
}

async function getStockItems() {
  const { rows } = await pool.query(
    "SELECT id, cost_price_rwf, sell_price_rwf FROM stock_items WHERE is_active=true"
  );
  return rows;
}

async function clearUserData(userId) {
  await pool.query("DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE user_id=$1)", [userId]);
  await pool.query("DELETE FROM sales WHERE user_id=$1", [userId]);
  await pool.query("DELETE FROM expenses WHERE recorded_by=$1", [userId]);
  await pool.query("DELETE FROM purchase_orders WHERE created_by=$1", [userId]);
  await pool.query("DELETE FROM health_score_log WHERE user_id=$1", [userId]);
  await pool.query("DELETE FROM credit_scores WHERE user_id=$1", [userId]);
  await pool.query("DELETE FROM notifications WHERE user_id=$1", [userId]);
}

async function seedSales(userId, profile, stockItems, customerIds) {
  let count = 0;
  for (let dayOffset = 90; dayOffset >= 1; dayOffset--) {
    if (Math.random() < profile.skipDayChance) continue;

    const range = dayOffset > 60 ? profile.revPerDay.old
                : dayOffset > 30 ? profile.revPerDay.mid
                :                  profile.revPerDay.recent;

    const txCount = rnd(...profile.txPerDay);
    for (let t = 0; t < txCount; t++) {
      const numItems = rnd(1, 3);
      const items = [];
      let total = 0;
      for (let i = 0; i < numItems; i++) {
        const s   = pick(stockItems);
        const qty = rnd(1, 4);
        const sub = qty * Number(s.sell_price_rwf);
        items.push({ stock_id: s.id, qty, price: Number(s.sell_price_rwf), sub });
        total += sub;
      }
      // Scale total toward profile range
      const target = rnd(...range);
      const scale  = total > 0 ? target / total : 1;
      total = Math.round(total * scale);
      items.forEach(it => { it.sub = Math.round(it.sub * scale); it.price = Math.round(it.price * scale); });

      const method = Math.random() < profile.digitalPct
        ? pick(["mtn_momo","airtel","card","bank_transfer"])
        : "cash";

      const ts = daysAgo(dayOffset - (t * 0.005));
      const { rows: [sale] } = await pool.query(
        `INSERT INTO sales (user_id, customer_id, payment_method, total_amount, is_voided, created_at)
         VALUES ($1,$2,$3,$4,false,$5) RETURNING id`,
        [userId, pick(customerIds), method, total, ts]
      );
      for (const it of items) {
        await pool.query(
          "INSERT INTO sale_items (sale_id, stock_item_id, quantity, unit_price, subtotal) VALUES ($1,$2,$3,$4,$5)",
          [sale.id, it.stock_id, it.qty, it.price, it.sub]
        );
      }
      count++;
    }
  }
  return count;
}

async function seedExpenses(userId, profile) {
  let count = 0;
  const monthlySalary  = rnd(40000, 80000);
  const monthlyRent    = rnd(30000, 90000);
  const monthlyUtil    = rnd(8000, 20000);

  for (let monthBack = 2; monthBack >= 0; monthBack--) {
    // Recurring monthly
    for (const [cat, base] of [["Salaries", monthlySalary], ["Rent", monthlyRent], ["Utilities", monthlyUtil]]) {
      const jitter = rnd(-5000, 5000);
      const dOffset = monthBack * 30 + rnd(1, 5);
      await pool.query(
        `INSERT INTO expenses (category, amount, description, recorded_by, expense_date, created_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [cat, Math.max(1000, base + jitter), `${cat} — month ${3 - monthBack}`, userId, dateOnly(dOffset), daysAgo(dOffset)]
      );
      count++;
    }
    // Variable expenses
    const varCount = rnd(4, 8);
    for (let v = 0; v < varCount; v++) {
      const dOffset = monthBack * 30 + rnd(6, 28);
      const cat = pick(["Transport","Supplies","Maintenance","Other"]);
      const amount = rnd(2000, 15000);
      await pool.query(
        `INSERT INTO expenses (category, amount, description, recorded_by, expense_date, created_at)
         VALUES ($1,$2,'Operational cost',$3,$4,$5)`,
        [cat, amount, userId, dateOnly(dOffset), daysAgo(dOffset)]
      );
      count++;
    }
  }
  return count;
}

async function seedPurchaseOrders(userId, supplierIds) {
  const count = rnd(2, 5);
  for (let i = 0; i < count; i++) {
    const orderDaysAgo = rnd(5, 60);
    const arrivalDaysAgo = orderDaysAgo - rnd(3, 10);
    const status = arrivalDaysAgo < 0 ? "ordered" : arrivalDaysAgo < 2 ? "in_transit" : "arrived";
    await pool.query(
      `INSERT INTO purchase_orders (supplier_id, order_date, arrival_date, status, notes, created_by, created_at)
       VALUES ($1,$2,$3,$4,'Restocking order',$5,$6)`,
      [pick(supplierIds), dateOnly(orderDaysAgo), dateOnly(Math.max(0, arrivalDaysAgo)), status, userId, daysAgo(orderDaysAgo)]
    );
  }
  return count;
}

async function seedAccountsReceivable(customerIds) {
  // Some customers owe money
  let count = 0;
  const statuses = ["pending","partial","overdue","paid"];
  for (let i = 0; i < 6; i++) {
    const amount     = rnd(5000, 50000);
    const amountPaid = pick([0, Math.round(amount * 0.5), amount]);
    const daysOverdue = rnd(-10, 40);
    const status = amountPaid >= amount ? "paid"
                 : daysOverdue > 0     ? "overdue"
                 : amountPaid > 0      ? "partial"
                 :                       "pending";
    await pool.query(
      `INSERT INTO accounts_receivable (customer_id, amount, amount_paid, due_date, status, notes, created_at)
       VALUES ($1,$2,$3,$4,$5,'Credit sale',$6)
       ON CONFLICT DO NOTHING`,
      [pick(customerIds), amount, amountPaid, dateOnly(-daysOverdue), status, daysAgo(rnd(5,45))]
    );
    count++;
  }
  return count;
}

async function scoreAndSave(userId) {
  const result = await calculateScore(userId);
  if (!result || result.score === null) return null;

  await pool.query(
    `INSERT INTO credit_scores (user_id, score, band, model_version, calculated_at, advisory_token)
     VALUES ($1,$2,$3,$4,NOW(),$5)
     ON CONFLICT (user_id) DO UPDATE SET
       score=$2, band=$3, model_version=$4, calculated_at=NOW(), advisory_token=$5`,
    [userId, result.score, result.band, result.model_version, result.advisoryToken]
  );

  // Save last 3 months of score history (simulated monthly snapshots)
  for (let i = 2; i >= 0; i--) {
    const histScore = Math.max(0, Math.min(100, result.score + rnd(-8, 8) - (i * 3)));
    const histBand  = histScore < 40 ? "red" : histScore < 65 ? "amber" : "green";
    await pool.query(
      `INSERT INTO health_score_log (user_id, score, band, factors, recommendations, advisory_token, model_version, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()-INTERVAL '${i+1} months')`,
      [userId, histScore, histBand, JSON.stringify(result.factors || {}),
       JSON.stringify(result.recommendations || []), crypto.randomBytes(16).toString("hex"), result.model_version]
    );
  }
  // Current score
  await pool.query(
    `INSERT INTO health_score_log (user_id, score, band, factors, recommendations, advisory_token, model_version)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [userId, result.score, result.band, JSON.stringify(result.factors || {}),
     JSON.stringify(result.recommendations || []), result.advisoryToken, result.model_version]
  );

  return result;
}

async function seedAdvisorySession(businessId, advisorId, scoreResult) {
  const status = pick(["completed", "scheduled", "requested"]);
  const { rows: [session] } = await pool.query(
    `INSERT INTO advisory_sessions (business_id, advisor_id, scheduled_at, status, notes, created_at)
     VALUES ($1,$2,NOW()-INTERVAL '${rnd(1,14)} days',$3,$4,NOW()-INTERVAL '${rnd(15,30)} days')
     RETURNING id`,
    [businessId, advisorId,  status,
     `Score ${scoreResult?.score}/100 (${scoreResult?.band}) — ${scoreResult?.recommendations?.[0]?.en || "Review recommended"}`]
  );

  if (status === "completed") {
    const causes = ["HRD-02","HRD-03","HRD-04","HRD-07","low_margin","high_expense","stock_gap"];
    await pool.query(
      `INSERT INTO advisory_outcomes (session_id, cause_code, intervention, outcome, recorded_at)
       VALUES ($1,$2,$3,$4,NOW()-INTERVAL '${rnd(1,7)} days')`,
      [session.id, pick(causes),
       "Reviewed expense structure and identified cost reduction opportunities. Advised on daily sales tracking and stock reorder schedule.",
       "SME committed to recording all expenses daily and setting stock reorder points. Follow-up in 30 days."]
    );
  }
  return session.id;
}

async function seedLenderPortfolio(lenderIds, smeIds, smeResults) {
  let refCount = 0;
  for (const lenderId of lenderIds) {
    // Each lender gets 2-4 SMEs in their portfolio
    const portfolio = smeIds.sort(() => 0.5 - Math.random()).slice(0, rnd(2, 4));
    for (const smeId of portfolio) {
      await pool.query(
        `INSERT INTO lender_clients (lender_user_id, sme_user_id, notes, created_at)
         VALUES ($1,$2,'Referred for credit assessment',NOW()-INTERVAL '${rnd(10,60)} days')
         ON CONFLICT (lender_user_id, sme_user_id) DO NOTHING`,
        [lenderId, smeId]
      );
      const code = "REF-" + crypto.randomBytes(4).toString("hex").toUpperCase();
      const refStatus = pick(["pending","active","active","closed"]);
      await pool.query(
        `INSERT INTO referrals (lender_user_id, sme_user_id, referral_code, status, notes, created_at)
         VALUES ($1,$2,$3,$4,'Loan application review',NOW()-INTERVAL '${rnd(10,60)} days')
         ON CONFLICT DO NOTHING`,
        [lenderId, smeId, code, refStatus]
      ).catch(() => {}); // ignore duplicate code collisions
      refCount++;
    }
  }
  return refCount;
}

async function createNotifications(userId, scoreResult) {
  const msgs = [
    { type:"health_score",    title:`Health Score Updated: ${scoreResult.score}/100`,
      msg: scoreResult.recommendations?.[0]?.en || "Check your business insights." },
    { type:"low_stock",       title:"3 products running low",
      msg: "Sugar 1kg, Soap Bar, and Rice 1kg are below your reorder threshold." },
    { type:"sales_alert",     title:"Weekly Sales Summary",
      msg: `You recorded ${rnd(15,45)} sales this week totalling ${rnd(50,200)*1000} RWF.` },
  ];
  if (scoreResult.band === "red") {
    msgs.push({ type:"advisory",  title:"Advisory Session Recommended",
      msg: "Your score is in the red band. A DataBridge advisor is available to help." });
  }
  for (const m of msgs) {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
       VALUES ($1,$2,$3,$4,$5,NOW()-INTERVAL '${rnd(0,7)} days')`,
      [userId, m.type, m.title, m.msg, Math.random() > 0.4]
    );
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log("\n🌱  Inzira Insights — Seeding mock data...\n");

  // 1. Extra stock items
  for (const s of EXTRA_STOCK) {
    await pool.query(
      `INSERT INTO stock_items (name, name_rw, category, unit, quantity, cost_price_rwf, sell_price_rwf, low_stock_threshold, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true) ON CONFLICT DO NOTHING`,
      [s.name, s.name_rw, s.category, s.unit, s.qty, s.cost, s.sell, s.low]
    );
  }
  const stockItems = await getStockItems();
  console.log(`✓ Stock catalog: ${stockItems.length} items`);

  // 2. Get suppliers and customers
  const { rows: suppliers } = await pool.query("SELECT id FROM suppliers");
  const { rows: customers } = await pool.query("SELECT id FROM customers");
  // Add more customers
  for (const [name, phone, loc, type, seg] of [
    ["Jean Damascene",  "+250788500001", "Gasabo",    "retailer",   "new"],
    ["Marie Claire",    "+250788500002", "Kicukiro",  "retailer",   "regular"],
    ["Alliance Market", "+250788500003", "Nyarugenge","wholesaler", "regular"],
    ["Solange Uwase",   "+250788500004", "Musanze",   "retailer",   "new"],
    ["Patrick Habimana","+250788500005", "Huye",      "wholesaler", "regular"],
  ]) {
    await pool.query(
      `INSERT INTO customers (name, phone, location, type, segment)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [name, phone, loc, type, seg]
    );
  }
  const { rows: allCustomers } = await pool.query("SELECT id FROM customers");
  const custIds = allCustomers.map(r => r.id);
  const suppIds = suppliers.map(r => r.id);
  console.log(`✓ Customers: ${custIds.length} | Suppliers: ${suppIds.length}`);

  // 3. Create lenders
  const lenderIds = [];
  for (const l of LENDERS) {
    const id = await upsertUser({ ...l, role:"lender", ageMonths:12 });
    lenderIds.push(id);
    console.log(`  ✓ Lender: ${l.name} (id=${id})`);
  }

  // 4. Create advisor
  const advisorId = await upsertUser({ ...ADVISOR, role:"databridge_advisor", ageMonths:18 });
  console.log(`  ✓ Advisor: ${ADVISOR.name} (id=${advisorId})`);

  // 5. Extra staff for demo business
  for (const s of EXTRA_STAFF) {
    const id = await upsertUser({ ...s, ageMonths:8 });
    console.log(`  ✓ Staff: ${s.name} → ${s.role} (id=${id})`);
  }

  // 6. Seed each SME
  const smeIds     = [];
  const smeResults = {};
  console.log("\n📊  Seeding SME transaction data...\n");

  for (const profile of SME_PROFILES) {
    const userId = await upsertUser({
      name: profile.name, email: profile.email, phone: profile.phone,
      role: "sme_owner", sector: profile.sector, district: profile.district,
      ageMonths: profile.ageMonths,
    });
    smeIds.push(userId);

    await clearUserData(userId);

    const salesCount = await seedSales(userId, profile, stockItems, custIds);
    const expCount   = await seedExpenses(userId, profile);
    const poCount    = await seedPurchaseOrders(userId, suppIds);

    const scoreResult = await scoreAndSave(userId);
    smeResults[userId] = scoreResult;

    await createNotifications(userId, scoreResult || { score: 0, band:"red", recommendations:[] });

    const band = scoreResult?.band?.toUpperCase() || "N/A";
    const score = scoreResult?.score ?? "?";
    const emoji = band === "GREEN" ? "🟢" : band === "AMBER" ? "🟡" : "🔴";
    console.log(`  ${emoji} ${profile.name}`);
    console.log(`     Score: ${score}/100 (${band})  |  Sales: ${salesCount}  |  Expenses: ${expCount}  |  POs: ${poCount}`);

    // Advisory for red/amber
    if (scoreResult && (scoreResult.band === "red" || scoreResult.band === "amber")) {
      await seedAdvisorySession(userId, advisorId, scoreResult);
      console.log(`     📅 Advisory session seeded`);
    }
  }

  // 7. Accounts receivable
  const arCount = await seedAccountsReceivable(custIds);
  console.log(`\n✓ Accounts receivable: ${arCount} records`);

  // 8. Lender portfolio
  const refCount = await seedLenderPortfolio(lenderIds, smeIds, smeResults);
  console.log(`✓ Lender portfolio: ${refCount} referrals across ${lenderIds.length} lenders`);

  // 9. Summary
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  MOCK DATA SUMMARY");
  console.log("═══════════════════════════════════════════════════");
  for (const [uid, r] of Object.entries(smeResults)) {
    if (!r) continue;
    const e = r.band === "green" ? "🟢" : r.band === "amber" ? "🟡" : "🔴";
    console.log(`  ${e}  Score ${r.score}/100 (${r.band?.toUpperCase()})`);
  }

  console.log("\n  ACCOUNTS (all password: inzira2024)");
  console.log("  ─────────────────────────────────────");
  const allAccounts = [
    ...SME_PROFILES.map(p => ({ email: p.email, role: "sme_owner" })),
    ...LENDERS.map(l =>      ({ email: l.email, role: "lender" })),
    { email: ADVISOR.email,           role: "databridge_advisor" },
    { email: "admin@inzira.rw",       role: "pulse_admin" },
    { email: "manager@inzira.rw",     role: "manager" },
    { email: "accountant@inzira.rw",  role: "accountant" },
  ];
  for (const a of allAccounts) {
    console.log(`  ${a.email.padEnd(38)} ${a.role}`);
  }
  console.log("\n✅  Done!\n");

  // Only close the pool when run as a standalone script (not as a module)
  if (require.main === module) await pool.end();

  return { smeResults, allAccounts };
}

// Export for API endpoint usage
module.exports = { seed };

// Run when invoked directly
if (require.main === module) {
  seed().catch(err => {
    console.error("\n❌  Seed failed:", err.message);
    console.error(err.stack);
    process.exit(1);
  });
}
