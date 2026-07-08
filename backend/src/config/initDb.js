const pool = require("./db");

// Full schema is embedded here so the database bootstraps automatically on
// first run in any environment (including serverless). Every statement is
// idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING), so repeated runs are safe.

const SCHEMA_SQL = `
BEGIN;

-- Core business entity (replaces separate users + branches model)
CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  email            VARCHAR(100) UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  role             VARCHAR(30) NOT NULL DEFAULT 'sme_owner',
  phone            VARCHAR(20),
  avatar_url       TEXT,
  is_active        BOOLEAN DEFAULT true,
  -- Inzira Insights fields
  consent_status   VARCHAR(20) DEFAULT 'pending',
  consent_date     TIMESTAMP,
  lender_id        INTEGER,
  referral_code    VARCHAR(20),
  language         VARCHAR(5) DEFAULT 'en',
  sector           VARCHAR(50),
  district         VARCHAR(50),
  currency         VARCHAR(10) DEFAULT 'RWF',
  otp_code         VARCHAR(10),
  otp_expires_at   TIMESTAMP,
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(100) NOT NULL,
  phone               VARCHAR(20),
  email               VARCHAR(100),
  address             TEXT,
  notes               TEXT,
  products_supplied   TEXT,
  payment_terms       TEXT,
  outstanding_balance BIGINT DEFAULT 0,
  created_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_items (
  id                   SERIAL PRIMARY KEY,
  name                 VARCHAR(100) NOT NULL,
  name_rw              VARCHAR(100),
  category             VARCHAR(50),
  unit                 VARCHAR(20) DEFAULT 'pcs',
  barcode              VARCHAR(100) UNIQUE,
  image_url            TEXT,
  quantity             INTEGER DEFAULT 0,
  cost_price_rwf       BIGINT DEFAULT 0,
  sell_price_rwf       BIGINT DEFAULT 0,
  low_stock_threshold  INTEGER DEFAULT 5,
  is_active            BOOLEAN DEFAULT true,
  created_at           TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  phone        VARCHAR(20),
  location     TEXT,
  type         VARCHAR(20) DEFAULT 'retailer'
                 CHECK (type IN ('wholesaler','retailer')),
  segment      VARCHAR(20) DEFAULT 'new'
                 CHECK (segment IN ('vip','regular','new','inactive')),
  credit_limit BIGINT DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_id       INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  payment_method    VARCHAR(20) CHECK (payment_method IN ('cash','mtn_momo','airtel','card','bank_transfer','credit','split')),
  total_amount      BIGINT NOT NULL,
  is_voided         BOOLEAN DEFAULT false,
  void_reason       TEXT,
  voided_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_offline        BOOLEAN DEFAULT false,
  synced_at         TIMESTAMP,
  payment_reference VARCHAR(100),
  payment_status    VARCHAR(20) DEFAULT 'completed',
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id            SERIAL PRIMARY KEY,
  sale_id       INTEGER REFERENCES sales(id) ON DELETE CASCADE,
  stock_item_id INTEGER REFERENCES stock_items(id) ON DELETE SET NULL,
  quantity      INTEGER NOT NULL,
  unit_price    BIGINT NOT NULL,
  subtotal      BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
  id             SERIAL PRIMARY KEY,
  sale_id        INTEGER REFERENCES sales(id) ON DELETE SET NULL,
  invoice_number VARCHAR(30) UNIQUE NOT NULL,
  status         VARCHAR(20) DEFAULT 'paid'
                   CHECK (status IN ('paid','pending','overdue','voided')),
  issued_at      TIMESTAMP DEFAULT NOW(),
  due_at         TIMESTAMP,
  paid_at        TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
  id           SERIAL PRIMARY KEY,
  category     VARCHAR(50) NOT NULL,
  amount       BIGINT NOT NULL,
  description  TEXT,
  receipt_url  TEXT,
  supplier_id  INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  recorded_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  expense_date DATE NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id           SERIAL PRIMARY KEY,
  supplier_id  INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  order_date   DATE NOT NULL,
  arrival_date DATE,
  status       VARCHAR(20) DEFAULT 'ordered'
                 CHECK (status IN ('ordered','in_transit','arrived','stocked')),
  notes        TEXT,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id            SERIAL PRIMARY KEY,
  order_id      INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
  stock_item_id INTEGER REFERENCES stock_items(id) ON DELETE SET NULL,
  item_name     VARCHAR(100) NOT NULL,
  quantity      INTEGER NOT NULL,
  unit_cost_rwf BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts_receivable (
  id          SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  sale_id     INTEGER REFERENCES sales(id) ON DELETE SET NULL,
  amount      BIGINT NOT NULL,
  amount_paid BIGINT DEFAULT 0,
  due_date    DATE,
  status      VARCHAR(20) DEFAULT 'pending'
                CHECK (status IN ('pending','partial','paid','overdue')),
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts_payable (
  id          SERIAL PRIMARY KEY,
  supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  order_id    INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
  amount      BIGINT NOT NULL,
  amount_paid BIGINT DEFAULT 0,
  due_date    DATE,
  status      VARCHAR(20) DEFAULT 'pending'
                CHECK (status IN ('pending','partial','paid','overdue')),
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id            SERIAL PRIMARY KEY,
  from_currency VARCHAR(10) NOT NULL,
  to_currency   VARCHAR(10) NOT NULL,
  rate          DECIMAL(10,4) NOT NULL,
  updated_at    TIMESTAMP DEFAULT NOW(),
  updated_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (from_currency, to_currency)
);

CREATE TABLE IF NOT EXISTS notifications (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(50) NOT NULL,
  title        VARCHAR(200) NOT NULL,
  message      TEXT,
  is_read      BOOLEAN DEFAULT false,
  sent_via_sms BOOLEAN DEFAULT false,
  sms_sent_at  TIMESTAMP,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(50) NOT NULL,
  table_name VARCHAR(50),
  record_id  INTEGER,
  old_value  JSONB,
  new_value  JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id                          SERIAL PRIMARY KEY,
  shop_name                   VARCHAR(100) DEFAULT 'My Business',
  shop_address                TEXT,
  shop_phone                  VARCHAR(20),
  logo_url                    TEXT,
  default_low_stock_threshold INTEGER DEFAULT 5,
  invoice_footer_text         TEXT DEFAULT 'Thank you for your business!',
  language                    VARCHAR(5) DEFAULT 'en',
  sector_default              VARCHAR(50),
  district_default            VARCHAR(50)
);

-- Health Score & Credit Scoring
CREATE TABLE IF NOT EXISTS health_score_log (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
  score           INTEGER NOT NULL,
  band            VARCHAR(10) NOT NULL CHECK (band IN ('red','amber','green')),
  factors         JSONB,
  recommendations JSONB,
  advisory_token  VARCHAR(64),
  model_version   VARCHAR(20),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_scores (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  score          INTEGER NOT NULL,
  band           VARCHAR(10) NOT NULL CHECK (band IN ('red','amber','green')),
  factors        JSONB,
  risk_flags     JSONB,
  advisory_token VARCHAR(64),
  model_version  VARCHAR(20),
  calculated_at  TIMESTAMP DEFAULT NOW()
);

-- Advisory
CREATE TABLE IF NOT EXISTS advisory_sessions (
  id            SERIAL PRIMARY KEY,
  business_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  advisor_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  scheduled_at  TIMESTAMP,
  status        VARCHAR(20) DEFAULT 'requested'
                  CHECK (status IN ('requested','scheduled','completed','cancelled')),
  notes         TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS advisory_outcomes (
  id           SERIAL PRIMARY KEY,
  session_id   INTEGER REFERENCES advisory_sessions(id) ON DELETE CASCADE,
  cause_code   VARCHAR(50),
  intervention TEXT,
  outcome      TEXT,
  recorded_at  TIMESTAMP DEFAULT NOW()
);

-- Lender / Institution (user-to-SME join table)
CREATE TABLE IF NOT EXISTS lender_clients (
  id              SERIAL PRIMARY KEY,
  lender_user_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
  sme_user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(lender_user_id, sme_user_id)
);

CREATE TABLE IF NOT EXISTS referrals (
  id              SERIAL PRIMARY KEY,
  lender_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sme_user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  referral_code   VARCHAR(20) UNIQUE NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending'
                    CHECK (status IN ('pending','active','closed','rejected')),
  notes           TEXT,
  updated_at      TIMESTAMP DEFAULT NOW(),
  created_at      TIMESTAMP DEFAULT NOW()
);

COMMIT;
`;

