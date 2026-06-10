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
  { id:1,  name:"Winter Puffer Jacket", category:"Jackets",     size:"M",        color:"Black",    quantity:24, cost_price_rwf:18000, sell_price_rwf:35000, low_stock_threshold:5,  barcode:"VL-00001", created_at:daysAgo(30) },
  { id:2,  name:"Slim Fit Chinos",      category:"Trousers",    size:"32",       color:"Khaki",    quantity:3,  cost_price_rwf:9500,  sell_price_rwf:18000, low_stock_threshold:5,  barcode:"VL-00002", created_at:daysAgo(28) },
  { id:3,  name:"Floral Summer Dress",  category:"Dresses",     size:"S",        color:"Red",      quantity:18, cost_price_rwf:12000, sell_price_rwf:25000, low_stock_threshold:5,  barcode:"VL-00003", created_at:daysAgo(25) },
  { id:4,  name:"Classic White Shirt",  category:"Shirts",      size:"L",        color:"White",    quantity:0,  cost_price_rwf:7000,  sell_price_rwf:14000, low_stock_threshold:5,  barcode:"VL-00004", created_at:daysAgo(22) },
  { id:5,  name:"Hoodie Fleece",        category:"Hoodies",     size:"XL",       color:"Navy",     quantity:11, cost_price_rwf:14000, sell_price_rwf:28000, low_stock_threshold:5,  barcode:"VL-00005", created_at:daysAgo(20) },
  { id:6,  name:"Leather Ankle Boots",  category:"Shoes",       size:"40",       color:"Brown",    quantity:8,  cost_price_rwf:22000, sell_price_rwf:45000, low_stock_threshold:3,  barcode:"VL-00006", created_at:daysAgo(18) },
  { id:7,  name:"Cargo Trousers",       category:"Trousers",    size:"34",       color:"Olive",    quantity:15, cost_price_rwf:11000, sell_price_rwf:22000, low_stock_threshold:5,  barcode:"VL-00007", created_at:daysAgo(16) },
  { id:8,  name:"Polo T-Shirt",         category:"Shirts",      size:"M",        color:"Sky Blue", quantity:4,  cost_price_rwf:6000,  sell_price_rwf:12000, low_stock_threshold:5,  barcode:"VL-00008", created_at:daysAgo(14) },
  { id:9,  name:"Wrap Midi Dress",      category:"Dresses",     size:"M",        color:"Purple",   quantity:9,  cost_price_rwf:13000, sell_price_rwf:27000, low_stock_threshold:3,  barcode:"VL-00009", created_at:daysAgo(12) },
  { id:10, name:"Denim Jacket",         category:"Jackets",     size:"L",        color:"Blue",     quantity:6,  cost_price_rwf:20000, sell_price_rwf:40000, low_stock_threshold:3,  barcode:"VL-00010", created_at:daysAgo(10) },
];

let FASHION_SALES = [
  { id:1,  invoice_number:"VL-2026-001", customer_name:"Celestine Nyirahabimana", worker_name:"Jean Pierre Habimana", items_count:5, payment_method:"mtn_momo", total_amount:145000, created_at:daysAgo(1), is_voided:false },
  { id:2,  invoice_number:"VL-2026-002", customer_name:"Walk-in",                  worker_name:"Marie Uwamahoro",       items_count:2, payment_method:"cash",     total_amount:52000,  created_at:daysAgo(1), is_voided:false },
  { id:3,  invoice_number:"VL-2026-003", customer_name:"Alliance Fashion Shop",    worker_name:"Alice Mukamana",        items_count:8, payment_method:"mtn_momo", total_amount:280000, created_at:daysAgo(2), is_voided:false },
  { id:4,  invoice_number:"VL-2026-004", customer_name:"Olivier Hakizimana",       worker_name:"Eric Ndayisabye",       items_count:3, payment_method:"cash",     total_amount:78000,  created_at:daysAgo(2), is_voided:false },
  { id:5,  invoice_number:"VL-2026-005", customer_name:"Walk-in",                  worker_name:"Alice Mukamana",        items_count:1, payment_method:"airtel",   total_amount:25000,  created_at:daysAgo(3), is_voided:false },
  { id:6,  invoice_number:"VL-2026-006", customer_name:"Style Hub Boutique",       worker_name:"Jean Pierre Habimana",  items_count:10,payment_method:"mtn_momo", total_amount:420000, created_at:daysAgo(3), is_voided:false },
  { id:7,  invoice_number:"VL-2026-007", customer_name:"Sandrine Uwera",           worker_name:"Marie Uwamahoro",       items_count:2, payment_method:"cash",     total_amount:46000,  created_at:daysAgo(4), is_voided:false },
  { id:8,  invoice_number:"VL-2026-008", customer_name:"Walk-in",                  worker_name:"Eric Ndayisabye",       items_count:1, payment_method:"cash",     total_amount:35000,  created_at:daysAgo(5), is_voided:true },
];

