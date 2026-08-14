const { Pool } = require("pg");
require("dotenv").config();

const connectionString = (
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  ""
).trim();

const isLocalDevMode = process.env.LOCAL_DEV_MODE === "true";

if (!connectionString && !isLocalDevMode) {
  const errMsg = "FATAL: Database connection string missing. Set DATABASE_URL or POSTGRES_URL in environment variables (or set LOCAL_DEV_MODE=true for explicit offline testing).";
  console.error(`[DB FATAL ERROR] ${errMsg}`);
  throw new Error(errMsg);
}

function createPool() {
  if (!connectionString) return null;
  const cleanConnStr = connectionString.replace(/[?&]sslmode=[^&]*/gi, "").replace(/\?$/, "");
  const isLocal = /localhost|127\.0\.0\.1/.test(cleanConnStr);

  try {
    const p = new Pool({
      connectionString: cleanConnStr,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: parseInt(process.env.PG_POOL_MAX || "2", 10),
      idleTimeoutMillis: 3000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: true,
    });

    p.on("error", (err) => {
      console.warn("[PG POOL IDLE CLIENT RECOVERED]", err.message);
    });

    return p;
  } catch (e) {
    console.error("[PG POOL INITIALIZATION FAILED]", e.message);
    return null;
  }
}

let pool = createPool();

const TRANSIENT_PATTERNS = [
  "connection terminated",
  "client was closed",
  "terminating connection",
  "econnreset",
  "etimedout",
  "epipe",
  "connection closed",
  "broken pipe",
  "timeout",
  "57p01",
  "57p02",
  "57p03",
  "08006",
  "08001",
  "08004",
];

function isTransient(err) {
  if (!err) return false;
  const msg = String(err.message || "").toLowerCase();
  const code = String(err.code || "").toLowerCase();
  return TRANSIENT_PATTERNS.some((p) => msg.includes(p) || code === p);
}

function formatDbError(err) {
  console.error("[PG QUERY ERROR]", err.message);
  const dbErr = new Error(`Database query failed: ${err.message}`);
  dbErr.status = 503;
  dbErr.code = err.code || "DB_UNAVAILABLE";
  dbErr.expose = true;
  return dbErr;
}

