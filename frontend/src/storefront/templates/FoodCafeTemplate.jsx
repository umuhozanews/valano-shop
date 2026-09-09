import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  UtensilsCrossed,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Plus,
  Minus,
  Check,
  ShoppingBag,
  Sparkles,
  Flame,
  Coffee,
  ChefHat,
  ArrowRight
} from "lucide-react";
import { useStore } from "../StoreContext";
import { formatMoney, whatsappLink, telLink } from "../lib/format";
import { ProductImage } from "../components/Bits";
import StoreSeo from "../components/StoreSeo";

export default function FoodCafeTemplate() {
  const { store, products, categories, currency, cart, base, home } = useStore();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const activeCategoryList = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["all", ...Array.from(set)];
  }, [products]);

  const filteredDishes = useMemo(() => {
    return products.filter((dish) => {
      const matchesCat = selectedCategory === "all" || dish.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        dish.name.toLowerCase().includes(q) ||
        dish.nameRw?.toLowerCase().includes(q) ||
        dish.description?.toLowerCase().includes(q) ||
        dish.category?.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const waOrderUrl = useMemo(() => {
    const msg = `Hello ${store.name}, I would like to order from your menu!`;
    return whatsappLink(store.whatsapp || store.phone, msg);
  }, [store]);

  const telUrl = useMemo(() => telLink(store.phone || store.whatsapp), [store]);

  return (
    <div className="space-y-8 pb-24">
      <StoreSeo store={store} />

      {/* 1. RESTAURANT & CAFE HERO BANNER */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-store-brand via-store-brand/95 to-store-fg text-store-brand-fg p-6 sm:p-10 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-white">
              <ChefHat size={14} /> Fresh Kitchen & Bar
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-amber-400/90 text-slate-950 px-3 py-1 font-extrabold">
              <Flame size={14} className="fill-amber-950 stroke-none" /> Kitchen Open
            </span>
          </div>

          <h1 className="font-store-serif text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            {store.headline || store.name}
          </h1>

          <p className="text-sm sm:text-base leading-relaxed text-white/85 max-w-2xl">
            {store.about || store.tagline || "Authentic freshly prepared meals, artisanal bakery goods, and specialty drinks crafted with care."}
          </p>

          {/* Quick Logistics Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs font-semibold text-white/90">
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-sm px-3.5 py-2.5">
              <Clock size={16} className="text-amber-300 shrink-0" />
              <span>Prep: 25–40 mins</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-sm px-3.5 py-2.5">
              <MapPin size={16} className="text-amber-300 shrink-0" />
              <span className="truncate">{store.address || "Kigali Delivery & Dine-in"}</span>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-sm px-3.5 py-2.5">
              <Coffee size={16} className="text-amber-300 shrink-0" />
              <span>{store.hours || "Open Today"}</span>
            </div>
          </div>

          {/* Call & WhatsApp CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {waOrderUrl && (
              <a
                href={waOrderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 text-xs transition shadow-md active:scale-95"
              >
                <MessageCircle size={15} /> Order on WhatsApp
              </a>
            )}
            {telUrl && (
              <a
                href={telUrl}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold px-5 py-2.5 text-xs transition active:scale-95"
              >
                <Phone size={14} /> Call Restaurant
              </a>
            )}
          </div>
        </div>

        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none flex items-center justify-center">
          <UtensilsCrossed className="w-80 h-80 text-white stroke-[1]" />
        </div>
      </section>

      {/* 2. SEARCH & STICKY MENU CATEGORIES */}
      <section className="sticky top-16 z-20 space-y-3 bg-store-bg/95 backdrop-blur-md py-3 border-b border-store-line">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Menu Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {activeCategoryList.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition capitalize ${
                    active
                      ? "bg-store-brand text-store-brand-fg shadow-sm"
                      : "bg-store-soft text-store-fg hover:bg-store-brand/10 border border-store-line/80"
                  }`}
                >
                  {cat === "all" ? "🍽️ Full Menu" : cat}
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-store-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes & drinks..."
              className="w-full rounded-full border border-store-line bg-store-card pl-9 pr-4 py-2 text-xs text-store-fg placeholder:text-store-muted focus:border-store-brand focus:outline-none focus:ring-1 focus:ring-store-brand"
            />
          </div>
        </div>
      </section>

      {/* 3. MENU DISHES GRID */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-store-serif text-xl font-bold text-store-fg capitalize">
            {selectedCategory === "all" ? "Our Kitchen Specials & Menu" : `${selectedCategory} Dishes`}
          </h2>
          <span className="text-xs font-semibold text-store-muted">
            {filteredDishes.length} {filteredDishes.length === 1 ? "item" : "items"}
          </span>
        </div>

        {filteredDishes.length === 0 ? (
          <div className="py-16 text-center rounded-3xl border border-dashed border-store-line bg-store-soft p-8">
            <UtensilsCrossed size={36} className="mx-auto text-store-muted" />
            <h3 className="mt-3 text-sm font-bold text-store-fg">No dishes found</h3>
            <p className="mt-1 text-xs text-store-muted">Try choosing another menu category or clearing your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDishes.map((dish) => {
              const inCart = cart.has(dish.id);
              const cartLine = cart.lines.find((l) => l.id === dish.id);
              const qty = cartLine?.quantity || 0;

              return (
                <div
                  key={dish.id}
                  className="group flex flex-col justify-between rounded-2xl border border-store-line bg-store-card p-3.5 transition hover:shadow-md hover:border-store-brand/40"
                >
                  <div className="flex gap-3.5">
                    {/* Dish Photo */}
                    <Link
                      to={`${base}/product/${dish.slug}`}
                      className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-store-soft"
                    >
                      <ProductImage
                        src={dish.image}
                        alt={dish.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {dish.featured && (
                        <span className="absolute top-1 left-1 rounded-md bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-slate-950 uppercase">
                          Chef's Pick
                        </span>
                      )}
                    </Link>

                    {/* Dish Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <Link
                          to={`${base}/product/${dish.slug}`}
                          className="font-bold text-sm text-store-fg line-clamp-1 hover:text-store-brand transition"
                        >
                          {dish.name}
                        </Link>
                      </div>

                      {dish.nameRw && (
                        <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 italic">
                          {dish.nameRw}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-store-muted line-clamp-2 leading-relaxed">
                        {dish.description || "Freshly prepared with authentic ingredients."}
                      </p>
                    </div>
                  </div>

                  {/* Price & Quantity Controls */}
                  <div className="mt-3.5 pt-2.5 border-t border-store-line/60 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-extrabold text-store-brand font-display">
                        {formatMoney(dish.price, currency)}
                      </span>
                      {dish.compareAtPrice && (
                        <span className="ml-2 text-xs text-store-muted line-through">
                          {formatMoney(dish.compareAtPrice, currency)}
                        </span>
                      )}
                    </div>

                    {/* Direct +/- Counter */}
                    {qty > 0 ? (
                      <div className="flex items-center gap-1 rounded-full bg-store-brand/10 p-1 border border-store-brand/30">
                        <button
                          type="button"
                          onClick={() => cart.setQuantity(dish.id, qty - 1)}
                          aria-label="Reduce quantity"
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-store-card text-store-brand hover:bg-store-brand hover:text-white transition shadow-sm"
                        >
                          <Minus size={12} strokeWidth={2.5} />
                        </button>
                        <span className="w-5 text-center text-xs font-extrabold text-store-brand">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => cart.setQuantity(dish.id, qty + 1)}
                          aria-label="Increase quantity"
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-store-brand text-store-brand-fg hover:opacity-90 transition shadow-sm"
                        >
                          <Plus size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!dish.inStock}
                        onClick={() => {
                          cart.add(dish.id, 1);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition shadow-sm ${
                          dish.inStock
                            ? "bg-store-brand text-store-brand-fg hover:opacity-90 active:scale-95"
                            : "bg-store-soft text-store-muted cursor-not-allowed"
                        }`}
                      >
                        <Plus size={13} strokeWidth={2.5} />
                        <span>{dish.inStock ? "Add" : "Sold out"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. SPECIAL DIETARY & CATERING INSTRUCTIONS */}
      <section className="rounded-3xl border border-store-line bg-store-soft/60 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-store-serif text-lg font-bold text-store-fg flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" /> Need Special Dietary or Group Catering?
            </h3>
            <p className="text-xs text-store-muted max-w-xl">
              We cater for birthdays, corporate lunches, vegetarian preferences, and customized meal prep. Chat with our head chef directly on WhatsApp.
            </p>
          </div>

          {waOrderUrl && (
            <a
              href={waOrderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 text-xs transition shrink-0 shadow-md"
            >
              <MessageCircle size={15} /> Chat with Chef
            </a>
          )}
        </div>
      </section>

      {/* 5. FLOATING STICKY TRAY CHECKOUT BAR */}
      {cart.itemCount > 0 && (
        <aside
          aria-label="Order Tray"
          className="fixed bottom-4 inset-x-4 max-w-xl mx-auto z-40 animate-in slide-in-from-bottom-5"
        >
          <div className="flex items-center justify-between rounded-full bg-store-fg text-store-bg p-3 px-5 shadow-2xl border-2 border-store-brand/40">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-store-brand text-store-brand-fg font-extrabold text-xs shadow-md">
                {cart.itemCount}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold leading-tight">Order Tray</p>
                <p className="text-xs text-store-bg/80 font-display font-extrabold">
                  {formatMoney(cart.subtotal, currency)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => cart.open()}
              className="inline-flex items-center gap-2 rounded-full bg-store-brand px-5 py-2 text-xs font-bold text-store-brand-fg hover:opacity-95 transition active:scale-95 shadow-md"
            >
              <span>Review Order</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
