import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Check, ShoppingBag, Minus, Plus, ChevronDown } from "lucide-react";
import { PRODUCTS } from "../data/products";
import { useCart } from "../context/CartContext";
import { formatRWF } from "../utils/formatters";
import LandingNav from "../components/landing/LandingNav";
import toast from "react-hot-toast";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const p = PRODUCTS.find(x => x.id === parseInt(id));

  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize]   = useState(null);
  const [qty, setQty]                     = useState(1);
  const [added, setAdded]                 = useState(false);
  const [wishlist, setWishlist]           = useState(false);
  const [detailsOpen, setDetailsOpen]     = useState(false);

  if (!p) return (
    <div style={{ backgroundColor: "#F5F2ED", minHeight: "100vh" }}>
      <LandingNav />
      <div className="max-w-[1400px] mx-auto px-6 py-24 text-center">
        <p className="text-[12px] text-gray-500 mb-6">Product not found.</p>
        <Link to="/" className="text-[11px] font-bold tracking-wider" style={{ color: "#1B4332" }}>← Back to collection</Link>
      </div>
    </div>
  );

  const discount = Math.round(((p.orig - p.price) / p.orig) * 100);

  function handleAddToCart() {
    if (!selectedSize) { toast.error("Please select a size"); return; }
    addToCart({
      id: p.id,
      name: p.name,
      img: p.img,
      price: p.price,
      size: selectedSize,
      colorName: p.swatchNames[selectedColor],
      quantity: qty,
    });
    setAdded(true);
    toast.success(`${p.name} added to cart!`);
    setTimeout(() => setAdded(false), 2500);
  }

  const related = PRODUCTS.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 4);

  return (
    <div style={{ backgroundColor: "#F5F2ED", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <LandingNav />

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[12px] text-gray-400 mb-6">
          <Link to="/" className="hover:text-[#1B4332] transition-colors">HOME</Link>
          <span>›</span>
          <Link to={`/?cat=${p.cat.toLowerCase()}`} className="hover:text-[#1B4332] transition-colors uppercase">{p.cat}</Link>
          <span>›</span>
          <span style={{ color: "#1B4332" }} className="font-medium">{p.name}</span>
        </nav>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">

          {/* LEFT — Image */}
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-sm" style={{ aspectRatio: "4/5", backgroundColor: "#edeae5" }}>
              <img
                src={p.imgL}
                alt={p.name}
                className="w-full h-full object-cover"
              />
              {discount > 0 && (
                <span className="absolute top-4 left-4 text-[11px] font-bold bg-[#1B4332] text-white px-2.5 py-1 rounded-sm">
                  -{discount}%
                </span>
              )}
              <button
                onClick={() => setWishlist(v => !v)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-sm transition-colors"
              >
                <Heart size={16} fill={wishlist ? "#ef4444" : "none"} stroke={wishlist ? "#ef4444" : "#1a1a1a"} />
              </button>
            </div>

            {/* Thumbnail strip — show 3 crops of the same image */}
            <div className="flex gap-2">
              {[0, 20, 50].map((crop, i) => (
                <div key={i} className="w-20 h-24 rounded-sm overflow-hidden cursor-pointer ring-2 ring-[#1B4332]" style={{ backgroundColor: "#edeae5" }}>
                  <img src={p.img} alt="" className="w-full h-full object-cover" style={{ objectPosition: `center ${crop}%` }} />
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Info */}
          <div className="lg:pt-2">
            {/* Category */}
            <p className="text-[11px] font-bold tracking-[0.15em] uppercase mb-2" style={{ color: "#1B4332" }}>{p.cat}</p>

            {/* Name */}
            <h1 className="text-[24px] sm:text-[36px] font-bold leading-tight text-[#1a1a1a] mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.02em" }}>
              {p.name}
            </h1>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-[24px] font-bold" style={{ color: "#1B4332" }}>{formatRWF(p.price)}</span>
              <span className="text-[12px] text-gray-400 line-through">{formatRWF(p.orig)}</span>
              {discount > 0 && (
                <span className="text-[12px] font-bold px-2 py-0.5 rounded-sm" style={{ backgroundColor: "#DCFCE7", color: "#166534" }}>
                  SAVE {discount}%
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-[12px] text-gray-600 leading-relaxed mb-6">{p.desc}</p>

            {/* Divider */}
            <div className="border-t mb-6" style={{ borderColor: "#e5e0d8" }} />

            {/* Color */}
            <div className="mb-5">
              <p className="text-[12px] font-bold tracking-wider uppercase mb-2.5 text-[#1a1a1a]">
                Colour — <span className="font-normal text-gray-500">{p.swatchNames[selectedColor]}</span>
              </p>
              <div className="flex gap-2.5">
                {p.swatches.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedColor(i)}
                    title={p.swatchNames[i]}
                    className="rounded-full transition-all"
                    style={{
                      width: 28, height: 28,
                      backgroundColor: s,
                      outline: selectedColor === i ? `3px solid ${s}` : "1px solid #ccc",
                      outlineOffset: selectedColor === i ? "3px" : "1px",
                      border: "2px solid white",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Size */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[12px] font-bold tracking-wider uppercase text-[#1a1a1a]">Size</p>
                <button className="text-[11px] text-gray-400 underline hover:text-[#1B4332] transition-colors">Size Guide</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.sizes.map(s => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className="h-10 min-w-[44px] px-3 text-[12px] font-semibold border rounded-sm transition-all"
                    style={selectedSize === s
                      ? { backgroundColor: "#1B4332", color: "#fff", borderColor: "#1B4332" }
                      : { backgroundColor: "transparent", color: "#1a1a1a", borderColor: "#c8c2b8" }
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
              {!selectedSize && (
                <p className="text-[11px] text-gray-400 mt-1.5">Please select a size</p>
              )}
            </div>

            {/* Quantity + Add to Cart */}
            <div className="flex gap-3 mb-4">
              {/* Qty */}
              <div className="flex items-center border rounded-sm overflow-hidden" style={{ borderColor: "#c8c2b8" }}>
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  className="w-11 h-12 flex items-center justify-center hover:bg-black/5 transition-colors text-[#1a1a1a]"
                ><Minus size={14} /></button>
                <span className="w-12 text-center text-[12px] font-semibold text-[#1a1a1a]">{qty}</span>
                <button
                  onClick={() => setQty(q => q + 1)}
                  className="w-11 h-12 flex items-center justify-center hover:bg-black/5 transition-colors text-[#1a1a1a]"
                ><Plus size={14} /></button>
              </div>

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                className="flex-1 h-12 flex items-center justify-center gap-2 text-[11px] font-bold tracking-wider text-white rounded-sm transition-all"
                style={{ backgroundColor: added ? "#166534" : "#1B4332" }}
                onMouseEnter={e => !added && (e.currentTarget.style.backgroundColor = "#14532d")}
                onMouseLeave={e => !added && (e.currentTarget.style.backgroundColor = "#1B4332")}
              >
                {added ? <><Check size={16} /> ADDED!</> : <><ShoppingBag size={15} /> ADD TO CART</>}
              </button>
            </div>

            {/* Wishlist */}
            <button
              onClick={() => { setWishlist(v => !v); toast(wishlist ? "Removed from wishlist" : "Added to wishlist ♥"); }}
              className="w-full h-11 flex items-center justify-center gap-2 text-[12px] font-bold tracking-wider border-2 rounded-sm transition-all"
              style={{ borderColor: "#c8c2b8", color: "#6b7280" }}
            >
              <Heart size={14} fill={wishlist ? "#ef4444" : "none"} stroke={wishlist ? "#ef4444" : "currentColor"} />
              {wishlist ? "SAVED TO WISHLIST" : "ADD TO WISHLIST"}
            </button>

            {/* Product Details accordion */}
            <div className="mt-6 border-t" style={{ borderColor: "#e5e0d8" }}>
              <button
                onClick={() => setDetailsOpen(v => !v)}
                className="w-full flex items-center justify-between py-4 text-[12px] font-bold tracking-wider text-[#1a1a1a]"
              >
                PRODUCT DETAILS
                <ChevronDown size={14} className={`transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
              </button>
              {detailsOpen && (
                <ul className="pb-4 space-y-1.5">
                  {p.details.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-gray-600">
                      <span className="text-[#1B4332] mt-0.5">—</span>
                      {d}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Shipping note */}
            <div className="mt-4 px-4 py-3 rounded-sm text-[12px] text-gray-500" style={{ backgroundColor: "#edeae5" }}>
              Available at <strong className="text-[#1a1a1a]">Nyabugogo</strong> & <strong className="text-[#1a1a1a]">Kimironko</strong> branches, Kigali.
              Order via WhatsApp for same-day delivery.
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="border-t pt-12" style={{ borderColor: "#e5e0d8" }}>
            <h2
              className="text-[40px] font-normal mb-8"
              style={{ fontFamily: "'Bebas Neue', sans-serif", color: "#1B4332", letterSpacing: "0.02em" }}
            >
              YOU MAY ALSO LIKE
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-8">
              {related.map(r => (
                <Link key={r.id} to={`/product/${r.id}`} className="group cursor-pointer block">
                  <div className="relative overflow-hidden rounded-sm mb-3" style={{ aspectRatio: "4/5", backgroundColor: "#edeae5" }}>
                    <img src={r.img} alt={r.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    {r.orig > r.price && (
                      <span className="absolute top-2 left-2 text-[11px] font-bold bg-[#1B4332] text-white px-2 py-0.5 rounded-sm">SALE</span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-[#1a1a1a] truncate mb-1">{r.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-gray-400 line-through">{formatRWF(r.orig)}</span>
                    <span className="text-[12px] font-bold text-[#1a1a1a]">{formatRWF(r.price)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Back to top footer link */}
      <div className="border-t mt-16 py-6 text-center" style={{ borderColor: "#e5e0d8" }}>
        <Link to="/" className="text-[12px] font-bold tracking-widest text-gray-400 hover:text-[#1B4332] transition-colors">
          ← BACK TO COLLECTION
        </Link>
      </div>
    </div>
  );
}
