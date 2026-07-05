const pool = require("./db");

// Full schema + seed are embedded here (instead of read from .sql files) so the
// database can bootstrap itself automatically on first run in any environment —
// including serverless, where bundling/reading external files is unreliable.
// Every statement is idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING), so
// running this repeatedly is safe.

const SCHEMA_SQL = `
BEGIN;

CREATE TABLE IF NOT EXISTS branches (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  location   TEXT,
  phone      VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  email            VARCHAR(100) UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  role             VARCHAR(20) NOT NULL CHECK (role IN ('admin','manager','worker','accountant')),
  branch_id        INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  phone            VARCHAR(20),
  avatar_url       TEXT,
  monthly_target   BIGINT DEFAULT 0,
  commission_rate  DECIMAL(5,2) DEFAULT 0,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
  check_in  TIMESTAMP,
  check_out TIMESTAMP,
  date      DATE NOT NULL,
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  wechat     VARCHAR(100),
  whatsapp   VARCHAR(20),
  city       VARCHAR(100),
  country    VARCHAR(100) DEFAULT 'China',
  specialty  TEXT,
  notes      TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS procurement_orders (
  id             SERIAL PRIMARY KEY,
  supplier_id    INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  order_date     DATE NOT NULL,
  arrival_date   DATE,
  status         VARCHAR(30) DEFAULT 'ordered'
                   CHECK (status IN ('ordered','in_transit','at_customs','arrived','stocked')),
  currency       VARCHAR(10) DEFAULT 'CNY',
  exchange_rate  DECIMAL(10,4),
  shipping_cost  DECIMAL(15,2) DEFAULT 0,
  customs_cost   DECIMAL(15,2) DEFAULT 0,
  notes          TEXT,
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS procurement_items (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER REFERENCES procurement_orders(id) ON DELETE CASCADE,
  item_name  VARCHAR(100) NOT NULL,
  category   VARCHAR(50),
  size       VARCHAR(20),
  color      VARCHAR(50),
  quantity   INTEGER NOT NULL,
  unit_cost  DECIMAL(15,2) NOT NULL,
  currency   VARCHAR(10)
);

CREATE TABLE IF NOT EXISTS stock_items (
  id                   SERIAL PRIMARY KEY,
  name                 VARCHAR(100) NOT NULL,
  category             VARCHAR(50),
  size                 VARCHAR(20),
  color                VARCHAR(50),
  barcode              VARCHAR(100) UNIQUE,
  image_url            TEXT,
  branch_id            INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  quantity             INTEGER DEFAULT 0,
  cost_price_rwf       BIGINT DEFAULT 0,
  sell_price_rwf       BIGINT DEFAULT 0,
  low_stock_threshold  INTEGER DEFAULT 5,
  is_active            BOOLEAN DEFAULT true,
  created_at           TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_transfers (
  id               SERIAL PRIMARY KEY,
  item_id          INTEGER REFERENCES stock_items(id) ON DELETE RESTRICT,
  from_branch      INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  to_branch        INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  quantity         INTEGER NOT NULL,
  transferred_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  transferred_at   TIMESTAMP DEFAULT NOW(),
  notes            TEXT
);

CREATE TABLE IF NOT EXISTS customers (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  phone      VARCHAR(20),
  location   TEXT,
  type       VARCHAR(20) DEFAULT 'retailer'
               CHECK (type IN ('wholesaler','retailer')),
  segment    VARCHAR(20) DEFAULT 'new'
               CHECK (segment IN ('vip','regular','new')),
  notes      TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
  id             SERIAL PRIMARY KEY,
  worker_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  branch_id      INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  customer_id    INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  payment_method VARCHAR(20) CHECK (payment_method IN ('cash','mtn_momo','airtel')),
  total_amount   BIGINT NOT NULL,
  is_voided      BOOLEAN DEFAULT false,
  void_reason    TEXT,
  voided_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMP DEFAULT NOW()
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
  branch_id    INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  recorded_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  expense_date DATE NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW()
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
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL,
  title      VARCHAR(200) NOT NULL,
  message    TEXT,
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
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
  shop_name                   VARCHAR(100) DEFAULT 'VALANO SHOP',
  shop_address                TEXT,
  shop_phone                  VARCHAR(20),
  logo_url                    TEXT,
  default_low_stock_threshold INTEGER DEFAULT 5,
  default_commission_rate     DECIMAL(5,2) DEFAULT 5.0,
  invoice_footer_text         TEXT DEFAULT 'Thank you for your business!'
);

CREATE TABLE IF NOT EXISTS debts (
  id           SERIAL PRIMARY KEY,
  person_name  VARCHAR(100) NOT NULL,
  amount       BIGINT NOT NULL,
  type         VARCHAR(20) NOT NULL CHECK (type IN ('receivable','payable')),
  due_date     DATE,
  status       VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  notes        TEXT,
  branch_id    INTEGER REFERENCES branches(id) ON DELETE SET NULL,
  sale_id      INTEGER REFERENCES sales(id) ON DELETE SET NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_created   ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_branch    ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_worker    ON sales(worker_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_branch    ON stock_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_barcode   ON stock_items(barcode);
CREATE INDEX IF NOT EXISTS idx_notif_user      ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_created   ON audit_log(created_at DESC);

COMMIT;
`;

