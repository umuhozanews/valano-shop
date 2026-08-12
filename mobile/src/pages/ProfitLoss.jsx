import { useState, useEffect, useCallback } from "react";
import { TrendingUp, AlertTriangle, Calendar, Wallet } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import Loading from "../components/Loading";
import api from "../lib/api";
import { StorageEngine } from "../lib/storage";
import { rwf } from "../lib/format";
import toast from "react-hot-toast";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

export default function ProfitLoss() {
  const [viewMode, setViewMode] = useState("monthly"); // "monthly" | "daily"
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPnl = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = viewMode === "monthly" ? "/finance/pnl" : "/finance/pnl/daily";
      const params = viewMode === "monthly" ? { year } : { year, month };
      const res = await api.get(endpoint, { params });
      if (res.data) setData(res.data);
      else throw new Error("No data");
    } catch {
      // Fallback calculation using StorageEngine
      const sales = StorageEngine.getSales().filter((s) => !s.is_voided);
      const expenses = StorageEngine.getExpenses();

      const totalRevenue = sales.reduce((s, r) => s + Number(r.total_amount || 0), 0);
      const totalExpenses = expenses.reduce((s, r) => s + Number(r.amount || 0), 0);
      const estimatedCogs = totalRevenue * 0.55;
      const grossProfit = totalRevenue - estimatedCogs;
      const netProfit = grossProfit - totalExpenses;

      setData({
        totals: {
          revenue: totalRevenue,
          cogs: estimatedCogs,
          expenses: totalExpenses,
          grossProfit,
          netProfit,
          netMargin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0,
        },
        byMonth: [
          { month: "Current", revenue: totalRevenue, cogs: estimatedCogs, expenses: totalExpenses }
        ]
      });
    } finally {
      setLoading(false);
    }
  }, [viewMode, year, month]);

  useEffect(() => {
    fetchPnl();
  }, [fetchPnl]);

  if (loading) return <Loading label="Loading Profit & Loss Statement..." />;

  const totals = data?.totals || {};
  const grossProfit = (totals.revenue || 0) - (totals.cogs || 0);
  const netProfit = totals.netProfit !== undefined ? totals.netProfit : grossProfit - (totals.expenses || 0);

  return (
    <div className="flex h-full flex-col bg-bg">
      <ScreenHeader title="Profit & Loss Statement" back />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tab Selector */}
        <div className="flex rounded-xl bg-card border border-line p-1">
          <button
            onClick={() => setViewMode("monthly")}
            className={`flex-1 py-1.5 text-[12px] font-bold rounded-lg transition-colors ${viewMode === "monthly" ? "bg-primary text-white" : "text-muted"}`}
          >
            Monthly Summary
          </button>
          <button
            onClick={() => setViewMode("daily")}
            className={`flex-1 py-1.5 text-[12px] font-bold rounded-lg transition-colors ${viewMode === "daily" ? "bg-primary text-white" : "text-muted"}`}
          >
            Daily Breakdown
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {viewMode === "daily" && (
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="flex-1 h-9 rounded-xl border border-line bg-card px-3 text-[12px] font-bold text-ink outline-none"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          )}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="flex-1 h-9 rounded-xl border border-line bg-card px-3 text-[12px] font-bold text-ink outline-none"
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Net Loss Warning Banner */}
        {netProfit < 0 && (
          <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-red-700">
            <AlertTriangle size={18} className="shrink-0 text-red-600" />
            <div className="text-[12px]">
              <div className="font-extrabold">NET LOSS WARNING: {rwf(Math.abs(netProfit))} RWF</div>
              <div className="text-[10.5px] opacity-90">Operating expenses and COGS exceeded gross revenue.</div>
            </div>
          </div>
        )}

        {/* Dynamic Net Profit / Loss Card */}
        <div className={`rounded-2xl p-4 text-white shadow-sm transition-all ${netProfit >= 0 ? "bg-gradient-to-r from-emerald-700 to-teal-800" : "bg-gradient-to-r from-red-600 to-red-800"}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">
              {netProfit < 0 ? "🚨 NET LOSS" : "NET OPERATING PROFIT"}
            </span>
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
              {netProfit >= 0 ? "PROFITABLE" : "NET LOSS"}
            </span>
          </div>
          <div className="mt-2 text-[26px] font-extrabold tabnum">{rwf(netProfit)} RWF</div>
          <div className="mt-1 text-[11px] opacity-80 font-medium">Net Profit Margin: {totals.netMargin || 0}%</div>
        </div>

        {/* Financial KPI Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-line bg-card p-3 shadow-xs">
            <div className="text-[11px] font-bold text-muted uppercase">Gross Revenue</div>
            <div className="mt-1 text-[15px] font-extrabold tabnum text-emerald-600">{rwf(totals.revenue || 0)} RWF</div>
          </div>

          <div className="rounded-xl border border-line bg-card p-3 shadow-xs">
            <div className="text-[11px] font-bold text-muted uppercase">Cost of Goods (COGS)</div>
            <div className="mt-1 text-[15px] font-extrabold tabnum text-ink">{rwf(totals.cogs || 0)} RWF</div>
          </div>

          <div className="rounded-xl border border-line bg-card p-3 shadow-xs">
            <div className="text-[11px] font-bold text-muted uppercase">Gross Profit</div>
            <div className="mt-1 text-[15px] font-extrabold tabnum text-primary">{rwf(grossProfit)} RWF</div>
          </div>

          <div className="rounded-xl border border-line bg-card p-3 shadow-xs">
            <div className="text-[11px] font-bold text-muted uppercase">Operating Expenses</div>
            <div className="mt-1 text-[15px] font-extrabold tabnum text-red-600">-{rwf(totals.expenses || 0)} RWF</div>
          </div>
        </div>
      </div>
    </div>
  );
}
