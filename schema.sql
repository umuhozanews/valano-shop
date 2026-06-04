-- VALANO SHOP — Full Database Schema (PostgreSQL 14+)
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
  role             VARCHAR(20) NOT NULL CHECK (role IN ('admin','manager','worker')),
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_created   ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_branch    ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_worker    ON sales(worker_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_stock_branch    ON stock_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_barcode   ON stock_items(barcode);
CREATE INDEX IF NOT EXISTS idx_notif_user      ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_created   ON audit_log(created_at DESC);

COMMIT;
