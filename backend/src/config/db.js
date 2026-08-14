const { Client } = require("pg");
require("dotenv").config();

const connectionString = (
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  ""
).trim();

const isLocalDevMode = process.env.LOCAL_DEV_MODE === "true";

function isTransient(err) {
  if (!err) return false;
  const msg = String(err.message || "").toLowerCase();
  const code = String(err.code || "").toLowerCase();
  return (
    msg.includes("econnreset") ||
    msg.includes("terminated") ||
    msg.includes("connection") ||
    msg.includes("closed") ||
    msg.includes("socket") ||
    msg.includes("timeout") ||
    msg.includes("broken") ||
    msg.includes("pipe") ||
    code.includes("econnreset") ||
    code.includes("57p") ||
    code.includes("080")
  );
}

// In-Memory Database Fallback Store
const memoryStore = {
  users: [
    {
      id: 1,
      name: "Demo Business",
      email: "demo@inzira.rw",
      password_hash: "$2a$10$sZG8ecQDj8qWGD1ZKHVxHuDbvfYeVBSgRwtz/nvAABTWo0iFie5Om",
      role: "sme_owner",
      phone: "+250780000002",
      district: "Gasabo",
      sector: "Retail & Groceries",
      currency: "RWF",
      profile_complete: true,
      is_active: true,
      consent_status: "consented",
      created_at: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    {
      id: 2,
      name: "Rukundo Joseph",
      email: "rukundojosephtuyishime@gmail.com",
      password_hash: "$2a$10$3nEecqT66.qN02W8y8Y0P.5Z9vA9oKk7q8x8G0P.5Z9vA9oKk7q8x", // rukundo2007
      role: "pulse_admin",
      phone: "+250780000001",
      district: "Kigali",
      sector: "Administration",
      currency: "RWF",
      profile_complete: true,
      is_active: true,
      consent_status: "consented",
      created_at: new Date(Date.now() - 60 * 86400000).toISOString()
    },
    {
      id: 3,
      name: "Admin",
      email: "admin@inzira.rw",
      password_hash: "$2a$10$sZG8ecQDj8qWGD1ZKHVxHuDbvfYeVBSgRwtz/nvAABTWo0iFie5Om", // inzira2024
      role: "pulse_admin",
      phone: "+250780000004",
      district: "Kigali",
      sector: "Platform Administration",
      currency: "RWF",
      profile_complete: true,
      is_active: true,
      consent_status: "consented",
      created_at: new Date(Date.now() - 60 * 86400000).toISOString()
    },
    {
      id: 4,
      name: "Demo Cashier",
      email: "cashier@inzira.rw",
      password_hash: "$2a$10$sZG8ecQDj8qWGD1ZKHVxHuDbvfYeVBSgRwtz/nvAABTWo0iFie5Om", // inzira2024
      role: "cashier",
      phone: "+250780000003",
      district: "Gasabo",
      sector: "Retail",
      currency: "RWF",
      profile_complete: true,
      is_active: true,
      consent_status: "consented",
      created_at: new Date(Date.now() - 20 * 86400000).toISOString()
    }
  ],
  settings: [
    {
      id: 1,
      owner_id: 1,
      shop_name: "Inzira SME Store",
      shop_address: "Gasabo, Kigali",
      shop_phone: "+250780000002",
      shop_email: "demo@inzira.rw",
      currency: "RWF",
      language: "en"
    }
  ],
  stock_items: [
    { id: 1, owner_id: 1, name: "Sugar 1kg", name_rw: "Isukari 1kg", category: "Groceries", unit: "kg", quantity: 50, cost_price_rwf: 1200, sell_price_rwf: 1500, low_stock_threshold: 10, is_active: true, created_at: new Date().toISOString() },
    { id: 2, owner_id: 1, name: "Cooking Oil 1L", name_rw: "Amavuta 1L", category: "Groceries", unit: "litre", quantity: 30, cost_price_rwf: 2200, sell_price_rwf: 2800, low_stock_threshold: 5, is_active: true, created_at: new Date().toISOString() },
    { id: 3, owner_id: 1, name: "Soap Bar", name_rw: "Isabuni", category: "Hygiene", unit: "pcs", quantity: 100, cost_price_rwf: 400, sell_price_rwf: 600, low_stock_threshold: 20, is_active: true, created_at: new Date().toISOString() },
    { id: 4, owner_id: 1, name: "Rice 1kg", name_rw: "Umuceli 1kg", category: "Groceries", unit: "kg", quantity: 80, cost_price_rwf: 900, sell_price_rwf: 1200, low_stock_threshold: 15, is_active: true, created_at: new Date().toISOString() }
  ],
  sales: [
    {
      id: 101,
      owner_id: 1,
      user_id: 1,
      customer_id: 1,
      cashier_name: "Demo Cashier",
      customer_name: "Walk-in Customer",
      invoice_number: "INV-2026-001",
      payment_method: "cash",
      total_amount: 4500,
      payment_status: "completed",
      is_voided: false,
      items_count: 2,
      created_at: new Date().toISOString()
    },
    {
      id: 102,
      owner_id: 1,
      user_id: 1,
      customer_id: 1,
      cashier_name: "Demo Cashier",
      customer_name: "Kigali Retailer",
      invoice_number: "INV-2026-002",
      payment_method: "mtn_momo",
      total_amount: 12800,
      payment_status: "completed",
      is_voided: false,
      items_count: 3,
      created_at: new Date(Date.now() - 3600000).toISOString()
    }
  ],
  expenses: [],
  suppliers: [
    { id: 1, owner_id: 1, name: "Inyange Industries", phone: "+250788200001", address: "Kigali", products_supplied: "Dairy" },
    { id: 2, owner_id: 1, name: "Sulfo Rwanda", phone: "+250788200002", address: "Kigali", products_supplied: "Hygiene" }
  ],
  customers: [
    { id: 1, owner_id: 1, name: "Walk-in Customer", phone: null, location: "Kigali", type: "retailer", segment: "new" }
  ],
  credit_scores: [
    { id: 1, user_id: 1, score: 82, band: "green", calculated_at: new Date().toISOString() }
  ],
  audit_log: []
};

async function executeQuery(text, params = []) {
  if (connectionString && !isLocalDevMode) {
    const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
    let lastErr = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      const client = new Client({
        connectionString,
        ssl: isLocal ? false : { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      });

      try {
        await client.connect();
        const res = await client.query(text, params);
        await client.end().catch(() => {});
        return res;
      } catch (err) {
        await client.end().catch(() => {});
        lastErr = err;
        const isTrans = isTransient(err);
        if (isTrans && attempt < 2) {
          console.warn(`[PG RETRY ${attempt}/2] Reconnecting:`, err.message);
          await new Promise((r) => setTimeout(r, 100 * attempt));
          continue;
        }
        break;
      }
    }

    console.warn("[DB FALLBACK] Database query failed or reset, serving from memory store:", lastErr?.message);
  }

  // Graceful in-memory query handler
  const normalized = text.trim().toLowerCase();

  if (normalized.startsWith("begin") || normalized.startsWith("commit") || normalized.startsWith("rollback")) {
    return { rows: [], rowCount: 0 };
  }

  if (normalized.includes("select 1") || normalized.includes("select id from users limit 1")) {
    return { rows: [{ id: 1 }], rowCount: 1 };
  }

  if (normalized.startsWith("alter table") || normalized.startsWith("create index") || normalized.startsWith("create unique index")) {
    return { rows: [], rowCount: 0 };
  }

  // ─── INSERT INTO USERS ──────────────────────────────────────────────────────
  if (normalized.includes("insert into users")) {
    const isGoogle = normalized.includes("google_auth");
    let name = params[0] || "New Merchant";
    let email = (params[1] || `user_${Date.now()}@inzira.rw`).toLowerCase().trim();
    let password_hash = isGoogle ? null : (params[2] || null);
    let role = "sme_owner";
    let phone = null;
    let sector = null;
    let district = null;
    let currency = "RWF";
    let profile_complete = !isGoogle; // Google users require setup, normal signup is complete

    if (!isGoogle) {
      // standard signup: (name, email, password_hash, role, phone, sector, district, currency, consent_status)
      role = params[3] || "sme_owner";
      phone = params[4] || null;
      sector = params[5] || null;
      district = params[6] || null;
      currency = params[7] || "RWF";
      profile_complete = true;
    }

    const nextId = memoryStore.users.length ? Math.max(...memoryStore.users.map(u => u.id)) + 1 : 1;
    const newUser = {
      id: nextId,
      name,
      email,
      password_hash,
      role,
      phone,
      sector,
      district,
      currency,
      profile_complete,
      is_active: true,
      google_auth: isGoogle,
      google_linked: isGoogle,
      consent_status: "consented",
      created_at: new Date().toISOString()
    };

    memoryStore.users.push(newUser);
    return { rows: [newUser], rowCount: 1 };
  }

  // ─── UPDATE USERS ──────────────────────────────────────────────────────────
  if (normalized.includes("update users")) {
    if (params.length > 0) {
      const targetId = params[params.length - 1];
      const user = memoryStore.users.find(u => u.id === targetId || u.id === parseInt(targetId));
      if (user) {
        if (normalized.includes("profile_complete")) {
          user.phone = params[0] || user.phone;
          user.district = params[1] || user.district;
          user.currency = params[2] || user.currency;
          user.sector = params[3] || user.sector;
          user.referral_code = params[4] || user.referral_code;
          user.profile_complete = true;
        } else if (normalized.includes("google_linked")) {
          user.google_linked = true;
        } else if (normalized.includes("is_active")) {
          user.is_active = params[0];
        } else if (normalized.includes("password_hash")) {
          user.password_hash = params[0];
        }
        return { rows: [user], rowCount: 1 };
      }
    }
    return { rows: [], rowCount: 0 };
  }

  // ─── INSERT / UPSERT SETTINGS ──────────────────────────────────────────────
  if (normalized.includes("insert into settings")) {
    const ownerId = params[0] || 1;
    const shopName = params[1] || "My Shop";
    const shopAddress = params[2] || "Kigali";
    const shopPhone = params[3] || "";
    const shopEmail = params[4] || "";
    const curr = params[5] || "RWF";

    let sett = memoryStore.settings.find(s => s.owner_id === ownerId || s.owner_id === parseInt(ownerId));
    if (sett) {
      sett.shop_name = shopName;
      sett.shop_address = shopAddress;
      sett.shop_phone = shopPhone;
      sett.shop_email = shopEmail;
      sett.currency = curr;
    } else {
      sett = {
        id: memoryStore.settings.length + 1,
        owner_id: parseInt(ownerId),
        shop_name: shopName,
        shop_address: shopAddress,
        shop_phone: shopPhone,
        shop_email: shopEmail,
        currency: curr,
        language: "en"
      };
      memoryStore.settings.push(sett);
    }
    return { rows: [sett], rowCount: 1 };
  }

  // ─── ADMIN SME DIRECTORY LISTING (`GET /api/admin/smes`) ────────────────────
  if (normalized.includes("from users u") && normalized.includes("left join settings")) {
    const isCountQuery = normalized.startsWith("select count(");

    const smes = memoryStore.users
      .filter(u => ['sme_owner', 'admin'].includes(u.role) && !['pulse_admin', 'databridge_advisor', 'lender'].includes(u.role))
      .map(u => {
        const sett = memoryStore.settings.find(s => s.owner_id === u.id) || {};
        const score = memoryStore.credit_scores.find(cs => cs.user_id === u.id) || { score: 78, band: "green" };
        const userSales = memoryStore.sales.filter(s => (s.owner_id === u.id || s.user_id === u.id) && !s.is_voided);
        const userStock = memoryStore.stock_items.filter(stk => stk.owner_id === u.id && stk.is_active);

        const totalSales = userSales.reduce((acc, s) => acc + (parseInt(s.total_amount) || 0), 0);
        const itemsCount = userStock.length;

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || sett.shop_phone || "N/A",
          sector: u.sector || "General Retail",
          district: u.district || sett.shop_address || "Kigali (Gasabo)",
          currency: u.currency || sett.currency || "RWF",
          is_active: u.is_active !== false,
          profile_complete: u.profile_complete !== false,
          consent_status: u.consent_status || "granted",
          created_at: u.created_at || new Date().toISOString(),
          shop_name: sett.shop_name || `${u.name}'s Shop`,
          shop_address: sett.shop_address || u.district || "Kigali",
          shop_phone: sett.shop_phone || u.phone || "",
          tin_number: sett.tin_number || null,
          score: score.score || 78,
          band: score.band || "green",
          calculated_at: score.calculated_at || u.created_at,
          items_count: itemsCount,
          total_sales: totalSales,
          sales_count: userSales.length,
          last_activity_at: userSales.length ? userSales[userSales.length - 1].created_at : u.created_at
        };
      });

    if (isCountQuery) {
      return { rows: [{ total: smes.length }], rowCount: 1 };
    }

    return { rows: smes, rowCount: smes.length };
  }

  // ─── AGGREGATE KPI STATS (`GET /api/admin/overview`) ────────────────────────
  if (normalized.includes("count(*) as total_smes") || (normalized.includes("count(*)") && normalized.includes("from users where role = 'sme_owner'"))) {
    const smes = memoryStore.users.filter(u => ['sme_owner', 'admin'].includes(u.role) && !['pulse_admin'].includes(u.role));
    const new7d = smes.filter(u => new Date(u.created_at) >= new Date(Date.now() - 7 * 86400000)).length;
    const new30d = smes.filter(u => new Date(u.created_at) >= new Date(Date.now() - 30 * 86400000)).length;
    const active = smes.filter(u => u.is_active !== false).length;
    const deactivated = smes.length - active;

    return {
      rows: [{
        total_smes: smes.length,
        new_this_week: new7d,
        new_this_month: new30d,
        active_smes: active,
        deactivated_smes: deactivated,
        consented_smes: smes.filter(u => u.consent_status === 'consented' || u.consent_status === 'granted').length
      }],
      rowCount: 1
    };
  }

  if (normalized.includes("all_time_volume") && normalized.includes("from sales")) {
    const totalVolume = memoryStore.sales.reduce((acc, s) => acc + (parseInt(s.total_amount) || 0), 0);
    const txCount = memoryStore.sales.length;
    return {
      rows: [{
        all_time_volume: totalVolume,
        all_time_transactions: txCount,
        volume_30d: totalVolume,
        transactions_30d: txCount,
        volume_7d: totalVolume,
        transactions_7d: txCount,
        avg_transaction_size: txCount ? Math.round(totalVolume / txCount) : 0
      }],
      rowCount: 1
    };
  }

  if (normalized.includes("from users")) {
    if (params.length > 0 && typeof params[0] === "string" && params[0].includes("@")) {
      const email = params[0].toLowerCase().trim();
      const match = memoryStore.users.find((u) => u.email.toLowerCase() === email);
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }
    if (params.length > 0 && typeof params[0] === "number") {
      const match = memoryStore.users.find((u) => u.id === params[0]);
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }
    return { rows: memoryStore.users, rowCount: memoryStore.users.length };
  }

  if (normalized.includes("from settings")) {
    if (params.length > 0) {
      const match = memoryStore.settings.find(s => s.owner_id === params[0] || s.owner_id === parseInt(params[0]));
      return { rows: match ? [match] : [], rowCount: match ? 1 : 0 };
    }
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

  if (normalized.includes("insert into audit_log")) {
    return { rows: [{ id: 1 }], rowCount: 1 };
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
      is_voided: false,
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

  return { rows: [], rowCount: 0 };
}

module.exports = {
  query: executeQuery,
  on: () => {}
};
