// Storefront support: turns an SME's settings + inventory into the payload that
// renders its public website. Every SME gets a site with zero configuration —
// slug, hero slides, categories and brands are all derived when unset.

const pool = require("../config/db");

const DEFAULT_BRAND_COLOR = "#006C49";
const DEFAULT_ACCENT_COLOR = "#E8F5EF";
const RESERVED_SLUGS = new Set([
  "app", "api", "admin", "login", "register", "shop", "store", "settings",
  "assets", "static", "health", "advisory", "www", "new", "about", "contact",
]);

const DEFAULT_DELIVERY_FEE = 1500;
const DEFAULT_MIN_FREE_DELIVERY = 50000;

// Named colour schemes the SME can pick instead of hand-typing hex codes.
const THEME_PRESETS = {
  teal_lime: { label: "Teal & Lime", brand: "#006C49", accent: "#C6F24E" },
  orange:    { label: "Sunset Orange", brand: "#E2560F", accent: "#FFE1CC" },
  sapphire:  { label: "Sapphire Blue", brand: "#1D4ED8", accent: "#DBEAFE" },
  plum:      { label: "Deep Plum", brand: "#6D28D9", accent: "#EDE9FE" },
  charcoal:  { label: "Charcoal", brand: "#1F2937", accent: "#E5E7EB" },
};

// Available website layout templates tailored for Rwandan SME verticals.
const STORE_TEMPLATES = {
  modern_retail: {
    id: "modern_retail",
    name: "Modern Retail & Minimarket",
    description: "High-speed catalog with category pills, live search, and quick add-to-cart.",
    badge: "Recommended",
    icon: "shopping-bag",
  },
  tech_gadgets: {
    id: "tech_gadgets",
    name: "Tech & Electronics Flagship",
    description: "Bento grid layout with hardware specs, warranty verification, and WhatsApp consultation.",
    badge: "Electronics",
    icon: "cpu",
  },
  food_cafe: {
    id: "food_cafe",
    name: "Restaurant, Cafe & Bakery",
    description: "Digital menu with meal categories, prep time badges, and kitchen order notes.",
    badge: "Food & Drinks",
    icon: "utensils",
  },
  fashion_boutique: {
    id: "fashion_boutique",
    name: "Fashion & Beauty Boutique",
    description: "Editorial lookbook with large visual imagery, brand showcases, and minimalist styling.",
    badge: "Lifestyle",
    icon: "sparkles",
  },
};

// Zone fees are derived from the SME's base fee rather than hard-coded, so an
// SME that only changes one number still gets a sensible Kigali/upcountry spread.
const DEFAULT_ZONE_TEMPLATE = [
  { name: "Nyarugenge / City Centre", multiplier: 1 },
  { name: "Kimironko", multiplier: 1.2 },
  { name: "Remera", multiplier: 1.2 },
  { name: "Kicukiro", multiplier: 1.4 },
  { name: "Gasabo (other sectors)", multiplier: 1.6 },
  { name: "Upcountry (Rubavu, Musanze, Huye…)", multiplier: 3 },
];

let _storeColumnsReady = false;
let _slugBackfillDone = false;

