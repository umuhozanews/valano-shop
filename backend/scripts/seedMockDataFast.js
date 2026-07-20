/**
 * Inzira Insights — Fast Bulk Seed
 * Same as seedMockData.js but uses batch inserts to run in < 15s
 * Suitable for calling from a Vercel serverless endpoint.
 */

const pool     = require("../src/config/db");
const crypto   = require("crypto");
const { calculateScore } = require("../src/utils/scoring");

const rnd  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr)      => arr[Math.floor(Math.random() * arr.length)];

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(rnd(7, 20), rnd(0, 59), 0, 0);
  return d.toISOString();
};
const dateOnly = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - Math.max(0, n));
  return d.toISOString().slice(0, 10);
};

// bcrypt(inzira2024, cost=10)
const HASH = "$2a$10$2JnEksJLQ2Uq5qKqhtPxsumIp4RA/7WuqQeItum/RFcwp4//7nN.S";

const SME_PROFILES = [
  { email:"amani.grocery@inzira.rw",   name:"Amani Grocery Store",     sector:"Retail Shop",        district:"Gasabo",    phone:"+250788201001", targetBand:"green", revPerDay:{old:[4000,8000],mid:[7000,12000],recent:[10000,18000]}, txPerDay:[3,6], skipDayChance:0.06, expenseRatio:0.38, digitalPct:0.40, ageMonths:8 },
  { email:"grace.restaurant@inzira.rw", name:"Chez Grace Restaurant",   sector:"Restaurant / Food",  district:"Kicukiro",  phone:"+250788201002", targetBand:"amber", revPerDay:{old:[8000,14000],mid:[7000,12000],recent:[6000,11000]}, txPerDay:[2,4], skipDayChance:0.12, expenseRatio:0.68, digitalPct:0.25, ageMonths:5 },
  { email:"pierre.hardware@inzira.rw",  name:"Pierre Hardware",          sector:"Hardware / Tools",   district:"Musanze",   phone:"+250788201003", targetBand:"amber", revPerDay:{old:[6000,12000],mid:[8000,15000],recent:[9000,16000]}, txPerDay:[1,3], skipDayChance:0.20, expenseRatio:0.45, digitalPct:0.35, ageMonths:14 },
  { email:"claudine.salon@inzira.rw",   name:"Claudine Beauty Salon",   sector:"Beauty / Salon",     district:"Nyarugenge",phone:"+250788201004", targetBand:"red",   revPerDay:{old:[2000,5000],mid:[2000,5000],recent:[1000,4000]},  txPerDay:[1,2], skipDayChance:0.40, expenseRatio:0.85, digitalPct:0.15, ageMonths:3 },
  { email:"nsanzimana.agri@inzira.rw",  name:"Nsanzimana Agribusiness", sector:"Agriculture",        district:"Huye",      phone:"+250788201005", targetBand:"amber", revPerDay:{old:[3000,7000],mid:[5000,9000],recent:[7000,12000]},  txPerDay:[2,5], skipDayChance:0.22, expenseRatio:0.50, digitalPct:0.30, ageMonths:11 },
];

const LENDERS = [
  { email:"equity.bank@inzira.rw",  name:"Equity Bank Rwanda",        phone:"+250788300001" },
  { email:"bk.group@inzira.rw",     name:"BK Group (Bank of Kigali)", phone:"+250788300002" },
];
const ADVISOR = { email:"advisor@inzira.rw", name:"DataBridge Advisor", phone:"+250788400001" };
const EXTRA_STAFF = [
  { email:"manager@inzira.rw",    name:"Shop Manager",        role:"manager" },
  { email:"accountant@inzira.rw", name:"Business Accountant", role:"accountant" },
];

// Helpers for bulk inserts ────────────────────────────────────────────────────
function buildInsert(table, cols, rows) {
  if (!rows.length) return null;
  const ph = rows.map((_, ri) =>
    "(" + cols.map((__, ci) => `$${ri * cols.length + ci + 1}`).join(",") + ")"
  ).join(",");
  return { text: `INSERT INTO ${table} (${cols.join(",")}) VALUES ${ph}`, values: rows.flat() };
}

