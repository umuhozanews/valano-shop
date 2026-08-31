import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { BadgeCheck, ChevronDown, Menu, Search, ShoppingCart, X } from "lucide-react";
import { useStore } from "../StoreContext";
import AnnouncementBar from "./AnnouncementBar";

function NavItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `rounded-full px-4 py-2 transition-all duration-200 hover:bg-store-brand/10 hover:text-store-brand ${
          isActive ? "bg-store-brand/10 text-store-brand" : ""
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function StoreHeader() {
  const { store, base, home, categories, cart } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const categoriesRef = useRef(null);

  useEffect(() => {
    if (!categoriesOpen) return undefined;
    const onPointerDown = (event) => {
      if (!categoriesRef.current?.contains(event.target)) setCategoriesOpen(false);
    };
    const onKeyDown = (event) => event.key === "Escape" && setCategoriesOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [categoriesOpen]);

  function submitSearch(event) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    navigate(`${base}/search?q=${encodeURIComponent(term)}`);
    setMobileSearchOpen(false);
    setMobileOpen(false);
  }

  const closeMenus = () => {
    setMobileOpen(false);
    setCategoriesOpen(false);
  };

  return (
    <header className="sticky top-0 z-40">
      <AnnouncementBar />

      <div className="px-3 pb-2 pt-1.5">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl border border-white/55 bg-store-card/85 shadow-[0_8px_32px_rgb(var(--store-brand)/0.12)] ring-1 ring-inset ring-white/60 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" aria-hidden="true" />

          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3 md:px-6">
            <Link to={home} className="flex shrink-0 items-center gap-2.5" onClick={closeMenus}>
              {store.logo ? (
                <img src={store.logo} alt={store.name} className="h-11 w-auto max-w-[150px] object-contain" />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-store-brand text-base font-extrabold text-store-brand-fg">
                  {store.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="flex min-w-0 flex-col">
                <span className="font-display flex items-center gap-1.5 text-base font-extrabold tracking-tight text-store-fg sm:text-lg">
                  <span className="max-w-[180px] truncate">{store.name}</span>
                  {store.verified && (
                    <BadgeCheck
                      size={16}
                      className="shrink-0 text-store-brand"
                      aria-label="Registered business"
                      title="Registered business — issues official EBM receipts"
                    />
                  )}
                </span>
                {store.address && (
                  <span className="hidden max-w-[200px] truncate text-[11px] text-store-muted sm:block">
                    {store.address}
                  </span>
                )}
              </span>
            </Link>

            <nav className="hidden items-center justify-center gap-1 text-sm font-medium text-store-fg/80 lg:flex">
              {categories.length > 0 && (
                <div className="relative" ref={categoriesRef}>
                  <button
                    type="button"
                    onClick={() => setCategoriesOpen((open) => !open)}
                    aria-expanded={categoriesOpen}
                    className="flex items-center gap-1.5 rounded-full px-4 py-2 transition-all duration-200 hover:bg-store-brand/10 hover:text-store-brand"
                  >
                    Categories
                    <ChevronDown size={14} className={`transition-transform ${categoriesOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>
                  {categoriesOpen && (
                    <div className="store-fade-up absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-store-line bg-store-card p-2 shadow-xl">
                      {categories.map((category) => (
                        <Link
                          key={category.slug}
                          to={`${base}/category/${category.slug}`}
                          onClick={closeMenus}
                          className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-store-fg/80 transition hover:bg-store-soft hover:text-store-brand"
                        >
                          <span className="truncate">{category.name}</span>
                          <span className="ml-2 shrink-0 text-xs text-store-muted">{category.count}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <NavItem to={`${base}/category/all`}>All Products</NavItem>
              <NavItem to={`${base}/about`}>About</NavItem>
              <NavItem to={`${base}/contact`}>Contact</NavItem>

              <form onSubmit={submitSearch} className="relative ml-2 hidden xl:block">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-store-muted" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products…"
                  aria-label="Search products"
                  className="w-56 rounded-full border border-store-line bg-store-soft/60 py-2 pl-10 pr-4 text-sm outline-none transition placeholder:text-store-muted focus:border-store-brand/40 focus:bg-store-card focus:ring-2 focus:ring-store-brand/20"
                />
              </form>
            </nav>

            <div className="flex shrink-0 items-center gap-1 md:gap-2">
              <button
                type="button"
                onClick={() => setMobileSearchOpen((open) => !open)}
                aria-label="Search"
                className="rounded-full p-2 text-store-fg/70 transition-all duration-200 hover:bg-store-brand/10 hover:text-store-brand xl:hidden"
              >
                <Search size={20} />
              </button>

              <button
                type="button"
                onClick={cart.open}
                className="relative flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-store-fg/80 transition-all duration-200 hover:bg-store-brand/10 hover:text-store-brand md:px-4"
              >
                <span className="relative">
                  <ShoppingCart size={18} />
                  {cart.itemCount > 0 && (
                    <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-store-brand px-1 text-[10px] font-bold text-store-brand-fg">
                      {cart.itemCount}
                    </span>
                  )}
                </span>
                <span className="hidden sm:inline">Cart</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileOpen((open) => !open)}
                aria-label="Menu"
                aria-expanded={mobileOpen}
                className="rounded-full p-2 text-store-fg/70 transition-all duration-200 hover:bg-store-brand/10 hover:text-store-brand lg:hidden"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {mobileSearchOpen && (
            <form onSubmit={submitSearch} className="store-fade-up border-t border-store-line px-4 py-3 xl:hidden">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-store-muted" aria-hidden="true" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search products…"
                  aria-label="Search products"
                  className="w-full rounded-full border border-store-line bg-store-soft/60 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-store-brand/40 focus:bg-store-card"
                />
              </div>
            </form>
          )}

          {mobileOpen && (
            <nav className="store-fade-up border-t border-store-line px-3 py-3 text-sm font-medium text-store-fg/80 lg:hidden">
              <div className="grid gap-1">
                <NavItem to={`${base}/category/all`} onClick={closeMenus}>All Products</NavItem>
                <NavItem to={`${base}/about`} onClick={closeMenus}>About</NavItem>
                <NavItem to={`${base}/contact`} onClick={closeMenus}>Contact</NavItem>
              </div>
              {categories.length > 0 && (
                <>
                  <p className="mt-3 px-4 text-[10px] font-bold uppercase tracking-widest text-store-muted">Categories</p>
                  <div className="mt-1 grid gap-1">
                    {categories.map((category) => (
                      <Link
                        key={category.slug}
                        to={`${base}/category/${category.slug}`}
                        onClick={closeMenus}
                        className="flex items-center justify-between rounded-full px-4 py-2 hover:bg-store-brand/10 hover:text-store-brand"
                      >
                        <span className="truncate">{category.name}</span>
                        <span className="text-xs text-store-muted">{category.count}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
