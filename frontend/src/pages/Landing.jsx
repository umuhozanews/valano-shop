import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { ArrowUpRight, Instagram, Facebook, Youtube } from "lucide-react";
import { PRODUCTS } from "../data/products";
import { formatRWF } from "../utils/formatters";
import LandingNav from "../components/landing/LandingNav";

const CATS = ["ALL","SHIRTS","TROUSERS","DRESSES","JACKETS","HOODIES","SHOES","ACCESSORIES"];
const COLORS_F = ["All Colors","Black","White","Green","Blue","Red","Brown"];
const PRICE_F  = ["From RWF 0–50K","RWF 50K–100K","RWF 100K+"];

// ─── Filter Dropdown ──────────────────────────────────────────────────────────
function FilterSelect({ options }) {
  const [val, setVal] = useState(options[0]);
  return (
    <div className="relative">
      <select
        value={val}
        onChange={e => setVal(e.target.value)}
        className="appearance-none bg-white border border-[#e5e0d8] rounded-sm px-4 py-2 pr-8 text-[13px] text-[#1a1a1a] focus:outline-none focus:border-[#1B4332] cursor-pointer"
      >
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b7280] pointer-events-none" />
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ p }) {
  const [active, setActive] = useState(0);
  return (
    <div className="group">
      <Link to={`/product/${p.id}`} className="block">
        <div className="relative overflow-hidden rounded-sm mb-3" style={{ aspectRatio: "4/5" }}>
          <img
            src={p.img}
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {p.orig > p.price && (
            <span className="absolute top-2 left-2 text-[10px] font-bold bg-[#1B4332] text-white px-2 py-0.5 rounded-sm">
              SALE
            </span>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
        </div>
      </Link>

      <Link to={`/product/${p.id}`} className="block">
        <p className="text-[13px] font-medium text-[#1a1a1a] truncate mb-1.5 hover:text-[#1B4332] transition-colors">{p.name}</p>
      </Link>

      {/* Swatches */}
      <div className="flex items-center gap-1.5 mb-2">
        {p.swatches.map((s, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            title={p.swatchNames[i]}
            className="rounded-full border-2 transition-all"
            style={{
              width: 14, height: 14,
              backgroundColor: s,
              borderColor: active === i ? "#1B4332" : "transparent",
              outline: active === i ? "1px solid #1B4332" : "1px solid #ccc",
            }}
          />
        ))}
      </div>

      {/* Price */}
      <div className="flex items-center gap-2">
        <span className="text-[12px] text-[#9ca3af] line-through">{formatRWF(p.orig)}</span>
        <span className="text-[14px] font-bold text-[#1a1a1a]">{formatRWF(p.price)}</span>
      </div>
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function Landing() {
  const [searchParams] = useSearchParams();
  const qSearch = searchParams.get("search") || "";
  const qCat    = (searchParams.get("cat") || "").toUpperCase();

  const [activeCat, setActiveCat] = useState(qCat && CATS.includes(qCat) ? qCat : "ALL");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  // sync activeCat when URL cat param changes
  useEffect(() => {
    if (qCat && CATS.includes(qCat)) setActiveCat(qCat);
  }, [qCat]);

  const filtered = PRODUCTS.filter(p => {
    const matchCat = activeCat === "ALL" || p.cat.toUpperCase() === activeCat || p.cat.toUpperCase().startsWith(activeCat.replace(/S$/, ""));
    const matchSearch = !qSearch || p.name.toLowerCase().includes(qSearch.toLowerCase()) || p.cat.toLowerCase().includes(qSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  function handleSubscribe(e) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setSubscribed(true);
    setEmail("");
  }

  return (
    <div style={{ backgroundColor: "#F5F2ED", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <LandingNav />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-6 pt-6 pb-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[12px] text-[#9ca3af] mb-4">
          <span>HOME</span><span>›</span>
          <span>CLOTHING</span><span>›</span>
          <span className="font-medium" style={{ color: "#1B4332" }}>COLLECTION</span>
        </nav>

        {/* Headline */}
        <h1
          style={{ fontFamily: "'Bebas Neue', 'Inter', sans-serif", color: "#1B4332", letterSpacing: "0.02em", lineHeight: 1 }}
          className="text-[72px] sm:text-[100px] font-normal mb-4"
        >
          NEW ARRIVALS
        </h1>

        <p className="text-[14px] text-[#6b7280] max-w-xl mb-6 leading-relaxed">
          Discover premium clothing imported directly from China. From casual streetwear to
          formal suits — every piece is hand-picked for quality and style. Available at our
          Nyabugogo and Kimironko branches across Kigali.
        </p>

        {/* Search result note */}
        {qSearch && (
          <p className="mb-4 text-[14px] font-medium" style={{ color: "#1B4332" }}>
            Showing results for "{qSearch}" — {filtered.length} found
          </p>
        )}

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 mb-5">
          <FilterSelect options={["All Categories","T-Shirts","Trousers","Dresses","Jackets","Shoes","Accessories"]} />
          <FilterSelect options={COLORS_F} />
          <FilterSelect options={["All Sizes","XS","S","M","L","XL","XXL","30","32","34"]} />
          <FilterSelect options={PRICE_F} />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {CATS.map(c => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className="shrink-0 px-4 py-1.5 text-[11px] font-semibold tracking-wider rounded-sm border transition-colors"
              style={activeCat === c
                ? { backgroundColor: "#1B4332", color: "#fff",   borderColor: "#1B4332" }
                : { backgroundColor: "transparent", color: "#1a1a1a", borderColor: "#c8c2b8" }
              }
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── PRODUCT GRID ──────────────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-6 pb-16">
        <p className="text-[12px] text-[#9ca3af] mb-4">{filtered.length} products</p>

        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-[16px] text-gray-400 mb-4">No products found.</p>
            <button onClick={() => setActiveCat("ALL")} className="text-[12px] font-bold tracking-wider border-2 px-5 py-2 rounded-sm" style={{ borderColor: "#1B4332", color: "#1B4332" }}>
              SHOW ALL
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
            {filtered.map(p => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </div>

      {/* ── SUBSCRIBE ─────────────────────────────────────────────────────── */}
      <div className="border-t border-b py-16" style={{ borderColor: "#e5e0d8" }}>
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <h2 style={{ fontFamily: "'Bebas Neue', 'Inter', sans-serif", color: "#1B4332", letterSpacing: "0.02em" }}
              className="text-[56px] sm:text-[72px] font-normal leading-none">
              SUBSCRIBE US
            </h2>
            <div className="w-14 h-14 rounded-full border-2 border-[#1B4332] flex items-center justify-center" style={{ color: "#1B4332" }}>
              <ArrowUpRight size={22} />
            </div>
          </div>
          {subscribed ? (
            <p className="text-[14px] font-semibold" style={{ color: "#1B4332" }}>✓ Thank you for subscribing!</p>
          ) : (
            <form onSubmit={handleSubscribe} className="flex gap-0 w-full sm:w-auto sm:max-w-md">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="Your email address"
                className="flex-1 h-11 px-4 border border-[#c8c2b8] text-[13px] focus:outline-none focus:border-[#1B4332] bg-transparent"
                style={{ borderRadius: "2px 0 0 2px" }}
              />
              <button
                type="submit"
                className="h-11 px-5 text-[12px] font-bold tracking-wider text-white transition-colors"
                style={{ backgroundColor: "#1B4332", borderRadius: "0 2px 2px 0" }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor="#14532d"}
                onMouseLeave={e => e.currentTarget.style.backgroundColor="#1B4332"}
              >
                SUBSCRIBE
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ backgroundColor: "#F5F2ED" }}>
        <div className="max-w-[1400px] mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <p className="text-[20px] font-black tracking-widest mb-3" style={{ color: "#1B4332", fontFamily: "'Bebas Neue', sans-serif" }}>VALANO SHOP</p>
              <p className="text-[13px] text-[#6b7280] leading-relaxed mb-4">
                Premium clothing imported from China.<br/>Kigali, Rwanda — Nyabugogo & Kimironko.
              </p>
              <div className="flex gap-3">
                {[Instagram, Facebook, Youtube].map((Icon, i) => (
                  <button key={i} className="w-8 h-8 border border-[#c8c2b8] rounded-sm flex items-center justify-center text-[#6b7280] hover:border-[#1B4332] hover:text-[#1B4332] transition-colors">
                    <Icon size={14} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[12px] font-bold tracking-widest text-[#1a1a1a] mb-3 uppercase">Help & Information</p>
              <div className="space-y-2">
                {["Returns & Exchanges","Delivery Info","Size Guide","Gift Cards","Contact Us"].map(item => (
                  <p key={item} className="text-[13px] text-[#6b7280] hover:text-[#1B4332] cursor-pointer transition-colors">{item}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[12px] font-bold tracking-widest text-[#1a1a1a] mb-3 uppercase">About Us</p>
              <div className="space-y-2">
                {["Our Story","Branches","Wholesale Pricing","Privacy Policy","Terms of Use"].map(item => (
                  <p key={item} className="text-[13px] text-[#6b7280] hover:text-[#1B4332] cursor-pointer transition-colors">{item}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[12px] font-bold tracking-widest text-[#1a1a1a] mb-3 uppercase">Quick Questions</p>
              <div className="space-y-3">
                {["How do I order in bulk?","What payment methods?","Same-day delivery?"].map(q => (
                  <div key={q} className="flex items-start justify-between gap-2 pb-3 border-b" style={{ borderColor: "#e5e0d8" }}>
                    <p className="text-[13px] text-[#6b7280]">{q}</p>
                    <ArrowUpRight size={14} className="text-[#9ca3af] shrink-0 mt-0.5" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t gap-3" style={{ borderColor: "#e5e0d8" }}>
            <div className="flex gap-4">
              {["Terms","Privacy","Cookies","Legal"].map(item => (
                <span key={item} className="text-[11px] text-[#9ca3af] hover:text-[#1B4332] cursor-pointer transition-colors">{item}</span>
              ))}
            </div>
            <p className="text-[11px] text-[#9ca3af]">© 2026 VALANO SHOP. Kigali, Rwanda.</p>
            <Link to="/app/login" className="text-[11px] font-semibold border px-3 py-1 rounded-sm hover:bg-[#1B4332] hover:text-white transition-colors"
              style={{ borderColor: "#1B4332", color: "#1B4332" }}>
              STAFF LOGIN
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
