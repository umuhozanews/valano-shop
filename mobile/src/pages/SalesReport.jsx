import { useState, useEffect, useCallback } from "react";
import { Search, Calendar, FileText, Share2, Filter, ShoppingBag, Banknote, Smartphone } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import Loading from "../components/Loading";
import api from "../lib/api";
import { StorageEngine } from "../lib/storage";
import { rwf, formatDate } from "../lib/format";

export default function SalesReport() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [query, setQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/reports/sales").catch(() => null);
      if (res?.data?.sales && Array.isArray(res.data.sales)) {
        setSales(res.data.sales);
      } else {
        setSales(StorageEngine.getSales());
      }
    } catch {
      setSales(StorageEngine.getSales());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const handleUpdate = () => load();
    window.addEventListener("databridge:data_changed", handleUpdate);
    return () => window.removeEventListener("databridge:data_changed", handleUpdate);
  }, [load]);

  if (loading) return <Loading label="Loading Sales Analytics & Transaction Report..." />;

  // Filtered sales dataset
  const filteredSales = sales.filter((s) => {
    if (query && !s.customer_name?.toLowerCase().includes(query.toLowerCase()) && !s.invoice_number?.toLowerCase().includes(query.toLowerCase())) return false;
    if (methodFilter !== "all" && s.payment_method !== methodFilter) return false;
    if (startDate && new Date(s.created_at) < new Date(startDate)) return false;
    if (endDate && new Date(s.created_at) > new Date(endDate + "T23:59:59")) return false;
    return true;
  });

  const validSales = filteredSales.filter(s => !s.is_voided);
  const totalVolume = validSales.reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const totalPaid = validSales.reduce((s, r) => s + Number(r.amount_paid || r.total_amount || 0), 0);
  const totalDebt = validSales.reduce((s, r) => s + Number(r.remaining_debt || 0), 0);
  const totalItemsCount = validSales.reduce((s, r) => s + Number(r.items_count || 1), 0);
  const avgBasket = validSales.length > 0 ? totalVolume / validSales.length : 0;

  // Breakdown by Payment Method
  const byMethod = {
    cash: validSales.filter(s => s.payment_method === 'cash').reduce((sum, r) => sum + Number(r.total_amount), 0),
    mtn_momo: validSales.filter(s => s.payment_method === 'mtn_momo').reduce((sum, r) => sum + Number(r.total_amount), 0),
    airtel: validSales.filter(s => s.payment_method === 'airtel').reduce((sum, r) => sum + Number(r.total_amount), 0),
    bank_transfer: validSales.filter(s => s.payment_method === 'bank_transfer').reduce((sum, r) => sum + Number(r.total_amount), 0),
  };

  function shareReport() {
    const text = `*SALES ANALYTICS REPORT*\nTotal Sales: ${validSales.length} orders\nTotal Revenue: ${rwf(totalVolume)} RWF\nCollected Cash: ${rwf(totalPaid)} RWF\nCustomer Debt: ${rwf(totalDebt)} RWF\n\n*Payment Breakdown:*\n• Cash: ${rwf(byMethod.cash)} RWF\n• MTN MoMo: ${rwf(byMethod.mtn_momo)} RWF\n• Airtel Money: ${rwf(byMethod.airtel)} RWF\n• Bank Transfer: ${rwf(byMethod.bank_transfer)} RWF`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="flex h-full flex-col bg-bg">
      <ScreenHeader
        title="Sales Analytics Report"
        back
        right={
          <button
            onClick={shareReport}
            className="flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary border border-primary/20"
          >
            <Share2 size={13} /> Export
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Date & Search Filters */}
        <div className="space-y-2 rounded-xl bg-card p-3 border border-line shadow-xs">
          <div className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2">
            <Search size={15} className="text-muted" />
            <input
              className="flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-muted"
              placeholder="Search by invoice # or customer name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-muted block mb-0.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-line bg-paper p-1.5 text-[11.5px] font-bold text-ink outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-muted block mb-0.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-line bg-paper p-1.5 text-[11.5px] font-bold text-ink outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
            {[
              { id: "all", label: "All Methods" },
              { id: "cash", label: "Cash" },
              { id: "mtn_momo", label: "MTN MoMo" },
              { id: "airtel", label: "Airtel" },
              { id: "bank_transfer", label: "Bank" },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMethodFilter(m.id)}
                className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold capitalize whitespace-nowrap transition-colors ${
                  methodFilter === m.id ? "bg-primary text-white" : "bg-paper border border-line text-muted"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Total Revenue & Volume Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-primary to-[#0D9488] p-4 text-white shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-90">GROSS SALES REVENUE</div>
          <div className="mt-2 text-[26px] font-extrabold tabnum">{rwf(totalVolume)} RWF</div>
          <div className="mt-2 grid grid-cols-3 gap-2 border-t border-white/20 pt-2 text-[11px]">
            <div>Orders: <strong className="tabnum">{validSales.length}</strong></div>
            <div>Paid: <strong className="tabnum">{rwf(totalPaid)}</strong></div>
            <div>Debt: <strong className="tabnum text-amber-200">{rwf(totalDebt)}</strong></div>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-line bg-card p-3 shadow-xs">
            <div className="text-[10.5px] font-bold text-muted uppercase">Average Order Value</div>
            <div className="mt-1 text-[15px] font-extrabold tabnum text-primary">{rwf(avgBasket)} RWF</div>
          </div>

          <div className="rounded-xl border border-line bg-card p-3 shadow-xs">
            <div className="text-[10.5px] font-bold text-muted uppercase">Total Items Sold</div>
            <div className="mt-1 text-[15px] font-extrabold tabnum text-ink">{totalItemsCount} Pcs</div>
          </div>
        </div>

        {/* Breakdown by Payment Method */}
        <div className="rounded-xl border border-line bg-card p-3 shadow-xs space-y-2">
          <div className="text-[11.5px] font-bold text-ink uppercase tracking-wider">Revenue by Payment Channel</div>
          <div className="grid grid-cols-2 gap-2 text-[11.5px] pt-1">
            <div className="flex justify-between rounded-lg bg-bg p-2 border border-line">
              <span className="text-muted font-semibold">Cash:</span>
              <span className="font-extrabold tabnum text-ink">{rwf(byMethod.cash)} RWF</span>
            </div>
            <div className="flex justify-between rounded-lg bg-bg p-2 border border-line">
              <span className="text-muted font-semibold">MTN MoMo:</span>
              <span className="font-extrabold tabnum text-primary">{rwf(byMethod.mtn_momo)} RWF</span>
            </div>
            <div className="flex justify-between rounded-lg bg-bg p-2 border border-line">
              <span className="text-muted font-semibold">Airtel:</span>
              <span className="font-extrabold tabnum text-ink">{rwf(byMethod.airtel)} RWF</span>
            </div>
            <div className="flex justify-between rounded-lg bg-bg p-2 border border-line">
              <span className="text-muted font-semibold">Bank:</span>
              <span className="font-extrabold tabnum text-ink">{rwf(byMethod.bank_transfer)} RWF</span>
            </div>
          </div>
        </div>

        {/* Detailed Sales Transactions Table / List */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-muted uppercase tracking-wider">Detailed Sales Ledger ({filteredSales.length})</div>
          {filteredSales.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-muted">No sales matching your filter criteria</div>
          ) : (
            filteredSales.map((s) => {
              const isDebt = s.is_debt || Number(s.remaining_debt) > 0;
              return (
                <div key={s.id} className="rounded-xl border border-line bg-card p-3 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11.5px] font-bold text-primary">{s.invoice_number}</span>
                        {isDebt && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800">DEBT</span>}
                      </div>
                      <div className="text-[13px] font-bold text-ink mt-0.5">{s.customer_name}</div>
                      <div className="text-[10px] text-muted">Worker: {s.worker_name || 'Staff'} • {new Date(s.created_at).toLocaleDateString()}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-[14px] font-extrabold tabnum text-ink">{rwf(s.total_amount)} RWF</div>
                      <div className="text-[10px] font-bold text-primary">{s.payment_method?.toUpperCase()}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
