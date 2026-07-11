import { X, Plus, Minus, Trash2, ShoppingBag, MessageCircle } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { formatRWF } from "../../utils/formatters";

export default function CartDrawer({ open, onClose }) {
  const { cart, removeFromCart, updateQty, cartTotal } = useCart();

  function orderWhatsApp() {
    const lines = cart.map(i =>
      `• ${i.name} (${i.size}, ${i.colorName}) × ${i.quantity} = ${formatRWF(i.price * i.quantity)}`
    ).join("\n");
    const msg = `Hello INZIRA INSIGHTS! I'd like to order:\n\n${lines}\n\nTotal: ${formatRWF(cartTotal)}\n\nPlease confirm availability.`;
    window.open(`https://wa.me/250788000111?text=${encodeURIComponent(msg)}`, "_blank");
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-full sm:w-[420px] z-50 flex flex-col shadow-2xl transition-transform duration-300"
        style={{
          backgroundColor: "#F5F2ED",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "#e5e0d8" }}>
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} style={{ color: "#1B4332" }} />
            <h2 className="text-[17px] font-bold tracking-wider" style={{ color: "#1B4332" }}>
              CART {cart.length > 0 && <span className="text-[14px] font-normal text-gray-500">({cart.reduce((s,i)=>s+i.quantity,0)} items)</span>}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-black/5 rounded-sm transition-colors">
            <X size={18} style={{ color: "#1a1a1a" }} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
              <ShoppingBag size={48} style={{ color: "#c8c2b8" }} />
              <p className="text-[15px] text-gray-400">Your cart is empty</p>
              <button
                onClick={onClose}
                className="text-[13px] font-bold tracking-wider border-2 px-5 py-2 rounded-sm transition-colors"
                style={{ borderColor: "#1B4332", color: "#1B4332" }}
                onMouseEnter={e => { e.target.style.backgroundColor="#1B4332"; e.target.style.color="#fff"; }}
                onMouseLeave={e => { e.target.style.backgroundColor="transparent"; e.target.style.color="#1B4332"; }}
              >
                CONTINUE SHOPPING
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {cart.map(item => (
                <div key={item.key} className="flex gap-4">
                  {/* Image */}
                  <div className="w-20 h-24 rounded-sm overflow-hidden shrink-0 bg-gray-100">
                    <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#1a1a1a] truncate">{item.name}</p>
                    <p className="text-[13px] text-gray-400 mt-0.5">
                      Size: {item.size} &nbsp;·&nbsp; {item.colorName}
                    </p>
                    <p className="text-[15px] font-bold mt-1" style={{ color: "#1B4332" }}>{formatRWF(item.price)}</p>

                    {/* Qty + Remove */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border rounded-sm overflow-hidden" style={{ borderColor: "#e5e0d8" }}>
                        <button
                          onClick={() => updateQty(item.key, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center text-[#1a1a1a] hover:bg-black/5 transition-colors"
                        ><Minus size={11} /></button>
                        <span className="w-8 text-center text-[14px] font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.key, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-[#1a1a1a] hover:bg-black/5 transition-colors"
                        ><Plus size={11} /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.key)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right shrink-0">
                    <p className="text-[14px] font-bold text-[#1a1a1a]">{formatRWF(item.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="px-6 py-5 border-t space-y-4" style={{ borderColor: "#e5e0d8" }}>
            <div className="flex items-center justify-between">
              <span className="text-[14px] text-gray-500 tracking-wider uppercase">Subtotal</span>
              <span className="text-[20px] font-bold" style={{ color: "#1B4332" }}>{formatRWF(cartTotal)}</span>
            </div>
            <p className="text-[13px] text-gray-400">Shipping calculated on contact. Prices in Rwandan Francs.</p>

            {/* WhatsApp Order */}
            <button
              onClick={orderWhatsApp}
              className="w-full h-12 flex items-center justify-center gap-2.5 text-[14px] font-bold tracking-wider text-white rounded-sm transition-colors"
              style={{ backgroundColor: "#25D366" }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor="#1eab52"}
              onMouseLeave={e => e.currentTarget.style.backgroundColor="#25D366"}
            >
              <MessageCircle size={16} />
              ORDER VIA WHATSAPP
            </button>

            {/* Continue shopping */}
            <button
              onClick={onClose}
              className="w-full h-10 text-[13px] font-bold tracking-wider border-2 rounded-sm transition-colors"
              style={{ borderColor: "#1B4332", color: "#1B4332" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor="#1B4332"; e.currentTarget.style.color="#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor="transparent"; e.currentTarget.style.color="#1B4332"; }}
            >
              CONTINUE SHOPPING
            </button>
          </div>
        )}
      </div>
    </>
  );
}
