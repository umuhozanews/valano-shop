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

// ─── KNOTTY FASHION DATA (Shop) ──────────────────────────────────────────────

let FASHION_STOCK = [
  { id:1, name:"Winter Puffer Jacket", category:"Jackets", size:"M", color:"Black", quantity:24, cost_price_rwf:18000, sell_price_rwf:35000, low_stock_threshold:5, barcode:"VL-001" },
  { id:2, name:"Slim Fit Chinos", category:"Trousers", size:"32", color:"Khaki", quantity:3, cost_price_rwf:9500, sell_price_rwf:18000, low_stock_threshold:5, barcode:"VL-002" },
  { id:3, name:"Classic White Shirt", category:"Shirts", size:"L", color:"White", quantity:0, cost_price_rwf:7000, sell_price_rwf:14000, low_stock_threshold:5, barcode:"VL-003" },
];

let FASHION_SALES = [
  { id:1, invoice_number:"FSH-2026-001", customer_name:"Eric N.", worker_name:"Marie U.", items_count:2, payment_method:"cash", total_amount:70000, created_at:daysAgo(1), is_voided:false },
  { id:2, invoice_number:"FSH-2026-002", customer_name:"Walk-in", worker_name:"Marie U.", items_count:1, payment_method:"momo", total_amount:18000, created_at:daysAgo(2), is_voided:false },
];

let FASHION_CUSTOMERS = [
  { id:1, name:"Celestine Nyirahabimana", phone:"0788123456", location:"Nyamirambo", type:"retailer", segment:"vip", total_orders:12, total_spent:450000, last_purchase:daysAgo(2) },
];

// ─── KNOTTY INDUSTRY DATA (Manufacturing) ────────────────────────────────────

let INDUSTRY_RAW = [
  { id:1, name:"Premium Cotton Fabric", category:"Fabric", size:"100m Roll", color:"White", quantity:45, cost_price_rwf:150000, sell_price_rwf:0, low_stock_threshold:10, barcode:"MAT-001" },
  { id:2, name:"Polyester Yarn", category:"Thread", size:"5kg", color:"Blue", quantity:120, cost_price_rwf:12000, sell_price_rwf:0, low_stock_threshold:20, barcode:"MAT-002" },
  { id:3, name:"Metallic Zippers", category:"Zippers", size:"20cm", color:"Silver", quantity:1500, cost_price_rwf:450, sell_price_rwf:0, low_stock_threshold:100, barcode:"MAT-003" },
];

let INDUSTRY_FINISHED = [
  { id:1, name:"Wholesale T-Shirts (Bulk)", category:"T-Shirts", size:"Mixed", color:"Mixed", quantity:450, cost_price_rwf:3500, sell_price_rwf:6500, low_stock_threshold:50, barcode:"FG-101" },
  { id:2, name:"Uniform Sets (School X)", category:"Suits", size:"Standard", color:"Green", quantity:120, cost_price_rwf:8000, sell_price_rwf:15000, low_stock_threshold:20, barcode:"FG-102" },
];

let INDUSTRY_PRODUCTION = [
  { id:1, name:"Production Run #44", item:"Summer T-Shirt", quantity:500, status:"in_progress", progress:65, start_date:daysAgo(2) },
  { id:2, name:"Uniform Batch B1", item:"Denim Jeans", quantity:200, status:"completed", progress:100, start_date:daysAgo(10) },
];

let INDUSTRY_SALES = [
  { id:1, invoice_number:"ORD-10024", customer_name:"Alliance Fashion Ltd", worker_name:"Jean P.", items_count:500, payment_method:"bank", total_amount:4500000, created_at:daysAgo(1), is_voided:false },
  { id:2, invoice_number:"ORD-10025", customer_name:"Kigali Boutique Chain", worker_name:"Jean P.", items_count:200, payment_method:"bank", total_amount:1800000, created_at:daysAgo(3), is_voided:false },
];

// ─── KNOTTY ESTATES DATA (Real Estate) ──────────────────────────────────────

let ESTATE_PROPERTIES = [
  { id:1, name:"Knotty Heights A1", address:"Gacuriro, Kigali", units:4, type:"Apartment", status:"occupied" },
  { id:2, name:"Knotty Heights A2", address:"Gacuriro, Kigali", units:4, type:"Apartment", status:"occupied" },
  { id:3, name:"Commercial Plaza", address:"Kiyovu, Kigali", units:10, type:"Commercial", status:"partial" },
  { id:4, name:"Warehouse X", address:"Freezone, Kigali", units:1, type:"Industrial", status:"vacant" },
];

let ESTATE_TENANTS = [
  { id:1, name:"Iradukunda Eric", property:"Knotty Heights A1", unit:"Unit 101", phone:"0788111222", status:"active", paid:true },
  { id:2, name:"Mutesi Solange", property:"Knotty Heights A1", unit:"Unit 102", phone:"0788333444", status:"active", paid:false },
];

let ESTATE_MAINTENANCE = [
  { id:1, title:"Plumbing Leak", property:"Knotty Heights A1", unit:"Unit 101", priority:"high", status:"pending", date:daysAgo(1) },
  { id:2, title:"Electrical Repair", property:"Commercial Plaza", unit:"Suite 4", priority:"medium", status:"completed", date:daysAgo(5) },
];

let ESTATE_SALES = [
  { id:1, invoice_number:"REC-5501", customer_name:"Iradukunda Eric", worker_name:"Admin", items_count:1, payment_method:"bank", total_amount:450000, created_at:daysAgo(1), is_voided:false },
  { id:2, invoice_number:"REC-5502", customer_name:"Gasana Jean", worker_name:"Admin", items_count:1, payment_method:"momo", total_amount:1200000, created_at:daysAgo(5), is_voided:false },
];

