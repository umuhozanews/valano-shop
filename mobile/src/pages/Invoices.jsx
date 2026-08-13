import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FileText,
  Search,
  Plus,
  ArrowUpRight,
  Printer,
  Download,
  ArrowLeft
} from "lucide-react";
import api from "../lib/api";
import { useLang } from "../lib/i18n.jsx";
import { rwf, formatDate } from "../lib/format";
import ScreenHeader from "../components/ScreenHeader";
import Loading from "../components/Loading";
import { useData } from "../context/DataContext";
import EbmReceipt from "../components/EbmReceipt";

export default function Invoices() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { sales } = useData();

  const [loading, setLoading] = useState(false);
  const [remoteInvoices, setRemoteInvoices] = useState([]);
  const [shopSettings, setShopSettings] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const load = useCallback(async () => {
    try {
      const [invRes, setRes] = await Promise.allSettled([
        api.get("/invoices"),
        api.get("/settings"),
      ]);
      if (invRes.status === "fulfilled") {
        const data = invRes.value.data;
        if (Array.isArray(data?.data)) setRemoteInvoices(data.data);
        else if (Array.isArray(data)) setRemoteInvoices(data);
      }
      if (setRes.status === "fulfilled" && setRes.value.data?.settings) {
        setShopSettings(setRes.value.data.settings);
      }
    } catch {
      /* network fallback */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDownloadPDF(inv) {
    if (!inv) return;
    const toastId = toast.loading("Downloading PDF...");
    try {
      const response = await api.get(`/invoices/${inv.id}/pdf`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${inv.invoice_number || 'invoice'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF Downloaded successfully!", { id: toastId });
    } catch (err) {
      toast.error("Could not download PDF file. Using browser print...", { id: toastId });
      window.print();
    }
  }

  const invoices = useMemo(() => {
    const derivedFromSales = (sales || []).map((s) => ({
      id: s.id,
      invoice_number: s.invoice_number || `INV-2026-${String(s.id).slice(-3)}`,
      customer_name: s.customer_name || "Walk-in Customer",
      total_amount: Number(s.total_amount) || 0,
      status: s.payment_status === "pending" || s.payment_method === "credit" ? "pending" : "paid",
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      created_at: s.created_at || new Date().toISOString(),
      items: (s.items || []).map((i) => ({
        name: i.item_name || i.name || "Item",
        qty: Number(i.quantity || i.qty) || 1,
        price: Number(i.unit_price || i.price) || 0,
        total: Number(i.subtotal || i.total || ((i.unit_price || 0) * (i.quantity || 1))) || 0,
      })),
    }));

    const derivedIds = new Set(derivedFromSales.map((i) => String(i.id)));
    const extraRemote = remoteInvoices.filter((r) => !derivedIds.has(String(r.id)));
    return [...derivedFromSales, ...extraRemote];
  }, [sales, remoteInvoices]);

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    const matchesQuery =
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.customer_name?.toLowerCase().includes(q);

    if (filter === "paid") return matchesQuery && inv.status === "paid";
    if (filter === "pending") return matchesQuery && inv.status === "pending";
    if (filter === "voided") return matchesQuery && inv.status === "voided";
    return matchesQuery;
  });

  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + (i.total_amount || 0), 0);
  const totalPending = invoices.filter((i) => i.status === "pending").reduce((sum, i) => sum + (i.total_amount || 0), 0);

  if (loading) return <Loading label={t("loading")} />;

  // Dedicated Single Page Document View for printing / saving as PDF
  if (selectedInvoice) {
    return (
      <div className="min-h-screen bg-gray-100 font-manrope text-gray-900 pb-16 pt-4 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-200 shadow-sm print:hidden">
            <button
              onClick={() => setSelectedInvoice(null)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-gray-50 text-xs font-bold text-gray-800 hover:bg-gray-100 transition cursor-pointer"
            >
              <ArrowLeft size={16} /> <span>Back to Invoices</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadPDF(selectedInvoice)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600 text-xs font-extrabold text-white hover:bg-purple-700 transition cursor-pointer shadow-sm"
              >
                <Download size={15} /> <span>Download PDF</span>
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4F06B] text-xs font-black text-gray-900 hover:bg-[#C5E456] transition cursor-pointer shadow-sm"
              >
                <Printer size={15} /> <span>Print Invoice</span>
              </button>
            </div>
          </div>

          {/* Clean Single Page Document */}
          <div className="w-full flex justify-center py-2">
            <EbmReceipt sale={selectedInvoice} shopSettings={shopSettings} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4FBE4] via-[#F9FAFB] to-[#F1F5E9] font-manrope text-gray-900 pb-24">
      <ScreenHeader
        title={t("nav_invoices")}
        right={
          <button
            onClick={() => navigate("/sell")}
            className="flex items-center gap-1.5 rounded-full bg-[#D4F06B] px-4 py-2 text-xs font-black text-gray-900 shadow-sm hover:bg-[#C5E456] transition"
          >
            <Plus size={16} />
            <span>New Invoice</span>
          </button>
        }
      />

      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[28px] border border-gray-200/80 bg-white p-4 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)]">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Invoiced</span>
            <div className="mt-1 text-base md:text-lg font-black text-gray-900 tabnum">{rwf(totalInvoiced)}</div>
          </div>
          <div className="rounded-[28px] border border-emerald-200 bg-emerald-50/60 p-4 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)]">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Paid Total</span>
            <div className="mt-1 text-base md:text-lg font-black text-emerald-700 tabnum">{rwf(totalPaid)}</div>
          </div>
          <div className="rounded-[28px] border border-amber-200 bg-amber-50/60 p-4 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)]">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Unpaid / Pending</span>
            <div className="mt-1 text-base md:text-lg font-black text-amber-700 tabnum">{rwf(totalPending)}</div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice number or customer name…"
              className="w-full rounded-full border border-gray-200/80 bg-white pl-11 pr-4 py-3 text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:border-[#D4F06B] focus:outline-none shadow-sm"
            />
          </div>

          <div className="flex items-center gap-1 bg-white p-1.5 rounded-full border border-gray-200/80 text-xs font-bold shadow-sm">
            {["all", "paid", "pending", "voided"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3.5 py-1.5 rounded-full capitalize transition ${
                  filter === tab
                    ? "bg-[#D4F06B] text-gray-900 shadow-sm font-extrabold"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Invoice List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-gray-200 bg-white p-10 text-center text-xs text-gray-400 font-semibold">
              No invoices match your search.
            </div>
          ) : (
            filtered.map((inv) => (
              <div
                key={inv.id}
                onClick={() => setSelectedInvoice(inv)}
                className="flex items-center justify-between p-4.5 rounded-[28px] border border-gray-200/80 bg-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] hover:border-[#D4F06B] hover:shadow-md transition cursor-pointer active:scale-[0.99] group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#D4F06B] text-gray-900 shrink-0 group-hover:scale-105 transition shadow-sm">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-manrope text-sm font-black text-gray-900 group-hover:text-purple-600 transition">
                        {inv.invoice_number}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full capitalize ${
                          inv.status === "paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : inv.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-400 mt-0.5">
                      {inv.customer_name || "Walk-in Customer"} · {formatDate(inv.created_at)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-manrope text-sm font-black text-gray-900 tabnum">
                    {rwf(inv.total_amount)}
                  </div>
                  <span className="text-[11px] font-extrabold text-purple-600 flex items-center justify-end gap-1 group-hover:underline">
                    View <ArrowUpRight size={13} />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
