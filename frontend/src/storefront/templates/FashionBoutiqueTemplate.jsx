import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ShoppingBag,
  ArrowUpRight,
  Heart,
  Plus,
  Check,
  Truck,
  ShieldCheck,
  RefreshCw,
  Search,
  Instagram,
  ArrowRight
} from "lucide-react";
import { useStore } from "../StoreContext";
import { formatMoney, whatsappLink } from "../lib/format";
import { ProductImage } from "../components/Bits";
import StoreSeo from "../components/StoreSeo";

export default function FashionBoutiqueTemplate() {
  const { store, products, categories, currency, cart, base } = useStore();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const activeCategoryList = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["all", ...Array.from(set)];
  }, [products]);

  const featuredItems = useMemo(() => {
    return products.filter((p) => p.featured || p.discountPct > 0).slice(0, 4);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === "all" || p.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="space-y-12 pb-20">
      <StoreSeo store={store} />

      {/* 1. EDITORIAL HIGH-FASHION HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-neutral-950 text-white shadow-2xl">
        <div className="relative z-10 px-6 py-16 sm:px-12 sm:py-24 max-w-2xl space-y-5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[11px] font-bold tracking-widest uppercase backdrop-blur-md">
            <Sparkles size={13} className="text-amber-300" /> New Season Collection
          </span>

          <h1 className="font-serif text-4xl sm:text-6xl font-light tracking-tight text-white leading-tight">
            {store.headline || `${store.name} Lookbook`}
          </h1>

          <p className="text-sm sm:text-base font-light text-neutral-300 leading-relaxed max-w-lg">
            {store.tagline || store.about || "Curated contemporary fashion, authentic footwear, and timeless boutique statements in Kigali."}
          </p>

          <div className="pt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("boutique-collection");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 rounded-full bg-white text-neutral-950 px-6 py-3 text-xs font-extrabold uppercase tracking-wider hover:bg-neutral-200 transition active:scale-95 shadow-lg"
            >
              <span>Explore Collection</span>
              <ArrowRight size={14} />
            </button>

            {store.whatsapp && (
              <a
                href={whatsappLink(store.whatsapp, `Hi ${store.name}, I would like styling consultation on your collection!`)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 backdrop-blur-sm px-5 py-3 text-xs font-semibold text-white hover:bg-white/15 transition active:scale-95"
              >
                <span>WhatsApp Stylist</span>
                <ArrowUpRight size={14} />
              </a>
            )}
          </div>
        </div>

        {/* Decorative Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-0" />
        {products[0]?.image && (
          <img
            src={products[0].image}
            alt="Hero Background"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-40 mix-blend-luminosity scale-105 transition-transform duration-1000 hover:scale-100"
          />
        )}
      </section>

      {/* 2. BOUTIQUE TRUST PILLARS */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-store-line/80 py-6">
        <div className="flex items-center gap-3.5 px-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-store-soft text-store-brand">
            <Truck size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-store-fg">Same-Day Fitting Dispatch</p>
            <p className="text-[11px] text-store-muted">Delivered to your door anywhere across Kigali</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 px-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-store-soft text-store-brand">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-store-fg">100% Verified Quality</p>
            <p className="text-[11px] text-store-muted">Authentic designer fabrics & premium finishes</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 px-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-store-soft text-store-brand">
            <RefreshCw size={20} />
          </div>
          <div>
            <p className="text-xs font-bold text-store-fg">Hassle-Free Size Exchange</p>
            <p className="text-[11px] text-store-muted">Fast swap if the size or fitting isn't perfect</p>
          </div>
        </div>
      </section>

      {/* 3. TRENDING PICKS / CURATOR HIGHLIGHTS */}
      {featuredItems.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-[11px] font-bold tracking-widest uppercase text-store-muted">Curator's Choice</span>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-store-fg">Trending Highlights</h2>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featuredItems.map((item) => (
              <div key={item.id} className="group relative flex flex-col">
                <Link
                  to={`${base}/product/${item.slug}`}
                  className="relative block aspect-[3/4] overflow-hidden rounded-2xl bg-store-soft"
                >
                  <ProductImage
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {item.discountPct > 0 && (
                    <span className="absolute left-3 top-3 rounded-full bg-neutral-950 px-2.5 py-1 text-[10px] font-black text-white">
                      -{item.discountPct}%
                    </span>
                  )}
                </Link>

                <div className="mt-3 space-y-1">
                  {item.brand && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-store-muted">{item.brand}</p>
                  )}
                  <Link
                    to={`${base}/product/${item.slug}`}
                    className="font-semibold text-xs text-store-fg line-clamp-1 hover:text-store-brand transition"
                  >
                    {item.name}
                  </Link>
                  <p className="text-xs font-bold text-store-brand font-display">
                    {formatMoney(item.price, currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. MAIN COLLECTION WITH CATEGORY FILTER */}
      <section id="boutique-collection" className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-store-line pb-4">
          <div>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-store-fg">
              The Full Boutique Collection
            </h2>
            <p className="text-xs text-store-muted mt-1">
              Browse {filteredProducts.length} pieces available for direct delivery
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-store-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search boutique..."
              className="w-full rounded-full border border-store-line bg-store-card pl-9 pr-4 py-2 text-xs text-store-fg placeholder:text-store-muted focus:border-store-brand focus:outline-none"
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {activeCategoryList.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                  active
                    ? "bg-neutral-950 text-white shadow-sm"
                    : "bg-store-soft text-store-fg hover:bg-neutral-200 border border-store-line/60"
                }`}
              >
                {cat === "all" ? "All Pieces" : cat}
              </button>
            );
          })}
        </div>

        {/* Products Portrait 3:4 Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => {
            const inCart = cart.has(product.id);

            return (
              <div
                key={product.id}
                className="group flex flex-col overflow-hidden rounded-2xl bg-store-card border border-store-line/70 transition hover:shadow-xl hover:border-store-brand/40"
              >
                {/* 3:4 Portrait Image */}
                <Link
                  to={`${base}/product/${product.slug}`}
                  className="relative aspect-[3/4] overflow-hidden bg-store-soft"
                >
                  <ProductImage
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {product.discountPct > 0 && (
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-neutral-950 px-2 py-0.5 text-[10px] font-black text-white">
                      -{product.discountPct}%
                    </span>
                  )}
                  {!product.inStock && (
                    <span className="absolute inset-x-0 bottom-0 bg-neutral-950/80 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-white">
                      Sold Out
                    </span>
                  )}
                </Link>

                {/* Details */}
                <div className="flex flex-1 flex-col p-3.5 sm:p-4">
                  {product.brand && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-store-muted">
                      {product.brand}
                    </span>
                  )}

                  <Link
                    to={`${base}/product/${product.slug}`}
                    className="font-serif text-sm font-semibold text-store-fg line-clamp-1 hover:text-store-brand transition"
                  >
                    {product.name}
                  </Link>

                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-extrabold text-store-brand font-display">
                        {formatMoney(product.price, currency)}
                      </span>
                      {product.compareAtPrice && (
                        <span className="ml-1.5 text-[11px] text-store-muted line-through">
                          {formatMoney(product.compareAtPrice, currency)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!product.inStock}
                      onClick={() => {
                        cart.add(product.id, 1);
                        cart.open();
                      }}
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition shadow-sm ${
                        product.inStock
                          ? inCart
                            ? "bg-store-brand text-store-brand-fg"
                            : "bg-store-soft hover:bg-store-brand hover:text-store-brand-fg text-store-fg"
                          : "bg-store-soft text-store-muted cursor-not-allowed"
                      }`}
                      aria-label="Add to bag"
                    >
                      {inCart ? <Check size={14} /> : <Plus size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. INSTAGRAM LOOKBOOK CTA */}
      <section className="rounded-3xl bg-store-soft p-8 text-center space-y-3 border border-store-line">
        <Instagram size={28} className="mx-auto text-store-brand" />
        <h3 className="font-serif text-xl font-bold text-store-fg">Follow Our Kigali Lookbook</h3>
        <p className="text-xs text-store-muted max-w-md mx-auto">
          Tag us on social media wearing {store.name} to be featured in our monthly community showcase.
        </p>
        {store.socials?.instagram && (
          <a
            href={store.socials.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-bold text-store-brand hover:underline pt-1"
          >
            <span>View on Instagram</span>
            <ArrowUpRight size={13} />
          </a>
        )}
      </section>
    </div>
  );
}
