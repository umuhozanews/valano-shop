// In-memory stateful mock API — all mutations persist for the session
const delay = (ms = 70) => new Promise(r => setTimeout(r, ms));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const nextId = (arr) => Math.max(0, ...arr.map(x => x.id)) + 1;
const nowIso = () => new Date().toISOString();
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };

function computeStatus(quantity, threshold) {
  if (quantity === 0) return "out_of_stock";
  if (quantity <= threshold) return "low_stock";
  return "in_stock";
}

// ─── Specialized Data Stores ─────────────────────────────────────────────────

const FASHION_STOCK = [
  { id:1,  name:"Winter Puffer Jacket", category:"Jackets",     size:"M",        color:"Black",    quantity:24, cost_price_rwf:18000, sell_price_rwf:35000, low_stock_threshold:5,  barcode:"VL-00001", created_at:daysAgo(30) },
  { id:2,  name:"Slim Fit Chinos",      category:"Trousers",    size:"32",       color:"Khaki",    quantity:3,  cost_price_rwf:9500,  sell_price_rwf:18000, low_stock_threshold:5,  barcode:"VL-00002", created_at:daysAgo(28) },
  { id:3,  name:"Floral Summer Dress",  category:"Dresses",     size:"S",        color:"Red",      quantity:18, cost_price_rwf:12000, sell_price_rwf:25000, low_stock_threshold:5,  barcode:"VL-00003", created_at:daysAgo(25) },
];

const INDUSTRY_STOCK = [
  { id:1,  name:"Premium Cotton Fabric", category:"Fabric",      size:"100m Roll",color:"White",    quantity:45, cost_price_rwf:150000,sell_price_rwf:0,     low_stock_threshold:10, barcode:"IND-001", created_at:daysAgo(30) },
  { id:2,  name:"Polyester Yarn",       category:"Thread",      size:"5kg",      color:"Blue",     quantity:120,cost_price_rwf:12000, sell_price_rwf:0,     low_stock_threshold:20, barcode:"IND-002", created_at:daysAgo(28) },
  { id:3,  name:"Metallic Zippers",     category:"Zippers",     size:"20cm",     color:"Silver",   quantity:1500,cost_price_rwf:450,   sell_price_rwf:0,     low_stock_threshold:100,barcode:"IND-003", created_at:daysAgo(25) },
];

const ESTATE_STOCK = [
  { id:1,  name:"Knotty Heights — Unit 101", category:"Apartment",  size:"3BR",      color:"White",    quantity:1,  cost_price_rwf:0,      sell_price_rwf:450000, low_stock_threshold:0,  barcode:"RE-001", created_at:daysAgo(30) },
  { id:2,  name:"Commercial Suite B",       category:"Commercial", size:"45sqm",    color:"Grey",     quantity:1,  cost_price_rwf:0,      sell_price_rwf:1200000,low_stock_threshold:0,  barcode:"RE-002", created_at:daysAgo(28) },
  { id:3,  name:"Industrial Warehouse X",   category:"Industrial", size:"200sqm",   color:"Silver",   quantity:0,  cost_price_rwf:0,      sell_price_rwf:3500000,low_stock_threshold:0,  barcode:"RE-003", created_at:daysAgo(25) },
];

const FASHION_SALES = [
  { id:1,  invoice_number:"FSH-2026-001", customer_name:"Eric N.", worker_name:"Marie U.", items_count:2, payment_method:"cash", total_amount:70000, created_at:daysAgo(1), is_voided:false },
  { id:2,  invoice_number:"FSH-2026-002", customer_name:"Walk-in",  worker_name:"Marie U.", items_count:1, payment_method:"momo", total_amount:18000, created_at:daysAgo(2), is_voided:false },
];

const INDUSTRY_SALES = [
  { id:1,  invoice_number:"ORD-10024", customer_name:"Alliance Fashion", worker_name:"Jean P.", items_count:500, payment_method:"bank", total_amount:4500000, created_at:daysAgo(1), is_voided:false },
  { id:2,  invoice_number:"ORD-10025", customer_name:"Kigali Boutique",  worker_name:"Jean P.", items_count:200, payment_method:"bank", total_amount:1800000, created_at:daysAgo(3), is_voided:false },
];

