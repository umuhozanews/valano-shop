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
import { useLanguage } from "../../context/LanguageContext";

function CartPanel({ cart, setCart, updateQty, customer, setCustomer, payment, setPayment, total, setShowConfirm, t, PAYMENTS, isSplit, setIsSplit, split2Method, setSplit2Method, split1Amount, setSplit1Amount }) {
  const split2Amount = isSplit ? Math.max(0, total - (parseFloat(split1Amount) || 0)) : 0;

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-[17px] font-semibold text-text-primary mb-4">{t("current_sale")}</h3>
      {!cart.length ? (
        <div className="flex-1 flex items-center justify-center text-text-secondary text-[14px]">{t("cart_empty")}</div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
          {cart.map(item => (
            <div key={item.stock_item_id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-text-primary truncate">{item.name}</p>
                <p className="text-[13px] text-text-secondary">{formatRWF(item.unit_price)} / {item.unit}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => updateQty(item.stock_item_id, item.quantity-1)}
                  className="w-6 h-6 bg-background border border-border rounded flex items-center justify-center hover:bg-border">
                  <Minus size={10} />
                </button>
                <span className="w-6 text-center text-[14px] font-medium">{item.quantity}</span>
                <button onClick={() => updateQty(item.stock_item_id, item.quantity+1)}
                  className="w-6 h-6 bg-background border border-border rounded flex items-center justify-center hover:bg-border">
                  <Plus size={10} />
                </button>
              </div>
              <span className="text-[14px] font-semibold text-text-primary w-20 text-right">{formatRWF(item.unit_price*item.quantity)}</span>
              <button onClick={() => setCart(c => c.filter(x => x.stock_item_id !== item.stock_item_id))}
                className="text-text-secondary hover:text-danger"><X size={14}/></button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-3 space-y-3">
        <div className="flex justify-between text-[16px]">
          <span className="text-text-secondary">{t("total")}</span>
          <span className="font-bold text-text-primary">{formatRWF(total)}</span>
        </div>

        <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder={t("customer_name_optional")}
          className="w-full h-9 px-3 border border-border rounded-[6px] text-[14px] focus:outline-none focus:ring-1 focus:ring-primary" />

        {/* Payment method(s) */}
        {!isSplit ? (
          <>
            <div className="grid grid-cols-3 gap-1">
              {PAYMENTS.map(p => (
                <button key={p.key} onClick={() => setPayment(p.key)}
                  className={`py-1.5 rounded-[6px] text-[13px] font-medium border transition-colors ${payment===p.key?"bg-primary text-white border-primary":"border-border text-text-secondary hover:border-primary/50"}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <button onClick={() => { setIsSplit(true); setSplit1Amount(String(Math.round(total/2))); setSplit2Method("mtn_momo"); }}
              className="w-full py-1.5 border border-dashed border-primary/40 rounded-[6px] text-[12px] text-primary/70 hover:border-primary hover:text-primary transition-colors">
              + Split between 2 payment methods
            </button>
          </>
        ) : (
          <div className="border border-primary/30 rounded-[8px] p-3 space-y-2 bg-primary/3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-semibold text-text-primary">Split Payment</span>
              <button onClick={() => { setIsSplit(false); setSplit1Amount(""); setSplit2Method("mtn_momo"); }}
                className="text-[12px] text-text-secondary hover:text-danger">Cancel</button>
            </div>
            {/* Method 1 */}
            <div className="flex items-center gap-2">
              <select value={payment} onChange={e => setPayment(e.target.value)}
                className="flex-1 h-8 px-2 border border-border rounded text-[13px] bg-surface focus:outline-none focus:ring-1 focus:ring-primary">
                {PAYMENTS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
              <input type="number" min="0" max={total} value={split1Amount}
                onChange={e => setSplit1Amount(e.target.value)}
                className="w-28 h-8 px-2 border border-border rounded text-[13px] text-right focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Amount" />
            </div>
            {/* Method 2 */}
            <div className="flex items-center gap-2">
              <select value={split2Method} onChange={e => setSplit2Method(e.target.value)}
                className="flex-1 h-8 px-2 border border-border rounded text-[13px] bg-surface focus:outline-none focus:ring-1 focus:ring-primary">
                {PAYMENTS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
              <div className={`w-28 h-8 px-2 border rounded text-[13px] text-right flex items-center justify-end font-semibold ${split2Amount < 0 ? "border-danger text-danger" : "border-border text-text-primary"}`}>
                {formatRWF(Math.max(0, split2Amount))}
              </div>
            </div>
            {split2Amount < 0 && (
              <p className="text-[12px] text-danger">First amount exceeds total</p>
            )}
          </div>
        )}

        <Button variant="primary" className="w-full" size="lg" disabled={!cart.length} onClick={() => setShowConfirm(true)}>
          {t("complete_sale")} — {formatRWF(total)}
        </Button>
      </div>
    </div>
  );
}

export default function NewSale() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const PAYMENTS = [
    { key:"cash",          label: t("cash") },
    { key:"mtn_momo",     label:"MTN MoMo" },
    { key:"airtel",       label:"Airtel" },
    { key:"card",         label:"Card" },
    { key:"bank_transfer", label: t("bank") },
  ];

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
  const [isPartial,    setIsPartial]    = useState(false);
  const [amountPaid,   setAmountPaid]   = useState("");
  const [dueDate,      setDueDate]      = useState("");
  const [isSplit,      setIsSplit]      = useState(false);
  const [split1Amount, setSplit1Amount] = useState("");
  const [split2Method, setSplit2Method] = useState("mtn_momo");

  const fetchStock = useCallback(() => {
    setLoading(true);
    api.get("/stock", { params: { limit: 300 } })
       .then(d => setAllItems(d.data?.data || []))
       .catch(() => toast.error("Failed to load products"))
       .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  const categories = [t("all"), ...ITEM_CATEGORIES];

  const filtered = allItems.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.barcode?.includes(search);
    const matchCat    = cat === t("all") || item.category === cat;
    return matchSearch && matchCat;
  });

  const total     = cart.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  function addToCart(item) {
    if (item.quantity === 0) return toast.error(t("out_of_stock"));
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
    if (!cart.length) return toast.error(t("cart_empty"));
    if (isSplit) {
      const amt1 = parseFloat(split1Amount);
      if (isNaN(amt1) || amt1 <= 0)  return toast.error("Enter valid first payment amount");
      if (amt1 >= total)             return toast.error("First amount must be less than total");
    }
    if (isPartial) {
      const paid = parseFloat(amountPaid);
      if (isNaN(paid) || paid < 0)  return toast.error("Enter a valid amount paid");
      if (paid >= total)             return toast.error("Partial payment must be less than total");
      if (!dueDate)                  return toast.error("Specify a due date for the remainder");
    }
    setSaving(true);
    try {
      const body = {
        customer_name:  customer || "Walk-in",
        payment_method: payment,
        items:          cart.map(i => ({ stock_item_id: i.stock_item_id, quantity: i.quantity, unit_price: i.unit_price })),
        amount_paid:    isPartial ? parseFloat(amountPaid) : total,
        due_date:       isPartial ? dueDate : null,
      };
      if (isSplit) {
        const amt1 = parseFloat(split1Amount);
        body.split_payments = [
          { method: payment,       amount: amt1 },
          { method: split2Method,  amount: total - amt1 },
        ];
        body.payment_method = "split";
      }
      const { data } = await api.post("/sales", body);
      setInvoiceNum(data.invoice_number);
      setNewSaleId(data.id);
      setShowConfirm(false);
      toast.success(`Sale recorded — Invoice: ${data.invoice_number}`);
      setCart([]); setCustomer(""); setPayment("cash");
      setIsPartial(false); setAmountPaid(""); setDueDate("");
      setIsSplit(false); setSplit1Amount(""); setSplit2Method("mtn_momo");
      fetchStock();
    } catch(e) { toast.error(e.response?.data?.error || "Failed to record sale"); }
    finally   { setSaving(false); }
  }

  return (
    <PageWrapper title={t("point_of_sale")} subtitle={t("point_of_sale_subtitle")}
      breadcrumbs={[{ label: t("sales"), path:"/app/sales" }, { label: t("new_sale"), path:"/app/sales/new" }]}>

      <div className="flex h-[calc(100vh-140px)] gap-4">
        {/* Product grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="mb-3">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t("search_by_name_or_barcode")}
                className="w-full h-10 pl-9 pr-3 border border-border rounded-[6px] text-[14px] focus:outline-none focus:ring-1 focus:ring-primary bg-surface" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map(c => (
                <button key={c} onClick={() => setCat(c)}
                  className={`shrink-0 px-3 py-1 rounded-full text-[13px] font-medium border transition-colors ${cat===c?"bg-primary text-white border-primary":"border-border text-text-secondary hover:border-primary/50"}`}>
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
              <div className="flex items-center justify-center h-full text-[14px] text-text-secondary">
                {t("no_products_match")}
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
                      <p className="text-[14px] font-semibold text-text-primary truncate">{item.name}</p>
                      {item.name_rw && <p className="text-[13px] text-text-secondary truncate">{item.name_rw}</p>}
                      <p className="text-[13px] text-text-secondary">{item.category} · {item.unit||"pcs"}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[15px] font-bold text-primary">{formatRWF(item.sell_price_rwf)}</span>
                        <span className={`text-[12px] font-medium ${outOfStock?"text-danger":item.quantity<=item.low_stock_threshold?"text-warning":"text-text-secondary"}`}>
                          {outOfStock ? t("out_label") : `${item.quantity} ${t("left_in_stock")}`}
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
          <CartPanel cart={cart} setCart={setCart} updateQty={updateQty} customer={customer} setCustomer={setCustomer} payment={payment} setPayment={setPayment} total={total} setShowConfirm={setShowConfirm} t={t} PAYMENTS={PAYMENTS} isSplit={isSplit} setIsSplit={setIsSplit} split2Method={split2Method} setSplit2Method={setSplit2Method} split1Amount={split1Amount} setSplit1Amount={setSplit1Amount} />
        </div>
      </div>

      {/* FAB (mobile) */}
      <button onClick={() => setShowCart(true)}
        className="fixed bottom-6 right-6 lg:hidden w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg text-white">
        <ShoppingCart size={22} />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-[12px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>
        )}
      </button>

      {/* Mobile cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setShowCart(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-[16px] p-5 max-h-[85vh] overflow-y-auto"
               onClick={e => e.stopPropagation()}>
            <CartPanel cart={cart} setCart={setCart} updateQty={updateQty} customer={customer} setCustomer={setCustomer} payment={payment} setPayment={setPayment} total={total} setShowConfirm={setShowConfirm} t={t} PAYMENTS={PAYMENTS} isSplit={isSplit} setIsSplit={setIsSplit} split2Method={split2Method} setSplit2Method={setSplit2Method} split1Amount={split1Amount} setSplit1Amount={setSplit1Amount} />
          </div>
        </div>
      )}

      {/* Confirm modal */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title={t("confirm_sale")}
        footer={<><Button variant="secondary" onClick={() => setShowConfirm(false)}>{t("cancel")}</Button><Button loading={saving} onClick={confirmSale}>{t("record_sale")}</Button></>}>
        <div className="space-y-4">
          <p className="text-[14px] text-text-secondary">{t("customer")}: <strong>{customer || t("walk_in")}</strong></p>
          {isSplit ? (
            <div className="text-[14px] text-text-secondary space-y-1">
              <p>{t("payment_label")}: <strong>Split</strong></p>
              <p className="ml-3">• {PAYMENTS.find(p=>p.key===payment)?.label}: <strong>{formatRWF(parseFloat(split1Amount)||0)}</strong></p>
              <p className="ml-3">• {PAYMENTS.find(p=>p.key===split2Method)?.label}: <strong>{formatRWF(Math.max(0,total-(parseFloat(split1Amount)||0)))}</strong></p>
            </div>
          ) : (
            <p className="text-[14px] text-text-secondary">{t("payment_label")}: <strong>{PAYMENTS.find(p=>p.key===payment)?.label}</strong></p>
          )}
          <div className="flex justify-between py-2 border-t border-b border-border">
            <span className="text-[14px] font-bold text-text-primary">{t("total")}:</span>
            <span className="text-[17px] font-black text-primary">{formatRWF(total)}</span>
          </div>

          <label className="flex items-center gap-2 text-[14px] font-medium text-text-primary cursor-pointer">
            <input type="checkbox" checked={isPartial}
              onChange={e => {
                setIsPartial(e.target.checked);
                if (e.target.checked) {
                  setAmountPaid(String(Math.round(total / 2)));
                  const d = new Date(); d.setDate(d.getDate()+7);
                  setDueDate(d.toISOString().slice(0,10));
                } else { setAmountPaid(""); setDueDate(""); }
              }} className="h-4 w-4 accent-primary" />
            {t("partial_payment")}
          </label>

          {isPartial && (
            <div className="p-3 bg-background border border-border rounded-[6px] space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] font-semibold text-text-secondary uppercase mb-1">{t("amount_paid_rwf")}</label>
                  <input type="number" min="0" value={amountPaid} onChange={e=>setAmountPaid(e.target.value)}
                    className="w-full h-9 px-2 border border-border rounded text-[14px] focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-text-secondary uppercase mb-1">{t("remaining")}</label>
                  <div className="h-9 px-2 border border-border rounded text-[14px] flex items-center text-danger font-bold">
                    {formatRWF(Math.max(0, total - (parseFloat(amountPaid)||0)))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-text-secondary uppercase mb-1">{t("due_date")}</label>
                <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}
                  className="w-full h-9 px-2 border border-border rounded text-[14px] focus:outline-none focus:ring-1 focus:ring-primary" />
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
            <h3 className="text-[20px] font-bold text-text-primary mb-1">{t("sale_recorded")}</h3>
            <p className="text-[14px] text-text-secondary mb-5">Invoice: {invoiceNum}</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1 text-[13px]" onClick={() => { setInvoiceNum(null); setNewSaleId(null); }}>{t("new_sale_btn")}</Button>
              <Button variant="primary"   className="flex-1 text-[13px]" onClick={() => navigate(`/app/sales/${newSaleId}?print=true`)}>{t("print_receipt")}</Button>
              <Button variant="secondary" className="flex-1 text-[13px]" onClick={() => navigate(`/app/sales/${newSaleId}`)}>{t("view")}</Button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
