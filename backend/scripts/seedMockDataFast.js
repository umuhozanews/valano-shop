/**
 * Inzira Insights — Fast Bulk Seed v3
 * Every record carries owner_id so the tenant filter works for all SME accounts.
 * Stock items, customers, and suppliers are seeded per-SME.
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
  { email:"amani.grocery@inzira.rw",   name:"Amani Grocery Store",    sector:"Retail Shop",       district:"Gasabo",    phone:"+250788201001", revPerDay:{old:[4000,8000],mid:[7000,12000],recent:[10000,18000]}, txPerDay:[3,6], skipDayChance:0.06, digitalPct:0.40, ageMonths:8 },
  { email:"grace.restaurant@inzira.rw", name:"Chez Grace Restaurant",  sector:"Restaurant / Food", district:"Kicukiro",  phone:"+250788201002", revPerDay:{old:[8000,14000],mid:[7000,12000],recent:[6000,11000]}, txPerDay:[2,4], skipDayChance:0.12, digitalPct:0.25, ageMonths:5 },
  { email:"pierre.hardware@inzira.rw",  name:"Pierre Hardware",         sector:"Hardware / Tools",  district:"Musanze",   phone:"+250788201003", revPerDay:{old:[6000,12000],mid:[8000,15000],recent:[9000,16000]}, txPerDay:[1,3], skipDayChance:0.20, digitalPct:0.35, ageMonths:14 },
  { email:"claudine.salon@inzira.rw",   name:"Claudine Beauty Salon",  sector:"Beauty / Salon",    district:"Nyarugenge",phone:"+250788201004", revPerDay:{old:[2000,5000],mid:[2000,5000],recent:[1000,4000]},  txPerDay:[1,2], skipDayChance:0.40, digitalPct:0.15, ageMonths:3 },
  { email:"nsanzimana.agri@inzira.rw",  name:"Nsanzimana Agribusiness",sector:"Agriculture",       district:"Huye",      phone:"+250788201005", revPerDay:{old:[3000,7000],mid:[5000,9000],recent:[7000,12000]},  txPerDay:[2,5], skipDayChance:0.22, digitalPct:0.30, ageMonths:11 },
];

// Per-sector stock catalog
const STOCK_BY_SECTOR = {
  "Retail Shop": [
    { name:"Flour 1kg",        name_rw:"Ufu 1kg",            category:"Groceries",  unit:"kg",    qty:60,  cost:600,  sell:800,  low:15 },
    { name:"Sugar 1kg",        name_rw:"Isukari 1kg",         category:"Groceries",  unit:"kg",    qty:80,  cost:700,  sell:900,  low:20 },
    { name:"Rice 1kg",         name_rw:"Umuceri 1kg",         category:"Groceries",  unit:"kg",    qty:100, cost:900,  sell:1200, low:25 },
    { name:"Cooking Oil 1L",   name_rw:"Amavuta y'iteye 1L",  category:"Groceries",  unit:"litre", qty:50,  cost:1500, sell:2000, low:10 },
    { name:"Salt 500g",        name_rw:"Umunyo 500g",         category:"Groceries",  unit:"pcs",   qty:120, cost:200,  sell:300,  low:30 },
    { name:"Milk 1L",          name_rw:"Amata 1L",            category:"Beverages",  unit:"litre", qty:40,  cost:800,  sell:1100, low:10 },
    { name:"Tea Leaves 100g",  name_rw:"Icyayi 100g",         category:"Beverages",  unit:"pcs",   qty:60,  cost:500,  sell:700,  low:15 },
    { name:"Tomato Paste 400g",name_rw:"Pasita y'inyanya",    category:"Groceries",  unit:"pcs",   qty:70,  cost:400,  sell:600,  low:15 },
    { name:"Soap Bar",         name_rw:"Isabuni",             category:"Hygiene",    unit:"pcs",   qty:150, cost:300,  sell:500,  low:30 },
    { name:"Matchbox",         name_rw:"Ibirimi",             category:"Hygiene",    unit:"pcs",   qty:200, cost:50,   sell:100,  low:50 },
  ],
  "Restaurant / Food": [
    { name:"Cooking Gas 6kg",  name_rw:"Gaze yo gutekereza", category:"Fuel",       unit:"pcs",   qty:5,   cost:12000,sell:15000,low:2 },
    { name:"Tomatoes 1kg",     name_rw:"Inyanya 1kg",         category:"Produce",    unit:"kg",    qty:30,  cost:500,  sell:800,  low:5 },
    { name:"Onions 1kg",       name_rw:"Ibitunguru 1kg",      category:"Produce",    unit:"kg",    qty:25,  cost:400,  sell:600,  low:5 },
    { name:"Cooking Oil 2L",   name_rw:"Amavuta 2L",          category:"Groceries",  unit:"litre", qty:20,  cost:2800, sell:3500, low:5 },
    { name:"Rice 5kg",         name_rw:"Umuceri 5kg",         category:"Groceries",  unit:"kg",    qty:40,  cost:4000, sell:5500, low:8 },
    { name:"Beans 1kg",        name_rw:"Ibishyimbo 1kg",      category:"Groceries",  unit:"kg",    qty:50,  cost:1200, sell:1600, low:10 },
    { name:"Soft Drinks",      name_rw:"Inzoga mbaraga",      category:"Beverages",  unit:"pcs",   qty:60,  cost:400,  sell:600,  low:12 },
    { name:"Water 1.5L",       name_rw:"Amazi 1.5L",          category:"Beverages",  unit:"pcs",   qty:48,  cost:300,  sell:500,  low:12 },
    { name:"Salt 1kg",         name_rw:"Umunyo 1kg",          category:"Groceries",  unit:"kg",    qty:10,  cost:350,  sell:550,  low:2 },
    { name:"Charcoal 5kg",     name_rw:"Amakara 5kg",         category:"Fuel",       unit:"pcs",   qty:15,  cost:2500, sell:3500, low:3 },
  ],
  "Hardware / Tools": [
    { name:"Cement 50kg",      name_rw:"Sima 50kg",           category:"Building",   unit:"sack",  qty:30,  cost:12000,sell:14500,low:5 },
    { name:"Paint 4L",         name_rw:"Penti 4L",            category:"Paint",      unit:"pcs",   qty:20,  cost:8000, sell:11000,low:4 },
    { name:"Nails 1kg",        name_rw:"Misumari 1kg",        category:"Fittings",   unit:"kg",    qty:50,  cost:1200, sell:1800, low:10 },
    { name:"Wire Roll 10m",    name_rw:"Umuseke 10m",         category:"Electrical", unit:"pcs",   qty:15,  cost:3500, sell:5000, low:3 },
    { name:"PVC Pipe 3m",      name_rw:"Tuyau 3m",            category:"Plumbing",   unit:"pcs",   qty:25,  cost:4000, sell:5500, low:5 },
    { name:"Iron Sheet",       name_rw:"Fariti",              category:"Roofing",    unit:"pcs",   qty:40,  cost:5000, sell:6500, low:8 },
    { name:"Bolts & Nuts set", name_rw:"Ibishingiro",         category:"Fittings",   unit:"pcs",   qty:100, cost:500,  sell:800,  low:20 },
    { name:"Power Socket",     name_rw:"Guhera amashanyarazi",category:"Electrical", unit:"pcs",   qty:30,  cost:1500, sell:2200, low:6 },
    { name:"Paint Brush",      name_rw:"Buroshi ya penti",    category:"Paint",      unit:"pcs",   qty:40,  cost:800,  sell:1200, low:8 },
    { name:"Wheelbarrow",      name_rw:"Kareti y'amaboko",    category:"Tools",      unit:"pcs",   qty:5,   cost:18000,sell:25000,low:1 },
  ],
  "Beauty / Salon": [
    { name:"Shampoo 500ml",    name_rw:"Sipuni y'umusatsi",   category:"Hair Care",  unit:"pcs",   qty:30,  cost:2500, sell:3500, low:5 },
    { name:"Conditioner 250ml",name_rw:"Kondisioneri",        category:"Hair Care",  unit:"pcs",   qty:25,  cost:2000, sell:3000, low:5 },
    { name:"Hair Dye",         name_rw:"Rangi y'umusatsi",    category:"Hair Color", unit:"pcs",   qty:20,  cost:3000, sell:4500, low:4 },
    { name:"Nail Polish",      name_rw:"Venikeresi",          category:"Nails",      unit:"pcs",   qty:40,  cost:1000, sell:1500, low:8 },
    { name:"Hair Wax",         name_rw:"Waxe y'umusatsi",     category:"Styling",    unit:"pcs",   qty:20,  cost:2500, sell:3500, low:4 },
    { name:"Face Cream",       name_rw:"Kremu y'uburebure",   category:"Skin Care",  unit:"pcs",   qty:25,  cost:3000, sell:4500, low:5 },
    { name:"Towel",            name_rw:"Serviette",           category:"Tools",      unit:"pcs",   qty:15,  cost:3500, sell:5000, low:3 },
    { name:"Hair Extensions",  name_rw:"Umusatsi wo gushona", category:"Hair Care",  unit:"pcs",   qty:10,  cost:8000, sell:12000,low:2 },
    { name:"Scissors",         name_rw:"Inkero",              category:"Tools",      unit:"pcs",   qty:5,   cost:5000, sell:7500, low:1 },
    { name:"Relaxer Kit",      name_rw:"Rilax",               category:"Hair Care",  unit:"pcs",   qty:15,  cost:4000, sell:6000, low:3 },
  ],
  "Agriculture": [
    { name:"DAP Fertilizer 50kg", name_rw:"Feritire DAP 50kg",  category:"Fertilizer",unit:"sack",  qty:20,  cost:35000,sell:42000,low:4 },
    { name:"Urea Fertilizer 50kg",name_rw:"Feritire Urée 50kg", category:"Fertilizer",unit:"sack",  qty:15,  cost:28000,sell:34000,low:3 },
    { name:"Maize Seeds 1kg",  name_rw:"Imbuto z'ibigori 1kg", category:"Seeds",     unit:"kg",    qty:50,  cost:2000, sell:3000, low:10 },
    { name:"Bean Seeds 1kg",   name_rw:"Imbuto z'ibishyimbo",  category:"Seeds",     unit:"kg",    qty:40,  cost:2500, sell:3500, low:8 },
    { name:"Pesticide 1L",     name_rw:"Umuti w'inzoka",       category:"Chemicals", unit:"litre", qty:25,  cost:8000, sell:11000,low:5 },
    { name:"Hoe",              name_rw:"Isuka",                category:"Tools",     unit:"pcs",   qty:30,  cost:3500, sell:5000, low:6 },
    { name:"Machete",          name_rw:"Inkota",               category:"Tools",     unit:"pcs",   qty:20,  cost:3000, sell:4500, low:4 },
    { name:"Sacks (10pcs)",    name_rw:"Amasashi (10)",        category:"Packaging", unit:"pcs",   qty:100, cost:3000, sell:4500, low:20 },
    { name:"Irrigation Pipe 5m",name_rw:"Tuyau y'ubuhinzi 5m",category:"Irrigation",unit:"pcs",   qty:15,  cost:5000, sell:7000, low:3 },
    { name:"Sprayer 15L",      name_rw:"Pompe ifuka",          category:"Tools",     unit:"pcs",   qty:8,   cost:15000,sell:22000,low:2 },
  ],
};

// Per-sector customers
const CUSTOMERS_BY_SECTOR = {
  "Retail Shop":      [["Amina Uwase","+250788601001","Kigali","individual","regular"],["Jean Habimana","+250788601002","Musanze","individual","regular"],["Koperative SACCO","+250788601003","Huye","business","wholesale"],["Patrick Nkusi","+250788601004","Rubavu","individual","regular"],["Agathe Mukamana","+250788601005","Kigali","individual","vip"]],
  "Restaurant / Food":[["Pierre Nzeyimana","+250788602001","Kicukiro","individual","regular"],["Marie Ingabire","+250788602002","Nyarugenge","individual","regular"],["Hotel Mille Collines","+250788602003","Kigali","business","wholesale"],["David Bizimana","+250788602004","Kicukiro","individual","regular"],["Chantal Uwimana","+250788602005","Gasabo","individual","vip"]],
  "Hardware / Tools": [["Construco Ltd","+250788603001","Musanze","business","wholesale"],["Emmanuel Habimana","+250788603002","Rubavu","individual","regular"],["TechBuild Rwanda","+250788603003","Kigali","business","wholesale"],["Francois Nkurunziza","+250788603004","Musanze","individual","regular"],["Beatrice Uwase","+250788603005","Gisenyi","individual","regular"]],
  "Beauty / Salon":   [["Solange Mukamana","+250788604001","Nyarugenge","individual","regular"],["Grace Mutoni","+250788604002","Kigali","individual","vip"],["Lydia Kamana","+250788604003","Kicukiro","individual","regular"],["Espoir Nziza","+250788604004","Gasabo","individual","regular"],["Ange Iradukunda","+250788604005","Nyarugenge","individual","regular"]],
  "Agriculture":      [["Huye Farmers Coop","+250788605001","Huye","business","wholesale"],["Jerome Hakizimana","+250788605002","Huye","individual","regular"],["SACCO wa Abaturage","+250788605003","Butare","business","wholesale"],["Emile Nshimiyimana","+250788605004","Huye","individual","regular"],["Consolee Nzabirinda","+250788605005","Nyanza","individual","regular"]],
};

// Per-sector suppliers
const SUPPLIERS_BY_SECTOR = {
  "Retail Shop":      [["Rwanda Grocers Ltd","info@rwandagrocers.rw","+250788701001","Kigali","Wholesale groceries"],["Bralirwa Distribution","dist@bralirwa.rw","+250788701002","Kigali","Beverages & drinks"]],
  "Restaurant / Food":[["Fresh Produce RW","produce@fresh.rw","+250788702001","Kigali","Fresh vegetables & produce"],["Muhanga Rice Mills","mills@muhanga.rw","+250788702002","Muhanga","Grains & dry goods"]],
  "Hardware / Tools": [["CIMERWA Cement","sales@cimerwa.rw","+250788703001","Muganza","Cement & building materials"],["Rwandan Paint Co","info@rwpaint.rw","+250788703002","Kigali","Paint & coatings"]],
  "Beauty / Salon":   [["BeautyPro Rwanda","info@beautypro.rw","+250788704001","Kigali","Salon products wholesale"],["L'Oréal Distributor","loreal@dist.rw","+250788704002","Kigali","Hair & skin care"]],
  "Agriculture":      [["RAB Agro Inputs","inputs@rab.gov.rw","+250788705001","Kigali","Fertilizers & seeds"],["Agro Tools Rwanda","tools@agrotools.rw","+250788705002","Huye","Farm tools & equipment"]],
};

const LENDERS = [
  { email:"equity.bank@inzira.rw",  name:"Equity Bank Rwanda",        phone:"+250788300001" },
  { email:"bk.group@inzira.rw",     name:"BK Group (Bank of Kigali)", phone:"+250788300002" },
];
const ADVISOR = { email:"advisor@inzira.rw", name:"DataBridge Advisor", phone:"+250788400001" };
const EXTRA_STAFF = [
  { email:"manager@inzira.rw",    name:"Shop Manager",        role:"manager" },
  { email:"accountant@inzira.rw", name:"Business Accountant", role:"accountant" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  await pool.query("DELETE FROM stock_items WHERE owner_id=$1", [userId]).catch(() => {});
  await pool.query("DELETE FROM customers WHERE owner_id=$1", [userId]).catch(() => {});
  await pool.query("DELETE FROM suppliers WHERE owner_id=$1", [userId]).catch(() => {});
}

// Seed sector-specific stock items for one SME, return [{id, sell_price_rwf}]
async function seedSMEStock(userId, sector) {
  const items = STOCK_BY_SECTOR[sector] || STOCK_BY_SECTOR["Retail Shop"];
  const rows = items.map(s => [s.name, s.name_rw, s.category, s.unit, s.qty, s.cost, s.sell, s.low, userId]);
  const inserted = await bulkInsert(
    "stock_items",
    ["name","name_rw","category","unit","quantity","cost_price_rwf","sell_price_rwf","low_stock_threshold","owner_id"],
    rows,
    "id, sell_price_rwf"
  );
  return inserted;
}

// Seed 5 customers for one SME, return [id, ...]
async function seedSMECustomers(userId, sector) {
  const list = CUSTOMERS_BY_SECTOR[sector] || CUSTOMERS_BY_SECTOR["Retail Shop"];
  const rows = list.map(([name, phone, location, type, segment]) => [name, phone, location, type, segment, userId]);
  const inserted = await bulkInsert(
    "customers",
    ["name","phone","location","type","segment","owner_id"],
    rows,
    "id"
  );
  return inserted.map(r => r.id);
}

// Seed 2 suppliers for one SME, return [id, ...]
async function seedSMESuppliers(userId, sector) {
  const list = SUPPLIERS_BY_SECTOR[sector] || SUPPLIERS_BY_SECTOR["Retail Shop"];
  const rows = list.map(([name, email, phone, address, products]) => [name, email, phone, address, products, userId]);
  const inserted = await bulkInsert(
    "suppliers",
    ["name","email","phone","address","products_supplied","owner_id"],
    rows,
    "id"
  );
  return inserted.map(r => r.id);
}

async function seedSalesBulk(userId, profile, stockItems, customerIds) {
  const salesRows  = [];
  const itemsByIdx = [];

  const DAYS = 60;
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

      salesRows.push([userId, pick(customerIds), method, total, false, daysAgo(dayOffset - t * 0.005), userId]);
      itemsByIdx.push(items);
    }
  }

  if (!salesRows.length) return 0;

  const saleIds = await bulkInsert(
    "sales",
    ["user_id","customer_id","payment_method","total_amount","is_voided","created_at","owner_id"],
    salesRows,
    "id"
  );

  const itemRows = [];
  for (let i = 0; i < saleIds.length; i++) {
    const saleId = saleIds[i].id;
    for (const it of itemsByIdx[i]) {
      itemRows.push([saleId, it.stock_id, it.qty, it.price, it.sub]);
    }
  }

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
      rows.push([cat, Math.max(1000, base + rnd(-5000, 5000)), `${cat} — month ${3-m}`, userId, dateOnly(d), daysAgo(d), userId]);
    }
    const varCount = rnd(4, 8);
    for (let v = 0; v < varCount; v++) {
      const d = m * 30 + rnd(6, 28);
      rows.push([pick(["Transport","Supplies","Maintenance"]), rnd(2000, 15000), "Operational cost", userId, dateOnly(d), daysAgo(d), userId]);
    }
  }
  await bulkInsert("expenses", ["category","amount","description","recorded_by","expense_date","created_at","owner_id"], rows);
  return rows.length;
}

async function seedPurchaseOrdersBulk(userId, supplierIds) {
  if (!supplierIds.length) return 0;
  const count = rnd(2, 5);
  const rows  = [];
  for (let i = 0; i < count; i++) {
    const od = rnd(5, 60);
    const ad = od - rnd(3, 10);
    const status = ad < 0 ? "ordered" : ad < 2 ? "in_transit" : "arrived";
    rows.push([pick(supplierIds), dateOnly(od), dateOnly(Math.max(0, ad)), status, "Restocking order", userId, daysAgo(od), userId]);
  }
  await bulkInsert("purchase_orders", ["supplier_id","order_date","arrival_date","status","notes","created_by","created_at","owner_id"], rows);
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

  for (let i = 2; i >= 0; i--) {
    const hs = Math.max(0, Math.min(100, result.score + rnd(-8, 8) - i * 3));
    const hb = hs < 40 ? "red" : hs < 65 ? "amber" : "green";
    await pool.query(
      `INSERT INTO health_score_log (user_id,score,band,factors,recommendations,advisory_token,model_version,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW()-INTERVAL '${i + 1} months')`,
      [userId, hs, hb, JSON.stringify(result.factors || {}),
       JSON.stringify(result.recommendations || []),
       crypto.randomBytes(16).toString("hex"), result.model_version]
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
  await pool.query(
    `INSERT INTO advisor_clients (advisor_user_id, sme_user_id, notes)
     VALUES ($1, $2, 'Advisory portfolio client')
     ON CONFLICT (advisor_user_id, sme_user_id) DO NOTHING`,
    [advisorId, businessId]
  ).catch(() => {});

  const status = pick(["completed","scheduled","requested"]);
  const { rows: [session] } = await pool.query(
    `INSERT INTO advisory_sessions (business_id, advisor_id, scheduled_at, status, notes, action_plan, created_at)
     VALUES ($1,$2,NOW()-INTERVAL '${rnd(1,14)} days',$3,$4,$5,NOW()-INTERVAL '${rnd(15,30)} days')
     RETURNING id`,
    [businessId, advisorId, status,
     `Score ${scoreResult?.score}/100 (${scoreResult?.band}) — ${scoreResult?.recommendations?.[0]?.en || "Review recommended"}`,
     "Implement daily sales logging, review top 5 high-margin stock items, reduce credit extension to unverified buyers."]
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

  logLine("🌱  Fast seed v3 starting...");

  // Ensure owner_id columns exist on all tenant tables
  const tenantTables = ["stock_items","sales","expenses","customers","suppliers","purchase_orders","notifications","accounts_receivable","accounts_payable"];
  for (const t of tenantTables) {
    await pool.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS owner_id INT`).catch(() => {});
  }

  // Ensure invoices owner_id column exists
  await pool.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS owner_id INT`).catch(() => {});

  // 1. Lenders
  const lenderIds = [];
  for (const l of LENDERS) {
    const id = await upsertUser({ ...l, role: "lender", ageMonths: 12 });
    lenderIds.push(id);
    logLine(`  ✓ Lender: ${l.name} (id=${id})`);
  }

  // 2. Advisor
  const advisorId = await upsertUser({ ...ADVISOR, role: "databridge_advisor", ageMonths: 10 });
  logLine(`  ✓ Advisor (id=${advisorId})`);

  // 3. SMEs — per-SME stock, customers, suppliers, then transactions
  const smeIds     = [];
  const smeResults = {};
  let amaniId = null;
  logLine("\n📊  Seeding SME data...");

  for (const profile of SME_PROFILES) {
    const userId = await upsertUser({ ...profile, role: "sme_owner" });
    if (profile.email === "amani.grocery@inzira.rw") amaniId = userId;
    smeIds.push(userId);
    await clearUserData(userId);

    // Per-SME catalog
    const stockItems  = await seedSMEStock(userId, profile.sector);
    const customerIds = await seedSMECustomers(userId, profile.sector);
    const supplierIds = await seedSMESuppliers(userId, profile.sector);

    const salesCount = await seedSalesBulk(userId, profile, stockItems, customerIds);
    const expCount   = await seedExpensesBulk(userId, profile);
    const poCount    = await seedPurchaseOrdersBulk(userId, supplierIds);

    // AR — 3 credit sales per SME
    const arRows = [];
    for (let i = 0; i < 3; i++) {
      const amount     = rnd(5000, 60000);
      const amountPaid = pick([0, Math.round(amount * 0.5), amount]);
      const daysOver   = rnd(-10, 40);
      const status     = amountPaid >= amount ? "paid" : daysOver > 0 ? "overdue" : amountPaid > 0 ? "partial" : "pending";
      arRows.push([pick(customerIds), amount, amountPaid, dateOnly(-daysOver), status, "Credit sale", userId, daysAgo(rnd(5,45))]);
    }
    await bulkInsert("accounts_receivable", ["customer_id","amount","amount_paid","due_date","status","notes","owner_id","created_at"], arRows);

    // AP — 2 supplier invoices per SME
    await pool.query(`ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS owner_id INT`).catch(() => {});
    for (let i = 0; i < 2; i++) {
      const amount   = rnd(10000, 80000);
      const daysOver = rnd(-15, 30);
      await pool.query(
        `INSERT INTO accounts_payable (supplier_id, amount, due_date, notes, owner_id) VALUES ($1,$2,$3,$4,$5)`,
        [pick(supplierIds), amount, dateOnly(-daysOver), "Supplier invoice", userId]
      );
    }

    // Invoices — 2 per SME (linked to recent sales)
    const { rows: recentSales } = await pool.query(
      `SELECT id FROM sales WHERE user_id=$1 ORDER BY created_at DESC LIMIT 2`, [userId]
    );
    for (let i = 0; i < recentSales.length; i++) {
      const invNum = `INV${userId}-${i}-${Date.now() % 100000}`;
      await pool.query(
        `INSERT INTO invoices (sale_id, invoice_number, status, issued_at, owner_id)
         VALUES ($1,$2,'paid',NOW()-INTERVAL '${rnd(1,10)} days',$3) ON CONFLICT DO NOTHING`,
        [recentSales[i].id, invNum, userId]
      );
    }

    const scoreResult = await scoreAndSave(userId);
    smeResults[userId] = scoreResult;

    // Notifications
    const nRows = [
      [userId, "health_score", `Health Score: ${scoreResult?.score ?? "?"}/100`,
       scoreResult?.recommendations?.[0]?.en || "Check insights.", Math.random() > 0.4, daysAgo(rnd(0,3)), userId],
      [userId, "low_stock", "Stock running low",
       "Some products are below reorder threshold.", false, daysAgo(rnd(1,7)), userId],
      [userId, "sales_alert", "Weekly Sales Summary",
       `You recorded ${rnd(15,45)} sales this week.`, true, daysAgo(rnd(3,10)), userId],
    ];
    if (scoreResult?.band === "red") {
      nRows.push([userId, "advisory", "Advisory Session Recommended",
        "Your score is in the red band. An advisor is available.", false, daysAgo(rnd(0,5)), userId]);
    }
    await bulkInsert("notifications", ["user_id","type","title","message","is_read","created_at","owner_id"], nRows);

    if (scoreResult && (scoreResult.band === "red" || scoreResult.band === "amber")) {
      await seedAdvisorySession(userId, advisorId, scoreResult);
    }

    const band  = scoreResult?.band?.toUpperCase() || "N/A";
    const emoji = band === "GREEN" ? "🟢" : band === "AMBER" ? "🟡" : "🔴";
    logLine(`  ${emoji} ${profile.name}: ${scoreResult?.score ?? "?"}/100 | Sales: ${salesCount} | Stock: ${stockItems.length} | Customers: ${customerIds.length} | Suppliers: ${supplierIds.length}`);
  }

  // 4. Staff — linked to amani.grocery
  for (const s of EXTRA_STAFF) {
    const id = await upsertUser({ ...s, ageMonths: 8, owner_id: amaniId });
    logLine(`  ✓ Staff: ${s.name} → owner_id=${amaniId} (id=${id})`);
  }

  // 5. Lender portfolio
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

  logLine("\n✅  Fast seed v3 complete!");
  return { smeResults, allAccounts, log };
}

module.exports = { seedFast };

if (require.main === module) {
  seedFast()
    .then(() => pool.end())
    .catch(err => { console.error("❌", err.message); process.exit(1); });
}
