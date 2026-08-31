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

// Resolves a public URL segment to an SME. Accepts the slug, a numeric owner id,
// or the "store-<id>" form so links keep working if a slug is later renamed.
async function resolveStore(slugOrId) {
  const raw = String(slugOrId || "").trim().toLowerCase();
  if (!raw) return null;

  const bySlug = await pool.query(
    `SELECT s.*, u.name AS owner_name, u.email AS owner_email,
            u.phone AS owner_phone, u.district AS owner_district
       FROM settings s
       JOIN users u ON u.id = s.owner_id
      WHERE s.store_slug = $1
      LIMIT 1`,
    [raw]
  );
  if (bySlug.rows.length) return bySlug.rows[0];

  const idMatch = raw.match(/^(?:store-)?(\d+)$/);
  if (!idMatch) return null;

  const byOwner = await pool.query(
    `SELECT s.*, u.name AS owner_name, u.email AS owner_email,
            u.phone AS owner_phone, u.district AS owner_district
       FROM settings s
       JOIN users u ON u.id = s.owner_id
      WHERE s.owner_id = $1
      LIMIT 1`,
    [Number(idMatch[1])]
  );
  return byOwner.rows[0] || null;
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
  };
}

module.exports = {
  DEFAULT_BRAND_COLOR,
  DEFAULT_ACCENT_COLOR,
  THEME_PRESETS,
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
};