async function bulkInsert(table, cols, rows, returning = "") {
  if (!rows.length) return [];
  const { text, values } = buildInsert(table, cols, rows);
  const { rows: result } = await pool.query(text + (returning ? ` RETURNING ${returning}` : ""), values);
  return result;
}

// Upsert a user and return their id
async function upsertUser({ name, email, phone, role, sector, district, ageMonths = 6, owner_id = null }) {
  const created_at = new Date(Date.now() - ageMonths * 30 * 24 * 60 * 60 * 1000).toISOString();
  const { rows: [u] } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, phone, sector, district, consent_status, created_at, owner_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'consented',$8,$9)
     ON CONFLICT (email) DO UPDATE SET
       name=$1, password_hash=$3, role=$4, phone=$5,
       sector=$6, district=$7, consent_status='consented', created_at=$8, owner_id=$9
     RETURNING id`,
    [name, email, HASH, role || "sme_owner", phone, sector || null, district || null, created_at, owner_id]
  );
  return u.id;
}

async function clearUserData(userId) {
  await pool.query("DELETE FROM sale_items WHERE sale_id IN (SELECT id FROM sales WHERE user_id=$1)", [userId]);
  await pool.query("DELETE FROM sales WHERE user_id=$1", [userId]);
  await pool.query("DELETE FROM expenses WHERE recorded_by=$1", [userId]);
  await pool.query("DELETE FROM purchase_orders WHERE created_by=$1", [userId]);
  await pool.query("DELETE FROM health_score_log WHERE user_id=$1", [userId]);
  await pool.query("DELETE FROM credit_scores WHERE user_id=$1", [userId]);
  await pool.query("DELETE FROM notifications WHERE user_id=$1", [userId]);
  await pool.query("DELETE FROM advisory_sessions WHERE business_id=$1", [userId]);
  await pool.query("DELETE FROM accounts_receivable WHERE owner_id=$1", [userId]).catch(() => {});
  await pool.query("DELETE FROM accounts_payable WHERE owner_id=$1", [userId]).catch(() => {});
}

// Build all sales rows in memory, then bulk-insert ────────────────────────────
async function seedSalesBulk(userId, profile, stockItems, customerIds) {
  const salesRows = [];   // [user_id, customer_id, payment_method, total_amount, is_voided, created_at]
  const itemsByIdx = [];  // parallel array of item arrays (to map to sale IDs after insert)

  const DAYS = 60; // 60 days of history for speed
  for (let dayOffset = DAYS; dayOffset >= 1; dayOffset--) {
    if (Math.random() < profile.skipDayChance) continue;

    const range = dayOffset > 40 ? profile.revPerDay.old
                : dayOffset > 20 ? profile.revPerDay.mid
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
      const target = rnd(...range);
      const scale  = total > 0 ? target / total : 1;
      total = Math.round(total * scale);
      items.forEach(it => { it.sub = Math.round(it.sub * scale); it.price = Math.round(it.price * scale); });

      const method = Math.random() < profile.digitalPct
        ? pick(["mtn_momo","airtel","card","bank_transfer"])
        : "cash";

      salesRows.push([userId, pick(customerIds), method, total, false, daysAgo(dayOffset - t * 0.005)]);
      itemsByIdx.push(items);
    }
  }

  if (!salesRows.length) return 0;

  // Bulk insert all sales, get IDs back
  const saleIds = await bulkInsert(
    "sales",
    ["user_id","customer_id","payment_method","total_amount","is_voided","created_at"],
    salesRows,
    "id"
  );

  // Build sale_items rows
  const itemRows = [];
  for (let i = 0; i < saleIds.length; i++) {
    const saleId = saleIds[i].id;
    for (const it of itemsByIdx[i]) {
      itemRows.push([saleId, it.stock_id, it.qty, it.price, it.sub]);
    }
  }

  // Batch insert in chunks of 500 rows to stay under pg param limit
  const CHUNK = 500;
  for (let s = 0; s < itemRows.length; s += CHUNK) {
    await bulkInsert(
      "sale_items",
      ["sale_id","stock_item_id","quantity","unit_price","subtotal"],
      itemRows.slice(s, s + CHUNK)
    );
  }

  return salesRows.length;
}

async function seedExpensesBulk(userId, profile) {
  const rows = [];
  const monthlySalary = rnd(40000, 80000);
  const monthlyRent   = rnd(30000, 90000);
  const monthlyUtil   = rnd(8000, 20000);

  for (let m = 2; m >= 0; m--) {
    for (const [cat, base] of [["Salaries",monthlySalary],["Rent",monthlyRent],["Utilities",monthlyUtil]]) {
      const d = m * 30 + rnd(1, 5);
      rows.push([cat, Math.max(1000, base + rnd(-5000, 5000)), `${cat} — month ${3-m}`, userId, dateOnly(d), daysAgo(d)]);
    }
    const varCount = rnd(4, 8);
    for (let v = 0; v < varCount; v++) {
      const d = m * 30 + rnd(6, 28);
      rows.push([pick(["Transport","Supplies","Maintenance"]), rnd(2000, 15000), "Operational cost", userId, dateOnly(d), daysAgo(d)]);
    }
  }
  await bulkInsert("expenses", ["category","amount","description","recorded_by","expense_date","created_at"], rows);
  return rows.length;
}

async function seedPurchaseOrdersBulk(userId, supplierIds) {
  const count = rnd(2, 5);
  const rows  = [];
  for (let i = 0; i < count; i++) {
    const od = rnd(5, 60);
    const ad = od - rnd(3, 10);
    const status = ad < 0 ? "ordered" : ad < 2 ? "in_transit" : "arrived";
    rows.push([pick(supplierIds), dateOnly(od), dateOnly(Math.max(0, ad)), status, "Restocking order", userId, daysAgo(od)]);
  }
  await bulkInsert("purchase_orders", ["supplier_id","order_date","arrival_date","status","notes","created_by","created_at"], rows);
  return count;
}

async function scoreAndSave(userId) {
  const result = await calculateScore(userId);
  if (!result || result.score === null) return null;

  await pool.query(
    `INSERT INTO credit_scores (user_id, score, band, model_version, calculated_at, advisory_token)
     VALUES ($1,$2,$3,$4,NOW(),$5)
     ON CONFLICT (user_id) DO UPDATE SET score=$2, band=$3, model_version=$4, calculated_at=NOW(), advisory_token=$5`,
    [userId, result.score, result.band, result.model_version, result.advisoryToken]
  );

  // 3-month history
  const histRows = [];
  for (let i = 2; i >= 0; i--) {
    const hs = Math.max(0, Math.min(100, result.score + rnd(-8, 8) - i * 3));
    const hb = hs < 40 ? "red" : hs < 65 ? "amber" : "green";
    // Use interval via SQL — store params only, interval as text interpolation is safe (numeric)
    histRows.push({
      params: [userId, hs, hb, JSON.stringify(result.factors || {}),
               JSON.stringify(result.recommendations || []),
               crypto.randomBytes(16).toString("hex"), result.model_version],
      interval: `${i + 1} months`
    });
  }
  for (const h of histRows) {
    await pool.query(
      `INSERT INTO health_score_log (user_id,score,band,factors,recommendations,advisory_token,model_version,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()-INTERVAL '${h.interval}')`,
      h.params
    );
  }
  await pool.query(
    `INSERT INTO health_score_log (user_id,score,band,factors,recommendations,advisory_token,model_version)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [userId, result.score, result.band, JSON.stringify(result.factors || {}),
     JSON.stringify(result.recommendations || []), result.advisoryToken, result.model_version]
  );

  return result;
}