// The public routes must work even when ensureDbReady() never ran (serverless
// cold starts import the Express app directly), so the columns are ensured here
// too. Mirrors the ensureTenantColumns() pattern used by the authed routes.
const STORE_COLUMN_SQL = [
  "ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_slug VARCHAR(60)",
  "ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_template VARCHAR(30) DEFAULT 'modern_retail'",
  "ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_published BOOLEAN DEFAULT true",
  "ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_headline TEXT",
  "ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_tagline TEXT",
  "ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_about TEXT",
  "ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_announcement TEXT",
  "ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_brand_color VARCHAR(9)",
  "ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_accent_color VARCHAR(9)",
  "ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_whatsapp VARCHAR(20)",
  "ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_hours VARCHAR(120)",
  "ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_delivery_note TEXT",
  "ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_hero_slides JSONB",
  "ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_socials JSONB",
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_delivery_fee BIGINT DEFAULT ${DEFAULT_DELIVERY_FEE}`,
  `ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_min_free_delivery BIGINT DEFAULT ${DEFAULT_MIN_FREE_DELIVERY}`,
  "ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_delivery_zones JSONB",
  "ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_pickup_enabled BOOLEAN DEFAULT true",
  "ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true",
  "ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false",
  "ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS brand VARCHAR(80)",
  "ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS description TEXT",
  "ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS compare_price_rwf BIGINT",
  `CREATE TABLE IF NOT EXISTS store_orders (
     id             SERIAL PRIMARY KEY,
     owner_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
     reference      VARCHAR(30) UNIQUE NOT NULL,
     customer_name  VARCHAR(120) NOT NULL,
     customer_phone VARCHAR(30)  NOT NULL,
     customer_email VARCHAR(120),
     delivery_note  TEXT,
     items          JSONB       NOT NULL DEFAULT '[]',
     total_amount   BIGINT      NOT NULL DEFAULT 0,
     status         VARCHAR(20) NOT NULL DEFAULT 'pending',
     source         VARCHAR(20) NOT NULL DEFAULT 'website',
     created_at     TIMESTAMP DEFAULT NOW()
   )`,
  // Delivery details and the link to the POS sale the order was converted into.
  "ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS fulfillment VARCHAR(20) DEFAULT 'delivery'",
  "ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS delivery_address TEXT",
  "ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS delivery_zone VARCHAR(120)",
  "ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS delivery_fee BIGINT DEFAULT 0",
  "ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS sale_id INTEGER",
  "ALTER TABLE store_orders ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMP",
  "CREATE UNIQUE INDEX IF NOT EXISTS uq_settings_store_slug ON settings(store_slug) WHERE store_slug IS NOT NULL",
  // One web order can only ever produce one sale, even under concurrent clicks.
  "CREATE UNIQUE INDEX IF NOT EXISTS uq_store_orders_sale ON store_orders(sale_id) WHERE sale_id IS NOT NULL",
];

async function ensureStoreColumns() {
  if (_storeColumnsReady) return;
  for (const sql of STORE_COLUMN_SQL) {
    await pool.query(sql).catch(() => {});
  }
  _storeColumnsReady = true;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

// Derives a URL-safe, globally unique slug. Falls back to the owner id so a
// store is always reachable even when the business name is unusable.
async function generateSlug(shopName, ownerId) {
  const base = slugify(shopName);
  const candidates = [];
  if (base && !RESERVED_SLUGS.has(base)) candidates.push(base);
  if (base) candidates.push(`${base}-${ownerId}`);
  candidates.push(`store-${ownerId}`);

  for (const candidate of candidates) {
    const { rows } = await pool.query(
      "SELECT 1 FROM settings WHERE store_slug=$1 AND owner_id IS DISTINCT FROM $2 LIMIT 1",
      [candidate, ownerId]
    );
    if (!rows.length) return candidate;
  }
  return `store-${ownerId}-${Date.now().toString(36)}`;
}

// One pass per process: give every SME that has settings but no slug a stable
// one, so existing accounts get a working website without touching the UI.
async function backfillSlugs() {
  if (_slugBackfillDone) return;
  _slugBackfillDone = true;
  try {
    const { rows } = await pool.query(
      `SELECT owner_id, shop_name FROM settings
       WHERE store_slug IS NULL AND owner_id IS NOT NULL
       ORDER BY owner_id`
    );
    for (const row of rows) {
      const slug = await generateSlug(row.shop_name, row.owner_id);
      await pool
        .query("UPDATE settings SET store_slug=$1 WHERE owner_id=$2 AND store_slug IS NULL", [slug, row.owner_id])
        .catch(() => {});
    }
  } catch {
    // A missing column here just means the site falls back to id lookups.
    _slugBackfillDone = false;
  }
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  if (!digits) return null;
  if (digits.startsWith("250")) return digits;
  if (digits.startsWith("0")) return `250${digits.slice(1)}`;
  return digits;
}

// ── Sector Intelligence & Auto-Storefront Generation ────────────────────────
function detectSectorProfile(sector = "", shopName = "") {
  const combined = `${sector || ""} ${shopName || ""}`.toLowerCase();

  // Food & Cafe keywords
  if (
    /food|restaurant|cafe|coffee|bakery|bar|bistro|grill|kitchen|eat|snack|beverage|catering|dish|meal|pizza|burger/i.test(
      combined
    )
  ) {
    return {
      template: "food_cafe",
      brandColor: "#C2410C", // Warm Terracotta / Dark Amber
      accentColor: "#FFEDD5", // Soft Apricot
      headlinePrefix: "Fresh Gourmet Dishes & Artisan Coffee at",
      tagline: "Freshly prepared meals and drinks delivered swiftly across Kigali.",
      announcement: "⚡ Fresh kitchen orders! Fast 25–40 min delivery across Kigali on WhatsApp & MoMo.",
      about:
        "Welcome to our kitchen! We pride ourselves on serving freshly prepared, delicious meals, artisan coffees, and refreshing beverages crafted from quality ingredients for our Kigali community.",
      category: "Main Courses",
    };
  }

  // Tech & Electronics keywords
  if (
    /electronic|phone|tech|computer|laptop|gadget|hardware|appliance|mobile|screen|audio|device|smart|apple|samsung/i.test(
      combined
    )
  ) {
    return {
      template: "tech_gadgets",
      brandColor: "#0D9488", // Deep Teal / Cyan
      accentColor: "#CCFBF1", // Soft Mint
      headlinePrefix: "Verified Original Hardware & Flagship Devices at",
      tagline: "100% genuine sealed electronics with official 12-month Rwanda warranty.",
      announcement: "⚡ 100% Original Sealed Hardware • Official Rwanda Warranty • Same-Day Kigali Delivery!",
      about:
        "Your trusted destination for original smartphones, high-performance laptops, accessories, and certified electronics in Rwanda. Every unit is tested, RURA-approved, and backed by a transparent warranty.",
      category: "Smartphones",
    };
  }

  // Fashion & Boutique keywords
  if (
    /fashion|boutique|cloth|apparel|shoe|sneaker|wear|dress|beauty|cosmetic|jewelry|luxury|style|tailor|suit|gown/i.test(
      combined
    )
  ) {
    return {
      template: "fashion_boutique",
      brandColor: "#831843", // Deep Rose Plum
      accentColor: "#FCE7F3", // Soft Blush
      headlinePrefix: "Curated Contemporary Fashion & Styling at",
      tagline: "Exclusive apparel, footwear, and timeless fashion statements in Kigali.",
      announcement: "✨ New Season Collection is Live! Same-day Kigali doorstep fitting & exchange available.",
      about:
        "We curate modern, comfortable, and elegant fashion pieces tailored for the contemporary lifestyle. Discover premium fabrics, bespoke tailoring, and trendsetting styles with convenient same-day doorstep fitting.",
      category: "Apparel",
    };
  }

  // Modern Retail (Default for supermarkets, minimarkets, groceries, pharmacies, and general stores)
  return {
    template: "modern_retail",
    brandColor: "#006C49", // Rwandan Forest Emerald
    accentColor: "#C6F24E", // Lime
    headlinePrefix: "Quality Daily Essentials & Groceries at",
    tagline: "Honest everyday prices with reliable same-day delivery to your door.",
    announcement: "🛒 Order directly online! Fast same-day home and office delivery across Rwanda.",
    about:
      "We serve families and businesses across Rwanda with carefully selected, high-quality daily essentials, groceries, and household goods at honest, transparent prices.",
    category: "Groceries",
  };
}

function getStarterProductsForSector(template, ownerId) {
  const now = Date.now();
  if (template === "food_cafe") {
    return [
      {
        name: "Ifi Yokeje / Charcoal Grilled Whole Tilapia",
        name_rw: "Ifi Yokeje y'i Nyanza",
        category: "Grills & Mains",
        unit: "plate",
        barcode: `FOOD${now}1`,
        quantity: 15,
        cost_price_rwf: 5000,
        sell_price_rwf: 7500,
        compare_price_rwf: 8500,
        description: "Fresh Lake Kivu whole Tilapia slow-grilled with garlic herb marinade, served with roasted plantains and chili.",
        is_published: true,
        is_featured: true,
        owner_id: ownerId,
      },
      {
        name: "Inyama y'Ingurube / Pork Brochettes (Pair)",
        name_rw: "Ururo ry'Ingurube",
        category: "Brochettes",
        unit: "stick",
        barcode: `FOOD${now}2`,
        quantity: 25,
        cost_price_rwf: 1500,
        sell_price_rwf: 2500,
        compare_price_rwf: 3000,
        description: "Flame-grilled tender pork brochettes basted in a rich aromatic marinade with grilled onions and peppers.",
        is_published: true,
        is_featured: true,
        owner_id: ownerId,
      },
      {
        name: "Specialty Huye Mountain Arabica Coffee",
        name_rw: "Ikawa y'i Huye",
        category: "Hot Beverages",
        unit: "cup",
        barcode: `FOOD${now}3`,
        quantity: 40,
        cost_price_rwf: 1200,
        sell_price_rwf: 3000,
        description: "Single-origin 100% Bourbon Arabica washed coffee freshly roasted and brewed to perfection.",
        is_published: true,
        is_featured: false,
        owner_id: ownerId,
      },
      {
        name: "Fresh Tropical Mango & Passion Juice",
        name_rw: "Umutobe w'Imyembe n'Ibitoki",
        category: "Cold Drinks",
        unit: "glass",
        barcode: `FOOD${now}4`,
        quantity: 30,
        cost_price_rwf: 1000,
        sell_price_rwf: 2500,
        description: "100% natural, freshly pressed Rwandan mango and passion fruit with crushed ice. No added sugar.",
        is_published: true,
        is_featured: false,
        owner_id: ownerId,
      },
    ];
  }

  if (template === "tech_gadgets") {
    return [
      {
        name: "iPhone 15 Pro Max Titanium (256GB)",
        name_rw: null,
        brand: "Apple",
        category: "Smartphones",
        unit: "pcs",
        barcode: `TECH${now}1`,
        quantity: 4,
        cost_price_rwf: 1280000,
        sell_price_rwf: 1450000,
        compare_price_rwf: 1580000,
        description: "Grade-A Sealed Original Hardware • A17 Pro Silicon • RURA & IMEI Verified with 12 Months Warranty.",
        is_published: true,
        is_featured: true,
        owner_id: ownerId,
      },
      {
        name: "Samsung Galaxy S24 Ultra 5G AI (512GB)",
        name_rw: null,
        brand: "Samsung",
        category: "Smartphones",
        unit: "pcs",
        barcode: `TECH${now}2`,
        quantity: 5,
        cost_price_rwf: 1220000,
        sell_price_rwf: 1380000,
        compare_price_rwf: 1500000,
        description: "Galaxy AI Integrated • Titanium Frame • 200MP Quad Tele • 12 Months Official Samsung Warranty.",
        is_published: true,
        is_featured: true,
        owner_id: ownerId,
      },
      {
        name: "Apple AirPods Pro 2nd Gen (USB-C MagSafe)",
        name_rw: null,
        brand: "Apple",
        category: "Audio",
        unit: "pcs",
        barcode: `TECH${now}3`,
        quantity: 8,
        cost_price_rwf: 230000,
        sell_price_rwf: 280000,
        compare_price_rwf: 320000,
        description: "Active Noise Cancellation • Adaptive Audio • Spatial Sound with MagSafe Charging Case.",
        is_published: true,
        is_featured: false,
        owner_id: ownerId,
      },
      {
        name: "Anker 65W GaN Fast Charger (3 Ports)",
        name_rw: null,
        brand: "Anker",
        category: "Accessories",
        unit: "pcs",
        barcode: `TECH${now}4`,
        quantity: 12,
        cost_price_rwf: 38000,
        sell_price_rwf: 55000,
        description: "High-speed multi-device GaN wall charger for MacBooks, laptops, iPhones, and Androids.",
        is_published: true,
        is_featured: false,
        owner_id: ownerId,
      },
    ];
  }

  if (template === "fashion_boutique") {
    return [
      {
        name: "Tailored Pure Linen Summer Shirt",
        name_rw: null,
        brand: "Kigali Atelier",
        category: "Men's Apparel",
        unit: "pcs",
        barcode: `FASH${now}1`,
        quantity: 10,
        cost_price_rwf: 22000,
        sell_price_rwf: 35000,
        compare_price_rwf: 42000,
        description: "Breathable relaxed-fit pure linen shirt with pearl buttons. Tailored with care in Rwanda.",
        is_published: true,
        is_featured: true,
        owner_id: ownerId,
      },
      {
        name: "Contemporary Pleated Silk Midi Dress",
        name_rw: null,
        brand: "Maison Rwanda",
        category: "Women's Apparel",
        unit: "pcs",
        barcode: `FASH${now}2`,
        quantity: 8,
        cost_price_rwf: 28000,
        sell_price_rwf: 45000,
        compare_price_rwf: 52000,
        description: "Flattering silhouette dress crafted from luxurious emerald silk blend fabric.",
        is_published: true,
        is_featured: true,
        owner_id: ownerId,
      },
      {
        name: "Handcrafted Rwandan Leather Weekend Bag",
        name_rw: null,
        brand: "Kigali Leather Co.",
        category: "Bags & Accessories",
        unit: "pcs",
        barcode: `FASH${now}3`,
        quantity: 6,
        cost_price_rwf: 42000,
        sell_price_rwf: 65000,
        description: "Full-grain vegetable-tanned local cowhide leather with heavy-duty brass hardware.",
        is_published: true,
        is_featured: false,
        owner_id: ownerId,
      },
      {
        name: "Minimalist Leather Low-Top Sneakers",
        name_rw: null,
        brand: "Kigali Kicks",
        category: "Footwear",
        unit: "pair",
        barcode: `FASH${now}4`,
        quantity: 12,
        cost_price_rwf: 32000,
        sell_price_rwf: 48000,
        compare_price_rwf: 55000,
        description: "Clean white genuine leather sneakers with cushioned insoles for all-day comfort.",
        is_published: true,
        is_featured: false,
        owner_id: ownerId,
      },
    ];
  }

  // Modern Retail / Supermarket
  return [
    {
      name: "Super Pure Basmati Rice (5kg Bag)",
      name_rw: "Umuceri wa Basmati",
      category: "Grains & Pantry",
      unit: "bag",
      barcode: `RET${now}1`,
      quantity: 30,
      cost_price_rwf: 9500,
      sell_price_rwf: 12500,
      description: "Premium aged long-grain aromatic Basmati rice, perfectly sorted and dust-free.",
      is_published: true,
      is_featured: true,
      owner_id: ownerId,
    },
    {
      name: "Inyange Whole Fresh Pasteurized Milk (1L x 6)",
      name_rw: "Amata ya Inyange",
      category: "Dairy & Eggs",
      unit: "pack",
      barcode: `RET${now}2`,
      quantity: 20,
      cost_price_rwf: 4800,
      sell_price_rwf: 6000,
      description: "100% natural whole Rwandan cow milk, pasteurized for freshness and nutrition.",
      is_published: true,
      is_featured: true,
      owner_id: ownerId,
    },
    {
      name: "Golden Drop Refined Sunflower Cooking Oil (3L)",
      name_rw: "Amavuta yo Guteka",
      category: "Cooking Essentials",
      unit: "bottle",
      barcode: `RET${now}3`,
      quantity: 18,
      cost_price_rwf: 6800,
      sell_price_rwf: 8500,
      description: "Triple-filtered healthy cholesterol-free cooking oil fortified with vitamins A & D.",
      is_published: true,
      is_featured: false,
      owner_id: ownerId,
    },
    {
      name: "Inyange Mango & Orange Blend Juice (1L)",
      name_rw: "Umutobe wa Inyange",
      category: "Beverages",
      unit: "bottle",
      barcode: `RET${now}4`,
      quantity: 25,
      cost_price_rwf: 1800,
      sell_price_rwf: 2400,
      description: "Delicious rich mango-orange blend nectar made from real local fruit pulp.",
      is_published: true,
      is_featured: false,
      owner_id: ownerId,
    },
  ];
}

async function autoProvisionStorefront(ownerId, options = {}) {
  await ensureStoreColumns();

  const id = Number(ownerId);
  if (!Number.isInteger(id) || id <= 0) return null;

  let user = null;
  const userQuery = await pool.query(
    "SELECT id, name, email, phone, district, sector, currency FROM users WHERE id = $1 LIMIT 1",
    [id]
  ).catch(() => ({ rows: [] }));
  user = userQuery.rows[0] || {};

  const shopName = String(options.shopName || user.name || "Inzira Store").trim();
  const sector = String(options.sector || user.sector || "").trim();
  const district = String(options.district || user.district || "Kigali").trim();
  const phone = normalizePhone(options.phone || user.phone || "");
  const email = String(options.email || user.email || "").trim();
  const currency = String(options.currency || user.currency || "RWF").trim().toUpperCase();

  const profile = detectSectorProfile(sector, shopName);
  const headline = `${profile.headlinePrefix} ${shopName}`;
  const slug = await generateSlug(shopName, id);

  await pool.query(
    `INSERT INTO settings (
       owner_id, shop_name, shop_address, shop_phone, shop_email, currency,
       store_slug, store_template, store_brand_color, store_accent_color,
       store_headline, store_tagline, store_about, store_announcement,
       store_whatsapp, store_hours, store_delivery_fee, store_min_free_delivery,
       store_pickup_enabled, store_published
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, true, true)
     ON CONFLICT (owner_id) DO UPDATE SET
       store_slug = COALESCE(settings.store_slug, EXCLUDED.store_slug),
       store_template = COALESCE(settings.store_template, EXCLUDED.store_template),
       store_brand_color = COALESCE(settings.store_brand_color, EXCLUDED.store_brand_color),
       store_accent_color = COALESCE(settings.store_accent_color, EXCLUDED.store_accent_color),
       store_headline = COALESCE(settings.store_headline, EXCLUDED.store_headline),
       store_tagline = COALESCE(settings.store_tagline, EXCLUDED.store_tagline),
       store_about = COALESCE(settings.store_about, EXCLUDED.store_about),
       store_announcement = COALESCE(settings.store_announcement, EXCLUDED.store_announcement),
       store_whatsapp = COALESCE(settings.store_whatsapp, EXCLUDED.store_whatsapp),
       store_hours = COALESCE(settings.store_hours, EXCLUDED.store_hours),
       store_delivery_fee = COALESCE(settings.store_delivery_fee, EXCLUDED.store_delivery_fee),
       store_min_free_delivery = COALESCE(settings.store_min_free_delivery, EXCLUDED.store_min_free_delivery),
       shop_address = COALESCE(settings.shop_address, EXCLUDED.shop_address),
       shop_phone = COALESCE(settings.shop_phone, EXCLUDED.shop_phone),
       currency = COALESCE(settings.currency, EXCLUDED.currency)`,
    [
      id, shopName, district, phone || null, email || null, currency,
      slug, profile.template, profile.brandColor, profile.accentColor,
      headline, profile.tagline, profile.about, profile.announcement,
      phone || null, "Mon–Sat, 8:00 AM – 8:30 PM", 1500, 35000
    ]
  ).catch(() => {});

  // Fetch or seed stock items
  const { rows: countRows } = await pool.query(
    "SELECT COUNT(*) AS total FROM stock_items WHERE owner_id = $1 AND is_active = true",
    [id]
  ).catch(() => ({ rows: [{ total: 0 }] }));

  const currentCount = parseInt(countRows[0]?.total || 0, 10);

  if (currentCount === 0) {
    const starterItems = getStarterProductsForSector(profile.template, id);
    for (const item of starterItems) {
      await pool.query(
        `INSERT INTO stock_items (
           name, name_rw, category, unit, barcode, quantity, cost_price_rwf,
           sell_price_rwf, compare_price_rwf, description, brand, is_published,
           is_featured, low_stock_threshold, owner_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12, 3, $13)
         ON CONFLICT (barcode) DO NOTHING`,
        [
          item.name, item.name_rw || null, item.category, item.unit || "pcs",
          item.barcode, item.quantity, item.cost_price_rwf, item.sell_price_rwf,
          item.compare_price_rwf || null, item.description, item.brand || null,
          item.is_featured || false, id
        ]
      ).catch(() => {});
    }
  }

  const { rows: [finalSettings] } = await pool.query(
    "SELECT * FROM settings WHERE owner_id = $1 LIMIT 1",
    [id]
  ).catch(() => ({ rows: [] }));

  return finalSettings || null;
}

// Resolves a public URL segment to an SME. Accepts the slug, a numeric owner id,
// or the "store-<id>" form so links keep working if a slug is later renamed.
async function resolveStore(slugOrId) {
  const raw = String(slugOrId || "").trim().toLowerCase();
  if (!raw) return null;

  let store = null;

  const bySlug = await pool.query(
    `SELECT s.*, u.name AS owner_name, u.email AS owner_email,
            u.phone AS owner_phone, u.district AS owner_district, u.sector AS owner_sector
       FROM settings s
       JOIN users u ON u.id = s.owner_id
      WHERE s.store_slug = $1
      LIMIT 1`,
    [raw]
  );
  if (bySlug.rows.length) {
    store = bySlug.rows[0];
  } else {
    const idMatch = raw.match(/^(?:store-)?(\d+)$/);
    if (idMatch) {
      const byOwner = await pool.query(
        `SELECT s.*, u.name AS owner_name, u.email AS owner_email,
                u.phone AS owner_phone, u.district AS owner_district, u.sector AS owner_sector
           FROM settings s
           JOIN users u ON u.id = s.owner_id
          WHERE s.owner_id = $1
          LIMIT 1`,
        [Number(idMatch[1])]
      );
      if (byOwner.rows.length) store = byOwner.rows[0];
    }
  }

  if (!store) return null;

  // Auto-heal if store is missing key auto-generated fields
  if (!store.store_template || !store.store_brand_color || !store.store_headline) {
    const updated = await autoProvisionStorefront(store.owner_id, {
      shopName: store.shop_name || store.owner_name,
      sector: store.owner_sector,
      district: store.shop_address || store.owner_district,
      phone: store.shop_phone || store.owner_phone,
      email: store.shop_email || store.owner_email,
      currency: store.currency,
    }).catch(() => null);
    if (updated) {
      return { ...store, ...updated };
    }
  }

  return store;
}

function parseJsonColumn(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

// RWF has no minor unit, so every money figure stays an integer. Fees are also
// snapped to 500 so derived zone prices read like real Rwandan delivery prices.
function toInt(value, fallback = 0) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

function roundFee(value) {
  return Math.max(0, Math.round(toInt(value) / 500) * 500);
}

function baseDeliveryFee(store) {
  const fee = store.store_delivery_fee;
  return fee === null || fee === undefined ? DEFAULT_DELIVERY_FEE : Math.max(0, toInt(fee));
}

function minFreeDelivery(store) {
  const min = store.store_min_free_delivery;
  return min === null || min === undefined ? DEFAULT_MIN_FREE_DELIVERY : Math.max(0, toInt(min));
}

// An SME that has configured nothing still gets a working zone selector.
function deliveryZones(store) {
  const authored = parseJsonColumn(store.store_delivery_zones, null);
  if (Array.isArray(authored) && authored.length) {
    const zones = authored
      .filter((zone) => zone && String(zone.name || "").trim())
      .slice(0, 20)
      .map((zone) => ({
        name: String(zone.name).trim().slice(0, 120),
        fee: Math.max(0, toInt(zone.fee)),
      }));
    if (zones.length) return zones;
  }

  const base = baseDeliveryFee(store);
  return DEFAULT_ZONE_TEMPLATE.map((zone) => ({
    name: zone.name,
    fee: roundFee(base * zone.multiplier),
  }));
}

function pickupEnabled(store) {
  return store.store_pickup_enabled !== false;
}

// The authoritative delivery price. The browser sends a zone *name* and never a
// fee, and this is the only place a fee is produced — for the quote shown on the
// storefront and again when the order is written, so the two cannot disagree.
function quoteDelivery(store, { subtotal = 0, fulfillment = "delivery", zone = null } = {}) {
  const zones = deliveryZones(store);
  const freeOver = minFreeDelivery(store);
  const wantsPickup = String(fulfillment).toLowerCase() === "pickup";
  const mode = wantsPickup && pickupEnabled(store) ? "pickup" : "delivery";

  if (mode === "pickup") {
    return { fulfillment: "pickup", zone: null, fee: 0, freeApplied: false, freeOver };
  }

  const wanted = String(zone || "").trim().toLowerCase();
  const matched = zones.find((entry) => entry.name.toLowerCase() === wanted) || null;

  // A zone the shopper picked can disappear if the SME edits its zones while the
  // page is open. Charging the base fee keeps the order placeable instead of
  // failing the checkout — the merchant still sees the typed address.
  const fee = matched ? matched.fee : baseDeliveryFee(store);
  const freeApplied = freeOver > 0 && toInt(subtotal) >= freeOver;

  return {
    fulfillment: "delivery",
    zone: matched ? matched.name : null,
    fee: freeApplied ? 0 : Math.max(0, toInt(fee)),
    freeApplied,
    freeOver,
  };
}

function shapeProduct(row) {
  const price = toNumber(row.sell_price_rwf);
  const compareAt = toNumber(row.compare_price_rwf);
  return {
    id: row.id,
    name: row.name,
    nameRw: row.name_rw || null,
    slug: `${slugify(row.name) || "item"}-${row.id}`,
    category: row.category || "General",
    brand: row.brand || null,
    unit: row.unit || "pcs",
    description: row.description || null,
    image: row.image_url || null,
    price,
    compareAtPrice: compareAt > price ? compareAt : null,
    discountPct: compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : null,
    inStock: toNumber(row.quantity) > 0,
    featured: row.is_featured === true,
  };
}

// Hero slides are the biggest visual element, so when the SME hasn't authored
// any we build them from its best products rather than showing an empty banner.
function deriveHeroSlides(store, products) {
  const authored = parseJsonColumn(store.store_hero_slides, null);
  if (Array.isArray(authored) && authored.length) {
    return authored
      .filter((slide) => slide && (slide.title || slide.image))
      .slice(0, 6)
      .map((slide) => ({
        badge: slide.badge || "FEATURED",
        title: slide.title || store.shop_name,
        subtitle: slide.subtitle || "",
        image: slide.image || null,
        ctaLabel: slide.ctaLabel || "Shop Now",
      }));
  }

  const BADGES = ["HOT DEALS", "NEW ARRIVAL", "BEST VALUE", "TOP PICK", "IN STOCK NOW"];
  const candidates = [
    ...products.filter((p) => p.featured && p.image),
    ...products.filter((p) => !p.featured && p.image && p.inStock),
  ].slice(0, 5);

  if (!candidates.length) {
    return [
      {
        badge: "WELCOME",
        title: store.store_headline || `${store.shop_name} — now open online`,
        subtitle:
          store.store_tagline ||
          "Browse our catalogue, then order on WhatsApp or have it delivered to your door.",
        image: store.logo_url || null,
        ctaLabel: "Browse Products",
      },
    ];
  }

  return candidates.map((product, index) => ({
    badge: BADGES[index % BADGES.length],
    title: product.name,
    subtitle:
      product.description ||
      `${product.brand ? `${product.brand} · ` : ""}Available now at ${store.shop_name}. Order today for fast delivery.`,
    image: product.image,
    ctaLabel: "Shop Now",
    productId: product.id,
  }));
}

function deriveCategories(products) {
  const map = new Map();
  for (const product of products) {
    const name = product.category || "General";
    if (!map.has(name)) {
      map.set(name, { name, slug: slugify(name) || "general", count: 0, image: null });
    }
    const entry = map.get(name);
    entry.count += 1;
    if (!entry.image && product.image) entry.image = product.image;
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

function deriveBrands(products) {
  const map = new Map();
  for (const product of products) {
    if (!product.brand) continue;
    map.set(product.brand, (map.get(product.brand) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

function buildTrustBadges(store) {
  const freeOver = minFreeDelivery(store);
  return [
    { icon: "shield-check", title: "Genuine Products", detail: "Every item verified before sale" },
    {
      icon: "truck",
      title: freeOver > 0 ? "Free Delivery Available" : "Fast Delivery",
      detail: freeOver > 0
        ? `Free on orders over ${freeOver.toLocaleString("en-RW")} RWF`
        : store.store_delivery_note || "Delivery across Rwanda",
    },
    { icon: "lock", title: "Secure Payment", detail: "Mobile money, cash or bank transfer" },
    { icon: "award", title: "Fair Pricing", detail: "Clear prices, no hidden charges" },
    { icon: "message-circle", title: "Customer Support", detail: store.store_hours || "Mon–Sat, 8am–6pm" },
  ];
}

function buildStorePayload(store, productRows) {
  const products = productRows.map(shapeProduct);
  const whatsapp = normalizePhone(store.store_whatsapp || store.shop_phone || store.owner_phone);
  const socials = parseJsonColumn(store.store_socials, {});

  return {
    store: {
      slug: store.store_slug || `store-${store.owner_id}`,
      name: store.shop_name || store.owner_name || "Inzira Store",
      tagline: store.store_tagline || "Quality products, honest prices, fast delivery.",
      headline: store.store_headline || null,
      about:
        store.store_about ||
        `${store.shop_name || "Our shop"} serves customers across Rwanda with a carefully selected range of products. Visit us in store or order online.`,
      announcement: store.store_announcement || null,
      logo: store.logo_url || null,
      address: store.shop_address || store.owner_district || "Kigali, Rwanda",
      phone: store.shop_phone || store.owner_phone || null,
      email: store.shop_email || store.owner_email || null,
      whatsapp,
      hours: store.store_hours || "Mon–Sat, 8am–6pm",
      deliveryNote: store.store_delivery_note || "Delivery available across Rwanda.",
      currency: store.currency || "RWF",
      // An RRA TIN on the settings row means this is a registered business that
      // issues EBM receipts, which is what the badge actually claims.
      verified: Boolean(String(store.tin_number || "").trim()),
      delivery: {
        fee: baseDeliveryFee(store),
        freeOver: minFreeDelivery(store),
        zones: deliveryZones(store),
        pickupAvailable: pickupEnabled(store),
      },
      socials: {
        facebook: socials.facebook || null,
        instagram: socials.instagram || null,
        tiktok: socials.tiktok || null,
        twitter: socials.twitter || null,
      },
      theme: {
        brand: store.store_brand_color || DEFAULT_BRAND_COLOR,
        accent: store.store_accent_color || DEFAULT_ACCENT_COLOR,
      },
      template: store.store_template || "modern_retail",
    },
    heroSlides: deriveHeroSlides(store, products),
    categories: deriveCategories(products),
    brands: deriveBrands(products),
    trustBadges: buildTrustBadges(store),
    products,
  };
}

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

class StorefrontValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

// A settings row is only written when an SME saves the main settings form, but a
// storefront has to work with zero configuration. Create the minimal row so the
// slug and the storefront fields have somewhere to live.
async function ensureSettingsRow(ownerId, shopName) {
  await pool
    .query(
      `INSERT INTO settings (owner_id, shop_name)
       VALUES ($1, $2)
       ON CONFLICT (owner_id) DO NOTHING`,
      [ownerId, shopName || "My Store"]
    )
    .catch(() => {});
}

// Guarantees the owner has a slug so the dashboard can always show the live URL,
// even for accounts created before the storefront existed.
async function ensureSlug(ownerId, shopName) {
  const { rows } = await pool.query("SELECT store_slug FROM settings WHERE owner_id=$1", [ownerId]);
  if (rows[0]?.store_slug) return rows[0].store_slug;

  if (!rows.length) await ensureSettingsRow(ownerId, shopName);

  const slug = await generateSlug(shopName, ownerId);
  await pool
    .query("UPDATE settings SET store_slug=$1 WHERE owner_id=$2 AND store_slug IS NULL", [slug, ownerId])
    .catch(() => {});

  // Read back so a concurrent writer's slug wins instead of being reported twice.
  const { rows: [saved] } = await pool
    .query("SELECT store_slug FROM settings WHERE owner_id=$1", [ownerId])
    .catch(() => ({ rows: [] }));
  return saved?.store_slug || slug;
}

function sanitizeHeroSlides(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((slide) => slide && typeof slide === "object")
    .slice(0, 6)
    .map((slide) => ({
      badge: String(slide.badge || "").slice(0, 40) || null,
      title: String(slide.title || "").slice(0, 160),
      subtitle: String(slide.subtitle || "").slice(0, 300) || null,
      image: String(slide.image || "").slice(0, 500) || null,
      ctaLabel: String(slide.ctaLabel || "").slice(0, 40) || null,
    }))
    .filter((slide) => slide.title || slide.image);
}

// Storing an empty array is meaningful: it means "no zones, use the flat fee".
function sanitizeDeliveryZones(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((zone) => zone && typeof zone === "object")
    .map((zone) => ({
      name: String(zone.name || "").trim().slice(0, 120),
      fee: Math.max(0, Math.min(10_000_000, Math.round(Number(zone.fee)) || 0)),
    }))
    .filter((zone) => zone.name)
    .slice(0, 20);
}

function sanitizeSocials(value) {
  const source = value && typeof value === "object" ? value : {};
  const out = {};
  for (const key of ["facebook", "instagram", "tiktok", "twitter"]) {
    const url = String(source[key] || "").trim().slice(0, 300);
    out[key] = /^https?:\/\//i.test(url) ? url : null;
  }
  return out;
}

// Writes only the storefront keys present in the request, leaving the rest of the
// settings row (and the main settings form) untouched.
async function saveStorefrontSettings(ownerId, body = {}) {
  await ensureStoreColumns();
  await ensureSettingsRow(ownerId, body.shop_name);

  const updates = [];
  const params = [];
  const push = (column, value) => {
    params.push(value);
    updates.push(`${column} = $${params.length}`);
  };

  if ("store_slug" in body) {
    const desired = slugify(body.store_slug);
    if (!desired || desired.length < 3) {
      throw new StorefrontValidationError("Website address must be at least 3 characters (letters, numbers and dashes).");
    }
    if (RESERVED_SLUGS.has(desired)) {
      throw new StorefrontValidationError(`"${desired}" is reserved. Please choose another website address.`);
    }
    const { rows } = await pool.query(
      "SELECT 1 FROM settings WHERE store_slug=$1 AND owner_id IS DISTINCT FROM $2 LIMIT 1",
      [desired, ownerId]
    );
    if (rows.length) {
      throw new StorefrontValidationError(`"${desired}" is already taken. Please choose another website address.`);
    }
    push("store_slug", desired);
  }

  for (const [key, column] of [
    ["store_headline", "store_headline"],
    ["store_tagline", "store_tagline"],
    ["store_about", "store_about"],
    ["store_announcement", "store_announcement"],
    ["store_delivery_note", "store_delivery_note"],
  ]) {
    if (key in body) push(column, body[key] ? String(body[key]).slice(0, 2000) : null);
  }

  if ("store_hours" in body) push("store_hours", body.store_hours ? String(body.store_hours).slice(0, 120) : null);
  if ("store_whatsapp" in body) push("store_whatsapp", normalizePhone(body.store_whatsapp));
  if ("store_published" in body) push("store_published", body.store_published !== false && body.store_published !== "false");
  if ("store_pickup_enabled" in body) {
    push("store_pickup_enabled", body.store_pickup_enabled !== false && body.store_pickup_enabled !== "false");
  }
  if ("store_template" in body) {
    const validTemplates = Object.keys(STORE_TEMPLATES);
    const chosen = String(body.store_template || "").trim().toLowerCase();
    if (validTemplates.includes(chosen)) {
      push("store_template", chosen);
    }
  }

  for (const key of ["store_delivery_fee", "store_min_free_delivery"]) {
    if (!(key in body)) continue;
    const amount = Math.round(Number(body[key]));
    if (!Number.isFinite(amount) || amount < 0) {
      throw new StorefrontValidationError("Delivery amounts must be whole numbers of RWF, and cannot be negative.");
    }
    push(key, Math.min(amount, 10_000_000));
  }

  if ("store_delivery_zones" in body) {
    push("store_delivery_zones", JSON.stringify(sanitizeDeliveryZones(body.store_delivery_zones)));
  }

  // Picking a preset just resolves to the two colour columns, so the rest of the
  // app keeps reading colours from one place and a preset is never a third source
  // of truth. An explicit colour in the same request wins over the preset.
  const preset = THEME_PRESETS[body.store_theme_preset] || null;
  for (const [key, presetKey] of [["store_brand_color", "brand"], ["store_accent_color", "accent"]]) {
    let color = null;
    if (key in body) {
      color = String(body[key] || "").trim();
      if (color && !HEX_COLOR.test(color)) {
        throw new StorefrontValidationError("Colours must be hex values such as #006C49.");
      }
    } else if (preset) {
      color = preset[presetKey];
    } else {
      continue;
    }
    push(key, color || (preset ? preset[presetKey] : null));
  }

  if ("store_hero_slides" in body) {
    push("store_hero_slides", JSON.stringify(sanitizeHeroSlides(body.store_hero_slides)));
  }
  if ("store_socials" in body) {
    push("store_socials", JSON.stringify(sanitizeSocials(body.store_socials)));
  }

  if (!updates.length) return null;

  params.push(ownerId);
  const { rows } = await pool.query(
    `UPDATE settings SET ${updates.join(", ")} WHERE owner_id = $${params.length} RETURNING *`,
    params
  );
  return rows[0] || null;
}

// Shape the storefront slice of a settings row for the authenticated dashboard.
function storefrontSettingsView(settingsRow, { baseUrl } = {}) {
  const row = settingsRow || {};
  const slug = row.store_slug || null;
  return {
    store_slug: slug,
    store_url: slug ? `${(baseUrl || "").replace(/\/$/, "")}/store/${slug}` : null,
    store_published: row.store_published !== false,
    store_headline: row.store_headline || null,
    store_tagline: row.store_tagline || null,
    store_about: row.store_about || null,
    store_announcement: row.store_announcement || null,
    store_brand_color: row.store_brand_color || DEFAULT_BRAND_COLOR,
    store_accent_color: row.store_accent_color || DEFAULT_ACCENT_COLOR,
    store_whatsapp: row.store_whatsapp || null,
    store_hours: row.store_hours || null,
    store_delivery_note: row.store_delivery_note || null,
    store_hero_slides: parseJsonColumn(row.store_hero_slides, []),
    store_socials: parseJsonColumn(row.store_socials, {}),
    store_delivery_fee: baseDeliveryFee(row),
    store_min_free_delivery: minFreeDelivery(row),
    store_pickup_enabled: pickupEnabled(row),
    // Always the resolved list, so the editor shows the defaults an SME is
    // actually charging rather than an empty grid it has to fill in first.
    store_delivery_zones: deliveryZones(row),
    theme_presets: Object.entries(THEME_PRESETS).map(([id, preset]) => ({ id, ...preset })),
    store_template: row.store_template || "modern_retail",
    available_templates: Object.values(STORE_TEMPLATES),
  };
}

module.exports = {
  DEFAULT_BRAND_COLOR,
  DEFAULT_ACCENT_COLOR,
  THEME_PRESETS,
  STORE_TEMPLATES,
  StorefrontValidationError,
  quoteDelivery,
  deliveryZones,
  ensureStoreColumns,
  ensureSettingsRow,
  slugify,
  generateSlug,
  ensureSlug,
  backfillSlugs,
  resolveStore,
  buildStorePayload,
  saveStorefrontSettings,
  storefrontSettingsView,
  normalizePhone,
  parseJsonColumn,
  autoProvisionStorefront,
  detectSectorProfile,
  getStarterProductsForSector,
};
