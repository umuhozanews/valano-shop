import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, User, ShoppingBag, Menu, X } from "lucide-react";
import { useCart } from "../../context/CartContext";
import CartDrawer from "./CartDrawer";

const NAV_LINKS = ["CLOTHING","MEN","WOMEN","ACCESSORIES","BRANDS"];

export default function LandingNav() {
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");

  function handleSearch(e) {
    e.preventDefault();
    if (searchVal.trim()) navigate(`/?search=${encodeURIComponent(searchVal.trim())}`);
    setSearchOpen(false);
    setSearchVal("");
  }

  return (
    <>
      <nav
        className="sticky top-0 z-30 border-b"
        style={{ backgroundColor: "#F5F2ED", borderColor: "#e5e0d8" }}
      >
        <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="shrink-0 flex flex-col leading-none">
            <span className="text-[11px] tracking-[0.2em] uppercase" style={{ color: "#1B4332", fontFamily: "Inter, sans-serif", fontStyle: "italic" }}>Fashion</span>
            <span className="text-[32px] sm:text-[38px] font-black tracking-tight" style={{ color: "#1B4332", fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.04em", lineHeight: 1 }}>VALANO</span>
            <span className="text-[11px] font-bold tracking-[0.3em] uppercase text-center" style={{ color: "#1B4332" }}>SHOP</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(item => (
              <Link key={item} to={`/?cat=${item.toLowerCase()}`}
                className="text-[13px] font-medium tracking-wider text-[#1a1a1a] hover:text-[#1B4332] transition-colors">
                {item}
              </Link>
            ))}
          </div>

          {/* Icons */}
          <div className="flex items-center gap-1">
            {/* Search */}
            {searchOpen ? (
              <form onSubmit={handleSearch} className="flex items-center border rounded-sm overflow-hidden" style={{ borderColor: "#c8c2b8" }}>
                <input
                  autoFocus
                  value={searchVal}
                  onChange={e => setSearchVal(e.target.value)}
                  placeholder="Search products…"
                  className="h-9 px-3 text-[13px] bg-transparent focus:outline-none w-44"
                  style={{ color: "#1a1a1a" }}
                />
                <button type="submit" className="px-2 h-9 flex items-center">
                  <Search size={15} style={{ color: "#1B4332" }} />
                </button>
                <button type="button" onClick={() => setSearchOpen(false)} className="px-2 h-9">
                  <X size={14} style={{ color: "#9ca3af" }} />
                </button>
              </form>
            ) : (
              <button onClick={() => setSearchOpen(true)} className="p-2 hover:text-[#1B4332] transition-colors hidden sm:flex" style={{ color: "#1a1a1a" }}>
                <Search size={18} />
              </button>
            )}

            <Link to="/app/login" className="p-2 hover:text-[#1B4332] transition-colors hidden sm:flex" style={{ color: "#1a1a1a" }}>
              <User size={18} />
            </Link>

            {/* Cart */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative p-2 hover:text-[#1B4332] transition-colors"
              style={{ color: "#1a1a1a" }}
            >
              <ShoppingBag size={18} />
              {cartCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                  style={{ backgroundColor: "#1B4332" }}
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>

            <Link
              to="/app/login"
              className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-semibold tracking-wider border-2 px-4 py-1.5 rounded-sm transition-colors ml-1"
              style={{ borderColor: "#1B4332", color: "#1B4332" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor="#1B4332"; e.currentTarget.style.color="#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor="transparent"; e.currentTarget.style.color="#1B4332"; }}
            >
              STAFF LOGIN
            </Link>

            <button className="md:hidden p-2 ml-1" style={{ color: "#1a1a1a" }} onClick={() => setMenuOpen(v => !v)}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t px-6 py-4 space-y-3" style={{ borderColor: "#e5e0d8" }}>
            {NAV_LINKS.map(item => (
              <Link key={item} to={`/?cat=${item.toLowerCase()}`} onClick={() => setMenuOpen(false)}
                className="block text-[14px] font-medium py-1" style={{ color: "#1a1a1a" }}>
                {item}
              </Link>
            ))}
            <Link to="/app/login" className="block w-full text-center mt-3 py-2 border-2 text-[13px] font-bold tracking-wider rounded-sm"
              style={{ borderColor: "#1B4332", color: "#1B4332" }}>
              STAFF LOGIN
            </Link>
          </div>
        )}
      </nav>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