const SEED_SQL = `
BEGIN;

INSERT INTO branches (name, location, phone) VALUES
  ('Main Branch', 'Kigali - Nyabugogo Market', '+250788000001'),
  ('City Branch',  'Kigali - Kimironko Market', '+250788000002')
ON CONFLICT DO NOTHING;

INSERT INTO users (name, email, password_hash, role, branch_id, phone, monthly_target, commission_rate) VALUES
  ('Rukundo joseph', 'rukundojosephtuyishime@gmail.com', '$2a$12$pqAP/gTVtss0cQuzuEMpdOTk5TRlOTLHgUR/pZ5QuXml07pFCXyza', 'admin',      1, '+250780000001', 5000000, 0),
  ('Habimana Jean Pierre','manager@valano.rw',   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBaXMGJ0eDuBau', 'manager',    1, '+250780000002', 3000000, 2),
  ('Uwimana Angélique',   'accounts@valano.rw',  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBaXMGJ0eDuBau', 'accountant', 1, '+250780000003', 0, 0),
  ('Uwamahoro Marie',     'worker1@valano.rw',   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBaXMGJ0eDuBau', 'worker',     1, '+250780000004', 1500000, 3),
  ('Ndayisabye Eric',     'worker2@valano.rw',   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBaXMGJ0eDuBau', 'worker',     2, '+250780000005', 1500000, 3)
ON CONFLICT (email) DO NOTHING;

INSERT INTO suppliers (name, wechat, whatsapp, city, country, specialty) VALUES
  ('Guangzhou Fashion Co.',  'gzfashion2024',  '+8613800000001', 'Guangzhou', 'China', 'T-Shirts, Casual Wear'),
  ('Yiwu Wholesale Hub',     'yiwuhub_trade',  '+8613800000002', 'Yiwu',      'China', 'Accessories, Mixed Clothing'),
  ('Shenzhen Style Ltd.',    'szstylelimited', '+8613800000003', 'Shenzhen',  'China', 'Formal Wear, Suits')
ON CONFLICT DO NOTHING;

INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES
  ('CNY', 'RWF', 190.50),
  ('USD', 'RWF', 1350.00),
  ('EUR', 'RWF', 1460.00)
ON CONFLICT (from_currency, to_currency) DO UPDATE SET rate = EXCLUDED.rate, updated_at = NOW();

INSERT INTO stock_items (name, category, size, color, quantity, cost_price_rwf, sell_price_rwf, low_stock_threshold, branch_id) VALUES
  ('Men Plain T-Shirt',      'T-Shirts',  'M',   'White',  50, 3000, 6000, 10, 1),
  ('Men Plain T-Shirt',      'T-Shirts',  'L',   'Black',  40, 3000, 6000, 10, 1),
  ('Women Floral Dress',     'Dresses',   'M',   'Red',    25, 8000, 18000, 5, 1),
  ('Men Slim Jeans',         'Jeans',     '32',  'Blue',   30, 12000, 25000, 8, 1),
  ('Men Casual Jacket',      'Jackets',   'XL',  'Grey',   15, 15000, 35000, 5, 2),
  ('Women Blouse',           'Shirts',    'S',   'Pink',   20, 5000, 12000, 5, 2)
ON CONFLICT DO NOTHING;

INSERT INTO customers (name, phone, location, type, segment) VALUES
  ('Walk-in Customer', NULL, 'Kigali', 'retailer', 'new'),
  ('Amani Boutique',   '+250788111001', 'Musanze',  'wholesaler', 'regular'),
  ('Grace Fashion',    '+250788111002', 'Huye',     'wholesaler', 'regular'),
  ('VIP Client - Kalisa', '+250788111003', 'Kigali', 'retailer', 'vip')
ON CONFLICT DO NOTHING;

INSERT INTO settings (shop_name, shop_address, shop_phone)
SELECT 'VALANO SHOP', 'Kigali, Rwanda', '+250788123456'
WHERE NOT EXISTS (SELECT 1 FROM settings);

COMMIT;
`;

let initPromise = null;

async function runInit() {
  // Create the schema (safe/idempotent), then seed only if there are no users yet.
  await pool.query(SCHEMA_SQL);
  const { rows } = await pool.query("SELECT COUNT(*)::int AS count FROM users");
  if (rows[0].count === 0) {
    await pool.query(SEED_SQL);
    console.log("[DB INIT] Schema created and seed data inserted.");
  } else {
    console.log("[DB INIT] Schema verified; existing data preserved.");
  }
}

// Runs at most once per process; subsequent callers await the same promise.
function ensureDbReady() {
  if (!initPromise) {
    initPromise = runInit().catch((err) => {
      // Reset so a later request can retry after a transient failure
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

module.exports = { ensureDbReady };
