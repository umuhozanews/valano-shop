import axios from "axios";

// Create real axios client targeting the local or configured backend API
const realApi = axios.create({
  baseURL: "/api",
});

// Attach JWT token to headers if present in localStorage
realApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("valano_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Automatically handle token refresh on TOKEN_EXPIRED error
realApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === "TOKEN_EXPIRED" &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem("valano_refresh");
        if (refreshToken) {
          const { data } = await axios.post("/api/auth/refresh", { refreshToken });
          localStorage.setItem("valano_token", data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return realApi(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem("valano_token");
        localStorage.removeItem("valano_refresh");
        localStorage.removeItem("valano_user");
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

function isHtmlResponse(res) {
  return typeof res?.data === "string" && res.data.trim().startsWith("<!");
}

function isNetworkError(err) {
  if (err.response) {
    return isHtmlResponse(err.response);
  }
  return true;
}

// In-memory stateful mock API — all mutations persist for the session
const delay = (ms = 70) => new Promise(r => setTimeout(r, ms));

const nextId = (arr) => Math.max(0, ...arr.map(x => x.id)) + 1;
const nowIso = () => new Date().toISOString();
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); };

function computeStatus(quantity, threshold) {
  if (quantity === 0) return "out_of_stock";
  if (quantity <= threshold) return "low_stock";
  return "in_stock";
}

// ─── STATEFUL DATASETS ──────────────────────────────────────────────────────

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

let WORKERS = [
  { id:1, name:"Jean Pierre Habimana", email:"jp@valano.rw", role:"manager", is_active:true, branch_id: 1, phone: "+250788111000", monthly_sales:42, monthly_revenue:4820000, monthly_target: 5000000, commission_rate: 5.0 },
  { id:2, name:"Marie Uwamahoro",      email:"marie@valano.rw", role:"worker",  is_active:true, branch_id: 2, phone: "+250788222000", monthly_sales:28, monthly_revenue:2310000, monthly_target: 3000000, commission_rate: 4.0 },
];

let MOCK_BRANCHES = [
  { id: 1, name: "Kigali Main Branch", location: "Kiyovu, Kigali", phone: "+250788111111", worker_count: 1 },
  { id: 2, name: "Gisenyi Branch", location: "Rubavu, Gisenyi", phone: "+250788222222", worker_count: 1 }
];

let SUPPLIERS = [
  { id: 1, name: "Guangzhou Fashion Co.", wechat: "gzfashion2024", whatsapp: "+8613800000001", city: "Guangzhou", country: "China", specialty: "T-Shirts, Casual Wear" },
  { id: 2, name: "Yiwu Wholesale Hub", wechat: "yiwuhub_trade", whatsapp: "+8613800000002", city: "Yiwu", country: "China", specialty: "Accessories, Mixed Clothing" },
  { id: 3, name: "Textile Rwanda Ltd", wechat: "textilerw", whatsapp: "+250788000111", city: "Kigali", country: "Rwanda", specialty: "Fabric, Cotton" }
];

let PROCUREMENT = [
  { id: 1, supplier_name: "Guangzhou Fashion Co.", supplier_id: 1, order_date: daysAgo(5), status: "ordered", total_amount: 3500000, items_count: 3 },
  { id: 2, supplier_name: "Textile Rwanda Ltd", supplier_id: 3, order_date: daysAgo(2), status: "arrived", total_amount: 1500000, items_count: 1 }
];

let EXPENSES = [
  { id: 1, category: "Rent", amount: 450000, description: "Monthly shop rent", expense_date: daysAgo(10) },
  { id: 2, category: "Electricity", amount: 25000, description: "Power bill", expense_date: daysAgo(5) },
  { id: 3, category: "Transport", amount: 80000, description: "Cargo delivery cost", expense_date: daysAgo(3) }
];

let AUDIT = [
  { id:1,  user_name:"Rukundo joseph", action:"LOGIN", entity_type:"user", details:"Logged in", created_at:daysAgo(0) },
];

const enrichStock = (item) => ({
  ...item,
  status: computeStatus(item.quantity, item.low_stock_threshold || 5),
});

// ─── ROUTE HANDLER ENGINE ────────────────────────────────────────────────────

function handle(method, url, body) {
  const path = url.replace(/^\/api/, "").split("?")[0];
  const parts = path.split("/").filter(Boolean);
  const [r0, r1, r2] = parts;

  const businessId = localStorage.getItem("active_business_id") || "b2"; 
  const businessType = businessId === "b1" ? "industry" : businessId === "b3" ? "real_estate" : "shop";

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

  // Auth Login
  if (path === "/auth/login") {
    const USERS = {
      "rukundojosephtuyishime@gmail.com": { id:1, name:"Rukundo joseph", email:"rukundojosephtuyishime@gmail.com", role:"admin" },
    };
    const email = body?.email?.trim().toLowerCase();
    const u = USERS[email];
    if (!u || body?.password !== "rukundo2007") throw { response:{ status:401, data:{ error:"Invalid credentials" } } };
    return { user:u, accessToken:"demo-token" };
  }

  // Dashboard Stats
  if (r0 === "dashboard") {
    if (r1 === "stats") {
      const totalRev = currentSales.filter(s => !s.is_voided).reduce((sum, x) => sum + x.total_amount, 0);
      const totalExp = EXPENSES.reduce((sum, x) => sum + x.amount, 0);
      const totalVal = currentStock.reduce((sum, x) => sum + x.quantity * x.cost_price_rwf, 0);
      return {
        totalStockValue: totalVal,
        todayRevenue: currentSales.filter(s => !s.is_voided && s.created_at >= daysAgo(1)).reduce((sum, x) => sum + x.total_amount, 0),
        monthlyProfit: totalRev - (totalRev * 0.45) - totalExp,
        activeWorkers: WORKERS.filter(w => w.is_active).length,
      };
    }
    if (r1 === "sales-trend") return Array(30).fill(0).map((_,i)=>({ date:daysAgo(29-i).slice(0,10), revenue:Math.floor(200000+Math.random()*400000) }));
    if (r1 === "stock-health") return { in_stock: currentStock.filter(x => x.quantity > 5).length, low_stock: currentStock.filter(x => x.quantity <= 5 && x.quantity > 0).length, out_of_stock: currentStock.filter(x => x.quantity === 0).length };
    if (r1 === "top-items") {
      if (businessType === 'shop') return FASHION_STOCK.map(i=>({ name:i.name, total_sold: 12, revenue: 350000 }));
      if (businessType === 'industry') return INDUSTRY_FINISHED.map(i=>({ name:i.name, total_sold: 500, revenue: 4500000 }));
      return ESTATE_PROPERTIES.slice(0,3).map(i=>({ name:i.name, total_sold: 'Occupied', revenue: 450000 }));
    }
    if (r1 === "worker-leaderboard") return WORKERS.map(w=>({ id:w.id, name:w.name, revenue:w.monthly_revenue, monthly_target:5000000 }));
    if (r1 === "low-stock-alerts") return [];
    if (r1 === "activity-feed") return AUDIT.slice(0,5);
  }

  // ─── STOCK CRUD ───────────────────────────────────────────────────────────
  if (r0 === "stock") {
    let dataList = r2 === 'finished' ? INDUSTRY_FINISHED : currentStock;
    const isFinished = r2 === 'finished';

    if (method === "GET") {
      if (!r1) return { data: dataList.map(enrichStock), total: dataList.length };
      return enrichStock(dataList.find(x=>x.id===parseInt(r1)) || dataList[0]);
    }

    if (method === "DELETE") {
      const id = parseInt(r1);
      if (businessType === "industry") {
        if (isFinished) {
          INDUSTRY_FINISHED = INDUSTRY_FINISHED.filter(x => x.id !== id);
        } else {
          INDUSTRY_RAW = INDUSTRY_RAW.filter(x => x.id !== id);
        }
      } else {
        FASHION_STOCK = FASHION_STOCK.filter(x => x.id !== id);
      }
      return { message: "Item deleted" };
    }

    if (method === "POST") {
      const id = nextId(dataList);
      const newItem = {
        id,
        name: body.name,
        category: body.category,
        size: body.size || "",
        color: body.color || "",
        quantity: parseInt(body.quantity) || 0,
        cost_price_rwf: parseInt(body.cost_price_rwf) || 0,
        sell_price_rwf: parseInt(body.sell_price_rwf) || 0,
        low_stock_threshold: parseInt(body.low_stock_threshold) || 5,
        barcode: body.barcode || `VL-${String(id).padStart(5, '0')}`,
        created_at: nowIso()
      };
      if (businessType === "industry") {
        if (isFinished) {
          INDUSTRY_FINISHED.unshift(newItem);
        } else {
          INDUSTRY_RAW.unshift(newItem);
        }
      } else {
        FASHION_STOCK.unshift(newItem);
      }
      return newItem;
    }

    if (method === "PUT") {
      const id = parseInt(r1);
      let item = dataList.find(x => x.id === id);
      if (item) {
        Object.assign(item, {
          name: body.name,
          category: body.category,
          size: body.size || "",
          color: body.color || "",
          quantity: parseInt(body.quantity) || 0,
          cost_price_rwf: parseInt(body.cost_price_rwf) || 0,
          sell_price_rwf: parseInt(body.sell_price_rwf) || 0,
          low_stock_threshold: parseInt(body.low_stock_threshold) || 5,
        });
      }
      return item;
    }
  }

  // ─── CUSTOMERS CRUD ───────────────────────────────────────────────────────
  if (r0 === "customers") {
    if (method === "GET") {
      if (!r1) return { data: currentCustomers, total: currentCustomers.length, summary: [] };
      return currentCustomers.find(x => x.id === parseInt(r1)) || currentCustomers[0];
    }
    if (method === "POST") {
      const id = nextId(currentCustomers);
      const newCust = {
        id,
        name: body.name,
        phone: body.phone,
        location: body.location,
        type: body.type || "retailer",
        segment: body.segment || "new",
        total_orders: 0,
        total_spent: 0,
        last_purchase: "-"
      };
      if (businessType === "real_estate") {
        ESTATE_TENANTS.unshift(newCust);
      } else {
        FASHION_CUSTOMERS.unshift(newCust);
      }
      return newCust;
    }
    if (method === "PUT") {
      const id = parseInt(r1);
      const cust = currentCustomers.find(x => x.id === id);
      if (cust) {
        Object.assign(cust, body);
      }
      return cust;
    }
    if (method === "DELETE") {
      const id = parseInt(r1);
      if (businessType === "real_estate") {
        ESTATE_TENANTS = ESTATE_TENANTS.filter(x => x.id !== id);
      } else {
        FASHION_CUSTOMERS = FASHION_CUSTOMERS.filter(x => x.id !== id);
      }
      return { message: "Customer deleted" };
    }
  }

  // ─── SUPPLIERS CRUD ───────────────────────────────────────────────────────
  if (r0 === "suppliers") {
    if (method === "GET") {
      if (!r1) return SUPPLIERS;
      return SUPPLIERS.find(x => x.id === parseInt(r1)) || SUPPLIERS[0];
    }
    if (method === "POST") {
      const id = nextId(SUPPLIERS);
      const newSup = { id, ...body };
      SUPPLIERS.unshift(newSup);
      return newSup;
    }
    if (method === "PUT") {
      const id = parseInt(r1);
      const sup = SUPPLIERS.find(x => x.id === id);
      if (sup) Object.assign(sup, body);
      return sup;
    }
    if (method === "DELETE") {
      const id = parseInt(r1);
      SUPPLIERS = SUPPLIERS.filter(x => x.id !== id);
      return { message: "Supplier deleted" };
    }
  }

  // ─── PROCUREMENT CRUD ─────────────────────────────────────────────────────
  if (r0 === "procurement") {
    if (method === "GET") {
      if (!r1) return { data: PROCUREMENT, total: PROCUREMENT.length };
      return PROCUREMENT.find(x => x.id === parseInt(r1)) || PROCUREMENT[0];
    }
    if (method === "POST") {
      const id = nextId(PROCUREMENT);
      const newProc = {
        id,
        supplier_id: body.supplier_id,
        supplier_name: SUPPLIERS.find(x=>x.id===parseInt(body.supplier_id))?.name || "Unknown Supplier",
        order_date: body.order_date || daysAgo(0),
        status: body.status || "ordered",
        total_amount: parseInt(body.total_amount) || 0,
        items_count: body.items?.length || 1,
        items: body.items || []
      };
      PROCUREMENT.unshift(newProc);
      return newProc;
    }
    if (method === "PUT") {
      const id = parseInt(r1);
      const proc = PROCUREMENT.find(x => x.id === id);
      if (proc) Object.assign(proc, body);
      return proc;
    }
    if (method === "DELETE") {
      const id = parseInt(r1);
      PROCUREMENT = PROCUREMENT.filter(x => x.id !== id);
      return { message: "Order deleted" };
    }
  }

  // ─── EXPENSES CRUD ────────────────────────────────────────────────────────
  if (r0 === "expenses") {
    if (method === "GET") {
      if (!r1) return { data: EXPENSES, total: EXPENSES.length, byCategory: [] };
      return EXPENSES.find(x => x.id === parseInt(r1)) || EXPENSES[0];
    }
    if (method === "POST") {
      const id = nextId(EXPENSES);
      const newExp = {
        id,
        category: body.category,
        amount: parseInt(body.amount) || 0,
        description: body.description,
        expense_date: body.expense_date || daysAgo(0)
      };
      EXPENSES.unshift(newExp);
      return newExp;
    }
    if (method === "PUT") {
      const id = parseInt(r1);
      const exp = EXPENSES.find(x => x.id === id);
      if (exp) Object.assign(exp, body);
      return exp;
    }
    if (method === "DELETE") {
      const id = parseInt(r1);
      EXPENSES = EXPENSES.filter(x => x.id !== id);
      return { message: "Expense deleted" };
    }
  }

  // ─── DEBTS CRUD ───────────────────────────────────────────────────────────
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

  // PNL Finance Reports
  if (r0 === "finance" && r1 === "pnl") {
    const totalRev = currentSales.filter(s => !s.is_voided).reduce((sum, x) => sum + x.total_amount, 0);
    const totalCogs = currentSales.filter(s => !s.is_voided).reduce((sum, x) => sum + (x.total_amount * 0.45), 0);
    const totalExp = EXPENSES.reduce((sum, x) => sum + x.amount, 0);
    const gross = totalRev - totalCogs;
    const net = gross - totalExp;
    return {
      totals: {
        revenue: totalRev,
        cogs: totalCogs,
        expenses: totalExp,
        grossProfit: gross,
        netProfit: net
      },
      byMonth: []
    };
  }

  // Reports
  if (r0 === "reports" && r1 === "worker-performance") {
    return [
      { id: 1, name: "Jean Pierre Habimana", branch: "Kigali Main Branch", monthly_target: 5000000, commission_rate: 5.0, sales_count: 42, revenue: 4820000, achievement_pct: 96.4, commission_due: 241000 },
      { id: 2, name: "Marie Uwamahoro", branch: "Gisenyi Branch", monthly_target: 3000000, commission_rate: 4.0, sales_count: 28, revenue: 2310000, achievement_pct: 77.0, commission_due: 92400 },
      { id: 3, name: "Eric Ndayisabye", branch: "Kigali Main Branch", monthly_target: 4000000, commission_rate: 5.0, sales_count: 15, revenue: 1200000, achievement_pct: 30.0, commission_due: 60000 }
    ];
  }

  // Industry Specific
  if (r0 === "production") return INDUSTRY_PRODUCTION;

  // Real Estate Specific
  if (r0 === "properties") return ESTATE_PROPERTIES;
  if (r0 === "tenants") return ESTATE_TENANTS;
  if (r0 === "maintenance") return ESTATE_MAINTENANCE;

  // Sales
  if (r0 === "sales") {
    if (!r1 && method === "GET") return { data: currentSales, total: currentSales.length, stats: { count: currentSales.length, revenue: currentSales.reduce((s,x)=>s+x.total_amount,0) } };
    if (r1 && method === "GET") {
      const s = currentSales.find(x=>x.id===parseInt(r1)) || currentSales[0];
      return { ...s, items: [{ item_name: s.invoice_number, quantity: 1, unit_price: s.total_amount }] };
    }
  }

  if (r0 === "suppliers") return businessType === 'industry' ? SUPPLIERS.filter(x=>x.country==="Rwanda") : SUPPLIERS.filter(x=>x.country!=="Rwanda");
  if (r0 === "invoices") return [ { id:1, invoice_number:"INV-001", customer_name:"Walk-in", issued_at:nowIso(), total_amount:70000, status:"paid" }];
  if (r0 === "workers") {
    const bId = body?.branch_id;
    let list = WORKERS;
    if (bId) {
      list = list.filter(w => w.branch_id === parseInt(bId));
    }
    if (method === "GET") return list;
    if (method === "POST") {
      const w = { id: nextId(WORKERS), ...body, is_active: true };
      WORKERS.push(w);
      return w;
    }
    if (method === "PUT") {
      const id = parseInt(r1);
      const w = WORKERS.find(x => x.id === id);
      if (w) Object.assign(w, body);
      return w;
    }
  }

  if (r0 === "settings") {
    if (r1 === "branches") {
      if (method === "POST") {
        const b = { id: nextId(MOCK_BRANCHES), name: body.name, location: body.location, phone: body.phone, worker_count: 0 };
        MOCK_BRANCHES.push(b);
        return b;
      }
      if (method === "PUT") {
        const id = parseInt(r2);
        const b = MOCK_BRANCHES.find(x => x.id === id);
        if (b) Object.assign(b, body);
        return b;
      }
      if (r3 === "clone-stock" && method === "POST") {
        return { message: "Stock catalog cloned successfully" };
      }
    }
    return {
      settings: { shop_name: "VALANO SHOP", shop_address: "Kigali, Rwanda", shop_phone: "+250788123456", default_low_stock_threshold: 5, default_commission_rate: 5.0, invoice_footer_text: "Thank you for your business!" },
      branches: MOCK_BRANCHES,
      exchangeRates: []
    };
  }

  return { ok:true };
}

// ─── API INTERFACE EXPORT ────────────────────────────────────────────────────

const api = {
  get: async (url, config) => {
    try {
      const res = await realApi.get(url, config);
      if (isHtmlResponse(res)) {
        throw new Error("HTML response detected");
      }
      return res;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay();
        return { data: handle("GET", url, config?.params) };
      }
      throw err;
    }
  },
  post: async (url, body, config) => {
    try {
      const res = await realApi.post(url, body, config);
      if (isHtmlResponse(res)) {
        throw new Error("HTML response detected");
      }
      return res;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay();
        return { data: handle("POST", url, body) };
      }
      throw err;
    }
  },
  put: async (url, body, config) => {
    try {
      const res = await realApi.put(url, body, config);
      if (isHtmlResponse(res)) {
        throw new Error("HTML response detected");
      }
      return res;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay();
        return { data: handle("PUT", url, body) };
      }
      throw err;
    }
  },
  delete: async (url, config) => {
    try {
      const res = await realApi.delete(url, config);
      if (isHtmlResponse(res)) {
        throw new Error("HTML response detected");
      }
      return res;
    } catch (err) {
      if (isNetworkError(err)) {
        await delay();
        return { data: handle("DELETE", url, null) };
      }
      throw err;
    }
  },
  interceptors: {
    request: { use: (onFulfilled, onRejected) => realApi.interceptors.request.use(onFulfilled, onRejected) },
    response: { use: (onFulfilled, onRejected) => realApi.interceptors.response.use(onFulfilled, onRejected) },
  },
};

export default api;
