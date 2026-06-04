import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Minus, X, ShoppingCart, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../../components/layout/PageWrapper";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const CATS = ["All","Jackets","Shirts","Trousers","Dresses","Shoes","Hoodies","Accessories"];
const PAYMENTS = [
  { key:"cash", label:"Cash" },
  { key:"mtn_momo", label:"MTN MoMo" },
  { key:"airtel", label:"Airtel" },
];

export default function NewSale() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allItems, setAllItems] = useState([]);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [payment, setPayment] = useState("cash");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [invoiceNum, setInvoiceNum] = useState(null);

  useEffect(() => {
    api.get("/stock", { params: { limit: 200 } })
       .then(d => setAllItems(d.data.data))
       .finally(() => setLoading(false));
  }, []);

  const filtered = allItems.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.barcode?.includes(search);
    const matchCat = cat === "All" || item.category === cat;
    return matchSearch && matchCat;
  });

  const total = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  function addToCart(item) {
    if (item.quantity === 0) return;
    setCart(c => {
      const ex = c.find(x => x.stock_item_id === item.id);
      if (ex) {
        if (ex.quantity >= item.quantity) { toast.error("Max stock reached"); return c; }
        return c.map(x => x.stock_item_id === item.id ? {...x, quantity: x.quantity+1} : x);
      }
      return [...c, { stock_item_id: item.id, name: item.name, size: item.size, color: item.color,
                      unit_price: item.sell_price_rwf, quantity: 1, max_qty: item.quantity }];
    });
  }

  function updateQty(id, qty) {
    if (qty < 1) { setCart(c => c.filter(x => x.stock_item_id !== id)); return; }
    setCart(c => c.map(x => x.stock_item_id === id ? {...x, quantity: Math.min(qty, x.max_qty)} : x));
  }

  async function confirmSale() {
    if (!cart.length) return toast.error("Cart is empty");
    setSaving(true);
    try {
      const { data } = await api.post("/sales", {
        customer_name: customerName || "Walk-in",
        payment_method: payment,
        items: cart.map(i => ({ stock_item_id: i.stock_item_id, quantity: i.quantity, unit_price: i.unit_price })),
      });
      setInvoiceNum(data.invoice_number);
      setShowConfirm(false);
      toast.success(`Sale recorded! Invoice: ${data.invoice_number}`);
      setCart([]);
      setCustomerName("");
      setPayment("cash");
    } catch(e){ toast.error(e.response?.data?.error || "Sale failed"); }
    finally { setSaving(false); }
  }

  const CartPanel = () => (
    <div className="flex flex-col h-full">
      <h3 className="text-[16px] font-semibold text-text-primary mb-4">Current Sale</h3>
      {cart.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-text-secondary text-[13px]">Cart is empty</div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {cart.map(item => (
            <div key={item.stock_item_id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-text-primary truncate">{item.name}</p>
                <p className="text-[11px] text-text-secondary">{formatRWF(item.unit_price)} each</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => updateQty(item.stock_item_id, item.quantity-1)} className="w-6 h-6 bg-background border border-border rounded flex items-center justify-center hover:bg-border">
                  <Minus size={10} />
                </button>
                <span className="w-6 text-center text-[13px] font-medium">{item.quantity}</span>
                <button onClick={() => updateQty(item.stock_item_id, item.quantity+1)} className="w-6 h-6 bg-background border border-border rounded flex items-center justify-center hover:bg-border">
                  <Plus size={10} />
                </button>
              </div>
              <span className="text-[13px] font-semibold text-text-primary w-24 text-right">{formatRWF(item.unit_price*item.quantity)}</span>
              <button onClick={() => setCart(c => c.filter(x => x.stock_item_id !== item.stock_item_id))} className="text-text-secondary hover:text-danger"><X size={14}/></button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-3 space-y-3">
        <div className="flex justify-between text-[15px]">
          <span className="text-text-secondary">Subtotal</span>
          <span className="font-bold text-text-primary">{formatRWF(total)}</span>
        </div>

        <input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Customer name (optional)"
          className="w-full h-9 px-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary" />

        <div className="flex gap-2">
          {PAYMENTS.map(p => (
            <button key={p.key} onClick={() => setPayment(p.key)}
              className={`flex-1 py-1.5 rounded-btn text-[12px] font-medium border transition-colors ${payment===p.key?"bg-primary text-white border-primary":"border-border text-text-secondary"}`}>
              {p.label}
            </button>
          ))}
        </div>

        <Button variant="primary" className="w-full" size="lg" disabled={!cart.length} onClick={() => setShowConfirm(true)}>
          Confirm Sale — {formatRWF(total)}
        </Button>
      </div>
    </div>
  );

  return (
    <PageWrapper title="New Sale" subtitle="Record a customer sale"
      breadcrumbs={[{label:"Sales",path:"/app/sales"},{label:"New Sale",path:"/app/sales/new"}]}>

      <div className="flex h-[calc(100vh-140px)] gap-4">
        {/* LEFT — Items */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search + Category tabs */}
          <div className="mb-3">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or barcode…"
                className="w-full h-10 pl-9 pr-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {CATS.map(c => (
                <button key={c} onClick={() => setCat(c)}
                  className={`shrink-0 px-3 py-1 rounded-badge text-[12px] font-medium border transition-colors ${cat===c?"bg-primary text-white border-primary":"border-border text-text-secondary hover:border-primary/50"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Item grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map(item => {
                const inCart = cart.find(x => x.stock_item_id === item.id);
                const outOfStock = item.quantity === 0;
                return (
                  <div key={item.id}
                    className={`bg-surface border rounded-card p-3 transition-all ${outOfStock?"opacity-50 cursor-not-allowed border-border":"cursor-pointer border-border hover:border-primary/50 hover:shadow-sm"}`}
                    onClick={() => !outOfStock && addToCart(item)}>
                    {/* Color swatch */}
                    <div className="h-12 rounded-btn mb-2 flex items-center justify-center"
                         style={{ backgroundColor: inCart ? "#ECFDF5" : "#F8F9FA" }}>
                      <span className="text-[11px] font-medium text-text-secondary">{item.color || item.category}</span>
                    </div>
                    <p className="text-[12px] font-semibold text-text-primary truncate">{item.name}</p>
                    <div className="flex gap-1 my-1">
                      {item.size && <span className="px-1 py-0.5 bg-background border border-border rounded text-[10px]">{item.size}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-primary">{formatRWF(item.sell_price_rwf)}</span>
                      <span className="text-[10px] text-text-secondary">{item.quantity} left</span>
                    </div>
                    {inCart && (
                      <div className="mt-1 text-center">
                        <span className="text-[10px] text-success font-medium">✓ {inCart.quantity} in cart</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT — Cart (desktop) */}
        <div className="hidden lg:flex flex-col w-80 bg-surface border border-border rounded-card p-4">
          <CartPanel />
        </div>
      </div>

      {/* Mobile cart FAB */}
      <button onClick={() => setShowCart(true)}
        className="fixed bottom-6 right-6 lg:hidden w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg text-white">
        <ShoppingCart size={22} />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger rounded-full text-[10px] font-bold flex items-center justify-center">{cartCount}</span>
        )}
      </button>

      {/* Mobile cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setShowCart(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-[16px] p-5 max-h-[85vh] overflow-y-auto"
               onClick={e => e.stopPropagation()}>
            <CartPanel />
          </div>
        </div>
      )}

      {/* Confirm modal */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Sale"
        footer={<><Button variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button><Button loading={saving} onClick={confirmSale}>Confirm Sale</Button></>}>
        <div className="space-y-2">
          <p className="text-[13px] text-text-secondary">Customer: <strong className="text-text-primary">{customerName || "Walk-in"}</strong></p>
          <p className="text-[13px] text-text-secondary">Payment: <strong className="text-text-primary">{PAYMENTS.find(p=>p.key===payment)?.label}</strong></p>
          <p className="text-[13px] text-text-secondary">Items: <strong className="text-text-primary">{cartCount}</strong></p>
          <div className="text-[20px] font-bold text-primary pt-2">{formatRWF(total)}</div>
        </div>
      </Modal>

      {/* Success modal */}
      {invoiceNum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-surface rounded-card p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-success" />
            </div>
            <h3 className="text-[18px] font-bold text-text-primary mb-1">Sale Recorded!</h3>
            <p className="text-[13px] text-text-secondary mb-1">Invoice Number:</p>
            <p className="text-[16px] font-bold text-primary mb-4">{invoiceNum}</p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setInvoiceNum(null)}>New Sale</Button>
              <Button className="flex-1" onClick={() => navigate("/app/sales")}>View Sales</Button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
