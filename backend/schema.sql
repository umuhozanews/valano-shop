-- ============================================================================
-- INZIRA INSIGHTS & DATABRIDGE PLATFORM — PRODUCTION DATABASE SCHEMA
-- Compatible with PostgreSQL 14+, Neon Serverless Postgres, Supabase
-- Multi-tenant isolation with Row Level Security (RLS) & E-commerce Storefront
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. AUTHENTICATION & MULTI-TENANT USERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  name             VARCHAR(100) NOT NULL,
  email            VARCHAR(100) UNIQUE NOT NULL,
  password_hash    TEXT,
  role             VARCHAR(30) NOT NULL DEFAULT 'sme_owner'
                     CHECK (role IN ('pulse_admin','sme_owner','admin','manager','accountant','cashier','databridge_advisor','lender','viewer')),
  phone            VARCHAR(20),
  avatar_url       TEXT,
  is_active        BOOLEAN DEFAULT true,
  profile_complete BOOLEAN DEFAULT true,
  google_auth      BOOLEAN DEFAULT false,
  google_linked    BOOLEAN DEFAULT false,
  
  -- Inzira Financial & KYC Profile
  consent_status   VARCHAR(20) DEFAULT 'pending'
                     CHECK (consent_status IN ('pending','approved','revoked')),
  consent_date     TIMESTAMP,
  lender_id        INTEGER,
  referral_code    VARCHAR(20),
  language         VARCHAR(5) DEFAULT 'en',
  sector           VARCHAR(50),
  district         VARCHAR(50),
  currency         VARCHAR(10) DEFAULT 'RWF',
  otp_code         VARCHAR(10),
  otp_expires_at   TIMESTAMP,
  lender_sharing   BOOLEAN DEFAULT false,
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ----------------------------------------------------------------------------
-- 2. MERCHANDISE & STOCK INVENTORY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_items (
  id                   SERIAL PRIMARY KEY,
  owner_id             INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name                 VARCHAR(100) NOT NULL,
  name_rw              VARCHAR(100),
  category             VARCHAR(50),
  unit                 VARCHAR(20) DEFAULT 'pcs',
  barcode              VARCHAR(100) UNIQUE,
  image_url            TEXT,
  quantity             INTEGER DEFAULT 0,
  cost_price_rwf       BIGINT DEFAULT 0,
  sell_price_rwf       BIGINT DEFAULT 0,
  compare_price_rwf    BIGINT,
  low_stock_threshold  INTEGER DEFAULT 5,
  is_active            BOOLEAN DEFAULT true,
  
  -- Public Storefront E-Commerce Fields
  is_published         BOOLEAN DEFAULT true,
  is_featured          BOOLEAN DEFAULT false,
  brand                VARCHAR(80),
  description          TEXT,
  created_at           TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_owner_active ON stock_items(owner_id, is_active);
CREATE INDEX IF NOT EXISTS idx_stock_barcode      ON stock_items(barcode);

-- ----------------------------------------------------------------------------
-- 3. CUSTOMER RELATIONSHIP MANAGEMENT (CRM)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id           SERIAL PRIMARY KEY,
  owner_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  phone        VARCHAR(20),
  location     TEXT,
  tin_number   VARCHAR(20),
  type         VARCHAR(20) DEFAULT 'retailer'
                 CHECK (type IN ('wholesaler','retailer','individual','business')),
  segment      VARCHAR(20) DEFAULT 'new'
                 CHECK (segment IN ('vip','regular','new','inactive','wholesale')),
  credit_limit BIGINT DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_owner ON customers(owner_id);

-- ----------------------------------------------------------------------------
-- 4. POINT OF SALE (POS) & TRANSACTIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales (
  id                SERIAL PRIMARY KEY,
  owner_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
  user_id           INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Cashier / Worker
  customer_id       INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  payment_method    VARCHAR(20)
                      CHECK (payment_method IN ('cash','mtn_momo','airtel','card','bank_transfer','credit','split')),
  total_amount      BIGINT NOT NULL,
  is_voided         BOOLEAN DEFAULT false,
  void_reason       TEXT,
  voided_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_offline        BOOLEAN DEFAULT false,
  synced_at         TIMESTAMP,
  payment_reference VARCHAR(100),
  payment_status    VARCHAR(20) DEFAULT 'completed',
  idempotency_key   VARCHAR(128),
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_owner ON sales(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_idempotency ON sales(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS sale_items (
  id            SERIAL PRIMARY KEY,
  sale_id       INTEGER REFERENCES sales(id) ON DELETE CASCADE,
  stock_item_id INTEGER REFERENCES stock_items(id) ON DELETE SET NULL,
  quantity      INTEGER NOT NULL,
  unit_price    BIGINT NOT NULL,
  subtotal      BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);

-- ----------------------------------------------------------------------------
-- 5. INVOICES & RRA EBM COMPLIANCE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id             SERIAL PRIMARY KEY,
  owner_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  sale_id        INTEGER REFERENCES sales(id) ON DELETE SET NULL,
  invoice_number VARCHAR(30) UNIQUE NOT NULL,
  status         VARCHAR(20) DEFAULT 'paid'
                   CHECK (status IN ('paid','pending','overdue','voided')),
  issued_at      TIMESTAMP DEFAULT NOW(),
  due_at         TIMESTAMP,
  paid_at        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_owner ON invoices(owner_id);

-- ----------------------------------------------------------------------------
-- 6. SUPPLIERS & PROCUREMENT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id                  SERIAL PRIMARY KEY,
  owner_id            INTEGER REFERENCES users(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_suppliers_owner ON suppliers(owner_id);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id           SERIAL PRIMARY KEY,
  owner_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  supplier_id  INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  order_date   DATE NOT NULL,
  arrival_date DATE,
  status       VARCHAR(20) DEFAULT 'ordered'
                 CHECK (status IN ('ordered','in_transit','arrived','stocked')),
  notes        TEXT,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_owner ON purchase_orders(owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id            SERIAL PRIMARY KEY,
  order_id      INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
  stock_item_id INTEGER REFERENCES stock_items(id) ON DELETE SET NULL,
  item_name     VARCHAR(100) NOT NULL,
  quantity      INTEGER NOT NULL,
  unit_cost_rwf BIGINT NOT NULL
);

-- ----------------------------------------------------------------------------
-- 7. FINANCIAL LEDGER: EXPENSES, RECEIVABLES & PAYABLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
  id           SERIAL PRIMARY KEY,
  owner_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  category     VARCHAR(50) NOT NULL,
  amount       BIGINT NOT NULL,
  description  TEXT,
  receipt_url  TEXT,
  supplier_id  INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  recorded_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  expense_date DATE NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_owner ON expenses(owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS accounts_receivable (
  id          SERIAL PRIMARY KEY,
  owner_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_ar_owner ON accounts_receivable(owner_id, status);

CREATE TABLE IF NOT EXISTS accounts_payable (
  id          SERIAL PRIMARY KEY,
  owner_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_ap_owner ON accounts_payable(owner_id);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id            SERIAL PRIMARY KEY,
  from_currency VARCHAR(10) NOT NULL,
  to_currency   VARCHAR(10) NOT NULL,
  rate          DECIMAL(10,4) NOT NULL,
  updated_at    TIMESTAMP DEFAULT NOW(),
  updated_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (from_currency, to_currency)
);

-- ----------------------------------------------------------------------------
-- 8. BUSINESS PROFILE & PUBLIC E-COMMERCE STOREFRONT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id                          SERIAL PRIMARY KEY,
  owner_id                    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  shop_name                   VARCHAR(100) DEFAULT 'My Business',
  shop_address                TEXT,
  shop_phone                  VARCHAR(20),
  shop_email                  VARCHAR(100),
  logo_url                    TEXT,
  currency                    VARCHAR(10) DEFAULT 'RWF',
  language                    VARCHAR(5) DEFAULT 'en',
  sector_default              VARCHAR(50),
  district_default            VARCHAR(50),
  default_low_stock_threshold INTEGER DEFAULT 5,
  invoice_footer_text         TEXT DEFAULT 'Thank you for your business!',
  
  -- RRA / EBM Fiscal Registration
  has_ebm                     BOOLEAN DEFAULT false,
  tin_number                  VARCHAR(20),
  sdc_id                      VARCHAR(30),
  mrc_number                  VARCHAR(30),
  cashier_tin                 VARCHAR(20),
  vat_rate                    DECIMAL(5,2) DEFAULT 18.00,
  
  -- Public Storefront Website Engine
  store_slug                  VARCHAR(60) UNIQUE,
  store_published             BOOLEAN DEFAULT true,
  store_template              VARCHAR(40) DEFAULT 'modern_retail',
  store_brand_color           VARCHAR(9)  DEFAULT '#0F766E',
  store_accent_color          VARCHAR(9)  DEFAULT '#F0FDFA',
  store_headline              TEXT,
  store_tagline               TEXT,
  store_about                 TEXT,
  store_announcement          TEXT,
  store_whatsapp              VARCHAR(20),
  store_hours                 VARCHAR(120),
  store_delivery_note         TEXT,
  store_delivery_fee          INTEGER DEFAULT 1500,
  store_min_free_delivery     INTEGER DEFAULT 35000,
  store_pickup_enabled        BOOLEAN DEFAULT true,
  store_delivery_zones        JSONB,
  store_hero_slides           JSONB,
  store_socials               JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_settings_owner ON settings(owner_id);

-- Online Shopper Orders
CREATE TABLE IF NOT EXISTS store_orders (
  id             SERIAL PRIMARY KEY,
  owner_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
  reference      VARCHAR(30) UNIQUE NOT NULL,
  customer_name  VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(30)  NOT NULL,
  customer_email VARCHAR(120),
  delivery_note  TEXT,
  items          JSONB       NOT NULL DEFAULT '[]',
  total_amount   BIGINT      NOT NULL DEFAULT 0,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','shipped','completed','cancelled')),
  source         VARCHAR(20) NOT NULL DEFAULT 'website',
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_orders_owner ON store_orders(owner_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 9. AI/ML FINANCIAL HEALTH & CREDIT SCORING
-- ----------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_health_user ON health_score_log(user_id, created_at DESC);

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

-- ----------------------------------------------------------------------------
-- 10. ADVISORY & FINANCIAL INSTITUTIONS (LENDERS)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS advisor_clients (
  id               SERIAL PRIMARY KEY,
  advisor_user_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
  sme_user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT NOW(),
  UNIQUE(advisor_user_id, sme_user_id)
);

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

-- ----------------------------------------------------------------------------
-- 11. NOTIFICATIONS & ENTERPRISE AUDIT TRAIL
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id           SERIAL PRIMARY KEY,
  owner_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- ----------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_sales') THEN
    CREATE POLICY tenant_isolation_sales ON sales
      USING (owner_id IS NULL OR owner_id = NULLIF(current_setting('app.current_user_id', true), '')::integer OR NULLIF(current_setting('app.current_user_role', true), '') = 'pulse_admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_stock') THEN
    CREATE POLICY tenant_isolation_stock ON stock_items
      USING (owner_id IS NULL OR owner_id = NULLIF(current_setting('app.current_user_id', true), '')::integer OR NULLIF(current_setting('app.current_user_role', true), '') = 'pulse_admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_expenses') THEN
    CREATE POLICY tenant_isolation_expenses ON expenses
      USING (owner_id IS NULL OR owner_id = NULLIF(current_setting('app.current_user_id', true), '')::integer OR NULLIF(current_setting('app.current_user_role', true), '') = 'pulse_admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_customers') THEN
    CREATE POLICY tenant_isolation_customers ON customers
      USING (owner_id IS NULL OR owner_id = NULLIF(current_setting('app.current_user_id', true), '')::integer OR NULLIF(current_setting('app.current_user_role', true), '') = 'pulse_admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_suppliers') THEN
    CREATE POLICY tenant_isolation_suppliers ON suppliers
      USING (owner_id IS NULL OR owner_id = NULLIF(current_setting('app.current_user_id', true), '')::integer OR NULLIF(current_setting('app.current_user_role', true), '') = 'pulse_admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_invoices') THEN
    CREATE POLICY tenant_isolation_invoices ON invoices
      USING (owner_id IS NULL OR owner_id = NULLIF(current_setting('app.current_user_id', true), '')::integer OR NULLIF(current_setting('app.current_user_role', true), '') = 'pulse_admin');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation_settings') THEN
    CREATE POLICY tenant_isolation_settings ON settings
      USING (owner_id IS NULL OR owner_id = NULLIF(current_setting('app.current_user_id', true), '')::integer OR NULLIF(current_setting('app.current_user_role', true), '') = 'pulse_admin');
  END IF;
END $$;

COMMIT;
