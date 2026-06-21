import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Minus, X, ShoppingCart, Check, Key, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../../components/layout/PageWrapper";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useBusiness } from "../../context/BusinessContext";

const CATS = ["All","Jackets","Shirts","Trousers","Dresses","Shoes","Hoodies","Accessories"];

export default function NewSale() {
  const { t } = useLanguage();
  const { activeBusiness } = useBusiness();
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
  const [newSaleId, setNewSaleId] = useState(null);
  const [isPartial, setIsPartial] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [dueDate, setDueDate] = useState("");

  const isRealEstate = activeBusiness.type === "real_estate";

  const PAYMENTS = [
    { key:"cash", label: t("cash") },
    { key:"mtn_momo", label: t("momo") },
    { key:"airtel", label:"Airtel" },
  ];

  const fetchStock = useCallback(() => {
    setLoading(true);
    api.get("/stock", { params: { limit: 200 } })
       .then(d => setAllItems(d.data.data))
       .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (isRealEstate) {
      // Mock properties for rent
      setAllItems([
        { id: 101, name: "Unit 101 - Iradukunda Eric", category: "Apartment", sell_price_rwf: 450000, quantity: 1 },
        { id: 102, name: "Unit 102 - Mutesi Solange", category: "Apartment", sell_price_rwf: 450000, quantity: 1 },
        { id: 201, name: "Suite 4 - Gasana Jean", category: "Commercial", sell_price_rwf: 1200000, quantity: 1 },
      ]);
      setLoading(false);
    } else {
      fetchStock();
    }
  }, [isRealEstate, fetchStock]);

  const filtered = allItems.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.barcode?.includes(search);
    const matchCat = isRealEstate || cat === "All" || item.category === cat;
    return matchSearch && matchCat;
  });

  const total = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  function addToCart(item) {
    if (item.quantity === 0) return;
    setCart(c => {
      const ex = c.find(x => x.stock_item_id === item.id);
      if (ex) {
        if (isRealEstate) return c; // Rent is usually 1 unit
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

    if (isPartial) {
      const paid = parseFloat(amountPaid);
      if (isNaN(paid) || paid < 0) {
        return toast.error("Please enter a valid amount paid");
      }
      if (paid >= total) {
        return toast.error("Amount paid for a partial payment must be less than the total sale amount");
      }
      if (!dueDate) {
        return toast.error("Please specify a due date for the remainder");
      }
    }

    setSaving(true);
    try {
      const { data } = await api.post("/sales", {
        customer_name: customerName || (isRealEstate ? "Unnamed Tenant" : "Walk-in"),
        payment_method: payment,
        items: cart.map(i => ({ stock_item_id: i.stock_item_id, quantity: i.quantity, unit_price: i.unit_price })),
        amount_paid: isPartial ? parseFloat(amountPaid) : total,
        due_date: isPartial ? dueDate : null,
      });
      setInvoiceNum(data.invoice_number);
      setNewSaleId(data.id);
      setShowConfirm(false);
      toast.success(isRealEstate ? "Payment recorded!" : `Sale recorded! Invoice: ${data.invoice_number}`);
      setCart([]);
      setCustomerName("");
      setPayment("cash");
      setIsPartial(false);
      setAmountPaid("");
      setDueDate("");
      if (!isRealEstate) fetchStock();
    } catch(e){ toast.error(e.response?.data?.error || t("error")); }
    finally { setSaving(false); }
  }

  const CartPanel = () => (
    <div className="flex flex-col h-full">
      <h3 className="text-[16px] font-semibold text-text-primary mb-4">{isRealEstate ? "Payment Receipt" : "Current Sale"}</h3>
      {cart.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-text-secondary text-[13px]">Cart is empty</div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {cart.map(item => (
            <div key={item.stock_item_id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-text-primary truncate">{item.name}</p>
                <p className="text-[11px] text-text-secondary">{formatRWF(item.unit_price)}</p>
              </div>
              {!isRealEstate && (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => updateQty(item.stock_item_id, item.quantity-1)} className="w-6 h-6 bg-background border border-border rounded flex items-center justify-center hover:bg-border">
                    <Minus size={10} />
                  </button>
                  <span className="w-6 text-center text-[13px] font-medium">{item.quantity}</span>
                  <button onClick={() => updateQty(item.stock_item_id, item.quantity+1)} className="w-6 h-6 bg-background border border-border rounded flex items-center justify-center hover:bg-border">
                    <Plus size={10} />
                  </button>
                </div>
              )}
              <span className="text-[13px] font-semibold text-text-primary w-24 text-right">{formatRWF(item.unit_price*item.quantity)}</span>
              <button onClick={() => setCart(c => c.filter(x => x.stock_item_id !== item.stock_item_id))} className="text-text-secondary hover:text-danger"><X size={14}/></button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-3 space-y-3">
        <div className="flex justify-between text-[15px]">
          <span className="text-text-secondary">{t("total")}</span>
          <span className="font-bold text-text-primary">{formatRWF(total)}</span>
        </div>

        <input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder={isRealEstate ? "Tenant Name" : "Customer name (optional)"}
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
          {isRealEstate ? "Record Payment" : t("save")} — {formatRWF(total)}
        </Button>
      </div>
    </div>
  );

  return (
    <PageWrapper title={isRealEstate ? "Record Rent" : t("new_sale")} subtitle={isRealEstate ? "Collect rent from tenant" : t("sales")}
      breadcrumbs={[{label: t("sales"), path:"/app/sales"},{label: t("add"), path:"/app/sales/new"}]}>

      <div className="flex h-[calc(100vh-140px)] gap-4">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="mb-3">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`${t("search")}…`}
                className="w-full h-10 pl-9 pr-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface" />
            </div>
            {!isRealEstate && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {CATS.map(c => (
                  <button key={c} onClick={() => setCat(c)}
                    className={`shrink-0 px-3 py-1 rounded-badge text-[12px] font-medium border transition-colors ${cat===c?"bg-primary text-white border-primary":"border-border text-text-secondary hover:border-primary/50"}`}>
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filtered.map(item => {
                const inCart = cart.find(x => x.stock_item_id === item.id);
                const outOfStock = item.quantity === 0;
                return (
                  <div key={item.id}
                    className={`bg-surface border rounded-card p-3 transition-all ${outOfStock?"opacity-50 cursor-not-allowed border-border":"cursor-pointer border-border hover:border-primary/50 hover:shadow-sm"}`}
                    onClick={() => !outOfStock && addToCart(item)}>
                    <div className="h-12 rounded-btn mb-2 flex items-center justify-center"
                         style={{ backgroundColor: inCart ? "#ECFDF5" : "#F8F9FA" }}>
                      {isRealEstate ? <Key size={20} className="text-text-secondary" /> : <span className="text-[11px] font-medium text-text-secondary">{item.color || item.category}</span>}
                    </div>
                    <p className="text-[12px] font-semibold text-text-primary truncate">{item.name}</p>
                    <div className="flex gap-1 my-1">
                      {item.size && <span className="px-1 py-0.5 bg-background border border-border rounded text-[10px]">{item.size}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-primary">{formatRWF(item.sell_price_rwf)}</span>
                      {!isRealEstate && <span className="text-[10px] text-text-secondary">{item.quantity} left</span>}
                    </div>
                    {inCart && (
                      <div className="mt-1 text-center">
                        <span className="text-[10px] text-success font-medium">✓ Selected</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="hidden lg:flex flex-col w-80 bg-surface border border-border rounded-card p-4">
          <CartPanel />
        </div>
      </div>

      <button onClick={() => setShowCart(true)}
        className="fixed bottom-6 right-6 lg:hidden w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg text-white">
        <ShoppingCart size={22} />
      </button>

      {showCart && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setShowCart(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-[16px] p-5 max-h-[85vh] overflow-y-auto"
               onClick={e => e.stopPropagation()}>
            <CartPanel />
          </div>
        </div>
      )}

      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title={isRealEstate ? "Confirm Payment" : "Confirm Sale"}
        footer={<><Button variant="secondary" onClick={() => setShowConfirm(false)}>{t("cancel")}</Button><Button loading={saving} onClick={confirmSale}>{t("save")}</Button></>}>
        <div className="space-y-4">
          <p className="text-[13px] text-text-secondary">{isRealEstate ? "Tenant" : "Customer"}: <strong className="text-text-primary">{customerName || (isRealEstate ? "Unnamed Tenant" : "Walk-in")}</strong></p>
          <p className="text-[13px] text-text-secondary">{t("payment_method")}: <strong className="text-text-primary">{PAYMENTS.find(p=>p.key===payment)?.label}</strong></p>
          
          <div className="flex justify-between items-center py-2 border-t border-b border-border">
            <span className="text-[13px] font-bold text-text-primary">Total Sale Amount:</span>
            <span className="text-[16px] font-black text-primary">{formatRWF(total)}</span>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[13px] font-medium text-text-primary cursor-pointer select-none">
              <input type="checkbox" checked={isPartial} onChange={e => {
                setIsPartial(e.target.checked);
                if (e.target.checked) {
                  setAmountPaid(String(Math.round(total / 2)));
                  const nextWeek = new Date();
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  setDueDate(nextWeek.toISOString().slice(0, 10));
                } else {
                  setAmountPaid("");
                  setDueDate("");
                }
              }} className="rounded border-border text-primary focus:ring-primary h-4 w-4" />
              <span>Record as Partial Payment (Customer Debt)</span>
            </label>
          </div>

          {isPartial && (
            <div className="p-3 bg-background border border-border rounded-card space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Amount Paid (RWF)</label>
                  <input type="number" min="0" max={total - 1} value={amountPaid} onChange={e => setAmountPaid(e.target.value)}
                    className="w-full h-9 px-2 border border-border rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-primary bg-surface font-semibold" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Remaining Due</label>
                  <div className="h-9 px-2 border border-border rounded text-[13px] flex items-center bg-surface/50 text-danger font-bold">
                    {formatRWF(Math.max(0, total - (parseFloat(amountPaid) || 0)))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Expected Pay Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full h-9 px-2 border border-border rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-primary bg-surface" />
              </div>
            </div>
          )}
        </div>
      </Modal>

      {invoiceNum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-surface rounded-card p-8 max-w-sm w-full text-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-success" />
            </div>
            <h3 className="text-[18px] font-bold text-text-primary mb-1">{isRealEstate ? "Payment Recorded!" : "Sale Recorded!"}</h3>
            <p className="text-[13px] text-text-secondary mb-4">{isRealEstate ? "Rent collection successfully tracked." : `Invoice: ${invoiceNum}`}</p>
            <div className="flex gap-2 mt-4">
              <Button variant="secondary" className="flex-1 text-[12px]" onClick={() => { setInvoiceNum(null); setNewSaleId(null); }}>{t("add")}</Button>
              <Button variant="primary" className="flex-1 text-[12px]" onClick={() => navigate(`/app/sales/${newSaleId}?print=true`)}>{t("print")}</Button>
              <Button variant="secondary" className="flex-1 text-[12px]" onClick={() => navigate(`/app/sales/${newSaleId}`)}>{t("view")}</Button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