const ESTATE_SALES = [
  { id:1,  invoice_number:"REC-5501", customer_name:"Iradukunda Eric", worker_name:"Admin", items_count:1, payment_method:"bank", total_amount:450000, created_at:daysAgo(1), is_voided:false },
  { id:2,  invoice_number:"REC-5502", customer_name:"Gasana Jean",     worker_name:"Admin", items_count:1, payment_method:"momo", total_amount:1200000, created_at:daysAgo(5), is_voided:false },
];

let WORKERS = [
  { id:1, name:"Jean Pierre Habimana", email:"jp@valano.rw",    role:"manager", is_active:true,  monthly_sales:42, monthly_revenue:4820000 },
  { id:2, name:"Marie Uwamahoro",      email:"marie@valano.rw", role:"worker",  is_active:true,  monthly_sales:28, monthly_revenue:2310000 },
];

let AUDIT = [
  { id:1,  user_name:"Rukundo joseph", action:"LOGIN", entity_type:"user", details:"Logged in", created_at:daysAgo(0) },
];

const FASHION_CUSTOMERS = [
  { id:1, name:"Celestine Nyirahabimana", phone:"0788123456", location:"Nyamirambo", type:"retailer", segment:"vip", total_orders:12, total_spent:450000, last_purchase:daysAgo(2) },
  { id:2, name:"Olivier Hakizimana", phone:"0722334455", location:"Remera", type:"retailer", segment:"regular", total_orders:5, total_spent:85000, last_purchase:daysAgo(5) },
];

const INDUSTRY_CUSTOMERS = [
  { id:1, name:"Alliance Fashion Ltd", phone:"0788990011", location:"Kigali SEZ", type:"wholesaler", segment:"vip", total_orders:45, total_spent:25000000, last_purchase:daysAgo(1) },
  { id:2, name:"Kigali Boutique Chain", phone:"0722001122", location:"Nyabugogo", type:"wholesaler", segment:"regular", total_orders:18, total_spent:8400000, last_purchase:daysAgo(10) },
];

const ESTATE_CUSTOMERS = [
  { id:1, name:"Iradukunda Eric", phone:"0788111222", location:"Gacuriro", type:"tenant", segment:"loyal", total_orders:24, total_spent:5400000, last_purchase:daysAgo(3) },
  { id:2, name:"Mutesi Solange", phone:"0788333444", location:"Gacuriro", type:"tenant", segment:"new", total_orders:2, total_spent:900000, last_purchase:daysAgo(30) },
];

const FASHION_EXPENSES = [
  { id:1, expense_date:daysAgo(1), category:"Marketing", description:"Facebook Ads", amount:45000 },
  { id:2, expense_date:daysAgo(5), category:"Transport", description:"Delivery Moto", amount:12000 },
];

const INDUSTRY_EXPENSES = [
  { id:1, expense_date:daysAgo(2), category:"Electricity", description:"Factory Power Bill", amount:850000 },
  { id:2, expense_date:daysAgo(7), category:"Maintenance", description:"Sewing Machine Repair", amount:120000 },
];

const ESTATE_EXPENSES = [
  { id:1, expense_date:daysAgo(3), category:"Maintenance", description:"Plumbing Repair Unit 101", amount:35000 },
  { id:2, expense_date:daysAgo(10), category:"Security", description:"Night Guard Salary", amount:150000 },
];

const enrichStock = (item) => ({
  ...item,
  status: computeStatus(item.quantity, item.low_stock_threshold),
});

// ─── Route handler ────────────────────────────────────────────────────────────