// ─── SHARED DATA ─────────────────────────────────────────────────────────────

let WORKERS = [
  { id:1, name:"Jean Pierre Habimana", email:"jp@valano.rw", role:"manager", is_active:true, monthly_sales:42, monthly_revenue:4820000 },
  { id:2, name:"Marie Uwamahoro", email:"marie@valano.rw", role:"worker", is_active:true, monthly_sales:28, monthly_revenue:2310000 },
];

let AUDIT = [
  { id:1, user_name:"Rukundo joseph", action:"LOGIN", entity_type:"user", details:"Logged in", created_at:daysAgo(0) },
];

const enrichStock = (item) => ({
  ...item,
  status: computeStatus(item.quantity, item.low_stock_threshold || 5),
});

// ─── Route handler ────────────────────────────────────────────────────────────

function handle(method, url, body) {
  const path = url.replace(/^\/api/, "").split("?")[0];
  const parts = path.split("/").filter(Boolean);
  const [r0, r1, r2] = parts;

  // Detect active business
  const businessId = localStorage.getItem("active_business_id") || "b2"; // Default to Fashion
  const businessType = businessId === "b1" ? "industry" : businessId === "b3" ? "real_estate" : "shop";

  // Data mapping based on current screen AND business
  let currentStock = FASHION_STOCK;
  let currentSales = FASHION_SALES;
  let currentCustomers = FASHION_CUSTOMERS;

  if (businessType === "industry") {
    currentStock = INDUSTRY_RAW; // StockList usually shows Raw Materials in Industry
    currentSales = INDUSTRY_SALES;
  } else if (businessType === "real_estate") {
    currentStock = []; // Stock not used here
    currentSales = ESTATE_SALES;
    currentCustomers = ESTATE_TENANTS;
  }

  // ── AUTH ──────────────────────────────────────────────────────────────────
  if (path === "/auth/login") {
    const USERS = {
      "rukundojosephtuyishime@gmail.com": { id:1, name:"Rukundo joseph", email:"rukundojosephtuyishime@gmail.com", role:"admin" },
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
      todayRevenue: currentSales.filter(s=>!s.is_voided && s.created_at>=daysAgo(1)).reduce((s,x)=>s+x.total_amount,0),
      monthlyProfit: businessType === "real_estate" ? 4850000 : businessType === "industry" ? 8200000 : 1450000,
      activeWorkers: WORKERS.length,
    };
    if (r1 === "sales-trend") return Array(30).fill(0).map((_,i)=>({ date:daysAgo(29-i).slice(0,10), revenue:Math.floor(200000+Math.random()*400000) }));
    if (r1 === "stock-health") return { in_stock: 5, low_stock: 2, out_of_stock: 1 };
    if (r1 === "top-items") {
      if (businessType === 'shop') return FASHION_STOCK.map(i=>({ name:i.name, total_sold: 12, revenue: 350000 }));
      if (businessType === 'industry') return INDUSTRY_FINISHED.map(i=>({ name:i.name, total_sold: 500, revenue: 4500000 }));
      return ESTATE_PROPERTIES.slice(0,3).map(i=>({ name:i.name, total_sold: 'Occupied', revenue: 450000 }));
    }
    if (r1 === "worker-leaderboard") return WORKERS.map(w=>({ id:w.id, name:w.name, revenue:w.monthly_revenue, monthly_target:5000000 }));
    if (r1 === "low-stock-alerts") return [];
    if (r1 === "activity-feed") return AUDIT.slice(0,5);
  }

  // ── STOCK / MATERIALS / FINISHED GOODS ────────────────────────────────────
  if (r0 === "stock") {
    const data = r2 === 'finished' ? INDUSTRY_FINISHED : currentStock;
    if (!r1 && method === "GET") return { data: data.map(enrichStock), total: data.length };
    if (r1 && method === "GET") return enrichStock(data.find(x=>x.id===parseInt(r1)) || data[0]);
  }

  // ── PRODUCTION (Industry Only) ───────────────────────────────────────────
  if (r0 === "production") return INDUSTRY_PRODUCTION;

  // ── PROPERTIES / TENANTS / MAINTENANCE (Real Estate) ────────────────────
  if (r0 === "properties") return ESTATE_PROPERTIES;
  if (r0 === "tenants") return ESTATE_TENANTS;
  if (r0 === "maintenance") return ESTATE_MAINTENANCE;

  // ── SALES / RENT PAYMENTS / WHOLESALE ORDERS ────────────────────────────
  if (r0 === "sales") {
    if (!r1 && method === "GET") return { data: currentSales, total: currentSales.length, stats: { count: currentSales.length, revenue: currentSales.reduce((s,x)=>s+x.total_amount,0) } };
    if (r1 && method === "GET") {
      const s = currentSales.find(x=>x.id===parseInt(r1)) || currentSales[0];
      return { ...s, items: [{ item_name: s.invoice_number, quantity: 1, unit_price: s.total_amount }] };
    }
  }

  // ── MANAGEMENT ────────────────────────────────────────────────────────────
  if (r0 === "workers") return WORKERS;
  if (r0 === "customers") return { data: currentCustomers, total: currentCustomers.length, summary: [] };
  if (r0 === "suppliers") return businessType === 'industry' ? [ { id:1, name:"Textile Rwanda Ltd", country:"Rwanda" } ] : [];
  if (r0 === "expenses") return { data: [], total: 0, byCategory: [] };
  if (r0 === "finance" && r1 === "pnl") return { totals: { revenue: 5000000, cogs: 2000000, expenses: 1000000, grossProfit: 3000000, netProfit: 2000000 }, byMonth: [] };
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