// In-Memory Database Fallback Store (Offline Local Dev)
const memoryStore = {
  users: [
    {
      id: 1,
      name: "Demo Business",
      email: "demo@inzira.rw",
      password_hash: "$2a$10$2JnEksJLQ2Uq5qKqhtPxsumIp4RA/7WuqQeItum/RFcwp4//7nN.S",
      role: "sme_owner",
      phone: "+250780000002",
      created_at: new Date().toISOString()
    },
    {
      id: 2,
      name: "Rukundo Joseph",
      email: "rukundojosephtuyishime@gmail.com",
      password_hash: "$2a$10$Jj8lgO6z7tgVGJDmT7F1gus5JVvg/NPg/qjpGOF3hDeE0GgMwcTKW",
      role: "pulse_admin",
      phone: "+250780000001",
      created_at: new Date().toISOString()
    },
    {
      id: 3,
      name: "Admin",
      email: "admin@inzira.rw",
      password_hash: "$2a$10$2JnEksJLQ2Uq5qKqhtPxsumIp4RA/7WuqQeItum/RFcwp4//7nN.S",
      role: "pulse_admin",
      phone: "+250780000004",
      created_at: new Date().toISOString()
    },
    {
      id: 4,
      name: "Demo Cashier",
      email: "cashier@inzira.rw",
      password_hash: "$2a$10$2JnEksJLQ2Uq5qKqhtPxsumIp4RA/7WuqQeItum/RFcwp4//7nN.S",
      role: "cashier",
      phone: "+250780000003",
      created_at: new Date().toISOString()
    }
  ],
  settings: [
    { id: 1, shop_name: "Inzira SME Store", shop_address: "Kigali, Rwanda", shop_phone: "+250788123456", language: "en" }
  ],
  stock_items: [
    { id: 1, name: "Sugar 1kg", name_rw: "Isukari 1kg", category: "Groceries", unit: "kg", quantity: 50, cost_price_rwf: 1200, sell_price_rwf: 1500, low_stock_threshold: 10, is_active: true },
    { id: 2, name: "Cooking Oil 1L", name_rw: "Amavuta 1L", category: "Groceries", unit: "litre", quantity: 30, cost_price_rwf: 2200, sell_price_rwf: 2800, low_stock_threshold: 5, is_active: true },
    { id: 3, name: "Soap Bar", name_rw: "Isabuni", category: "Hygiene", unit: "pcs", quantity: 100, cost_price_rwf: 400, sell_price_rwf: 600, low_stock_threshold: 20, is_active: true },
    { id: 4, name: "Rice 1kg", name_rw: "Umuceli 1kg", category: "Groceries", unit: "kg", quantity: 80, cost_price_rwf: 900, sell_price_rwf: 1200, low_stock_threshold: 15, is_active: true }
  ],
  sales: [
    {
      id: 101,
      user_id: 1,
      customer_id: 1,
      cashier_name: "Demo Cashier",
      customer_name: "Walk-in Customer",
      invoice_number: "INV-2026-001",
      payment_method: "cash",
      total_amount: 4500,
      payment_status: "completed",
      items_count: 2,
      created_at: new Date().toISOString()
    },
    {
      id: 102,
      user_id: 1,
      customer_id: 1,
      cashier_name: "Demo Cashier",
      customer_name: "Kigali Retailer",
      invoice_number: "INV-2026-002",
      payment_method: "mtn_momo",
      total_amount: 12800,
      payment_status: "completed",
      items_count: 3,
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  ],
  expenses: [],
  suppliers: [
    { id: 1, name: "Inyange Industries", phone: "+250788200001", address: "Kigali", products_supplied: "Dairy" },
    { id: 2, name: "Sulfo Rwanda", phone: "+250788200002", address: "Kigali", products_supplied: "Hygiene" }
  ],
  customers: [
    { id: 1, name: "Walk-in Customer", phone: null, location: "Kigali", type: "retailer", segment: "new" }
  ]
};

async function executeQuery(text, params = []) {
  if (connectionString) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      let client = null;
      try {
        if (!pool) pool = createPool();
        if (!pool) throw new Error("Database pool initialization failed");
        
        client = await pool.connect();
        const res = await client.query(text, params);
        return res;
      } catch (err) {
        if (client) {
          try { client.release(true); } catch {}
          client = null;
        }

        if (isTransient(err) && attempt < 3) {
          console.warn(`[PG RETRY ${attempt}/3] Reconnecting after transient drop:`, err.message);
          try {
            if (pool) pool.end().catch(() => {});
          } catch {}
          pool = createPool();
          await new Promise((r) => setTimeout(r, 150 * attempt));
          continue;
        }

        throw formatDbError(err);
      } finally {
        if (client) {
          try { client.release(); } catch {}
        }
      }
    }
  }

  if (!isLocalDevMode) {
    console.error("[DB ERROR] Database pool uninitialized and LOCAL_DEV_MODE is false.");
    const err = new Error("Database unavailable. Please check database configuration.");
    err.status = 503;
    err.code = "DB_UNAVAILABLE";
    err.expose = true;
    throw err;
  }

  // Explicit LOCAL_DEV_MODE offline mock fallback
  const normalized = text.trim().toLowerCase();

  if (normalized.startsWith("begin") || normalized.startsWith("commit") || normalized.startsWith("rollback")) {
    return { rows: [], rowCount: 0 };
  }

  if (normalized.includes("select 1")) {
    return { rows: [{ "?column?": 1 }], rowCount: 1 };
  }

  // Handle Aggregate / Count / KPI Queries first
  if (normalized.includes("count(") || normalized.includes("sum(") || normalized.includes("avg(")) {
    const totalUsers = memoryStore.users.length;
    const totalSmes = memoryStore.users.filter(u => u.role === 'sme_owner').length || 1;
    return {
      rows: [{
        count: totalUsers,
        total_smes: totalSmes,
        new_this_month: totalSmes,
        consented: totalSmes,
        declined: 0,
        withdrawn: 0,
        inactive: 0,
        total_scored: totalSmes,
        green: totalSmes,
        amber: 0,
        red: 0,
        avg_score: 78,
        min_score: 65,
        max_score: 92,
        total_lenders: 1,
        total_referrals: 0,
        active_referrals: 0,
        sales_30d: memoryStore.sales.length,
        revenue_30d: 17300,
        total: totalUsers,
        portfolio_size: 1,
        avg_portfolio_score: 78,
        active_sellers: 1,
        have_expenses: 1,
        stock_items: memoryStore.stock_items.length,
        scored_businesses: totalSmes,
        scored_this_week: totalSmes
      }],
      rowCount: 1
    };
  }

  if (normalized.includes("from users")) {
    if (params.length > 0 && typeof params[0] === "string" && params[0].includes("@")) {
      const email = params[0].toLowerCase();
      const match = memoryStore.users.find((u) => u.email.toLowerCase() === email);
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }
    return { rows: memoryStore.users, rowCount: memoryStore.users.length };
  }

  if (normalized.includes("from settings")) {
    return { rows: memoryStore.settings, rowCount: memoryStore.settings.length };
  }

  if (normalized.includes("from stock_items")) {
    return { rows: memoryStore.stock_items, rowCount: memoryStore.stock_items.length };
  }

  if (normalized.includes("from suppliers")) {
    return { rows: memoryStore.suppliers, rowCount: memoryStore.suppliers.length };
  }

  if (normalized.includes("from expenses")) {
    return { rows: memoryStore.expenses, rowCount: memoryStore.expenses.length };
  }

  if (normalized.includes("from sales")) {
    return { rows: memoryStore.sales, rowCount: memoryStore.sales.length };
  }

  if (normalized.includes("from customers")) {
    return { rows: memoryStore.customers, rowCount: memoryStore.customers.length };
  }

  if (normalized.includes("insert into sales")) {
    const newSale = {
      id: memoryStore.sales.length + 1,
      user_id: params[0] || 1,
      customer_id: params[1] || 1,
      payment_method: params[2] || "cash",
      total_amount: params[3] || 0,
      is_offline: params[4] || false,
      payment_reference: params[5] || null,
      payment_status: params[6] || "completed",
      owner_id: params[7] || 1,
      created_at: new Date().toISOString()
    };
    memoryStore.sales.push(newSale);
    return { rows: [newSale], rowCount: 1 };
  }

  if (normalized.includes("insert into customers")) {
    const newCust = {
      id: memoryStore.customers.length + 1,
      name: params[0] || "Walk-in Customer",
      owner_id: params[1] || 1
    };
    memoryStore.customers.push(newCust);
    return { rows: [newCust], rowCount: 1 };
  }

  if (normalized.includes("insert into invoices")) {
    const inv = {
      id: memoryStore.sales.length + 100,
      sale_id: params[0],
      invoice_number: params[1],
      status: params[2] || "paid"
    };
    return { rows: [inv], rowCount: 1 };
  }

  if (normalized.includes("insert into sale_items") || normalized.includes("insert into accounts_receivable")) {
    return { rows: [{ id: 1 }], rowCount: 1 };
  }

  if (normalized.includes("count(")) {
    return { rows: [{ count: 0 }], rowCount: 1 };
  }

  return { rows: [], rowCount: 0 };
}

module.exports = {
  query: executeQuery,
  on: (event, handler) => {
    if (pool) pool.on(event, handler);
  }
};
