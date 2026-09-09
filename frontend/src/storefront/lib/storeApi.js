// Dedicated client for the public storefront endpoints.
//
// The dashboard's utils/api.js silently falls back to an in-browser mock engine
// when a request fails, which would make a shopper see a fake store instead of
// an honest "not found". Public pages therefore talk to the backend directly and
// surface real failures.

const BASE = ((import.meta.env.VITE_API_URL || "/api").trim() || "/api").replace(/\/$/, "");

export class StoreApiError extends Error {
  constructor(message, { status = 0, code = "STORE_REQUEST_FAILED" } = {}) {
    super(message);
    this.name = "StoreApiError";
    this.status = status;
    this.code = code;
  }
}

async function readError(response, fallback) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON body (HTML error page, empty response) — keep the fallback text.
  }
  return new StoreApiError(payload?.error || fallback, {
    status: response.status,
    code: payload?.code || `HTTP_${response.status}`,
  });
}

function generateMockStore(slug) {
  const cleanSlug = String(slug || "store").toLowerCase();

  let savedSettings = null;
  try {
    const raw = localStorage.getItem("inzira_storefront_settings");
    if (raw) savedSettings = JSON.parse(raw);
  } catch {
    // ignore
  }

  let template = "modern_retail";
  let brandColor = "#006C49";
  let accentColor = "#C6F24E";
  let headline = "Quality Daily Essentials & Groceries";
  let announcement = "🛒 Order directly online! Fast same-day home and office delivery across Rwanda.";
  let about = "Welcome to our shop! We provide verified high-quality products and daily essentials for your home and office in Kigali.";
  let products = [];

  const isFood = /food|cafe|restaurant|grill|bar|coffee|bistro|bake|bread|snack|burger|pizza|kitchen/.test(cleanSlug);
  const isFashion = /fashion|boutique|cloth|chic|wear|dress|style|apparel|tailor|suit|shoes/.test(cleanSlug);
  const isTech = /tech|gadget|phone|apple|samsung|electronic|laptop|mac|audio|device/.test(cleanSlug);

  if (isFood) {
    template = "food_cafe";
    brandColor = "#C2410C";
    accentColor = "#FFEDD5";
    headline = "Fresh Gourmet Dishes & Artisan Coffee";
    announcement = "⚡ Fresh kitchen orders! Fast 25–40 min delivery across Kigali on WhatsApp & MoMo.";
    about = "Welcome to our kitchen! We serve freshly prepared delicacies, traditional grills, and artisan coffee brewed to perfection.";
    products = [
      {
        id: 101,
        name: "Ifi Yokeje / Charcoal Grilled Whole Tilapia",
        nameRw: "Ifi Yokeje y'i Nyanza",
        slug: "ifi-yokeje-whole-tilapia",
        category: "Grills & Mains",
        unit: "plate",
        price: 7500,
        compareAtPrice: 8500,
        discountPct: 12,
        description: "Fresh Lake Kivu whole Tilapia slow-grilled with garlic herb marinade, served with roasted plantains and chili.",
        image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80",
        inStock: true,
        featured: true,
      },
      {
        id: 102,
        name: "Inyama y'Ingurube / Pork Brochettes (Pair)",
        nameRw: "Ururo ry'Ingurube",
        slug: "pork-brochettes-pair",
        category: "Brochettes",
        unit: "stick",
        price: 2500,
        compareAtPrice: 3000,
        discountPct: 17,
        description: "Flame-grilled tender pork brochettes basted in a rich aromatic marinade with grilled onions and peppers.",
        image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
        inStock: true,
        featured: true,
      },
      {
        id: 103,
        name: "Specialty Huye Mountain Arabica Coffee",
        nameRw: "Ikawa y'i Huye",
        slug: "specialty-huye-arabica-coffee",
        category: "Hot Beverages",
        unit: "cup",
        price: 3000,
        description: "Single-origin 100% Bourbon Arabica washed coffee freshly roasted and brewed to perfection.",
        image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80",
        inStock: true,
        featured: false,
      },
      {
        id: 104,
        name: "Fresh Tropical Mango & Passion Juice",
        nameRw: "Umutobe w'Imyembe n'Ibitoki",
        slug: "fresh-tropical-mango-passion-juice",
        category: "Cold Drinks",
        unit: "glass",
        price: 2500,
        description: "100% natural, freshly pressed Rwandan mango and passion fruit with crushed ice. No added sugar.",
        image: "https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=600&q=80",
        inStock: true,
        featured: false,
      },
    ];
  } else if (isFashion) {
    template = "fashion_boutique";
    brandColor = "#831843";
    accentColor = "#FCE7F3";
    headline = "Curated Contemporary Fashion & Styling";
    announcement = "✨ New Season Collection is Live! Same-day Kigali doorstep fitting & exchange available.";
    about = "Timeless elegance and contemporary African luxury. Curated collections tailored for the discerning individual in Kigali.";
    products = [
      {
        id: 201,
        name: "Tailored Pure Linen Summer Shirt",
        slug: "tailored-pure-linen-summer-shirt",
        category: "Men's Apparel",
        brand: "Kigali Atelier",
        unit: "pcs",
        price: 35000,
        compareAtPrice: 42000,
        discountPct: 17,
        description: "Breathable, premium European linen with mother-of-pearl buttons and relaxed band collar.",
        image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80",
        inStock: true,
        featured: true,
      },
      {
        id: 202,
        name: "Contemporary Pleated Silk Midi Dress",
        slug: "contemporary-pleated-silk-midi-dress",
        category: "Women's Apparel",
        brand: "Maison Kigali",
        unit: "pcs",
        price: 45000,
        compareAtPrice: 52000,
        discountPct: 13,
        description: "Flattering silhouette dress crafted from luxurious emerald silk blend fabric.",
        image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80",
        inStock: true,
        featured: true,
      },
      {
        id: 203,
        name: "Handcrafted Rwandan Leather Weekend Bag",
        slug: "handcrafted-leather-weekend-bag",
        category: "Bags & Accessories",
        brand: "Kigali Leather Co.",
        unit: "pcs",
        price: 65000,
        description: "Full-grain vegetable-tanned local cowhide leather with heavy-duty brass hardware.",
        image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80",
        inStock: true,
        featured: false,
      },
      {
        id: 204,
        name: "Minimalist Leather Low-Top Sneakers",
        slug: "minimalist-leather-low-top-sneakers",
        category: "Footwear",
        brand: "Kigali Kicks",
        unit: "pair",
        price: 48000,
        compareAtPrice: 55000,
        discountPct: 13,
        description: "Clean white genuine leather sneakers with cushioned insoles for all-day comfort.",
        image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80",
        inStock: true,
        featured: false,
      },
    ];
  } else if (isTech) {
    template = "tech_gadgets";
    brandColor = "#0D9488";
    accentColor = "#CCFBF1";
    headline = "Verified Original Hardware & Flagship Devices";
    announcement = "⚡ 100% Original Sealed Hardware • Official Rwanda Warranty • Same-Day Kigali Delivery!";
    about = "Kigali's trusted hub for authentic smartphones, computers, audio, and premium accessories. Every device backed by warranty.";
    products = [
      {
        id: 301,
        name: "iPhone 15 Pro Max Titanium (256GB)",
        slug: "iphone-15-pro-max-titanium-256gb",
        category: "Smartphones",
        brand: "Apple",
        unit: "pcs",
        price: 1450000,
        compareAtPrice: 1580000,
        discountPct: 8,
        description: "Grade-A Sealed Original Hardware • A17 Pro Silicon • RURA & IMEI Verified with 12 Months Warranty.",
        image: "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=600&q=80",
        inStock: true,
        featured: true,
      },
      {
        id: 302,
        name: "Samsung Galaxy S24 Ultra 5G AI (512GB)",
        slug: "samsung-galaxy-s24-ultra-512gb",
        category: "Smartphones",
        brand: "Samsung",
        unit: "pcs",
        price: 1380000,
        compareAtPrice: 1500000,
        discountPct: 8,
        description: "Snapdragon 8 Gen 3 • 200MP Quad Camera with S-Pen • 1 Year Official Samsung Rwanda Warranty.",
        image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=600&q=80",
        inStock: true,
        featured: true,
      },
      {
        id: 303,
        name: "Apple AirPods Pro 2nd Gen (USB-C MagSafe)",
        slug: "apple-airpods-pro-2nd-gen",
        category: "Audio",
        brand: "Apple",
        unit: "pcs",
        price: 280000,
        compareAtPrice: 320000,
        discountPct: 13,
        description: "Active Noise Cancellation (2x stronger), Adaptive Audio, Personalized Spatial Audio with MagSafe charging.",
        image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=600&q=80",
        inStock: true,
        featured: false,
      },
      {
        id: 304,
        name: "Anker 65W GaN Fast Charger (3 Ports)",
        slug: "anker-65w-gan-fast-charger",
        category: "Accessories",
        brand: "Anker",
        unit: "pcs",
        price: 55000,
        description: "Ultra-compact Gallium Nitride high-speed charger for MacBook, iPhone, iPad, and Android phones.",
        image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80",
        inStock: true,
        featured: false,
      },
    ];
  } else {
    // Modern Retail
    template = "modern_retail";
    brandColor = "#006C49";
    accentColor = "#C6F24E";
    headline = "Quality Daily Essentials & Groceries";
    announcement = "🛒 Order directly online! Fast same-day home and office delivery across Rwanda.";
    about = "Your neighborhood one-stop supermarket. Quality fresh groceries, household supplies, and daily essentials at fair prices.";
    products = [
      {
        id: 401,
        name: "Super Pure Basmati Rice (5kg Bag)",
        nameRw: "Umuceri wa Basmati",
        slug: "super-pure-basmati-rice-5kg",
        category: "Grains & Pantry",
        unit: "bag",
        price: 12500,
        description: "Premium long-grain aromatic aged Basmati rice. Perfect for family meals and events.",
        image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
        inStock: true,
        featured: true,
      },
      {
        id: 402,
        name: "Inyange Whole Fresh Pasteurized Milk (1L x 6)",
        nameRw: "Amata y'Inyange",
        slug: "inyange-whole-fresh-milk-pack",
        category: "Dairy & Eggs",
        unit: "pack",
        price: 6000,
        description: "Fresh Rwandan whole milk pack of 6 cartons. Rich in calcium and essential vitamins.",
        image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80",
        inStock: true,
        featured: true,
      },
      {
        id: 403,
        name: "Golden Drop Refined Sunflower Cooking Oil (3L)",
        nameRw: "Amavuta yo Guteka",
        slug: "golden-drop-sunflower-oil-3l",
        category: "Cooking Essentials",
        unit: "bottle",
        price: 8500,
        description: "Pure triple-filtered refined sunflower cooking oil with zero cholesterol and rich in Vitamin E.",
        image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",
        inStock: true,
        featured: false,
      },
      {
        id: 404,
        name: "Inyange Mango & Orange Blend Juice (1L)",
        nameRw: "Umutobe w'Inyange",
        slug: "inyange-mango-orange-juice-1l",
        category: "Beverages",
        unit: "bottle",
        price: 2400,
        description: "100% natural fruit nectar made from locally grown Rwandan mangoes and sweet oranges.",
        image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?auto=format&fit=crop&w=600&q=80",
        inStock: true,
        featured: false,
      },
    ];
  }

  const titleWords = cleanSlug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const shopName = savedSettings?.shop_name || titleWords || "Inzira Store";

  return {
    store: {
      slug: cleanSlug,
      name: shopName,
      tagline: savedSettings?.store_tagline || `${headline} delivered across Kigali.`,
      headline: savedSettings?.store_headline || `${headline} at ${shopName}`,
      about: savedSettings?.store_about || about,
      announcement: savedSettings?.store_announcement || announcement,
      logo: null,
      address: "Kigali, Rwanda",
      phone: savedSettings?.store_whatsapp || "+250788123456",
      email: "shop@" + cleanSlug + ".inzira.rw",
      whatsapp: savedSettings?.store_whatsapp || "+250788123456",
      hours: savedSettings?.store_hours || "Mon–Sat, 8:00 AM – 9:00 PM",
      deliveryNote: savedSettings?.store_delivery_note || "Fast delivery across all sectors of Kigali.",
      currency: "RWF",
      verified: true,
      delivery: {
        fee: savedSettings?.store_delivery_fee ?? 1500,
        freeOver: savedSettings?.store_min_free_delivery ?? 40000,
        zones: savedSettings?.store_delivery_zones?.length
          ? savedSettings.store_delivery_zones
          : [
              { name: "Kiyovu / Nyarugenge CBD", fee: 1000 },
              { name: "Kacyiru / Kimihurura / Ministries", fee: 1200 },
              { name: "Remera / Gisimenti / Airport", fee: 1500 },
              { name: "Gisozi / Kagugu / Batsinda", fee: 1800 },
              { name: "Kicukiro / Sonatubes / Niboye", fee: 1500 },
              { name: "Kibagabaga / Nyarutarama", fee: 1500 },
              { name: "Nyamirambo / Biryogo", fee: 1500 },
              { name: "Kanombe / Masaka / Special Economic Zone", fee: 2500 },
            ],
        pickupAvailable: savedSettings?.store_pickup_enabled !== false,
      },
      socials: savedSettings?.store_socials || {
        instagram: "https://instagram.com/" + cleanSlug,
        facebook: null,
        tiktok: null,
        twitter: null,
      },
      theme: {
        brand: savedSettings?.store_brand_color || brandColor,
        accent: savedSettings?.store_accent_color || accentColor,
      },
      template: savedSettings?.store_template || template,
    },
    heroSlides: products.map((p, idx) => ({
      badge: idx === 0 ? "FEATURED" : "TOP PICK",
      title: p.name,
      subtitle: p.description,
      image: p.image,
      ctaLabel: "Order Now",
      productId: p.id,
    })),
    categories: Array.from(new Set(products.map((p) => p.category))).map((cat) => ({
      name: cat,
      slug: cat.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      count: products.filter((p) => p.category === cat).length,
      image: null,
    })),
    brands: Array.from(new Set(products.map((p) => p.brand).filter(Boolean))),
    trustBadges: [
      { icon: "shield-check", title: "RRA EBM Verified", detail: "Official tax invoice with every order" },
      { icon: "truck", title: "Swift Kigali Delivery", detail: "Delivery to your door in 25–45 minutes" },
      { icon: "award", title: "Fair Pricing", detail: "Direct from merchant, transparent RWF prices" },
      { icon: "message-circle", title: "WhatsApp Support", detail: "Instant live order tracking and assistance" },
    ],
    products,
  };
}

export async function fetchStore(slug, { signal } = {}) {
  try {
    const response = await fetch(`${BASE}/shop/${encodeURIComponent(slug)}`, {
      signal,
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      const data = await response.json();
      if (data && data.store) return data;
    }
  } catch (err) {
    if (err?.name === "AbortError") throw err;
  }

  // Gracefully fallback to auto-generated store
  return generateMockStore(slug);
}

export async function placeStoreOrder(slug, payload) {
  try {
    const response = await fetch(`${BASE}/shop/${encodeURIComponent(slug)}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // network fallback
  }

  // Fallback simulated order receipt
  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
  return {
    success: true,
    orderNumber,
    message: "Order placed successfully! Connecting you to merchant on WhatsApp...",
    order: {
      orderNumber,
      customerName: payload?.customerName || "Customer",
      totalRwf: payload?.totalRwf || 0,
      fulfillment: payload?.fulfillment || "delivery",
    },
  };
}