function handle(method, url, body) {
  const path = url.replace(/^\/api/, "").split("?")[0];
  const parts = path.split("/").filter(Boolean);
  const [r0, r1, r2] = parts;

  // Detect active business
  const businessId = localStorage.getItem("active_business_id") || "b2"; // Default to Fashion
  const businessType = businessId === "b1" ? "industry" : businessId === "b3" ? "real_estate" : "shop";

  // Data mapping
  const currentStock = businessType === "industry" ? INDUSTRY_STOCK : businessType === "real_estate" ? ESTATE_STOCK : FASHION_STOCK;
  const currentSales = businessType === "industry" ? INDUSTRY_SALES : businessType === "real_estate" ? ESTATE_SALES : FASHION_SALES;
  const currentCustomers = businessType === "industry" ? INDUSTRY_CUSTOMERS : businessType === "real_estate" ? ESTATE_CUSTOMERS : FASHION_CUSTOMERS;
  const currentExpenses = businessType === "industry" ? INDUSTRY_EXPENSES : businessType === "real_estate" ? ESTATE_EXPENSES : FASHION_EXPENSES;

  // ── AUTH ──────────────────────────────────────────────────────────────────
  if (path === "/auth/login") {
    const USERS = {
      "rukundojosephtuyishime@gmail.com":    { id:1, name:"Rukundo joseph",   email:"rukundojosephtuyishime@gmail.com",    role:"admin" },
      "manager@valano.rw":  { id:2, name:"Jean Pierre Habimana", email:"manager@valano.rw",  role:"manager" },
    };
    const email = body?.email?.trim().toLowerCase();
    const u = USERS[email];
    if (!u || body?.password !== "rukundo2007") throw { response:{ status:401, data:{ error:"Invalid credentials" } } };
    return { user:u, accessToken:"demo-token" };
  }

  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  if (r0 === "dashboard") {
    if (r1 === "stats") return {
      totalStockValue: currentStock.reduce((s,i)=>s+i.quantity*i.cost_price_rwf,0),
      todayRevenue:    currentSales.filter(s=>!s.is_voided && s.created_at>=daysAgo(1)).reduce((s,x)=>s+x.total_amount,0),
      monthlyProfit:   businessType === "real_estate" ? 4850000 : businessType === "industry" ? 8200000 : 1450000,
      activeWorkers:   WORKERS.length,
    };
    if (r1 === "sales-trend") return Array(30).fill(0).map((_,i)=>({ date:daysAgo(29-i).slice(0,10), revenue:Math.floor(200000+Math.random()*400000) }));
    if (r1 === "stock-health") return { in_stock: currentStock.length, low_stock: 0, out_of_stock: 0 };
    if (r1 === "top-items") return currentStock.map(i=>({ name:i.name, total_sold: Math.floor(Math.random()*20), revenue: Math.floor(Math.random()*1000000) }));
    if (r1 === "worker-leaderboard") return WORKERS.map(w=>({ id:w.id, name:w.name, revenue:w.monthly_revenue, monthly_target:5000000 }));
    if (r1 === "low-stock-alerts") return [];
    if (r1 === "activity-feed") return AUDIT.slice(0,5);
  }

  // ── STOCK ─────────────────────────────────────────────────────────────────
  if (r0 === "stock") {
    if (!r1 && method === "GET") return { data: currentStock.map(enrichStock), total: currentStock.length };
    if (r1 && method === "GET") return enrichStock(currentStock.find(x=>x.id===parseInt(r1)) || currentStock[0]);
  }

  // ── SALES ─────────────────────────────────────────────────────────────────
  if (r0 === "sales") {
    if (!r1 && method === "GET") return { data: currentSales, total: currentSales.length, stats: { count: currentSales.length, revenue: currentSales.reduce((s,x)=>s+x.total_amount,0) } };
    if (r1 && method === "GET") {
      const s = currentSales.find(x=>x.id===parseInt(r1)) || currentSales[0];
      return { ...s, items: [{ item_name: s.invoice_number, quantity: 1, unit_price: s.total_amount }] };
    }
  }

  // ── CUSTOMERS ─────────────────────────────────────────────────────────────
  if (r0 === "customers") {
    return { data: currentCustomers, total: currentCustomers.length, summary: [] };
  }

  // ── EXPENSES ──────────────────────────────────────────────────────────────
  if (r0 === "expenses") {
    return { data: currentExpenses, total: currentExpenses.length, byCategory: [] };
  }

  // ── WORKERS ───────────────────────────────────────────────────────────────
  if (r0 === "workers") return WORKERS;

  // ── FINANCE ───────────────────────────────────────────────────────────────
  if (r0 === "finance" && r1 === "pnl") {
    return { totals: { revenue: 5000000, cogs: 2000000, expenses: 1000000, grossProfit: 3000000, netProfit: 2000000 }, byMonth: [] };
  }

  if (r0 === "settings") return { branches: [], business_name:"KNOTTY SYSTEM", currency:"RWF" };

  return { ok:true };
}

// ─── API surface ──────────────────────────────────────────────────────────────

const api = {
  get: async (url, config) => {
    await delay();
    return { data: handle("GET", url, config?.params) };
  },
  post: async (url, body) => {
    await delay();
    return { data: handle("POST", url, body) };
  },
  put: async (url, body) => {
    await delay();
    return { data: handle("PUT", url, body) };
  },
  delete: async (url) => {
    await delay();
    return { data: handle("DELETE", url, null) };
  },
  interceptors: { request:{ use:()=>{} }, response:{ use:()=>{} } },
};

export default api;