let FASHION_CUSTOMERS = [
  { id:1, name:"Celestine Nyirahabimana", phone:"0788123456", location:"Nyamirambo", type:"wholesaler", segment:"vip",     total_orders:48, total_spent:12400000, last_purchase:"2026-05-30" },
  { id:2, name:"Olivier Hakizimana",      phone:"0722334455", location:"Remera",     type:"retailer",   segment:"vip",     total_orders:31, total_spent:5800000,  last_purchase:"2026-05-28" },
  { id:3, name:"Sandrine Uwera",          phone:"0733556677", location:"Kacyiru",    type:"retailer",   segment:"regular", total_orders:12, total_spent:1900000,  last_purchase:"2026-05-20" },
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
  { id:2, invoice_number:"REC-5502", customer_name:"Gasana Jean",     worker_name:"Admin", items_count:1, payment_method:"momo", total_amount:1200000, created_at:daysAgo(5), is_voided:false },
];

let DEBTS = [
  { id:1, person_name:"Eric Ndayisabye", amount:45000, type:"receivable", due_date:daysAgo(-5), status:"pending", business_id:"b2" },
  { id:2, person_name:"Alliance Fashion", amount:280000, type:"receivable", due_date:daysAgo(-10), status:"pending", business_id:"b1" },
  { id:3, person_name:"Mutesi Solange", amount:450000, type:"receivable", due_date:daysAgo(2), status:"pending", business_id:"b3" },
  { id:4, person_name:"Textile Rwanda Ltd", amount:1200000, type:"payable", due_date:daysAgo(-15), status:"pending", business_id:"b1" },
  { id:5, person_name:"Kigali City Council", amount:85000, type:"payable", due_date:daysAgo(-2), status:"pending", business_id:"b2" },
];

// ─── SHARED DATA ─────────────────────────────────────────────────────────────

let WORKERS = [
  { id:1, name:"Jean Pierre Habimana", email:"jp@valano.rw", role:"manager", is_active:true, monthly_sales:42, monthly_revenue:4820000 },
  { id:2, name:"Marie Uwamahoro",      email:"marie@valano.rw", role:"worker",  is_active:true, monthly_sales:28, monthly_revenue:2310000 },
];

let AUDIT = [
  { id:1,  user_name:"Rukundo joseph", action:"LOGIN", entity_type:"user", details:"Logged in", created_at:daysAgo(0) },
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
    currentStock = INDUSTRY_RAW; 
    currentSales = INDUSTRY_SALES;
  } else if (businessType === "real_estate") {
    currentStock = []; 
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

  // ── SALES ───────────────────────────────────────────────────────────────
  if (r0 === "sales") {
    if (!r1 && method === "GET") return { data: currentSales, total: currentSales.length, stats: { count: currentSales.length, revenue: currentSales.reduce((s,x)=>s+x.total_amount,0) } };
    if (r1 && method === "GET") {
      const s = currentSales.find(x=>x.id===parseInt(r1)) || currentSales[0];
      return { ...s, items: [{ item_name: s.invoice_number, quantity: 1, unit_price: s.total_amount }] };
    }
  }

  // ── DEBTS ────────────────────────────────────────────────────────────────
  if (r0 === "debts") {
    const bizDebts = DEBTS.filter(d => d.business_id === businessId);
    if (!r1 && method === "GET") return bizDebts;
    if (r2 === "pay" && method === "PUT") {
      const idx = DEBTS.findIndex(d => d.id === parseInt(r1));
      if (idx !== -1) DEBTS[idx].status = "paid";
      return { ok: true };
    }
    if (method === "POST") {
      const debt = { id: nextId(DEBTS), ...body, business_id: businessId, status: "pending" };
      DEBTS.unshift(debt);
      return debt;
    }
  }

  // ── CUSTOMERS / SUPPLIERS ────────────────────────────────────────────────
  if (r0 === "customers") return { data: currentCustomers, total: currentCustomers.length, summary: [] };
  if (r0 === "suppliers") return businessType === 'industry' ? [ { id:1, name:"Textile Rwanda Ltd", country:"Rwanda" } ] : [ { id:1, name:"Guangzhou Fashion", country:"China" } ];
  
  if (r0 === "procurement") return { data: [], total: 0 };
  if (r0 === "invoices") return [ { id:1, invoice_number:"INV-001", customer_name:"Walk-in", issued_at:nowIso(), total_amount:70000, status:"paid" }];
  if (r0 === "workers") return WORKERS;
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
