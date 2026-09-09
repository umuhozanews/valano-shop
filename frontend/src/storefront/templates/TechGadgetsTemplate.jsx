import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Cpu,
  Smartphone,
  Laptop,
  Gamepad2,
  Headphones,
  ShieldCheck,
  CheckCircle2,
  MessageCircle,
  Zap,
  Plus,
  Check,
  Search,
  ArrowRight,
  BatteryCharging,
  Layers,
  Sparkles
} from "lucide-react";
import { useStore } from "../StoreContext";
import { formatMoney, whatsappLink } from "../lib/format";
import { ProductImage } from "../components/Bits";
import StoreSeo from "../components/StoreSeo";

export default function TechGadgetsTemplate() {
  const { store, products, categories, currency, cart, base } = useStore();
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const brandList = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return ["all", ...Array.from(set)];
  }, [products]);

  const flagshipHero = useMemo(() => {
    return products.find((p) => p.featured && p.image) || products[0] || null;
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchBrand = selectedBrand === "all" || p.brand === selectedBrand;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q);
      return matchBrand && matchSearch;
    });
  }, [products, selectedBrand, searchQuery]);

  return (
    <div className="space-y-10 pb-20">
      <StoreSeo store={store} />

      {/* 1. BENTO GRID TECH HERO */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Flagship Hero Card (8 Cols) */}
        <div className="lg:col-span-8 rounded-3xl bg-slate-950 text-white p-6 sm:p-10 flex flex-col justify-between relative overflow-hidden shadow-xl border border-slate-800">
          <div className="relative z-10 space-y-3 max-w-lg">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider">
                ⚡ ORIGINAL HARDWARE
              </span>
              <span className="text-xs text-slate-400">100% Sealed & Untouched</span>
            </div>

            <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              {flagshipHero?.name || store.headline || "Flagship Tech Hub"}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {flagshipHero?.description || store.tagline || "Verified genuine smartphones, workstations, and pro audio gear with official Rwanda warranty."}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              {flagshipHero && (
                <div className="text-2xl font-black text-teal-400 font-display">
                  {formatMoney(flagshipHero.price, currency)}
                </div>
              )}

              {flagshipHero && (
                <button
                  type="button"
                  onClick={() => {
                    cart.add(flagshipHero.id, 1);
                    cart.open();
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-teal-500 hover:bg-teal-400 text-slate-950 px-6 py-2.5 text-xs font-black uppercase tracking-wider transition active:scale-95 shadow-lg"
                >
                  <Zap size={14} className="fill-slate-950" />
                  <span>Order Unit</span>
                </button>
              )}
            </div>
          </div>

          {/* Hero Product Image */}
          {flagshipHero?.image && (
            <div className="mt-6 sm:mt-0 sm:absolute sm:right-4 sm:bottom-4 w-56 h-56 sm:w-72 sm:h-72 opacity-90 transition-transform duration-500 hover:scale-105">
              <img
                src={flagshipHero.image}
                alt={flagshipHero.name}
                className="h-full w-full object-contain drop-shadow-2xl"
              />
            </div>
          )}
        </div>

        {/* Bento Side Cards (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Bento Block 1: Warranty & RURA Guarantee */}
          <div className="flex-1 rounded-3xl bg-slate-900 border border-slate-800 p-6 text-white flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                <ShieldCheck size={22} />
              </div>
              <h3 className="font-bold text-base text-white">RURA & IMEI Certified</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every unit is network-cleared for MTN Rwanda, Airtel 4G/5G, and international eSIMs.
              </p>
            </div>
            <div className="pt-3 flex items-center gap-2 text-[11px] font-bold text-teal-400">
              <CheckCircle2 size={13} /> 12-Month Official Warranty
            </div>
          </div>

          {/* Bento Block 2: WhatsApp Tech Consultation */}
          <div className="rounded-3xl bg-emerald-950/60 border border-emerald-800/40 p-6 text-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <MessageCircle size={15} /> Tech Advisor
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs text-slate-300">
              Need advice comparing specs or checking real-time stock? Chat live with our technical consultant.
            </p>
            {store.whatsapp && (
              <a
                href={whatsappLink(store.whatsapp, `Hi ${store.name}, I'm looking for technical advice on your devices!`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 text-xs transition"
              >
                <span>Chat on WhatsApp</span>
                <ArrowRight size={13} />
              </a>
            )}
          </div>
        </div>
      </section>

      {/* 2. BRAND & SEARCH BAR */}
      <section className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between border-y border-store-line py-4">
        {/* Brand Selector */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {brandList.map((brand) => {
            const active = selectedBrand === brand;
            return (
              <button
                key={brand}
                type="button"
                onClick={() => setSelectedBrand(brand)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition capitalize ${
                  active
                    ? "bg-slate-950 text-white shadow-sm"
                    : "bg-store-soft text-store-fg hover:bg-slate-200 border border-store-line"
                }`}
              >
                {brand === "all" ? "All Brands" : brand}
              </button>
            );
          })}
        </div>

        {/* Live Search */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-store-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models, specs..."
            className="w-full rounded-full border border-store-line bg-store-card pl-9 pr-4 py-2 text-xs text-store-fg placeholder:text-store-muted focus:border-store-brand focus:outline-none"
          />
        </div>
      </section>

      {/* 3. TECH HARDWARE CATALOG */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-store-fg">
            Verified Hardware Inventory
          </h2>
          <span className="text-xs font-semibold text-store-muted">
            {filteredProducts.length} devices available
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredProducts.map((device) => {
            const inCart = cart.has(device.id);

            return (
              <div
                key={device.id}
                className="group flex flex-col justify-between rounded-2xl bg-store-card border border-store-line p-4 transition hover:shadow-lg hover:border-teal-500/50"
              >
                <div>
                  {/* Photo with Spec Tag */}
                  <Link
                    to={`${base}/product/${device.slug}`}
                    className="relative block aspect-square overflow-hidden rounded-xl bg-slate-900/5 p-4 flex items-center justify-center"
                  >
                    <ProductImage
                      src={device.image}
                      alt={device.name}
                      className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                    />
                    {device.discountPct > 0 && (
                      <span className="absolute left-2.5 top-2.5 rounded-md bg-teal-600 px-2 py-0.5 text-[10px] font-black text-white">
                        SAVE {device.discountPct}%
                      </span>
                    )}
                    {device.brand && (
                      <span className="absolute right-2.5 top-2.5 rounded-md bg-slate-950/80 px-2 py-0.5 text-[9px] font-mono font-bold text-slate-200">
                        {device.brand}
                      </span>
                    )}
                  </Link>

                  {/* Device Info */}
                  <div className="mt-3 space-y-1">
                    <Link
                      to={`${base}/product/${device.slug}`}
                      className="font-bold text-xs text-store-fg line-clamp-2 hover:text-store-brand transition leading-snug"
                    >
                      {device.name}
                    </Link>

                    {device.description && (
                      <p className="text-[11px] text-store-muted line-clamp-2 leading-relaxed">
                        {device.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Pricing & Cart */}
                <div className="mt-4 pt-3 border-t border-store-line/60 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-extrabold text-store-fg font-display">
                      {formatMoney(device.price, currency)}
                    </span>
                    {device.compareAtPrice && (
                      <span className="block text-[10px] text-store-muted line-through">
                        {formatMoney(device.compareAtPrice, currency)}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!device.inStock}
                    onClick={() => {
                      cart.add(device.id, 1);
                      cart.open();
                    }}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition shadow-sm ${
                      device.inStock
                        ? inCart
                          ? "bg-teal-50 text-teal-700 border border-teal-300"
                          : "bg-slate-950 hover:bg-slate-800 text-white active:scale-95"
                        : "bg-store-soft text-store-muted cursor-not-allowed"
                    }`}
                  >
                    {inCart ? <Check size={13} /> : <Plus size={13} />}
                    <span>{inCart ? "Added" : "Cart"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. SECURITY & VERIFICATION FOOTER BANNER */}
      <section className="rounded-3xl bg-slate-950 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">Rwanda EBM Verified Merchant</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Official tax-compliant receipts, transparent serialized warranty, and safe delivery dispatch.
            </p>
          </div>
        </div>

        {store.whatsapp && (
          <a
            href={whatsappLink(store.whatsapp, `Hi ${store.name}, I want to confirm stock availability for delivery!`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-5 py-2.5 text-xs transition shrink-0"
          >
            <MessageCircle size={15} /> WhatsApp Dispatch
          </a>
        )}
      </section>
    </div>
  );
}