// Indexes run outside the transaction so one failure doesn't roll back everything
const INDEX_SQL = [
  "CREATE INDEX IF NOT EXISTS idx_sales_created   ON sales(created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_sales_user      ON sales(user_id)",
  "CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id)",
  "CREATE INDEX IF NOT EXISTS idx_stock_barcode   ON stock_items(barcode)",
  "CREATE INDEX IF NOT EXISTS idx_notif_user      ON notifications(user_id, is_read)",
  "CREATE INDEX IF NOT EXISTS idx_audit_created   ON audit_log(created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_health_user     ON health_score_log(user_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_credit_user     ON credit_scores(user_id, calculated_at DESC)",
  "CREATE INDEX IF NOT EXISTS idx_ar_customer     ON accounts_receivable(customer_id)",
  "CREATE INDEX IF NOT EXISTS idx_ar_status       ON accounts_receivable(status)",
];

// Migration SQL: safely evolves existing databases
// All ALTER statements use IF NOT EXISTS / IF EXISTS — safe to re-run
const MIGRATION_SQL = `
-- Users: drop old role constraint FIRST, then normalize, then re-add
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
UPDATE users SET role='viewer' WHERE role NOT IN ('pulse_admin','sme_owner','admin','manager','accountant','cashier','databridge_advisor','lender','viewer');
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('pulse_admin','sme_owner','admin','manager','accountant','cashier','databridge_advisor','lender','viewer'));

-- Users: add new columns and update role constraint
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS consent_date TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lender_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';
ALTER TABLE users ADD COLUMN IF NOT EXISTS sector VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS district VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'RWF';
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lender_sharing BOOLEAN DEFAULT false;

-- Suppliers: add Inzira fields (remove Chinese-specific via UI, keep columns for compat)
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS email VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS products_supplied TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS outstanding_balance BIGINT DEFAULT 0;

-- Stock items: add unit and Kinyarwanda name
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'pcs';
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS name_rw VARCHAR(100);

-- Sales: add offline support and payment reference
ALTER TABLE sales ADD COLUMN IF NOT EXISTS is_offline BOOLEAN DEFAULT false;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'completed';

-- Customers: add credit limit
ALTER TABLE customers ADD COLUMN IF NOT EXISTS credit_limit BIGINT DEFAULT 0;

-- Expenses: add receipt upload and supplier link
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier_id INTEGER;

-- Notifications: add SMS tracking
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sent_via_sms BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMP;

-- Settings: add language and location defaults
ALTER TABLE settings ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS sector_default VARCHAR(50);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS district_default VARCHAR(50);

-- Health score log: ensure core columns exist (handles old schema)
ALTER TABLE health_score_log ADD COLUMN IF NOT EXISTS user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE health_score_log ADD COLUMN IF NOT EXISTS score           INTEGER;
ALTER TABLE health_score_log ADD COLUMN IF NOT EXISTS band            VARCHAR(10);
ALTER TABLE health_score_log ADD COLUMN IF NOT EXISTS factors         JSONB;
ALTER TABLE health_score_log ADD COLUMN IF NOT EXISTS recommendations JSONB;
ALTER TABLE health_score_log ADD COLUMN IF NOT EXISTS advisory_token  VARCHAR(64);
ALTER TABLE health_score_log ADD COLUMN IF NOT EXISTS model_version   VARCHAR(20);
ALTER TABLE health_score_log ADD COLUMN IF NOT EXISTS created_at      TIMESTAMP DEFAULT NOW();

-- Credit scores: ensure user_id and advisory_token exist (handles old schema)
ALTER TABLE credit_scores ADD COLUMN IF NOT EXISTS user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE credit_scores ADD COLUMN IF NOT EXISTS advisory_token VARCHAR(64);
ALTER TABLE credit_scores ADD COLUMN IF NOT EXISTS model_version  VARCHAR(20);
ALTER TABLE credit_scores ADD COLUMN IF NOT EXISTS calculated_at  TIMESTAMP DEFAULT NOW();

-- Lender clients: convert to user-to-user join table
ALTER TABLE lender_clients ADD COLUMN IF NOT EXISTS lender_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE lender_clients ADD COLUMN IF NOT EXISTS sme_user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE lender_clients ADD COLUMN IF NOT EXISTS notes TEXT;

-- Referrals: convert to user-to-user references
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS lender_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS sme_user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
`;

