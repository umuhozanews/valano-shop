-- VALANO SHOP — Seed Data
-- Passwords are bcrypt hash of "valano123"

BEGIN;

-- Branches
INSERT INTO branches (name, location, phone) VALUES
  ('Main Branch', 'Kigali - Nyabugogo Market', '+250788000001'),
  ('City Branch',  'Kigali - Kimironko Market', '+250788000002')
ON CONFLICT DO NOTHING;

-- Users (password = "valano123")
INSERT INTO users (name, email, password_hash, role, branch_id, phone, monthly_target, commission_rate) VALUES
  ('Niyomugabo Emmanuel', 'owner@valano.rw',     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBaXMGJ0eDuBau', 'owner',      1, '+250780000001', 5000000, 0),
  ('Habimana Jean Pierre','manager@valano.rw',   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBaXMGJ0eDuBau', 'manager',    1, '+250780000002', 3000000, 2),
  ('Uwimana Angélique',   'accounts@valano.rw',  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBaXMGJ0eDuBau', 'accountant', 1, '+250780000003', 0, 0),
  ('Uwamahoro Marie',     'worker1@valano.rw',   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBaXMGJ0eDuBau', 'worker',     1, '+250780000004', 1500000, 3),
  ('Ndayisabye Eric',     'worker2@valano.rw',   '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBaXMGJ0eDuBau', 'worker',     2, '+250780000005', 1500000, 3)
ON CONFLICT (email) DO NOTHING;

-- Suppliers
INSERT INTO suppliers (name, wechat, whatsapp, city, country, specialty, reliability_score) VALUES
  ('Guangzhou Fashion Co.',  'gzfashion2024',  '+8613800000001', 'Guangzhou', 'China', 'T-Shirts, Casual Wear', 8),
  ('Yiwu Wholesale Hub',     'yiwuhub_trade',  '+8613800000002', 'Yiwu',      'China', 'Accessories, Mixed Clothing', 7),
  ('Shenzhen Style Ltd.',    'szstylelimited', '+8613800000003', 'Shenzhen',  'China', 'Formal Wear, Suits', 9)
ON CONFLICT DO NOTHING;

-- Exchange rates
INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES
  ('CNY', 'RWF', 190.50),
  ('USD', 'RWF', 1350.00),
  ('EUR', 'RWF', 1460.00)
ON CONFLICT (from_currency, to_currency) DO UPDATE SET rate = EXCLUDED.rate, updated_at = NOW();

-- Sample stock items
INSERT INTO stock_items (name, category, size, color, quantity, cost_price_rwf, sell_price_rwf, low_stock_threshold, branch_id) VALUES
  ('Men Plain T-Shirt',      'T-Shirts',  'M',   'White',  50, 3000, 6000, 10, 1),
  ('Men Plain T-Shirt',      'T-Shirts',  'L',   'Black',  40, 3000, 6000, 10, 1),
  ('Women Floral Dress',     'Dresses',   'M',   'Red',    25, 8000, 18000, 5, 1),
  ('Men Slim Jeans',         'Jeans',     '32',  'Blue',   30, 12000, 25000, 8, 1),
  ('Men Casual Jacket',      'Jackets',   'XL',  'Grey',   15, 15000, 35000, 5, 2),
  ('Women Blouse',           'Shirts',    'S',   'Pink',   20, 5000, 12000, 5, 2)
ON CONFLICT DO NOTHING;

-- Sample customers
INSERT INTO customers (name, phone, location, type, segment) VALUES
  ('Walk-in Customer', NULL, 'Kigali', 'retail', 'new'),
  ('Amani Boutique',   '+250788111001', 'Musanze',  'wholesale', 'regular'),
  ('Grace Fashion',    '+250788111002', 'Huye',     'wholesale', 'loyal'),
  ('VIP Client - Kalisa', '+250788111003', 'Kigali', 'vip', 'loyal')
ON CONFLICT DO NOTHING;

COMMIT;
