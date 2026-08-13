import { useEffect, useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Search,
  Plus,
  Minus,
  ChevronRight,
  Banknote,
  Smartphone,
  Clock,
  Trash2,
  ShoppingCart,
  Edit3,
  Tag,
  History,
  FileText,
  CheckCircle,
  Printer,
  Calendar,
  Layers,
  Phone,
  MessageCircle,
  AlertCircle,
  UserCheck,
  CreditCard,
  User,
  DollarSign,
  ArrowRight,
  Image,
  ImageOff
} from "lucide-react";
import api, { errorMessage } from "../lib/api";
import { useLang } from "../lib/i18n.jsx";
import { rwf, clockTime, formatDate } from "../lib/format";
import ScreenHeader from "../components/ScreenHeader";
import Sheet from "../components/Sheet";
import { Button, TextInput, Field } from "../components/ui";
import { getProductImage } from "../lib/productImages";
import SafeImage from "../components/SafeImage";
import { useData } from "../context/DataContext";
import EbmReceipt from "../components/EbmReceipt";

export default function Sell() {
  const { t } = useLang();
  const { stock: products, sales: salesHistory, recordSale, recordDebtPayment } = useData();

  const [cats, setCats] = useState([]);
  const [activeCat, setActiveCat] = useState("__all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState({}); // id -> { item, qty }
  const [payOpen, setPayOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPhotos, setShowPhotos] = useState(false);

  // View Mode: "sell" | "debts" | "history"
  const [viewMode, setViewMode] = useState("sell");
  const [historyQuery, setHistoryQuery] = useState("");
  const [debtQuery, setDebtQuery] = useState("");
  const [debtFilter, setDebtFilter] = useState("all"); // 'all' | 'unpaid' | 'partial'
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Payment Mode State: "single" | "split"
  const [payMode, setPayMode] = useState("single");
  const [method, setMethod] = useState("cash"); // 'cash' | 'mtn_momo' | 'airtel' | 'credit'

  // Split Payment Inputs
  const [splitCash, setSplitCash] = useState("");
  const [splitMomo, setSplitMomo] = useState("");
  const [splitMomoProvider, setSplitMomoProvider] = useState("mtn_momo");

  // Customer & Debt Details
  const [customer, setCustomer] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    return new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
  });
  const [saleNotes, setSaleNotes] = useState("");

  // Manual Custom Item Modal State
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");

  // Debt Payment Modal State
  const [repayTarget, setRepayTarget] = useState(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayMethod, setRepayMethod] = useState("cash");
  const [repayNote, setRepayNote] = useState("");
  const [repaySaving, setRepaySaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const catRes = await api.get("/stock/categories");
      if (catRes?.data) setCats(catRes.data);
    } catch (e) {
      /* network fallback */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const safeProducts = Array.isArray(products) ? products : [];
  const safeHistory = Array.isArray(salesHistory) ? salesHistory : [];

  const visibleProducts = useMemo(() => {
    return safeProducts.filter((p) => {
      if (activeCat !== "__all" && p.category !== activeCat) return false;
      if (query && !p.name?.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [safeProducts, activeCat, query]);

  // Derived Debt List (Sales with remaining debt > 0)
  const debtSales = useMemo(() => {
    return safeHistory.filter((s) => Number(s.amount_owed) > 0 || s.payment_status === "pending" || s.payment_status === "partial" || s.payment_status === "debt");
  }, [safeHistory]);

  const filteredDebts = useMemo(() => {
    return debtSales.filter((s) => {
      const q = debtQuery.toLowerCase();
      const matchesSearch =
        s.customer_name?.toLowerCase().includes(q) ||
        s.customer_phone?.includes(q) ||
        s.invoice_number?.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (debtFilter === "unpaid") return Number(s.amount_paid || 0) === 0;
      if (debtFilter === "partial") return Number(s.amount_paid || 0) > 0 && Number(s.amount_owed || 0) > 0;
      return true;
    });
  }, [debtSales, debtQuery, debtFilter]);

  const totalOutstandingDebt = useMemo(() => {
    return debtSales.reduce((acc, s) => acc + (Number(s.amount_owed) || 0), 0);
  }, [debtSales]);

  const filteredHistory = useMemo(() => {
    if (!historyQuery.trim()) return safeHistory;
    const q = historyQuery.toLowerCase();
    return safeHistory.filter(
      (s) =>
        s.invoice_number?.toLowerCase().includes(q) ||
        s.customer_name?.toLowerCase().includes(q) ||
        s.payment_method?.toLowerCase().includes(q)
    );
  }, [safeHistory, historyQuery]);

  const todayRevenue = useMemo(() => {
    return safeHistory.reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0);
  }, [safeHistory]);

  // Cart Calculations
  const lines = Object.values(cart);
  const totalItems = lines.reduce((s, l) => s + l.qty, 0);
  const totalAmount = lines.reduce((s, l) => s + l.qty * (l.item.sell_price_rwf || 0), 0);

  // Split calculation metrics
  const cashVal = Number(splitCash) || 0;
  const momoVal = Number(splitMomo) || 0;
  const splitTotalPaid = cashVal + momoVal;
  const splitRemainingDebt = Math.max(0, totalAmount - splitTotalPaid);

  // Existing customer names suggestion list
  const existingCustomers = useMemo(() => {
    const names = new Set();
    safeHistory.forEach((s) => {
      if (s.customer_name && s.customer_name !== "Walk-in Customer") {
        names.add(s.customer_name.trim());
      }
    });
    return Array.from(names);
  }, [safeHistory]);

  const addToCart = (item) => {
    setCart((c) => {
      const cur = c[item.id];
      const max = item.is_custom ? 9999 : Number(item.quantity) || 0;
      const nextQty = Math.min((cur?.qty || 0) + 1, max);
      if (nextQty === 0 && !item.is_custom) {
        toast.error(t("out_of_stock"));
        return c;
      }
      return { ...c, [item.id]: { item, qty: nextQty } };
    });
  };

  const decFromCart = (item) => {
    setCart((c) => {
      const cur = c[item.id];
      if (!cur) return c;
      const nextQty = cur.qty - 1;
      const next = { ...c };
      if (nextQty <= 0) delete next[item.id];
      else next[item.id] = { item, qty: nextQty };
      return next;
    });
  };

  const updateCartQty = (item, newQtyVal) => {
    const parsed = parseInt(newQtyVal, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setCart((c) => {
        const next = { ...c };
        delete next[item.id];
        return next;
      });
      return;
    }

    const max = item.is_custom ? 9999 : (Number(item.quantity) || 9999);
    const finalQty = Math.min(parsed, max);

    setCart((c) => ({
      ...c,
      [item.id]: { item, qty: finalQty },
    }));
  };

  const clearCart = () => setCart({});

  // Handle adding custom manual text item
  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!customName.trim()) {
      toast.error("Please enter a product or service name.");
      return;
    }
    const priceNum = Number(customPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Please enter a valid price in RWF.");
      return;
    }

    const id = `custom_${Date.now()}`;
    const item = {
      id,
      name: customName.trim(),
      sell_price_rwf: priceNum,
      is_custom: true,
      category: "Custom Item",
    };
    const qty = Math.max(1, Number(customQty) || 1);

    setCart((c) => ({ ...c, [id]: { item, qty } }));
    toast.success(`Added "${customName.trim()}" to cart`);

    setCustomName("");
    setCustomPrice("");
    setCustomQty("1");
    setCustomOpen(false);
  };

  async function handleComplete() {
    if (!lines.length) return;

    // Validate Debt Requirement: If customer owes money, require customer name & phone number
    const isDebtSale = method === "credit" || (payMode === "split" && splitRemainingDebt > 0);
    if (isDebtSale && !customer.trim()) {
      toast.error("Customer name is required when money is owed as debt.");
      return;
    }
    if (isDebtSale && !customerPhone.trim()) {
      toast.error("Customer phone number is required for recording customer debt.");
      return;
    }

    setSaving(true);
    try {
      const items = lines.map((l) => ({
        stock_item_id: l.item.is_custom ? null : l.item.id,
        item_name: l.item.name,
        quantity: l.qty,
        unit_price: Number(l.item.sell_price_rwf) || 0,
      }));

      const finalPaymentMethod = payMode === "split" ? "split" : method;
      const splitPaymentsObj = payMode === "split"
        ? {
            cash: cashVal,
            momo: momoVal,
            momo_provider: splitMomoProvider,
            credit: splitRemainingDebt,
          }
        : null;

      const amountPaidUpfront = payMode === "split"
        ? splitTotalPaid
        : (method === "credit" ? 0 : totalAmount);

      await recordSale({
        items,
        payment_method: finalPaymentMethod,
        customer_name: customer.trim() || "Walk-in Customer",
        customer_phone: customerPhone.trim(),
        due_date: isDebtSale ? dueDate : undefined,
        amount_paid: amountPaidUpfront,
        split_payments: splitPaymentsObj,
        notes: saleNotes,
      });

      toast.success(isDebtSale ? "Sale & Customer Debt Recorded!" : t("sale_recorded"));
      setCart({});
      setCustomer("");
      setCustomerPhone("");
      setSaleNotes("");
      setSplitCash("");
      setSplitMomo("");
      setPayOpen(false);
      setMethod("cash");
      setPayMode("single");
    } catch (err) {
      toast.error(errorMessage(err, "Could not record the sale."));
    } finally {
      setSaving(false);
    }
  }

  // Handle Debt Payment Repayment Submit
  const handleRecordRepayment = async (e) => {
    e.preventDefault();
    if (!repayTarget) return;

    const amt = Number(repayAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid repayment amount.");
      return;
    }

    setRepaySaving(true);
    try {
      await recordDebtPayment(repayTarget.id, {
        amount: amt,
        payment_method: repayMethod,
        note: repayNote.trim() || "Customer debt repayment",
      });

      toast.success(`Recorded repayment of ${rwf(amt)} RWF from ${repayTarget.customer_name}`);
      setRepayTarget(null);
      setRepayAmount("");
      setRepayNote("");
    } catch (err) {
      toast.error("Could not record debt repayment.");
    } finally {
      setRepaySaving(false);
    }
  };

  const payOptions = [
    { value: "cash", label: t("pay_cash"), icon: Banknote },
    { value: "mtn_momo", label: t("pay_momo"), icon: Smartphone },
    { value: "airtel", label: "Airtel Money", icon: Smartphone },
    { value: "credit", label: "Full Credit (Debt)", icon: Clock },
  ];

  return (
    <div className="relative flex h-full flex-col md:flex-row md:gap-6 p-0 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        <ScreenHeader title={t("record_a_sale")} />

        {/* View Mode Toggle: Record Sale vs Customer Debts vs Today's History */}
        <div className="px-4 md:px-0">
          <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-white border border-gray-200/80 shadow-sm overflow-x-auto">
            <button
              onClick={() => setViewMode("sell")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                viewMode === "sell"
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <ShoppingCart size={15} /> Record Sale
            </button>

            <button
              onClick={() => setViewMode("debts")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                viewMode === "debts"
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Clock size={15} /> Customer Debts ({debtSales.length})
            </button>

            <button
              onClick={() => setViewMode("history")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs font-extrabold transition cursor-pointer whitespace-nowrap ${
                viewMode === "history"
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <History size={15} /> Sales History ({salesHistory.length})
            </button>
          </div>
        </div>

        {/* VIEW 1: RECORD SALE (Product Catalog & Manual Items) */}
        {viewMode === "sell" && (
          <>
            {/* Search, Photo Toggle & Custom Text Item Button */}
            <div className="px-4 md:px-0 flex items-center gap-2 font-manrope">
              <div className="flex flex-1 items-center gap-2.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 shadow-sm">
                <Search size={16} className="text-gray-400 shrink-0" />
                <input
                  className="flex-1 bg-transparent text-xs md:text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400"
                  placeholder={t("search")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={() => setShowPhotos(!showPhotos)}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-extrabold text-gray-700 shadow-sm hover:bg-gray-50 transition cursor-pointer shrink-0"
              >
                {showPhotos ? <ImageOff size={15} className="text-gray-500" /> : <Image size={15} className="text-purple-600" />}
                <span className="hidden sm:inline">{showPhotos ? "Hide Photos" : "Show Photos"}</span>
              </button>

              <button
                onClick={() => setCustomOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-gray-900 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-gray-800 active:scale-95 transition cursor-pointer shrink-0 shadow-sm"
              >
                <Edit3 size={15} />
                <span className="hidden sm:inline">+ Custom Item</span>
                <span className="sm:hidden">+ Manual</span>
              </button>
            </div>

            {/* Category chips */}
            <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 md:px-0 font-manrope">
              {[{ value: "__all", label: t("all") }, ...cats.map((c) => ({ value: c, label: c }))].map((c) => (
                <button
                  key={c.value}
                  onClick={() => setActiveCat(c.value)}
                  className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-extrabold transition ${
                    activeCat === c.value
                      ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Product grid */}
            <div className="flex-1 overflow-y-auto px-4 md:px-0 pb-36 md:pb-6 font-manrope">
              {visibleProducts.length === 0 ? (
                <div className="mt-12 text-center text-xs md:text-sm text-gray-400 space-y-3 font-semibold">
                  <p>{t("no_products")}</p>
                  <button
                    onClick={() => setCustomOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-gray-900 text-xs font-extrabold text-white shadow-sm hover:bg-gray-800"
                  >
                    <Plus size={14} /> Add Custom Item Manually
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {visibleProducts.map((p) => {
                    const inCart = cart[p.id]?.qty || 0;
                    return (
                      <div
                        key={p.id}
                        className={`group flex flex-col justify-between overflow-hidden rounded-[24px] border bg-white transition duration-150 ${
                          inCart > 0 ? "border-gray-900 shadow-md ring-1 ring-gray-900/10" : "border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        <button onClick={() => addToCart(p)} className="block w-full text-left flex-1">
                          {/* Optional Product Image */}
                          {showPhotos && (
                            <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-gray-100">
                              <SafeImage
                                src={getProductImage(p)}
                                alt={p.name}
                                className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                              />
                              {inCart > 0 && (
                                <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-[10px] font-black text-white shadow-md">
                                  {inCart}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="p-3.5">
                            <div className="flex items-start justify-between gap-1">
                              <div className="line-clamp-2 text-xs md:text-sm font-extrabold text-gray-900 group-hover:text-purple-600 transition">
                                {p.name}
                              </div>
                              {inCart > 0 && !showPhotos && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[10px] font-black text-white shrink-0 shadow-sm">
                                  {inCart}
                                </span>
                              )}
                            </div>

                            {p.category && (
                              <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[9px] font-extrabold uppercase tracking-wider">
                                {p.category}
                              </span>
                            )}

                            <div className="mt-2 text-xs font-black tabnum text-gray-900">
                              {rwf(p.sell_price_rwf)} RWF
                            </div>
                          </div>
                        </button>

                        {inCart > 0 ? (
                          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-2 py-1.5 gap-1">
                            <button
                              type="button"
                              onClick={() => decFromCart(p)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-900 hover:bg-gray-100 shrink-0"
                            >
                              <Minus size={14} />
                            </button>

                            <input
                              type="number"
                              min="1"
                              max={p.quantity || 9999}
                              value={inCart}
                              onChange={(e) => updateCartQty(p, e.target.value)}
                              className="w-12 text-center text-xs font-black tabnum text-gray-900 bg-white border border-gray-300 rounded-lg py-1 px-0 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                              title="Type quantity manually"
                            />

                            <button
                              type="button"
                              onClick={() => addToCart(p)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-900 text-white hover:bg-gray-800 shrink-0"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="px-3 pb-3">
                            <button
                              onClick={() => addToCart(p)}
                              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-900 text-xs font-extrabold text-white hover:bg-gray-800 transition shadow-sm"
                            >
                              <Plus size={14} /> {t("add")}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* VIEW 2: CUSTOMER DEBT BOOK & RECOVERY LEDGER */}
        {viewMode === "debts" && (
          <div className="flex-1 overflow-y-auto px-4 md:px-0 space-y-4 pb-20">
            {/* KPI Cards for Debts */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
                <span className="text-xs font-bold text-amber-800 uppercase">Total Outstanding Debt</span>
                <h3 className="text-xl font-extrabold text-amber-900 mt-1">{rwf(totalOutstandingDebt)} RWF</h3>
              </div>

              <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
                <span className="text-xs font-bold text-muted uppercase">Active Debtors</span>
                <h3 className="text-xl font-extrabold text-ink mt-1">{debtSales.length} Customers</h3>
              </div>

              <div className="rounded-2xl border border-line bg-card p-4 shadow-sm col-span-2 sm:col-span-1">
                <span className="text-xs font-bold text-muted uppercase">Repayment Rate</span>
                <h3 className="text-xl font-extrabold text-emerald-600 mt-1">High Health</h3>
              </div>
            </div>

            {/* Debt Filters & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 rounded-xl border border-line bg-card px-3.5 py-2.5 shadow-sm flex-1">
                <Search size={16} className="text-muted shrink-0" />
                <input
                  className="flex-1 bg-transparent text-xs md:text-sm text-ink outline-none placeholder:text-muted"
                  placeholder="Search debtor by customer name, phone or invoice..."
                  value={debtQuery}
                  onChange={(e) => setDebtQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-1 bg-card p-1 rounded-xl border border-line text-xs font-semibold">
                {["all", "unpaid", "partial"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDebtFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg capitalize transition ${
                      debtFilter === tab ? "bg-primary text-white shadow-sm font-bold" : "text-muted hover:text-ink"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Debt Cards List */}
            {filteredDebts.length === 0 ? (
              <div className="mt-8 text-center text-xs md:text-sm text-muted p-8 rounded-2xl border border-line bg-card space-y-2">
                <CheckCircle size={32} className="mx-auto text-emerald-500 mb-2" />
                <p className="font-bold text-ink">No Customer Debts Found!</p>
                <p className="text-xs text-muted">All customer credit accounts are fully balanced or match filter criteria.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDebts.map((s) => {
                  const total = Number(s.total_amount) || 0;
                  const paid = Number(s.amount_paid) || 0;
                  const owed = Number(s.amount_owed) || Math.max(0, total - paid);
                  const progressPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

                  return (
                    <div
                      key={s.id}
                      className="flex flex-col p-4 rounded-2xl border border-line bg-card shadow-sm space-y-3 hover:border-primary/40 transition"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-line/60 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold">
                            <User size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-extrabold text-ink">{s.customer_name || "Unknown Customer"}</h4>
                              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                                {s.payment_status || "Debt"}
                              </span>
                            </div>
                            <p className="text-xs text-muted mt-0.5 flex items-center gap-2">
                              {s.customer_phone ? (
                                <span className="font-mono text-primary font-bold">{s.customer_phone}</span>
                              ) : (
                                <span>No Phone Provided</span>
                              )}
                              <span>&bull;</span>
                              <span>{s.invoice_number || `INV-${s.id}`}</span>
                              <span>&bull;</span>
                              <span>{formatDate(s.created_at)}</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[11px] font-bold text-muted uppercase block">Remaining Debt</span>
                          <span className="text-lg font-black text-danger tabnum">{rwf(owed)} RWF</span>
                        </div>
                      </div>

                      {/* Repayment Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-semibold text-muted">
                          <span>Paid: <strong className="text-emerald-700 tabnum">{rwf(paid)} RWF</strong> ({progressPct}%)</span>
                          <span>Total Invoice: <strong className="text-ink tabnum">{rwf(total)} RWF</strong></span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-paper border border-line overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Due Date & Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="text-xs text-muted flex items-center gap-1.5">
                          <Calendar size={14} className="text-amber-600" />
                          <span>Due: <strong className="text-ink">{s.due_date || "No due date"}</strong></span>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          {s.customer_phone && (
                            <>
                              <a
                                href={`tel:${s.customer_phone}`}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl border border-line bg-paper text-xs font-bold text-ink hover:bg-card transition"
                              >
                                <Phone size={13} /> Call
                              </a>

                              <a
                                href={`https://wa.me/${s.customer_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                  `Hello ${s.customer_name}, this is a friendly reminder from our store regarding your outstanding balance of ${rwf(owed)} RWF for invoice ${s.invoice_number}. Thank you!`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition"
                              >
                                <MessageCircle size={13} /> WhatsApp
                              </a>
                            </>
                          )}

                          <button
                            onClick={() => {
                              setRepayTarget(s);
                              setRepayAmount(String(owed));
                            }}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-xl bg-primary text-xs font-extrabold text-white shadow-sm hover:bg-primary-lt transition cursor-pointer"
                          >
                            <DollarSign size={14} /> Pay Off Debt
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: SALES HISTORY VIEW */}
        {viewMode === "history" && (
          <div className="flex-1 overflow-y-auto px-4 md:px-0 space-y-4 pb-20">
            {/* Sales Stats Banner */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
                <span className="text-xs font-bold text-muted uppercase">Today's Total Sales</span>
                <h3 className="text-xl font-extrabold text-ink mt-1">{salesHistory.length} Recorded</h3>
              </div>

              <div className="rounded-2xl border border-primary/30 bg-primary-xlt p-4 shadow-sm">
                <span className="text-xs font-bold text-primary uppercase">Today's Revenue</span>
                <h3 className="text-xl font-extrabold text-primary mt-1">{rwf(todayRevenue)} RWF</h3>
              </div>
            </div>

            {/* Filter Search */}
            <div className="flex items-center gap-2.5 rounded-xl border border-line bg-card px-3.5 py-2.5 shadow-sm">
              <Search size={16} className="text-muted shrink-0" />
              <input
                className="flex-1 bg-transparent text-xs md:text-sm text-ink outline-none placeholder:text-muted"
                placeholder="Search sales by invoice #, customer name, or payment..."
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
              />
            </div>

            {/* Sales History List */}
            {filteredHistory.length === 0 ? (
              <div className="mt-8 text-center text-xs md:text-sm text-muted p-8 rounded-2xl border border-line bg-card">
                No sales transactions found for today.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border border-line bg-card shadow-sm hover:border-primary/40 transition"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-xlt text-primary">
                        <FileText size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-ink">
                            {s.invoice_number || `REC-${s.id}`}
                          </h4>
                          <span className="px-2 py-0.5 rounded-md bg-paper text-[10px] font-bold text-muted uppercase border border-line/60">
                            {s.payment_method || "cash"}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {s.customer_name || "Walk-in Customer"} &bull; {clockTime(s.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/60">
                      <div className="text-right">
                        <div className="text-sm font-extrabold tabnum text-primary">
                          {rwf(s.total_amount)} RWF
                        </div>
                        <div className="text-[10.5px] font-semibold text-emerald-700 flex items-center justify-end gap-1">
                          <CheckCircle size={12} /> {s.payment_status || "Completed"}
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedReceipt(s)}
                        className="px-3 py-1.5 rounded-xl border border-line bg-paper hover:bg-card text-xs font-bold text-ink transition cursor-pointer flex items-center gap-1"
                      >
                        <FileText size={13} /> View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR (DESKTOP LIVE CART & CHECKOUT PANEL) */}
      {viewMode === "sell" && (
        <div className="hidden md:flex md:w-80 lg:w-96 flex-col border border-line bg-card rounded-2xl p-5 shadow-card shrink-0 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-primary" />
              <h2 className="font-heading text-base font-extrabold text-ink">
                {t("cart_empty").replace("Empty", "Cart")}
              </h2>
            </div>
            {lines.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-semibold text-danger flex items-center gap-1 hover:underline"
              >
                <Trash2 size={13} /> {t("clear") || "Clear"}
              </button>
            )}
          </div>

          {/* Selected Cart Items */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[140px] max-h-[220px]">
            {lines.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted">
                <ShoppingCart size={32} className="mb-2 text-line" />
                <p className="text-xs font-semibold">{t("cart_empty")}</p>
                <p className="text-[11px] mt-1">Select items or tap "+ Custom Item" to start recording.</p>
              </div>
            ) : (
              lines.map(({ item, qty }) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper p-2.5"
                >
                  {item.is_custom ? (
                    <div className="h-10 w-10 rounded-lg bg-primary-xlt text-primary flex items-center justify-center shrink-0 border border-primary/20">
                      <Tag size={18} />
                    </div>
                  ) : (
                    <SafeImage
                      src={getProductImage(item)}
                      alt={item.name}
                      className="h-10 w-10 rounded-lg object-cover shrink-0 border border-line/60 bg-card"
                    />
                  )}
                  <div className="flex-1 truncate pr-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-ink truncate">{item.name}</span>
                      {item.is_custom && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 text-[9px] font-extrabold uppercase shrink-0">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted tabnum">
                      {rwf(item.sell_price_rwf)} RWF x {qty}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => decFromCart(item)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-900 hover:bg-gray-100"
                    >
                      <Minus size={13} />
                    </button>

                    <input
                      type="number"
                      min="1"
                      value={qty}
                      onChange={(e) => updateCartQty(item, e.target.value)}
                      className="w-12 text-center text-xs font-black tabnum text-gray-900 bg-white border border-gray-300 rounded-lg py-1 px-0 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                      title="Type quantity manually"
                    />

                    <button
                      type="button"
                      onClick={() => addToCart(item)}
                      className="h-7 w-7 flex items-center justify-center rounded-lg bg-gray-900 text-white hover:bg-gray-800"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout Controls */}
          <div className="pt-3 border-t border-line space-y-3 overflow-y-auto max-h-[50vh]">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted">
                <span>{t("items")}</span>
                <span className="font-bold tabnum">{totalItems}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-ink">
                <span>Total</span>
                <span className="tabnum text-primary">{rwf(totalAmount)} RWF</span>
              </div>
            </div>

            {/* Payment Mode Selector: Single vs Split Payment */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
                  Payment Mode
                </label>
                <div className="flex items-center gap-1 bg-paper p-1 rounded-lg border border-line text-[10.5px]">
                  <button
                    type="button"
                    onClick={() => setPayMode("single")}
                    className={`px-2 py-0.5 rounded font-bold transition ${
                      payMode === "single" ? "bg-primary text-white" : "text-muted hover:text-ink"
                    }`}
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPayMode("split");
                      if (!splitCash && !splitMomo) {
                        setSplitCash(String(Math.round(totalAmount / 2)));
                        setSplitMomo(String(totalAmount - Math.round(totalAmount / 2)));
                      }
                    }}
                    className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
                      payMode === "split" ? "bg-primary text-white" : "text-muted hover:text-ink"
                    }`}
                  >
                    <Layers size={11} /> Split
                  </button>
                </div>
              </div>

              {payMode === "single" ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {payOptions.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setMethod(value)}
                      className={`flex items-center gap-1.5 rounded-xl border p-2 text-left transition ${
                        method === value
                          ? "border-primary bg-primary-xlt text-primary font-bold"
                          : "border-line bg-paper text-ink font-semibold"
                      }`}
                    >
                      <Icon size={14} />
                      <span className="text-[11px] truncate">{label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                /* SPLIT PAYMENT CONTROLS */
                <div className="space-y-2.5 p-3 rounded-2xl border border-primary/30 bg-primary-xlt/30">
                  <div className="text-[11px] font-bold text-primary flex items-center gap-1">
                    <Layers size={13} /> Split Cash + Mobile Money + Debt
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Cash Paid (RWF)">
                      <TextInput
                        type="number"
                        placeholder="0"
                        value={splitCash}
                        onChange={(e) => setSplitCash(e.target.value)}
                      />
                    </Field>

                    <Field label="MoMo Paid (RWF)">
                      <TextInput
                        type="number"
                        placeholder="0"
                        value={splitMomo}
                        onChange={(e) => setSplitMomo(e.target.value)}
                      />
                    </Field>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted font-bold">MoMo Provider:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSplitMomoProvider("mtn_momo")}
                        className={`px-2 py-1 rounded-lg text-[10.5px] font-bold border transition ${
                          splitMomoProvider === "mtn_momo"
                            ? "bg-amber-400 text-amber-950 border-amber-500"
                            : "bg-paper text-muted border-line"
                        }`}
                      >
                        MTN MoMo
                      </button>
                      <button
                        type="button"
                        onClick={() => setSplitMomoProvider("airtel")}
                        className={`px-2 py-1 rounded-lg text-[10.5px] font-bold border transition ${
                          splitMomoProvider === "airtel"
                            ? "bg-red-500 text-white border-red-600"
                            : "bg-paper text-muted border-line"
                        }`}
                      >
                        Airtel Money
                      </button>
                    </div>
                  </div>

                  {/* Split Calculation Live Summary Box */}
                  <div className="pt-2 border-t border-line/60 space-y-1 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span>Total Paying Now:</span>
                      <span className="font-extrabold text-emerald-700 tabnum">{rwf(splitTotalPaid)} RWF</span>
                    </div>

                    {splitRemainingDebt > 0 ? (
                      <div className="flex justify-between font-extrabold text-amber-800 bg-amber-100/70 p-2 rounded-xl border border-amber-300">
                        <span>Owed as Customer Debt:</span>
                        <span className="tabnum">{rwf(splitRemainingDebt)} RWF</span>
                      </div>
                    ) : splitTotalPaid > totalAmount ? (
                      <div className="flex justify-between font-extrabold text-blue-800 bg-blue-100/70 p-2 rounded-xl border border-blue-300">
                        <span>Change to Return:</span>
                        <span className="tabnum">{rwf(splitTotalPaid - totalAmount)} RWF</span>
                      </div>
                    ) : (
                      <div className="flex justify-between font-bold text-emerald-800 text-[11px]">
                        <span>Status:</span>
                        <span>Fully Paid (0 Debt)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Customer Information Section */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
                Customer & Credit Info
              </label>

              <div className="space-y-2">
                <TextInput
                  placeholder="Customer Name (e.g. Jean Paul)"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  list="customer-suggestions"
                />
                <datalist id="customer-suggestions">
                  {existingCustomers.map((c, idx) => (
                    <option key={idx} value={c} />
                  ))}
                </datalist>

                {(method === "credit" || (payMode === "split" && splitRemainingDebt > 0)) && (
                  <div className="space-y-2 p-3 rounded-2xl border border-amber-300 bg-amber-50/60">
                    <div className="text-[11px] font-extrabold text-amber-900 flex items-center gap-1">
                      <AlertCircle size={13} /> Customer Contact Required for Debt
                    </div>

                    <TextInput
                      required
                      placeholder="Customer Phone Number (e.g. 0788123456)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />

                    <Field label="Debt Payment Due Date">
                      <TextInput
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </Field>
                  </div>
                )}
              </div>
            </div>

            {/* Complete Sale Button */}
            <Button
              full
              variant="green"
              disabled={!lines.length || saving}
              onClick={handleComplete}
              className="py-3 text-sm font-extrabold shadow-sm"
            >
              {saving ? "…" : `${t("complete_sale")} · ${rwf(totalAmount)} RWF`}
            </Button>
          </div>
        </div>
      )}

      {/* MOBILE STICKY FLOATING CART BAR (< md) when in 'sell' mode */}
      {viewMode === "sell" && (
        <div className="md:hidden pointer-events-none fixed inset-x-0 bottom-16 px-4 pb-3 z-10">
          <div
            className={`pointer-events-auto flex items-center justify-between rounded-2xl bg-ink px-4 py-3 shadow-pop transition ${
              lines.length ? "opacity-100" : "opacity-70"
            }`}
          >
            <div>
              <div className="text-[10.5px] font-semibold text-white/65">
                {lines.length ? `${totalItems} ${t("items")}` : t("cart_empty")}
              </div>
              <div className="font-heading text-base font-extrabold tabnum text-white">
                {rwf(totalAmount)} RWF
              </div>
            </div>
            <button
              disabled={!lines.length}
              onClick={() => setPayOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary-lt disabled:opacity-50"
            >
              <span>{t("checkout")}</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* MOBILE PAYMENT DRAWER SHEET */}
      <Sheet open={payOpen} onClose={() => setPayOpen(false)} title={t("complete_sale")}>
        <div className="space-y-4 pt-2 pb-6 max-h-[80vh] overflow-y-auto">
          <div className="rounded-2xl border border-line bg-paper p-4 space-y-2">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider">Cart Summary</div>
            <div className="max-h-32 overflow-y-auto space-y-2 pr-1">
              {lines.map(({ item, qty }) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <span className="font-bold text-ink truncate pr-2">{item.name}</span>
                  <span className="text-muted font-mono">{qty} x {rwf(item.sell_price_rwf)}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-line/60 flex justify-between text-sm font-extrabold text-ink">
              <span>Total Payable:</span>
              <span className="text-primary">{rwf(totalAmount)} RWF</span>
            </div>
          </div>

          {/* Mobile Payment Mode Switcher */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider">
                Payment Mode
              </label>
              <div className="flex items-center gap-1 bg-paper p-1 rounded-lg border border-line text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPayMode("single")}
                  className={`px-3 py-1 rounded-lg transition ${
                    payMode === "single" ? "bg-primary text-white font-bold" : "text-muted"
                  }`}
                >
                  Single Payment
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPayMode("split");
                    if (!splitCash && !splitMomo) {
                      setSplitCash(String(Math.round(totalAmount / 2)));
                      setSplitMomo(String(totalAmount - Math.round(totalAmount / 2)));
                    }
                  }}
                  className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                    payMode === "split" ? "bg-primary text-white font-bold" : "text-muted"
                  }`}
                >
                  <Layers size={13} /> Split Payment
                </button>
              </div>
            </div>

            {payMode === "single" ? (
              <div className="grid grid-cols-2 gap-2">
                {payOptions.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setMethod(value)}
                    className={`flex items-center gap-2 rounded-xl border p-3 text-left transition ${
                      method === value
                        ? "border-primary bg-primary-xlt text-primary font-bold"
                        : "border-line bg-paper text-ink font-semibold"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-xs">{label}</span>
                  </button>
                ))}
              </div>
            ) : (
              /* Mobile Split Controls */
              <div className="space-y-3 p-3.5 rounded-2xl border border-primary/30 bg-primary-xlt/30">
                <div className="text-xs font-bold text-primary flex items-center gap-1">
                  <Layers size={14} /> Split Cash + Mobile Money + Customer Debt
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Field label="Cash Paid (RWF)">
                    <TextInput
                      type="number"
                      placeholder="0"
                      value={splitCash}
                      onChange={(e) => setSplitCash(e.target.value)}
                    />
                  </Field>

                  <Field label="MoMo Paid (RWF)">
                    <TextInput
                      type="number"
                      placeholder="0"
                      value={splitMomo}
                      onChange={(e) => setSplitMomo(e.target.value)}
                    />
                  </Field>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted font-bold">MoMo Provider:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSplitMomoProvider("mtn_momo")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                        splitMomoProvider === "mtn_momo"
                          ? "bg-amber-400 text-amber-950 border-amber-500"
                          : "bg-paper text-muted border-line"
                      }`}
                    >
                      MTN MoMo
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitMomoProvider("airtel")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                        splitMomoProvider === "airtel"
                          ? "bg-red-500 text-white border-red-600"
                          : "bg-paper text-muted border-line"
                      }`}
                    >
                      Airtel Money
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-line/60 space-y-1 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span>Total Paying Upfront:</span>
                    <span className="font-extrabold text-emerald-700 tabnum">{rwf(splitTotalPaid)} RWF</span>
                  </div>

                  {splitRemainingDebt > 0 ? (
                    <div className="flex justify-between font-extrabold text-amber-900 bg-amber-100 p-2.5 rounded-xl border border-amber-300">
                      <span>Owed as Customer Debt:</span>
                      <span className="tabnum">{rwf(splitRemainingDebt)} RWF</span>
                    </div>
                  ) : splitTotalPaid > totalAmount ? (
                    <div className="flex justify-between font-extrabold text-blue-900 bg-blue-100 p-2.5 rounded-xl border border-blue-300">
                      <span>Change to Return:</span>
                      <span className="tabnum">{rwf(splitTotalPaid - totalAmount)} RWF</span>
                    </div>
                  ) : (
                    <div className="flex justify-between font-bold text-emerald-800">
                      <span>Status:</span>
                      <span>Fully Paid (0 Debt)</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <TextInput
              placeholder="Customer Name (e.g. Jean Paul)"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            />

            {(method === "credit" || (payMode === "split" && splitRemainingDebt > 0)) && (
              <div className="space-y-2 p-3 rounded-2xl border border-amber-300 bg-amber-50/60">
                <div className="text-[11px] font-extrabold text-amber-900 flex items-center gap-1">
                  <AlertCircle size={13} /> Phone Number Required for Customer Debt
                </div>

                <TextInput
                  required
                  placeholder="Customer Phone Number (e.g. 0788123456)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />

                <Field label="Debt Payment Due Date">
                  <TextInput
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>

          <Button
            full
            variant="green"
            disabled={saving}
            onClick={handleComplete}
            className="py-3 text-sm font-extrabold shadow-sm"
          >
            {saving ? "…" : `${t("complete_sale")} · ${rwf(totalAmount)} RWF`}
          </Button>
        </div>
      </Sheet>

      {/* REPAY DEBT MODAL SHEET */}
      <Sheet open={!!repayTarget} onClose={() => setRepayTarget(null)} title="Record Customer Debt Repayment">
        {repayTarget && (
          <form onSubmit={handleRecordRepayment} className="space-y-4 pt-2 pb-6">
            <div className="rounded-2xl border border-line bg-paper p-4 space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-ink">{repayTarget.customer_name}</span>
                <span className="font-mono text-muted">{repayTarget.invoice_number}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted">Total Invoice:</span>
                <span className="font-bold tabnum">{rwf(repayTarget.total_amount)} RWF</span>
              </div>
              <div className="flex justify-between items-center text-sm font-extrabold text-danger pt-1 border-t border-line/60">
                <span>Current Debt Balance:</span>
                <span className="tabnum">{rwf(repayTarget.amount_owed)} RWF</span>
              </div>
            </div>

            <Field label="Repayment Amount (RWF)">
              <TextInput
                required
                type="number"
                min="1"
                max={repayTarget.amount_owed}
                placeholder="Enter repayment amount"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                autoFocus
              />
            </Field>

            <Field label="Payment Method">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "cash", label: "Cash", icon: Banknote },
                  { id: "mtn_momo", label: "MTN MoMo", icon: Smartphone },
                  { id: "airtel", label: "Airtel Money", icon: Smartphone },
                  { id: "bank", label: "Bank Transfer", icon: CreditCard },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRepayMethod(m.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition ${
                        repayMethod === m.id
                          ? "border-primary bg-primary-xlt text-primary"
                          : "border-line bg-paper text-ink"
                      }`}
                    >
                      <Icon size={16} /> {m.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Notes / Reference (Optional)">
              <TextInput
                placeholder="e.g. Partial repayment via Cash"
                value={repayNote}
                onChange={(e) => setRepayNote(e.target.value)}
              />
            </Field>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="paper"
                onClick={() => setRepayTarget(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="green"
                disabled={repaySaving}
                className="flex-1 font-bold shadow-sm"
              >
                {repaySaving ? "Saving…" : "Save Debt Repayment"}
              </Button>
            </div>
          </form>
        )}
      </Sheet>

      {/* MANUAL CUSTOM ITEM INPUT MODAL SHEET */}
      <Sheet open={customOpen} onClose={() => setCustomOpen(false)} title="Add Custom Item Manually">
        <form onSubmit={handleAddCustom} className="space-y-4 pt-2 pb-6">
          <p className="text-xs text-muted">
            Enter item or service details to add a custom text item directly to the current sale cart.
          </p>

          <Field label="Item / Service Name">
            <TextInput
              required
              placeholder="e.g., Tailoring Repair, Special Delivery, Service Fee"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit Price (RWF)">
              <TextInput
                required
                type="number"
                min="1"
                placeholder="e.g., 5000"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
              />
            </Field>

            <Field label="Quantity">
              <TextInput
                required
                type="number"
                min="1"
                placeholder="1"
                value={customQty}
                onChange={(e) => setCustomQty(e.target.value)}
              />
            </Field>
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="paper"
              onClick={() => setCustomOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="green"
              className="flex-1 font-bold shadow-sm"
            >
              Add to Sale Cart
            </Button>
          </div>
        </form>
      </Sheet>

      {/* SELECTED RECEIPT DETAILS MODAL SHEET */}
      <Sheet open={!!selectedReceipt} onClose={() => setSelectedReceipt(null)} title="RRA EBM v2 Fiscal Receipt Preview">
        {selectedReceipt && (
          <div className="space-y-4 pt-2 pb-6 flex flex-col items-center">
            {/* Authentic EBM v2 Thermal Receipt */}
            <div className="w-full flex justify-center max-h-[60vh] overflow-y-auto p-2 bg-paper rounded-2xl border border-line">
              <EbmReceipt sale={selectedReceipt} />
            </div>

            <div className="flex gap-2 w-full">
              <Button
                variant="paper"
                onClick={() => setSelectedReceipt(null)}
                className="flex-1"
              >
                Close
              </Button>
              <Button
                variant="green"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 font-bold shadow-sm"
              >
                <Printer size={16} /> Print EBM Receipt
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