const SEED_SQL = `
BEGIN;

INSERT INTO users (name, email, password_hash, role, phone) VALUES
  ('Admin',         'admin@inzira.rw',      '$2a$12$pqAP/gTVtss0cQuzuEMpdOTk5TRlOTLHgUR/pZ5QuXml07pFCXyza', 'pulse_admin', '+250780000001'),
  ('Demo Business', 'demo@inzira.rw',       '$2a$12$s1O42VRPCBl1KIvmeIxatu2nE8VW5Wrfy/eVjJZWzPXEMffaA8d0K', 'sme_owner',   '+250780000002'),
  ('Demo Cashier',  'cashier@inzira.rw',    '$2a$12$s1O42VRPCBl1KIvmeIxatu2nE8VW5Wrfy/eVjJZWzPXEMffaA8d0K', 'cashier',     '+250780000003')
ON CONFLICT (email) DO NOTHING;

INSERT INTO suppliers (name, phone, address, products_supplied) VALUES
  ('Inyange Industries',  '+250788200001', 'Kigali, Rwanda', 'Dairy products, water'),
  ('Sulfo Rwanda',        '+250788200002', 'Kigali, Rwanda', 'Cleaning products, soap'),
  ('Bralirwa',            '+250788200003', 'Gisenyi, Rwanda','Beverages, beer')
ON CONFLICT DO NOTHING;

INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES
  ('USD', 'RWF', 1350.00),
  ('EUR', 'RWF', 1460.00),
  ('KES', 'RWF', 10.40),
  ('UGX', 'RWF', 0.36)
ON CONFLICT (from_currency, to_currency) DO UPDATE SET rate = EXCLUDED.rate, updated_at = NOW();

INSERT INTO stock_items (name, name_rw, category, unit, quantity, cost_price_rwf, sell_price_rwf, low_stock_threshold) VALUES
  ('Sugar 1kg',       'Isukari 1kg',  'Groceries', 'kg',     50, 1200, 1500, 10),
  ('Cooking Oil 1L',  'Amavuta 1L',   'Groceries', 'litre',  30, 2200, 2800,  5),
  ('Soap Bar',        'Isabuni',      'Hygiene',   'pcs',   100,  400,  600, 20),
  ('Rice 1kg',        'Umuceli 1kg',  'Groceries', 'kg',     80,  900, 1200, 15)
ON CONFLICT DO NOTHING;

INSERT INTO customers (name, phone, location, type, segment) VALUES
  ('Walk-in Customer', NULL,            'Local',    'retailer',   'new'),
  ('Amani Shop',       '+250788111001', 'Musanze',  'wholesaler', 'regular'),
  ('Grace Store',      '+250788111002', 'Huye',     'wholesaler', 'regular')
ON CONFLICT DO NOTHING;

INSERT INTO settings (shop_name, shop_address, shop_phone, language)
SELECT 'My Business', 'Kigali, Rwanda', '+250788123456', 'en'
WHERE NOT EXISTS (SELECT 1 FROM settings);

COMMIT;
`;

