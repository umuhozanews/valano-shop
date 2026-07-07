import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Minus, X, ShoppingCart, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../../components/layout/PageWrapper";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import toast from "react-hot-toast";
import { ITEM_CATEGORIES } from "../../utils/constants";

const PAYMENTS = [
  { key:"cash",       label:"Cash" },
  { key:"mtn_momo",  label:"MTN MoMo" },
  { key:"airtel",    label:"Airtel" },
  { key:"card",      label:"Card" },
  { key:"bank_transfer", label:"Bank" },
];

export default function NewSale() {
  const navigate = useNavigate();

  const [allItems, setAllItems]   = useState([]);
  const [search,   setSearch]     = useState("");
  const [cat,      setCat]        = useState("All");
  const [cart,     setCart]       = useState([]);
  const [customer, setCustomer]   = useState("");
  const [payment,  setPayment]    = useState("cash");
  const [loading,  setLoading]    = useState(true);
  const [saving,   setSaving]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCart,    setShowCart]    = useState(false);
  const [invoiceNum,  setInvoiceNum]  = useState(null);
  const [newSaleId,   setNewSaleId]   = useState(null);
  const [isPartial,   setIsPartial]   = useState(false);
  const [amountPaid,  setAmountPaid]  = useState("");
  const [dueDate,     setDueDate]     = useState("");

  const fetchStock = useCallback(() => {
    setLoading(true);
    api.get("/stock", { params: { limit: 300 } })
       .then(d => setAllItems(d.data?.data || []))
       .catch(() => toast.error("Failed to load products"))
       .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  const categories = ["All", ...ITEM_CATEGORIES];

  const filtered = allItems.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.barcode?.includes(search);
    const matchCat    = cat === "All" || item.category === cat;
    return matchSearch && matchCat;
  });

  const total     = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  function addToCart(item) {
    if (item.quantity === 0) return toast.error("Out of stock");
    setCart(c => {
      const ex = c.find(x => x.stock_item_id === item.id);
      if (ex) {
        if (ex.quantity >= item.quantity) { toast.error("Max stock reached"); return c; }
        return c.map(x => x.stock_item_id === item.id ? {...x, quantity: x.quantity+1} : x);
      }
      return [...c, { stock_item_id: item.id, name: item.name, unit: item.unit || "pcs",
                      unit_price: item.sell_price_rwf, quantity: 1, max_qty: item.quantity }];
    });
  }

  function updateQty(id, qty) {
    if (qty < 1) { setCart(c => c.filter(x => x.stock_item_id !== id)); return; }
    setCart(c => c.map(x => x.stock_item_id === id ? {...x, quantity: Math.min(qty, x.max_qty)} : x));
  }

  async function confirmSale() {
    if (!cart.length) return toast.error("Cart is empty");
    if (isPartial) {
      const paid = parseFloat(amountPaid);
      if (isNaN(paid) || paid < 0)  return toast.error("Enter a valid amount paid");
      if (paid >= total)             return toast.error("Partial payment must be less than total");
      if (!dueDate)                  return toast.error("Specify a due date for the remainder");
    }
    setSaving(true);
    try {
      const { data } = await api.post("/sales", {
        customer_name:  customer || "Walk-in",
        payment_method: payment,
        items:          cart.map(i => ({ stock_item_id: i.stock_item_id, quantity: i.quantity, unit_price: i.unit_price })),
        amount_paid:    isPartial ? parseFloat(amountPaid) : total,
        due_date:       isPartial ? dueDate : null,
      });
      setInvoiceNum(data.invoice_number);
      setNewSaleId(data.id);
      setShowConfirm(false);
      toast.success(`Sale recorded — Invoice: ${data.invoice_number}`);
      setCart([]); setCustomer(""); setPayment("cash"); setIsPartial(false); setAmountPaid(""); setDueDate("");
      fetchStock();
    } catch(e) { toast.error(e.response?.data?.error || "Failed to record sale"); }
    finally   { setSaving(false); }
  }

  function CartPanel() {
    return (
      <div className="flex flex-col h-full">
        <h3 className="text-[16px] font-semibold text-text-primary mb-4">Current Sale</h3>
        {!cart.length ? (
          <div className="flex-1 flex items-center justify-center text-text-secondary text-[13px]">Cart is empty</div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {cart.map(item => (
              <div key={item.stock_item_id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-text-primary truncate">{item.name}</p>
                  <p className="text-[11px] text-text-secondary">{formatRWF(item.unit_price)} / {item.unit}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => updateQty(item.stock_item_id, item.quantity-1)}
                    className="w-6 h-6 bg-background border border-border rounded flex items-center justify-center hover:bg-border">
                    <Minus size={10} />
                  </button>
                  <span className="w-6 text-center text-[13px] font-medium">{item.quantity}</span>
                  <button onClick={() => updateQty(item.stock_item_id, item.quantity+1)}
                    className="w-6 h-6 bg-background border border-border rounded flex items-center justify-center hover:bg-border">
                    <Plus size={10} />
                  </button>
                </div>
                <span className="text-[13px] font-semibold text-text-primary w-20 text-right">{formatRWF(item.unit_price*item.quantity)}</span>
                <button onClick={() => setCart(c => c.filter(x => x.stock_item_id !== item.stock_item_id))}
                  className="text-text-secondary hover:text-danger"><X size={14}/></button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-border pt-3 space-y-3">
          <div className="flex justify-between text-[15px]">
            <span className="text-text-secondary">Total</span>
            <span className="font-bold text-text-primary">{formatRWF(total)}</span>
          </div>

          <input value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="Customer name (optional)"
            className="w-full h-9 px-3 border border-border rounded-[6px] text-[13px] focus:outline-none focus:ring-1 focus:ring-primary" />

          <div className="grid grid-cols-3 gap-1">
            {PAYMENTS.map(p => (
              <button key={p.key} onClick={() => setPayment(p.key)}
                className={`py-1.5 rounded-[6px] text-[11px] font-medium border transition-colors ${payment===p.key?"bg-primary text-white border-primary":"border-border text-text-secondary hover:border-primary/50"}`}>
                {p.label}
              </button>
            ))}
          </div>

          <Button variant="primary" className="w-full" size="lg" disabled={!cart.length} onClick={() => setShowConfirm(true)}>
            Complete Sale — {formatRWF(total)}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper title="Point of Sale" subtitle="Record a new sale"
      breadcrumbs={[{ label:"Sales", path:"/app/sales" }, { label:"New Sale", path:"/app/sales/new" }]}>

      <div className="flex h-[calc(100vh-140px)] gap-4">
        {/* Product grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="mb-3">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or barcode…"
                className="w-full h-10 pl-9 pr-3 border border-border rounded-[6px] text-[13px] focus:outline-none focus:ring-1 focus:ring-primary bg-surface" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map(c => (
                <button key={c} onClick={() => setCat(c)}
                  className={`shrink-0 px-3 py-1 rounded-full text-[12px] font-medium border transition-colors ${cat===c?"bg-primary text-white border-primary":"border-border text-text-secondary hover:border-primary/50"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array(6).fill(0).map((_,i) => <div key={i} className="h-28 bg-surface border border-border rounded-[8px] animate-pulse" />)}
              </div>
            ) : !filtered.length ? (
              <div className="flex items-center justify-center h-full text-[13px] text-text-secondary">
                No products match your search
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filtered.map(item => {
                  const inCart     = cart.find(x => x.stock_item_id === item.id);
                  const outOfStock = item.quantity === 0;
                  return (
                    <div key={item.id}
                      onClick={() => !outOfStock && addToCart(item)}
                      className={`bg-surface border rounded-[8px] p-3 transition-all relative ${outOfStock?"opacity-40 cursor-not-allowed border-border":"cursor-pointer border-border hover:border-primary/50 hover:shadow-sm"} ${inCart?"border-primary bg-primary/5":""}`}>
                      <p className="text-[13px] font-semibold text-text-primary truncate">{item.name}</p>
                      {item.name_rw && <p className="text-[11px] text-text-secondary truncate">{item.name_rw}</p>}
                      <p className="text-[11px] text-text-secondary">{item.category} · {item.unit||"pcs"}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[14px] font-bold text-primary">{formatRWF(item.sell_price_rwf)}</span>
                        <span className={`text-[10px] font-medium ${outOfStock?"text-danger":item.quantity<=item.low_stock_threshold?"text-warning":"text-text-secondary"}`}>
                          {outOfStock ? "OUT" : `${item.quantity} left`}
                        </span>
                      </div>
                      {inCart && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <Check size={11} className="text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart (desktop) */}
        <div className="hidden lg:flex flex-col w-80 bg-surface border border-border rounded-[8px] p-4">
          <CartPanel />
        </div>
      </div>

      {/* FAB (mobile) */}
      <button onClick={() => setShowCart(true)}
        className="fixed bottom-6 right-6 lg:hidden w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg text-white">
        <ShoppingCart size={22} />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>
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
        footer={<><Button variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button><Button loading={saving} onClick={confirmSale}>Record Sale</Button></>}>
        <div className="space-y-4">
          <p className="text-[13px] text-text-secondary">Customer: <strong>{customer || "Walk-in"}</strong></p>
          <p className="text-[13px] text-text-secondary">Payment: <strong>{PAYMENTS.find(p=>p.key===payment)?.label}</strong></p>
          <div className="flex justify-between py-2 border-t border-b border-border">
            <span className="text-[13px] font-bold text-text-primary">Total:</span>
            <span className="text-[16px] font-black text-primary">{formatRWF(total)}</span>
          </div>

          <label className="flex items-center gap-2 text-[13px] font-medium text-text-primary cursor-pointer">
            <input type="checkbox" checked={isPartial}
              onChange={e => {
                setIsPartial(e.target.checked);
                if (e.target.checked) {
                  setAmountPaid(String(Math.round(total / 2)));
                  const d = new Date(); d.setDate(d.getDate()+7);
                  setDueDate(d.toISOString().slice(0,10));
                } else { setAmountPaid(""); setDueDate(""); }
              }} className="h-4 w-4 accent-primary" />
            Record as Partial Payment (Customer Debt)
          </label>

          {isPartial && (
            <div className="p-3 bg-background border border-border rounded-[6px] space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Amount Paid (RWF)</label>
                  <input type="number" min="0" value={amountPaid} onChange={e=>setAmountPaid(e.target.value)}
                    className="w-full h-9 px-2 border border-border rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Remaining</label>
                  <div className="h-9 px-2 border border-border rounded text-[13px] flex items-center text-danger font-bold">
                    {formatRWF(Math.max(0, total - (parseFloat(amountPaid)||0)))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Due Date</label>
                <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}
                  className="w-full h-9 px-2 border border-border rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Success screen */}
      {invoiceNum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-[12px] p-8 max-w-sm w-full text-center shadow-xl">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-success" />
            </div>
            <h3 className="text-[18px] font-bold text-text-primary mb-1">Sale Recorded!</h3>
            <p className="text-[13px] text-text-secondary mb-5">Invoice: {invoiceNum}</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 text-[12px]" onClick={() => { setInvoiceNum(null); setNewSaleId(null); }}>New Sale</Button>
              <Button variant="primary"   className="flex-1 text-[12px]" onClick={() => navigate(`/app/sales/${newSaleId}?print=true`)}>Print Receipt</Button>
              <Button variant="secondary" className="flex-1 text-[12px]" onClick={() => navigate(`/app/sales/${newSaleId}`)}>View</Button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