async function seedAdvisorySession(businessId, advisorId, scoreResult) {
  const status = pick(["completed","scheduled","requested"]);
  const { rows: [session] } = await pool.query(
    `INSERT INTO advisory_sessions (business_id, advisor_id, scheduled_at, status, notes, created_at)
     VALUES ($1,$2,NOW()-INTERVAL '${rnd(1,14)} days',$3,$4,NOW()-INTERVAL '${rnd(15,30)} days')
     RETURNING id`,
    [businessId, advisorId, status,
     `Score ${scoreResult?.score}/100 (${scoreResult?.band}) — ${scoreResult?.recommendations?.[0]?.en || "Review recommended"}`]
  );
  if (status === "completed") {
    await pool.query(
      `INSERT INTO advisory_outcomes (session_id, cause_code, intervention, outcome, recorded_at)
       VALUES ($1,$2,$3,$4,NOW()-INTERVAL '${rnd(1,7)} days')`,
      [session.id, pick(["HRD-02","HRD-03","HRD-07","low_margin","high_expense"]),
       "Reviewed expense structure and advised on daily sales tracking.",
       "SME committed to daily recording. Follow-up in 30 days."]
    );
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────
async function seedFast() {
  const log = [];
  const logLine = (s) => { log.push(s); console.log(s); };

  logLine("🌱  Fast seed starting...");

  // 1. Extra stock items (bulk)
  const EXTRA_STOCK = [
    { name:"Flour 1kg",       name_rw:"Ufu 1kg",         category:"Groceries", unit:"kg",    qty:60,  cost:600,  sell:800,  low:15 },
    { name:"Salt 500g",       name_rw:"Umunyo 500g",      category:"Groceries", unit:"pcs",   qty:80,  cost:200,  sell:300,  low:20 },
    { name:"Tea Leaves 100g", name_rw:"Icyayi 100g",      category:"Beverages", unit:"pcs",   qty:50,  cost:500,  sell:700,  low:10 },
    { name:"Matchbox",        name_rw:"Ibirimi",           category:"Hygiene",   unit:"pcs",   qty:200, cost:50,   sell:100,  low:50 },
    { name:"Milk 1L",         name_rw:"Amata 1L",          category:"Beverages", unit:"litre", qty:40,  cost:800,  sell:1000, low:10 },
    { name:"Tomato Paste",    name_rw:"Pasita y'inyanya",  category:"Groceries", unit:"pcs",   qty:70,  cost:400,  sell:600,  low:15 },
    { name:"Bleach 1L",       name_rw:"Amazi yo gukanika", category:"Hygiene",   unit:"litre", qty:30,  cost:700,  sell:1000, low:5  },
    { name:"Cement 50kg",     name_rw:"Sima 50kg",         category:"Hardware",  unit:"sack",  qty:20,  cost:12000,sell:14000,low:5  },
    { name:"Paint Bucket 4L", name_rw:"Penti 4L",          category:"Hardware",  unit:"pcs",   qty:15,  cost:8000, sell:10500,low:3  },
    { name:"Notebook A4",     name_rw:"Akayabo A4",        category:"Stationery",unit:"pcs",   qty:100, cost:600,  sell:900,  low:20 },
  ];
  for (const s of EXTRA_STOCK) {
    await pool.query(
      `INSERT INTO stock_items (name, name_rw, category, unit, quantity, cost_price_rwf, sell_price_rwf, low_stock_threshold, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true) ON CONFLICT DO NOTHING`,
      [s.name, s.name_rw, s.category, s.unit, s.qty, s.cost, s.sell, s.low]
    );
  }
  const { rows: stockItems } = await pool.query(
    "SELECT id, cost_price_rwf, sell_price_rwf FROM stock_items WHERE is_active=true"
  );
  logLine(`✓ Stock: ${stockItems.length} items`);

  // 2. Customers
  const EXTRA_CUSTOMERS = [
    { name:"Amina Uwase",    phone:"+250788501001", location:"Kigali",  type:"individual", segment:"regular" },
    { name:"Jean Habimana",  phone:"+250788501002", location:"Musanze", type:"individual", segment:"regular" },
    { name:"Koperative SACCO",phone:"+250788501003",location:"Huye",   type:"business",   segment:"wholesale" },
    { name:"Patrick Nkusi",  phone:"+250788501004", location:"Rubavu",  type:"individual", segment:"regular" },
    { name:"Agathe Mukamana",phone:"+250788501005", location:"Kigali",  type:"individual", segment:"regular" },
  ];
  for (const c of EXTRA_CUSTOMERS) {
    await pool.query(
      `INSERT INTO customers (name, phone, location, type, segment)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [c.name, c.phone, c.location, c.type, c.segment]
    );
  }
  const { rows: customers } = await pool.query("SELECT id FROM customers LIMIT 20");
  const custIds = customers.map(c => c.id);
  logLine(`✓ Customers: ${custIds.length}`);

  // 3. Suppliers
  const { rows: suppliers } = await pool.query("SELECT id FROM suppliers LIMIT 5");
  const suppIds = suppliers.length ? suppliers.map(s => s.id) : [null];

  // 4. Lenders
  const lenderIds = [];
  for (const l of LENDERS) {
    const id = await upsertUser({ ...l, role: "lender", ageMonths: 12 });
    lenderIds.push(id);
    logLine(`  ✓ Lender: ${l.name} (id=${id})`);
  }

  // 5. Advisor
  const advisorId = await upsertUser({ ...ADVISOR, role: "databridge_advisor", ageMonths: 10 });
  logLine(`  ✓ Advisor (id=${advisorId})`);

  // 6. SMEs — seed transactions in parallel-ish (sequential to avoid pool exhaustion)
  const smeIds     = [];
  const smeResults = {};
  logLine("\n📊  Seeding SME data...");

  // Seed amani first so we have her ID for staff linking
  let amaniId = null;

  for (const profile of SME_PROFILES) {
    const userId = await upsertUser({ ...profile, role: "sme_owner" });
    if (profile.email === "amani.grocery@inzira.rw") amaniId = userId;
    smeIds.push(userId);
    await clearUserData(userId);

    const salesCount = await seedSalesBulk(userId, profile, stockItems, custIds);
    const expCount   = await seedExpensesBulk(userId, profile);
    const poCount    = await seedPurchaseOrdersBulk(userId, suppIds.filter(Boolean));

    const scoreResult = await scoreAndSave(userId);
    smeResults[userId] = scoreResult;

    // Notifications (bulk)
    const nRows = [
      [userId, "health_score", `Health Score: ${scoreResult?.score ?? "?"}/${100}`,
       scoreResult?.recommendations?.[0]?.en || "Check insights.", Math.random() > 0.4,
       daysAgo(rnd(0, 3))],
      [userId, "low_stock", "3 products running low",
       "Some products are below reorder threshold.", false, daysAgo(rnd(1, 7))],
      [userId, "sales_alert", "Weekly Sales Summary",
       `You recorded ${rnd(15,45)} sales this week.`, true, daysAgo(rnd(3, 10))],
    ];
    if (scoreResult?.band === "red") {
      nRows.push([userId, "advisory", "Advisory Session Recommended",
        "Your score is in the red band. An advisor is available.", false, daysAgo(rnd(0, 5))]);
    }
    await bulkInsert("notifications", ["user_id","type","title","message","is_read","created_at"], nRows);

    if (scoreResult && (scoreResult.band === "red" || scoreResult.band === "amber")) {
      await seedAdvisorySession(userId, advisorId, scoreResult);
    }

    const band  = scoreResult?.band?.toUpperCase() || "N/A";
    const emoji = band === "GREEN" ? "🟢" : band === "AMBER" ? "🟡" : "🔴";
    logLine(`  ${emoji} ${profile.name}: ${scoreResult?.score ?? "?"}/${100} | Sales: ${salesCount} | Exp: ${expCount} | POs: ${poCount}`);
  }

  // 7b. Staff — linked to amani.grocery as their owner
  for (const s of EXTRA_STAFF) {
    const id = await upsertUser({ ...s, ageMonths: 8, owner_id: amaniId });
    logLine(`  ✓ Staff: ${s.name} → owner_id=${amaniId} (id=${id})`);
  }

  // 8. Accounts receivable — 2 records per SME owner so every dashboard shows AR data
  const arRows = [];
  for (const smeId of smeIds) {
    for (let i = 0; i < 2; i++) {
      const amount     = rnd(5000, 50000);
      const amountPaid = pick([0, Math.round(amount * 0.5), amount]);
      const daysOver   = rnd(-10, 40);
      const status     = amountPaid >= amount ? "paid"
                       : daysOver > 0         ? "overdue"
                       : amountPaid > 0       ? "partial"
                       :                        "pending";
      arRows.push([pick(custIds), amount, amountPaid, dateOnly(-daysOver), status, "Credit sale", smeId, daysAgo(rnd(5,45))]);
    }
  }
  await pool.query(
    `INSERT INTO accounts_receivable (customer_id,amount,amount_paid,due_date,status,notes,owner_id,created_at)
     VALUES ${arRows.map((_,i)=>`($${i*8+1},$${i*8+2},$${i*8+3},$${i*8+4},$${i*8+5},$${i*8+6},$${i*8+7},$${i*8+8})`).join(",")}
     ON CONFLICT DO NOTHING`,
    arRows.flat()
  );
  logLine(`✓ Accounts receivable: ${arRows.length} (${arRows.length / smeIds.length} per SME)`);

  // 8b. Accounts payable — 2 records per SME (money owed to suppliers)
  await pool.query(`ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS owner_id INT`).catch(() => {});
  const apRows = [];
  for (const smeId of smeIds) {
    for (let i = 0; i < 2; i++) {
      const amount   = rnd(10000, 80000);
      const daysOver = rnd(-15, 30);
      const status   = daysOver > 0 ? "overdue" : "pending";
      apRows.push([suppIds[0] || null, amount, dateOnly(-daysOver), "Supplier invoice", smeId]);
    }
  }
  if (apRows.length) {
    await pool.query(
      `INSERT INTO accounts_payable (supplier_id,amount,due_date,notes,owner_id)
       VALUES ${apRows.map((_,i)=>`($${i*5+1},$${i*5+2},$${i*5+3},$${i*5+4},$${i*5+5})`).join(",")}`,
      apRows.flat()
    );
  }
  logLine(`✓ Accounts payable: ${apRows.length} (${apRows.length / smeIds.length} per SME)`);

  // 9. Lender portfolio (bulk)
  let refCount = 0;
  for (const lenderId of lenderIds) {
    const portfolio = [...smeIds].sort(() => 0.5 - Math.random()).slice(0, rnd(2, 4));
    for (const smeId of portfolio) {
      await pool.query(
        `INSERT INTO lender_clients (lender_user_id, sme_user_id, notes, created_at)
         VALUES ($1,$2,'Referred for credit assessment',NOW()-INTERVAL '${rnd(10,60)} days')
         ON CONFLICT (lender_user_id, sme_user_id) DO NOTHING`,
        [lenderId, smeId]
      );
      const code = "REF-" + crypto.randomBytes(4).toString("hex").toUpperCase();
      await pool.query(
        `INSERT INTO referrals (lender_user_id, sme_user_id, referral_code, status, notes, created_at)
         VALUES ($1,$2,$3,$4,'Loan review',NOW()-INTERVAL '${rnd(10,60)} days')
         ON CONFLICT DO NOTHING`,
        [lenderId, smeId, code, pick(["pending","active","active","closed"])]
      ).catch(() => {});
      refCount++;
    }
  }
  logLine(`✓ Lender portfolio: ${refCount} referrals`);

  const allAccounts = [
    ...SME_PROFILES.map(p => ({ email: p.email, role: "sme_owner" })),
    ...LENDERS.map(l =>      ({ email: l.email, role: "lender" })),
    { email: ADVISOR.email,          role: "databridge_advisor" },
    { email: "admin@inzira.rw",      role: "pulse_admin" },
    { email: "manager@inzira.rw",    role: "manager" },
    { email: "accountant@inzira.rw", role: "accountant" },
  ];

  logLine("\n✅  Fast seed complete!");
  return { smeResults, allAccounts, log };
}

module.exports = { seedFast };

if (require.main === module) {
  seedFast()
    .then(() => pool.end())
    .catch(err => { console.error("❌", err.message); process.exit(1); });
}
