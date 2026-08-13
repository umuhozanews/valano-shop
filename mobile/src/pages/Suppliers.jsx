import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Users,
  CreditCard,
  Phone,
  Plus,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Search,
  DollarSign,
  UserPlus,
  Truck,
  FileText,
  AlertCircle
} from "lucide-react";
import api, { errorMessage } from "../lib/api";
import { useLang } from "../lib/i18n.jsx";
import { rwf, initials, formatDate } from "../lib/format";
import ScreenHeader from "../components/ScreenHeader";
import Sheet from "../components/Sheet";
import Loading from "../components/Loading";
import { Button, Field, TextInput } from "../components/ui";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";

export default function Suppliers() {
  const { t } = useLang();
  const { user } = useAuth();
  const { sales, recordDebtPayment } = useData();
  const [params, setParams] = useSearchParams();

  // User-scoped keys so new signups start at clean NULL state
  const userKey = useMemo(() => {
    if (!user) return "guest";
    return String(user.id || user.email || user.phone || "guest").replace(/[^a-zA-Z0-9_-]/g, "_");
  }, [user]);

  const CUST_KEY = `db_customers_${userKey}`;
  const SUPP_KEY = `db_suppliers_${userKey}`;

  const [activeTab, setActiveTab] = useState("customers"); // 'customers' | 'owed' | 'payables'
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Local Customers State (Starts [] for new signups)
  const [customers, setCustomers] = useState(() => {
    try {
      const saved = localStorage.getItem(`db_customers_${userKey}`);
      return saved !== null ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Local Suppliers State (Starts [] for new signups)
  const [suppliers, setSuppliers] = useState(() => {
    try {
      const saved = localStorage.getItem(`db_suppliers_${userKey}`);
      return saved !== null ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch remote backend customers on mount
  useEffect(() => {
    api.get("/customers")
      .then((res) => {
        const data = res.data?.data || res.data;
        if (Array.isArray(data) && data.length > 0) {
          setCustomers(data);
        }
      })
      .catch(() => {});
  }, []);

  // Re-sync local state whenever active user account changes
  useEffect(() => {
    try {
      const savedCust = localStorage.getItem(CUST_KEY);
      const savedSupp = localStorage.getItem(SUPP_KEY);
      if (savedCust !== null) setCustomers(JSON.parse(savedCust));
      if (savedSupp !== null) setSuppliers(JSON.parse(savedSupp));
    } catch (e) {
      console.error("Failed to load user-scoped customers/suppliers:", e);
    }
  }, [userKey, CUST_KEY, SUPP_KEY]);

  useEffect(() => {
    try {
      localStorage.setItem(CUST_KEY, JSON.stringify(customers));
    } catch (e) {
      console.error(e);
    }
  }, [customers, CUST_KEY]);

  useEffect(() => {
    try {
      localStorage.setItem(SUPP_KEY, JSON.stringify(suppliers));
    } catch (e) {
      console.error(e);
    }
  }, [suppliers, SUPP_KEY]);

  // Modal States
  const [addCustOpen, setAddCustOpen] = useState(false);
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custLimit, setCustLimit] = useState("200000");

  const [addSupOpen, setAddSupOpen] = useState(false);
  const [supName, setSupName] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supProducts, setSupProducts] = useState("");
  const [supOwed, setSupOwed] = useState("");

  const [payModalSale, setPayModalSale] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNote, setPayNote] = useState("");

  // Dynamically compile Customer accounts merging DB/manual entries with POS Sales records
  const allCustomers = useMemo(() => {
    const map = new Map();

    // 1. Add explicitly saved/backend customers
    (customers || []).forEach((c) => {
      if (!c || !c.name) return;
      const key = c.name.trim().toLowerCase();
      map.set(key, {
        id: c.id || `cust_${key}`,
        name: c.name.trim(),
        phone: c.phone || "N/A",
        email: c.email || "",
        owed_to_us_rwf: Number(c.owed_to_us_rwf || c.amount_owed || 0),
        total_spent_rwf: Number(c.total_spent_rwf || c.total_spent || 0),
        credit_limit_rwf: Number(c.credit_limit_rwf || 200000),
        created_at: c.created_at || new Date().toISOString(),
        sales_count: Number(c.sales_count || 0),
      });
    });

    // 2. Automatically derive customer records from live sales recorded at POS
    (sales || []).forEach((s) => {
      const rawName = s.customer_name?.trim();
      if (!rawName || rawName === "Walk-in Customer") return;

      const key = rawName.toLowerCase();
      const existing = map.get(key) || {
        id: `cust_sale_${key}`,
        name: rawName,
        phone: s.customer_phone?.trim() || "N/A",
        email: "",
        owed_to_us_rwf: 0,
        total_spent_rwf: 0,
        credit_limit_rwf: 200000,
        created_at: s.created_at || new Date().toISOString(),
        sales_count: 0,
      };

      if (s.customer_phone && (existing.phone === "N/A" || !existing.phone)) {
        existing.phone = s.customer_phone.trim();
      }

      existing.total_spent_rwf += Number(s.total_amount || 0);
      const owed = Number(s.amount_owed || (s.payment_status === "pending" || s.payment_status === "partial" ? s.total_amount : 0));
      existing.owed_to_us_rwf += owed;
      existing.sales_count += 1;

      map.set(key, existing);
    });

    return Array.from(map.values());
  }, [customers, sales]);

  // Derived Owed to Us (Receivables) from live sales
  const receivables = useMemo(() => {
    return (sales || []).filter((s) => (Number(s.amount_owed) || 0) > 0 || s.payment_status === "pending" || s.payment_status === "partial");
  }, [sales]);

  const totalOwedToUs = useMemo(() => {
    const saleOwed = receivables.reduce((sum, s) => sum + (Number(s.amount_owed) || 0), 0);
    const custOwed = allCustomers.reduce((sum, c) => sum + (Number(c.owed_to_us_rwf) || 0), 0);
    return Math.max(saleOwed, custOwed);
  }, [receivables, allCustomers]);

  const totalPayables = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (Number(s.amount_we_owe_rwf) || 0), 0);
  }, [suppliers]);

  // Handlers
  const handleAddCustomer = (e) => {
    e.preventDefault();
    if (!custName.trim()) return toast.error("Please enter customer name.");

    const created = {
      id: Date.now(),
      name: custName.trim(),
      phone: custPhone.trim() || "N/A",
      email: custEmail.trim() || "",
      credit_limit_rwf: Number(custLimit) || 200000,
      owed_to_us_rwf: 0,
      total_spent_rwf: 0,
    };

    setCustomers((prev) => [created, ...prev]);
    toast.success(`Added customer "${custName.trim()}"`);

    setCustName("");
    setCustPhone("");
    setCustEmail("");
    setCustLimit("200000");
    setAddCustOpen(false);
  };

  const handleAddSupplier = (e) => {
    e.preventDefault();
    if (!supName.trim()) return toast.error("Please enter supplier name.");

    const created = {
      id: Date.now(),
      name: supName.trim(),
      phone: supPhone.trim() || "N/A",
      products_supplied: supProducts.trim() || "General Goods",
      amount_we_owe_rwf: Number(supOwed) || 0,
    };

    setSuppliers((prev) => [created, ...prev]);
    toast.success(`Added supplier "${supName.trim()}"`);

    setSupName("");
    setSupPhone("");
    setSupProducts("");
    setSupOwed("");
    setAddSupOpen(false);
  };

  const handleRecordDebtPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!payModalSale) return;
    const amt = Number(payAmount);
    if (isNaN(amt) || amt <= 0) return toast.error("Please enter valid payment amount.");

    await recordDebtPayment(payModalSale.id, {
      amount: amt,
      payment_method: payMethod,
      note: payNote,
    });

    toast.success(`Recorded payment of ${rwf(amt)} RWF!`);
    setPayModalSale(null);
    setPayAmount("");
    setPayNote("");
  };

  const handlePaySupplier = (id, currentOwed) => {
    if (currentOwed <= 0) return toast.success("All supplier invoices are paid!");
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, amount_we_owe_rwf: 0 } : s))
    );
    toast.success("Marked supplier invoice as fully paid!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4FBE4] via-[#F9FAFB] to-[#F1F5E9] font-manrope text-gray-900 pb-24">
      <ScreenHeader
        title="Suppliers & Debtors"
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddCustOpen(true)}
              className="flex items-center gap-1 rounded-full bg-[#D4F06B] px-3.5 py-1.5 text-xs font-black text-gray-900 shadow-sm hover:bg-[#C5E456] transition cursor-pointer"
            >
              <UserPlus size={14} />
              <span>Customer</span>
            </button>
            <button
              onClick={() => setAddSupOpen(true)}
              className="flex items-center gap-1 rounded-full bg-gray-900 px-3.5 py-1.5 text-xs font-black text-white shadow-sm hover:bg-gray-800 transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Supplier</span>
            </button>
          </div>
        }
      />

      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* KPI Strip: Customers, Owed to Us, Payables */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Customers */}
          <div
            onClick={() => setActiveTab("customers")}
            className={`p-5 rounded-3xl border bg-card shadow-card transition cursor-pointer active:scale-[0.99] ${
              activeTab === "customers" ? "border-primary ring-2 ring-primary/20" : "border-line"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Customers</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-xlt text-primary">
                <Users size={20} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-ink tabnum">{allCustomers.length}</div>
            <span className="text-[11px] font-semibold text-muted block mt-0.5">Active Client Accounts</span>
          </div>

          {/* Card 2: Owed to Us (Receivables) */}
          <div
            onClick={() => setActiveTab("owed")}
            className={`p-5 rounded-3xl border bg-card shadow-card transition cursor-pointer active:scale-[0.99] ${
              activeTab === "owed" ? "border-amber-500 ring-2 ring-amber-500/20" : "border-line"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Owed to Us</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                <CreditCard size={20} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-amber-700 tabnum">{rwf(totalOwedToUs)} RWF</div>
            <span className="text-[11px] font-semibold text-amber-800 block mt-0.5">Customer Credit Sales Owed</span>
          </div>

          {/* Card 3: Payables (Owed to Suppliers) */}
          <div
            onClick={() => setActiveTab("payables")}
            className={`p-5 rounded-3xl border bg-card shadow-card transition cursor-pointer active:scale-[0.99] ${
              activeTab === "payables" ? "border-red-500 ring-2 ring-red-500/20" : "border-line"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-700 uppercase tracking-wider">Payables</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 text-red-800">
                <Truck size={20} />
              </div>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-red-700 tabnum">{rwf(totalPayables)} RWF</div>
            <span className="text-[11px] font-semibold text-red-800 block mt-0.5">Owed to Stock Suppliers</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-card p-1.5 rounded-2xl border border-line shadow-sm overflow-x-auto">
            {[
              { id: "customers", label: "Customers", count: allCustomers.length },
              { id: "owed", label: "Owed to Us (Receivables)", count: receivables.length },
              { id: "payables", label: "Payables (Suppliers)", count: suppliers.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-sm"
                    : "text-muted hover:text-ink hover:bg-paper"
                }`}
              >
                <span>{tab.label}</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-extrabold">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, phone, invoice…"
              className="w-full rounded-xl border border-line bg-card pl-9 pr-3 py-2 text-xs font-semibold text-ink placeholder:text-muted focus:border-primary focus:outline-none shadow-sm"
            />
          </div>
        </div>

        {/* Tab 1: Customers Directory */}
        {activeTab === "customers" && (
          <div className="space-y-3">
            {allCustomers.filter((c) => !searchQuery || c.name?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[32px] border border-dashed border-gray-300 bg-white shadow-sm space-y-4 max-w-lg mx-auto">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 border border-gray-200 text-gray-900 shadow-sm">
                  <Users size={36} className="text-gray-800" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">No Customers Listed Yet</h3>
                  <p className="mt-1.5 text-xs text-gray-500 font-medium leading-relaxed max-w-xs mx-auto">
                    Add your customer client accounts or record credit sales at the POS counter to track receivables.
                  </p>
                </div>
                <button
                  onClick={() => setAddCustOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-xs font-black text-white hover:bg-gray-800 active:scale-95 transition shadow-md cursor-pointer mt-2"
                >
                  <UserPlus size={16} />
                  <span>+ Add Your First Customer Account</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allCustomers
                  .filter((c) => !searchQuery || c.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-col justify-between rounded-2xl border border-line bg-card p-5 shadow-card hover:border-primary/40 transition"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-xlt text-primary font-heading font-extrabold text-base shrink-0">
                          {initials(c.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading text-sm font-extrabold text-ink truncate">{c.name}</h3>
                          <p className="text-xs text-muted mt-0.5">{c.phone || "No phone"}</p>

                          <div className="mt-3 pt-3 border-t border-line/60 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted font-medium">Total Spent:</span>
                              <span className="font-bold text-ink tabnum">{rwf(c.total_spent_rwf)} RWF</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted font-medium">Owed to Us:</span>
                              <span className={`font-extrabold tabnum ${c.owed_to_us_rwf > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                                {c.owed_to_us_rwf > 0 ? `${rwf(c.owed_to_us_rwf)} RWF` : "Clean 0 RWF"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {c.phone && c.phone !== "N/A" && (
                        <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-muted">{c.phone}</span>
                          <a
                            href={`tel:${c.phone}`}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition"
                          >
                            <Phone size={13} /> Call Client
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Owed to Us (Receivables / Customer Credit Sales) */}
        {activeTab === "owed" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-sm font-extrabold text-ink uppercase tracking-wider">
                Unpaid Customer Credit Invoices
              </h3>
              <span className="text-xs text-muted">{receivables.length} active credit records</span>
            </div>

            <div className="space-y-3">
              {receivables.length === 0 ? (
                <div className="p-10 text-center text-xs text-muted bg-card rounded-2xl border border-dashed border-line">
                  🎉 All customer sales are fully paid! No outstanding receivables.
                </div>
              ) : (
                receivables.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-card hover:border-amber-400 transition"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 shrink-0">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading text-sm font-extrabold text-ink">
                            {s.invoice_number || `INV-${s.id}`}
                          </h4>
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase">
                            {s.payment_status === "partial" ? "Partially Paid" : "Unpaid Credit"}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          Customer: <strong className="text-ink">{s.customer_name}</strong>
                          {s.customer_phone ? ` (${s.customer_phone})` : ""}
                          <span> &bull; </span>
                          Due: <strong className="text-amber-800">{s.due_date || "No due date"}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200/60">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-bold text-muted uppercase block">Amount Owed</span>
                        <span className="text-base font-extrabold text-amber-800 tabnum">
                          {rwf(s.amount_owed)} RWF
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setPayModalSale(s);
                          setPayAmount(String(s.amount_owed));
                        }}
                        className="px-4 py-2 rounded-xl bg-primary text-xs font-extrabold text-white shadow-sm hover:bg-primary-lt transition cursor-pointer"
                      >
                        Record Repayment
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Payables (Suppliers We Owe Money) */}
        {activeTab === "payables" && (
          <div className="space-y-3">
            {suppliers.filter((s) => !searchQuery || s.name?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[32px] border border-dashed border-gray-300 bg-white shadow-sm space-y-4 max-w-lg mx-auto">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 border border-gray-200 text-gray-900 shadow-sm">
                  <Truck size={36} className="text-gray-800" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">No Stock Suppliers Listed Yet</h3>
                  <p className="mt-1.5 text-xs text-gray-500 font-medium leading-relaxed max-w-xs mx-auto">
                    Add your stock suppliers to manage invoice payables and restock orders.
                  </p>
                </div>
                <button
                  onClick={() => setAddSupOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-xs font-black text-white hover:bg-gray-800 active:scale-95 transition shadow-md cursor-pointer mt-2"
                >
                  <Plus size={16} />
                  <span>+ Add Stock Supplier Account</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {suppliers
                  .filter((s) => !searchQuery || s.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col justify-between rounded-2xl border border-line bg-card p-5 shadow-card hover:border-red-400 transition"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-800 font-heading font-extrabold text-base shrink-0">
                          <Truck size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading text-sm font-extrabold text-ink truncate">{s.name}</h3>
                          <p className="text-xs text-muted mt-0.5">{s.phone || "No phone"}</p>
                          <p className="text-xs text-muted mt-1 italic truncate">
                            Products: {s.products_supplied || "General Supplies"}
                          </p>

                          <div className="mt-3 pt-3 border-t border-line/60 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted font-medium">We Owe Supplier:</span>
                              <span
                                className={`font-extrabold tabnum ${
                                  s.amount_we_owe_rwf > 0 ? "text-red-700" : "text-emerald-700"
                                }`}
                              >
                                {s.amount_we_owe_rwf > 0 ? `${rwf(s.amount_we_owe_rwf)} RWF` : "Paid in Full 🎉"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between gap-2">
                        {s.phone && s.phone !== "N/A" ? (
                          <a
                            href={`tel:${s.phone}`}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-line bg-paper text-xs font-bold text-ink hover:bg-card transition"
                          >
                            <Phone size={13} /> Call
                          </a>
                        ) : (
                          <div />
                        )}

                        <button
                          onClick={() => handlePaySupplier(s.id, s.amount_we_owe_rwf)}
                          className="px-3.5 py-1.5 rounded-xl bg-gray-900 text-xs font-extrabold text-white shadow-sm hover:bg-gray-800 transition cursor-pointer"
                        >
                          Mark Paid
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ADD CUSTOMER MODAL SHEET */}
      <Sheet open={addCustOpen} onClose={() => setAddCustOpen(false)} title="Add Customer Account">
        <form onSubmit={handleAddCustomer} className="space-y-4 pt-2 font-manrope pb-6">
          <Field label="Customer Full Name *">
            <TextInput
              required
              placeholder="e.g. Jean Paul Bizimana"
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone Number">
              <TextInput
                type="tel"
                placeholder="0788123456"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
              />
            </Field>

            <Field label="Email Address">
              <TextInput
                type="email"
                placeholder="customer@gmail.com"
                value={custEmail}
                onChange={(e) => setCustEmail(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Approved Credit Limit (RWF)">
            <TextInput
              type="number"
              placeholder="200000"
              value={custLimit}
              onChange={(e) => setCustLimit(e.target.value)}
            />
          </Field>

          <div className="pt-2 flex gap-2">
            <Button type="button" variant="paper" onClick={() => setAddCustOpen(false)} className="flex-1">
              Cancel
            </Button>

            <Button type="submit" variant="green" className="flex-1 font-bold shadow-sm">
              Save Customer
            </Button>
          </div>
        </form>
      </Sheet>

      {/* ADD SUPPLIER MODAL SHEET */}
      <Sheet open={addSupOpen} onClose={() => setAddSupOpen(false)} title="Add Stock Supplier Account">
        <form onSubmit={handleAddSupplier} className="space-y-4 pt-2 font-manrope pb-6">
          <Field label="Supplier / Company Name *">
            <TextInput
              required
              placeholder="e.g. Inyange Industries Ltd"
              value={supName}
              onChange={(e) => setSupName(e.target.value)}
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Supplier Phone">
              <TextInput
                type="tel"
                placeholder="0788900100"
                value={supPhone}
                onChange={(e) => setSupPhone(e.target.value)}
              />
            </Field>

            <Field label="Current Amount We Owe (RWF)">
              <TextInput
                type="number"
                placeholder="0"
                value={supOwed}
                onChange={(e) => setSupOwed(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Products / Items Supplied">
            <TextInput
              placeholder="e.g. Milk, Juices, Bottled Water"
              value={supProducts}
              onChange={(e) => setSupProducts(e.target.value)}
            />
          </Field>

          <div className="pt-2 flex gap-2">
            <Button type="button" variant="paper" onClick={() => setAddSupOpen(false)} className="flex-1">
              Cancel
            </Button>

            <Button type="submit" variant="green" className="flex-1 font-bold shadow-sm">
              Save Supplier
            </Button>
          </div>
        </form>
      </Sheet>

      {/* RECORD DEBT REPAYMENT MODAL SHEET */}
      <Sheet open={!!payModalSale} onClose={() => setPayModalSale(null)} title="Record Customer Debt Repayment">
        {payModalSale && (
          <form onSubmit={handleRecordDebtPaymentSubmit} className="space-y-4 pt-2 font-manrope pb-6">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex justify-between font-bold">
                <span>Invoice: {payModalSale.invoice_number || `INV-${payModalSale.id}`}</span>
                <span>Owed: {rwf(payModalSale.amount_owed)} RWF</span>
              </div>
              <div>Customer: <strong>{payModalSale.customer_name}</strong></div>
            </div>

            <Field label="Repayment Amount (RWF) *">
              <TextInput
                required
                type="number"
                min="1"
                max={payModalSale.amount_owed}
                placeholder="Enter amount paid"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                autoFocus
              />
            </Field>

            <Field label="Payment Method">
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white p-3 text-xs font-semibold outline-none"
              >
                <option value="cash">Cash</option>
                <option value="momo">MTN Mobile Money</option>
                <option value="airtel">Airtel Money</option>
              </select>
            </Field>

            <Field label="Notes / Reference (Optional)">
              <TextInput
                placeholder="e.g. Partial repayment via Cash"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
              />
            </Field>

            <div className="pt-2 flex gap-2">
              <Button type="button" variant="paper" onClick={() => setPayModalSale(null)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" variant="green" className="flex-1 font-bold shadow-sm">
                Save Repayment
              </Button>
            </div>
          </form>
        )}
      </Sheet>
    </div>
  );
}
