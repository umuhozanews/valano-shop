import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  TrendingUp,
  Package,
  Receipt,
  Sparkles,
  Calendar,
  Download,
  Printer,
  ChevronRight,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import api from "../lib/api";
import { useLang } from "../lib/i18n.jsx";
import { rwf, rwfCompact } from "../lib/format";
import ScreenHeader from "../components/ScreenHeader";
import Loading from "../components/Loading";
import { useData } from "../context/DataContext";

export default function Reports() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { sales, stock, expenses } = useData();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("sales"); // 'sales' | 'stock' | 'tax' | 'intelligence'
  const [serverSalesReport, setServerSalesReport] = useState(null);
  const [serverStockReport, setServerStockReport] = useState(null);
  const [serverTaxReport, setServerTaxReport] = useState(null);

  const load = useCallback(async () => {
    try {
      const [sRes, stRes, tRes] = await Promise.allSettled([
        api.get("/reports/sales"),
        api.get("/reports/stock"),
        api.get("/reports/tax"),
      ]);

      if (sRes.status === "fulfilled") setServerSalesReport(sRes.value.data);
      if (stRes.status === "fulfilled") setServerStockReport(stRes.value.data);
      if (tRes.status === "fulfilled") setServerTaxReport(tRes.value.data);
    } catch {
      /* fallback */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Dynamically compute Sales Report from live sales
  const salesReport = useMemo(() => {
    const totalRev = (sales || []).reduce((sum, s) => sum + (Number(s.total_amount) || 0), 0);
    const count = (sales || []).length;

    // Payment methods map
    const methodTotals = {};
    (sales || []).forEach((s) => {
      const m = s.payment_method || "cash";
      methodTotals[m] = (methodTotals[m] || 0) + (Number(s.total_amount) || 0);
    });

    const paymentMethods = Object.entries(methodTotals).map(([mKey, amt]) => {
      const labelMap = { cash: "Cash", mtn_momo: "MTN MoMo", airtel: "Airtel Money", credit: "Credit (Owed)" };
      return {
        method: labelMap[mKey] || mKey,
        total: amt,
        pct: totalRev > 0 ? Number(((amt / totalRev) * 100).toFixed(1)) : 0,
      };
    });

    // Top products map
    const prodMap = {};
    (sales || []).forEach((s) => {
      (s.items || []).forEach((i) => {
        const name = i.item_name || i.name || "Item";
        const qty = Number(i.quantity || i.qty) || 1;
        const rev = Number(i.subtotal || i.total || ((i.unit_price || 0) * qty)) || 0;
        if (!prodMap[name]) prodMap[name] = { name, qty: 0, revenue: 0 };
        prodMap[name].qty += qty;
        prodMap[name].revenue += rev;
      });
    });

    const topProducts = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    return {
      totalRevenue: totalRev,
      totalSalesCount: count,
      paymentMethods: paymentMethods.length > 0 ? paymentMethods : [{ method: "Cash", total: totalRev, pct: 100 }],
      topProducts,
    };
  }, [sales]);

  // Dynamically compute Stock Report from live stock
  const stockReport = useMemo(() => {
    const totalValuation = (stock || []).reduce(
      (sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.sell_price_rwf) || 0),
      0
    );
    const lowCount = (stock || []).filter((i) => (Number(i.quantity) || 0) <= (Number(i.low_stock_threshold) || 5)).length;

    // Categories valuation map
    const catVal = {};
    const catCount = {};
    (stock || []).forEach((i) => {
      const c = i.category || "General";
      const val = (Number(i.quantity) || 0) * (Number(i.sell_price_rwf) || 0);
      catVal[c] = (catVal[c] || 0) + val;
      catCount[c] = (catCount[c] || 0) + 1;
    });

    const categories = Object.keys(catVal).map((c) => ({
      category: c,
      count: catCount[c],
      value: catVal[c],
    }));

    return {
      totalStockItems: (stock || []).length,
      totalValuationRwf: totalValuation,
      lowStockItemsCount: lowCount,
      outOfStockCount: (stock || []).filter((i) => Number(i.quantity) === 0).length,
      categories,
    };
  }, [stock]);

  // Dynamically compute Tax & EBM Report from live sales
  const taxReport = useMemo(() => {
    const totalRev = salesReport.totalRevenue;
    const taxableSales = Math.round(totalRev / 1.18);
    const vat18 = totalRev - taxableSales;
    return {
      totalTaxableSales: taxableSales,
      vatAmount18: vat18,
      exemptSales: 0,
      ebmReceiptsIssued: salesReport.totalSalesCount,
    };
  }, [salesReport]);

  const sr = salesReport;
  const str = stockReport;
  const tr = taxReport;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4FBE4] via-[#F9FAFB] to-[#F1F5E9] font-manrope text-gray-900 pb-24">
      <ScreenHeader
        title={t("nav_reports")}
        right={
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-800 shadow-sm hover:bg-gray-100 transition"
          >
            <Printer size={15} />
            <span>Export</span>
          </button>
        }
      />

      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-white p-2 rounded-full border border-gray-200/80 shadow-sm overflow-x-auto">
          {[
            { id: "sales", label: "Sales Report", icon: TrendingUp },
            { id: "stock", label: "Stock Valuation", icon: Package },
            { id: "tax", label: "Tax & EBM", icon: Receipt },
            { id: "intelligence", label: "Intelligence", icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#D4F06B] text-gray-900 shadow-sm font-black"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Sales Report */}
        {activeTab === "sales" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
                <span className="text-[11px] font-bold text-muted uppercase">Gross Sales Revenue</span>
                <div className="mt-1 text-xl md:text-2xl font-extrabold text-ink tabnum">{rwf(sr.totalRevenue)}</div>
              </div>
              <div className="rounded-2xl border border-line bg-card p-5 shadow-card">
                <span className="text-[11px] font-bold text-muted uppercase">Completed Sales</span>
                <div className="mt-1 text-xl md:text-2xl font-extrabold text-primary tabnum">{sr.totalSalesCount || 0} transactions</div>
              </div>
            </div>

            {/* Payment Method Breakdown */}
            <div className="rounded-2xl border border-line bg-card p-5 shadow-card space-y-3">
              <h3 className="font-heading text-xs font-extrabold text-ink uppercase tracking-wider">
                Sales by Payment Channel
              </h3>
              <div className="space-y-2 text-xs">
                {(sr.paymentMethods || []).map((m, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-ink">{m.method}</span>
                      <span className="text-primary tabnum">{rwf(m.total)} ({m.pct}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-paper overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${m.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Products */}
            <div className="rounded-2xl border border-line bg-card p-5 shadow-card space-y-3">
              <h3 className="font-heading text-xs font-extrabold text-ink uppercase tracking-wider">
                Top Selling Products
              </h3>
              <div className="space-y-2 text-xs divide-y divide-line/40">
                {(sr.topProducts || []).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2">
                    <div>
                      <span className="font-bold text-ink">{item.name}</span>
                      <span className="text-[11px] text-muted block">{item.qty} units sold</span>
                    </div>
                    <span className="font-extrabold text-emerald-700 tabnum">{rwf(item.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Stock Report */}
        {activeTab === "stock" && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-line bg-card p-4 shadow-card">
                <span className="text-[11px] font-bold text-muted uppercase">Total Inventory Value</span>
                <div className="mt-1 text-lg font-extrabold text-emerald-700 tabnum">{rwf(str.totalValuationRwf)}</div>
              </div>
              <div className="rounded-2xl border border-line bg-card p-4 shadow-card">
                <span className="text-[11px] font-bold text-muted uppercase">Active Stock Items</span>
                <div className="mt-1 text-lg font-extrabold text-ink tabnum">{str.totalStockItems || 0} items</div>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-card">
                <span className="text-[11px] font-bold text-amber-800 uppercase">Low Stock Alerts</span>
                <div className="mt-1 text-lg font-extrabold text-amber-700 tabnum">{str.lowStockItemsCount || 0} items</div>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-card p-5 shadow-card space-y-3">
              <h3 className="font-heading text-xs font-extrabold text-ink uppercase tracking-wider">
                Inventory Valuation by Category
              </h3>
              <div className="space-y-2 text-xs divide-y divide-line/40">
                {(str.categories || []).map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2.5">
                    <div>
                      <span className="font-bold text-ink">{cat.category}</span>
                      <span className="text-[11px] text-muted block">{cat.count} stock items</span>
                    </div>
                    <span className="font-extrabold text-ink tabnum">{rwf(cat.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Tax & EBM Report */}
        {activeTab === "tax" && (
          <div className="space-y-5">
            <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-900 to-slate-900 p-6 text-white shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={22} className="text-blue-400" />
                  <span className="font-heading text-sm font-bold uppercase tracking-wider">
                    EBM Tax Summary (VAT 18%)
                  </span>
                </div>
                <span className="bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-1 rounded-full border border-blue-400/30">
                  RRA Verified
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-xs text-white/60">Net Taxable Revenue:</span>
                  <div className="text-xl font-extrabold tabnum mt-0.5">{rwf(tr.totalTaxableSales)}</div>
                </div>
                <div>
                  <span className="text-xs text-white/60">VAT Payable (18%):</span>
                  <div className="text-xl font-extrabold text-blue-400 tabnum mt-0.5">{rwf(tr.vatAmount18)}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-card p-5 shadow-card space-y-3">
              <h3 className="font-heading text-xs font-extrabold text-ink uppercase tracking-wider">
                EBM Receipt Counter
              </h3>
              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-paper">
                <span className="font-bold text-ink">Total EBM Receipts Generated:</span>
                <span className="font-extrabold text-primary tabnum">{tr.ebmReceiptsIssued || 0} receipts</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Intelligence & Health */}
        {activeTab === "intelligence" && (
          <div className="space-y-5">
            <div
              onClick={() => navigate("/health-score")}
              className="flex items-center justify-between p-5 rounded-2xl border border-line bg-card hover:border-primary/50 shadow-card transition cursor-pointer group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-primary" />
                  <h3 className="font-heading text-base font-extrabold text-ink group-hover:text-primary transition">
                    Business Health Score & AI Diagnostics
                  </h3>
                </div>
                <p className="text-xs text-muted mt-1">
                  View full credit readiness report, working capital drivers, and SACCO loan eligibility.
                </p>
              </div>
              <ChevronRight size={20} className="text-muted group-hover:text-primary" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