const BOOTSTRAP_SQL = `
INSERT INTO users (name, email, password_hash, role, phone) VALUES
  ('Rukundo Joseph',    'rukundojosephtuyishime@gmail.com', '$2a$12$pqAP/gTVtss0cQuzuEMpdOTk5TRlOTLHgUR/pZ5QuXml07pFCXyza', 'pulse_admin', '+250780000001'),
  ('Admin',             'admin@inzira.rw',                 '$2a$12$pqAP/gTVtss0cQuzuEMpdOTk5TRlOTLHgUR/pZ5QuXml07pFCXyza', 'pulse_admin', '+250780000004'),
  ('Demo Business',     'demo@inzira.rw',                  '$2a$12$s1O42VRPCBl1KIvmeIxatu2nE8VW5Wrfy/eVjJZWzPXEMffaA8d0K', 'sme_owner',   '+250780000002'),
  ('Demo Cashier',      'cashier@inzira.rw',               '$2a$12$s1O42VRPCBl1KIvmeIxatu2nE8VW5Wrfy/eVjJZWzPXEMffaA8d0K', 'cashier',     '+250780000003')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
WHERE users.role NOT IN ('pulse_admin', 'sme_owner');
`;

let initPromise = null;

async function runInit() {
  await pool.query(SCHEMA_SQL);
  await pool.query(MIGRATION_SQL);
  await pool.query(BOOTSTRAP_SQL);

  // Run indexes individually — skip any that fail (column may not exist in old schema)
  for (const sql of INDEX_SQL) {
    try { await pool.query(sql); } catch (e) { /* skip silently */ }
  }

  // Safe unique indexes — run after migration ensures columns exist
  try { await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_scores_user ON credit_scores(user_id) WHERE user_id IS NOT NULL"); } catch (e) { /* skip */ }
  try { await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS uq_lender_clients ON lender_clients(lender_user_id, sme_user_id) WHERE lender_user_id IS NOT NULL AND sme_user_id IS NOT NULL"); } catch (e) { /* skip */ }

  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM stock_items");
  if (rows[0].count === 0) {
    await pool.query(SEED_SQL);
    console.log("[DB INIT] Schema created and seed data inserted.");
  } else {
    console.log("[DB INIT] Schema verified; existing data preserved.");
  }
}

function ensureDbReady() {
  if (!initPromise) {
    initPromise = runInit().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

module.exports = { ensureDbReady };
