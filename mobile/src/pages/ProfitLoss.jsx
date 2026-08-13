import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  ArrowUpRight,
  AlertTriangle,
  Sparkles,
  PieChart,
  Layers,
  CheckCircle2
} from "lucide-react";
import { useLang } from "../lib/i18n.jsx";
import { rwf } from "../lib/format";
import ScreenHeader from "../components/ScreenHeader";
import { useData } from "../context/DataContext";

export default function ProfitLoss() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { sales, expenses, stock } = useData();

  const [period, setPeriod] = useState("this_month");

  const grossRevenue = sales.reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);

  const stockCostMap = useMemo(() => {
    const map = {};
    (stock || []).forEach((s) => {
      if (s.id) map[String(s.id)] = Number(s.cost_price_rwf) || 0;
    });
    return map;
  }, [stock]);

  const cogs = useMemo(() => {
    let totalCost = 0;
    (sales || []).forEach((s) => {
      const items = s.items || [];
      items.forEach((item) => {
        const qty = Number(item.quantity || item.qty) || 1;
        const knownCost = Number(item.cost_price_rwf) || (item.stock_item_id ? stockCostMap[String(item.stock_item_id)] : 0);
        // If exact cost price is known, use it; otherwise fallback to standard estimated 60% wholesale cost
        const unitCost = knownCost > 0 ? knownCost : Math.round((Number(item.unit_price || item.price) || 0) * 0.60);
        totalCost += unitCost * qty;
      });
    });
    return Math.round(totalCost);
  }, [sales, stockCostMap]);

  const grossProfit = grossRevenue - cogs;
  const operatingExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount_rwf || e.amount) || 0), 0);
  const netProfit = grossProfit - operatingExpenses;
  const marginPct = grossRevenue > 0 ? ((netProfit / grossRevenue) * 100).toFixed(1) : 0;

  const p = {
    grossRevenue,
    cogs,
    grossProfit,
    operatingExpenses,
    netProfit,
    marginPct: Number(marginPct),
    salesCount: sales.length,
    expenseCount: expenses.length
  };

  const isNetPositive = p.netProfit >= 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4FBE4] via-[#F9FAFB] to-[#F1F5E9] font-manrope text-gray-900 pb-24">
      <ScreenHeader title={t("nav_pnl")} />

      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        
        {/* Period Selector Tabs (Luminous Modern Pill Style) */}
        <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-full border border-gray-200/80 shadow-sm">
          <div className="flex items-center gap-2 px-3 text-xs font-bold text-gray-500">
            <Calendar size={15} className="text-purple-600" /> Period:
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold">
            {[
              { id: "this_month", label: "This Month" },
              { id: "last_month", label: "Last Month" },
              { id: "ytd", label: "Year to Date" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setPeriod(item.id)}
                className={`px-4 py-2 rounded-full transition-all duration-200 ${
                  period === item.id
                    ? "bg-[#D4F06B] text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Luminous Executive P&L Hero Card */}
        <div
          className={`rounded-[36px] p-7 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border transition-all duration-300 ${
            isNetPositive
              ? "bg-gray-900 text-white border-gray-800"
              : "bg-gray-900 text-white border-red-500/40"
          }`}
        >
          <div className="flex items-center justify-between border-b border-gray-800 pb-4">
            <div>
              <span className="text-[11px] font-extrabold tracking-widest text-[#D4F06B] uppercase">
                Net Statement Outcome
              </span>
              <h2 className="font-manrope text-2xl md:text-3xl font-black tracking-tight mt-1 flex items-center gap-2">
                {isNetPositive ? (
                  <>Net Income <Sparkles size={22} className="text-[#D4F06B]" /></>
                ) : (
                  <>Net Loss <AlertTriangle size={22} className="text-amber-400" /></>
                )}
              </h2>
            </div>
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full border ${
                isNetPositive
                  ? "bg-[#D4F06B]/20 text-[#D4F06B] border-[#D4F06B]/30"
                  : "bg-red-500/20 text-red-400 border-red-500/40"
              }`}
            >
              {isNetPositive ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
            </div>
          </div>

          <div className="flex items-end justify-between pt-6">
            <div>
              <span className="text-xs text-gray-400 font-semibold">Net Income:</span>
              <div className={`font-manrope text-3xl md:text-4xl font-black tabnum mt-1 ${isNetPositive ? "text-white" : "text-red-400"}`}>
                {rwf(p.netProfit)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400 font-semibold">Profit Margin:</span>
              <div className={`text-xl font-extrabold tabnum mt-1 ${isNetPositive ? "text-[#D4F06B]" : "text-red-400"}`}>
                {p.marginPct}%
              </div>
            </div>
          </div>

          {/* Luminous Visual Profit Ratio Bar */}
          <div className="space-y-2 pt-6">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-300">
              <span>Gross Sales ({rwf(p.grossRevenue)})</span>
              <span>Expenses & COGS ({rwf((p.cogs || 0) + (p.operatingExpenses || 0))})</span>
            </div>
            <div className="h-3.5 w-full rounded-full bg-gray-800 overflow-hidden flex p-0.5 border border-gray-700/60">
              <div
                className="bg-[#D4F06B] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(10, (p.grossProfit / (p.grossRevenue || 1)) * 100))}%` }}
              />
              <div
                className="bg-purple-500 h-full rounded-full transition-all duration-500 ml-1"
                style={{ width: `${Math.min(100, Math.max(10, (p.operatingExpenses / (p.grossRevenue || 1)) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Income Statement Breakdown Table Card */}
        <div className="rounded-[32px] border border-gray-200/80 bg-white p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] space-y-4">
          <h3 className="font-manrope text-base font-extrabold text-gray-900">
            Income Statement Breakdown
          </h3>

          <div className="space-y-3 text-xs font-manrope">
            {/* Revenue */}
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="h-3 w-3 rounded-full bg-[#D4F06B] border border-gray-400" />
                <span className="font-extrabold text-gray-900">Gross Sales Revenue</span>
              </div>
              <span className="font-black text-gray-900 tabnum text-sm">{rwf(p.grossRevenue)}</span>
            </div>

            {/* COGS */}
            <div className="flex items-center justify-between py-2.5 border-b border-gray-100 pl-4">
              <span className="font-semibold text-gray-500">• Less: Cost of Goods Sold (COGS)</span>
              <span className="font-bold text-gray-500 tabnum">- {rwf(p.cogs)}</span>
            </div>

            {/* Gross Profit Subtotal */}
            <div className="flex items-center justify-between py-3.5 bg-[#F4FBE4] px-4 rounded-2xl border border-[#D4F06B]/50">
              <span className="font-extrabold text-gray-900 uppercase tracking-wider text-[11px]">Gross Profit</span>
              <span className="font-black text-gray-900 tabnum text-sm">{rwf(p.grossProfit)}</span>
            </div>

            {/* Operating Expenses */}
            <div className="flex items-center justify-between py-2.5 border-b border-gray-100 pl-4">
              <span className="font-semibold text-gray-500">• Less: Operating Expenses</span>
              <span className="font-bold text-gray-500 tabnum">- {rwf(p.operatingExpenses)}</span>
            </div>

            {/* Net Income Final */}
            <div className="flex items-center justify-between pt-4 pb-1">
              <span className="font-manrope text-sm font-black text-gray-900 uppercase">Net Profit / (Loss)</span>
              <span className={`font-manrope text-lg font-black tabnum ${isNetPositive ? "text-emerald-600" : "text-red-500"}`}>
                {rwf(p.netProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Navigation Cards */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/sell")}
            className="flex items-center justify-between p-5 rounded-[28px] border border-gray-200/80 bg-white hover:border-[#D4F06B] hover:shadow-md transition cursor-pointer text-left group"
          >
            <div>
              <span className="text-xs font-extrabold text-gray-900 group-hover:text-purple-600 transition">Sales Transactions</span>
              <p className="text-[11px] text-gray-500 mt-0.5">{p.salesCount || 0} sales recorded</p>
            </div>
            <ArrowUpRight size={18} className="text-gray-400 group-hover:text-gray-900 transition" />
          </button>

          <button
            onClick={() => navigate("/expenses")}
            className="flex items-center justify-between p-5 rounded-[28px] border border-gray-200/80 bg-white hover:border-[#D4F06B] hover:shadow-md transition cursor-pointer text-left group"
          >
            <div>
              <span className="text-xs font-extrabold text-gray-900 group-hover:text-purple-600 transition">Expenses Entries</span>
              <p className="text-[11px] text-gray-500 mt-0.5">{p.expenseCount || 0} expenses recorded</p>
            </div>
            <ArrowUpRight size={18} className="text-gray-400 group-hover:text-gray-900 transition" />
          </button>
        </div>

      </div>
    </div>
  );
}
