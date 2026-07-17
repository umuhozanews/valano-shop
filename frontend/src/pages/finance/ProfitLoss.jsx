import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

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
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState("monthly"); // "monthly" | "daily"
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [monthlyData, setMonthlyData] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const endpoint = viewMode === "monthly" ? "/finance/pnl" : "/finance/pnl/daily";
    const params = viewMode === "monthly" ? { year } : { year, month };

    api.get(endpoint, { params })
       .then(d => {
         if (viewMode === "monthly") {
           setMonthlyData(d.data);
         } else {
           setDailyData(d.data);
         }
       })
       .catch(() => toast.error(t("error")))
       .finally(() => setLoading(false));
  }, [viewMode, year, month, t]);

  const activeData = viewMode === "monthly" ? monthlyData : dailyData;
  const totals = activeData?.totals || {};

  // Calculate P&L Totals
  const grossProfit = (totals.revenue || 0) - (totals.cogs || 0);
  const netProfit = grossProfit - (totals.expenses || 0);

  // Monthly list mappings
  const byMonth = (monthlyData?.byMonth || []).map(m => ({
    ...m,
    grossProfit: parseFloat(m.revenue) - parseFloat(m.cogs),
    netProfit: parseFloat(m.revenue) - parseFloat(m.cogs) - parseFloat(m.expenses),
  }));

  // Daily list mappings
  const dailyList = dailyData?.daily || [];
  const byDay = [...dailyList].map(r => ({
    ...r,
    shortDate: r.date ? new Date(r.date).getDate() : "",
    grossProfit: parseFloat(r.revenue) - parseFloat(r.cogs),
    netProfit: parseFloat(r.revenue) - parseFloat(r.cogs) - parseFloat(r.expenses),
  })).reverse(); // Oldest to newest for trend chart

  const getMonthName = (m) => MONTHS.find(x => x.value === parseInt(m))?.label || "";

  return (
    <PageWrapper title={t("profit_loss")} subtitle={viewMode === "monthly" ? t("monthly_summary") : t("daily_pnl_subtitle")}
      breadcrumbs={[{label: t("finance"), path:"/app/invoices"},{label: t("profit_loss"), path:"/app/finance/pnl"}]}>

      {/* Tabs Selector */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => { setViewMode("monthly"); }}
          className={`py-2.5 px-4 font-semibold text-[14px] border-b-2 transition-colors ${viewMode === "monthly" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
        >
          {t("monthly_summary")}
        </button>
        <button
          onClick={() => { setViewMode("daily"); }}
          className={`py-2.5 px-4 font-semibold text-[14px] border-b-2 transition-colors ${viewMode === "daily" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
        >
          {t("daily_breakdown")}
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {viewMode === "daily" && (
          <select value={month} onChange={e=>setMonth(parseInt(e.target.value))} className="h-9 px-3 border border-border rounded-card text-[14px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary font-medium">
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        )}
        <select value={year} onChange={e=>setYear(parseInt(e.target.value))} className="h-9 px-3 border border-border rounded-card text-[14px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary font-medium">
          {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">
        <StatCard title={t("revenue")} value={formatRWF(totals.revenue||0)} />
        <StatCard title={t("gross_profit")} value={formatRWF(grossProfit)} />
        <StatCard title={t("operating_expenses")} value={formatRWF(totals.expenses||0)} />
        <StatCard title={t("procurement_costs")} value={formatRWF(totals.procurement||0)} />
        <StatCard title={t("net_profit")} value={formatRWF(netProfit)} />
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-surface rounded-card" />
          <div className="h-64 bg-surface rounded-card" />
        </div>
      ) : (
        <div className="space-y-6">
          {viewMode === "monthly" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Monthly P&L Statement */}
              <div className="lg:col-span-5">
                <Card title={t("profit_loss")} subtitle={`${t("date")} ${year}`}>
                  <table className="w-full text-[14px]">
                    <tbody>
                      <tr className="bg-background">
                        <td className="py-2 px-3 font-semibold text-text-secondary uppercase text-[12px] tracking-wide">{t("revenue")}</td>
                        <td />
                      </tr>
                      <tr className="border-b border-border">
                        <td className="py-2 px-3 text-text-primary">{t("revenue")}</td>
                        <td className="py-2 px-3 text-right font-medium text-text-primary">{formatRWF(totals.revenue||0)}</td>
                      </tr>
                      <tr className="bg-background"><td className="py-2 px-3 font-semibold text-text-secondary uppercase text-[12px] tracking-wide">{t("cogs")}</td><td /></tr>
                      <tr className="border-b border-border">
                        <td className="py-2 px-3 text-text-secondary">{t("cogs")}</td>
                        <td className="py-2 px-3 text-right text-danger">({formatRWF(totals.cogs||0)})</td>
                      </tr>
                      <tr className="border-b-2 border-border bg-success/5">
                        <td className="py-2.5 px-3 font-bold text-text-primary">{t("gross_profit")}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-success">{formatRWF(grossProfit)}</td>
                      </tr>
                      <tr className="bg-background"><td className="py-2 px-3 font-semibold text-text-secondary uppercase text-[12px] tracking-wide">{t("operating_expenses")}</td><td /></tr>
                      <tr className="border-b border-border">
                        <td className="py-2 px-3 text-text-secondary">{t("operating_expenses")}</td>
                        <td className="py-2 px-3 text-right text-danger">({formatRWF(totals.expenses||0)})</td>
                      </tr>
                      <tr className={`border-t-2 border-border ${netProfit >= 0 ? "bg-success/5":"bg-danger/5"}`}>
                        <td className="py-2.5 px-3 font-bold text-text-primary">{t("net_profit")}</td>
                        <td className={`py-2.5 px-3 text-right font-bold ${netProfit >= 0 ? "text-success":"text-danger"}`}>
                          {formatRWF(netProfit)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </Card>
              </div>

              {/* Monthly Trend Chart */}
              <div className="lg:col-span-7">
                <Card title={t("sales_trend")}>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={byMonth}>
                      <XAxis dataKey="month" tick={{fontSize:10}} />
                      <YAxis tick={{fontSize:10}} tickFormatter={v=>v >= 100000 ? (v/1000).toFixed(0)+"k" : v} />
                      <Tooltip formatter={v=>formatRWF(v)} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#D1FAE5" name={t("revenue")} />
                      <Area type="monotone" dataKey="cogs" stroke="#F59E0B" fill="#FEF3C7" name={t("cogs")} />
                      <Area type="monotone" dataKey="netProfit" stroke="#3B82F6" fill="#DBEAFE" name={t("net_profit")} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* Monthly Linked Audit Records */}
              <div className="lg:col-span-12">
                <Card title={t("monthly_linked_activity")} subtitle={`${t("summary_linked")} ${year}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px] text-left">
                      <thead>
                        <tr className="border-b border-border text-text-secondary uppercase text-[12px] tracking-wide bg-background">
                          <th className="py-2.5 px-3">{t("month_col")}</th>
                          <th className="py-2.5 px-3 text-right">{t("revenue")}</th>
                          <th className="py-2.5 px-3 text-right font-medium">{t("cogs")}</th>
                          <th className="py-2.5 px-3 text-right">{t("expenses")}</th>
                          <th className="py-2.5 px-3 text-right">{t("procurements")}</th>
                          <th className="py-2.5 px-3 text-right">{t("net_profit_col")}</th>
                          <th className="py-2.5 px-3 text-center">{t("linked_activity_metrics")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {byMonth.map((m, idx) => (
                          <tr key={idx} className="hover:bg-background/50 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-text-primary">{m.month}</td>
                            <td className="py-2.5 px-3 text-right text-success font-medium">{formatRWF(m.revenue)}</td>
                            <td className="py-2.5 px-3 text-right text-text-secondary">({formatRWF(m.cogs)})</td>
                            <td className="py-2.5 px-3 text-right text-danger">({formatRWF(m.expenses)})</td>
                            <td className="py-2.5 px-3 text-right text-amber-600 font-medium">{formatRWF(m.procurement)}</td>
                            <td className={`py-2.5 px-3 text-right font-bold ${m.netProfit >= 0 ? "text-success":"text-danger"}`}>
                              {formatRWF(m.netProfit)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex justify-center gap-2">
                                <span className="px-2 py-0.5 bg-green-50 border border-green-200 text-green-700 rounded-btn text-[12px] font-medium">
                                  {m.sales_count} {t("sales_count_label")} • {m.customers_count} {t("cust_label")}
                                </span>
                                <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-btn text-[12px] font-medium">
                                  {m.procurements_count} {t("proc_label")} • {m.suppliers_count} {t("supp_label")}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Daily Trend Chart */}
              <div className="lg:col-span-12">
                <Card title={`${t("daily_pnl_trend")} — ${getMonthName(month)} ${year}`}>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={byDay}>
                      <XAxis dataKey="shortDate" tick={{fontSize:10}} />
                      <YAxis tick={{fontSize:10}} tickFormatter={v=>v >= 100000 ? (v/1000).toFixed(0)+"k" : v} />
                      <Tooltip formatter={v=>formatRWF(v)} />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#D1FAE5" name={t("revenue")} />
                      <Area type="monotone" dataKey="expenses" stroke="#EF4444" fill="#FEE2E2" name={t("operating_expenses")} />
                      <Area type="monotone" dataKey="netProfit" stroke="#3B82F6" fill="#DBEAFE" name={t("net_profit")} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* Daily Everyday Breakdown Table */}
              <div className="lg:col-span-12">
                <Card title={t("everyday_pnl")} subtitle={`${t("daily_performance_for")} ${getMonthName(month)} ${year}`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px] text-left">
                      <thead>
                        <tr className="border-b border-border text-text-secondary uppercase text-[12px] tracking-wide bg-background">
                          <th className="py-2.5 px-3">{t("date")}</th>
                          <th className="py-2.5 px-3 text-right">{t("revenue")}</th>
                          <th className="py-2.5 px-3 text-right">{t("cogs_stock_cost")}</th>
                          <th className="py-2.5 px-3 text-right">{t("gross_profit")}</th>
                          <th className="py-2.5 px-3 text-right">{t("expenses")}</th>
                          <th className="py-2.5 px-3 text-right">{t("procurements")}</th>
                          <th className="py-2.5 px-3 text-right">{t("net_profit_col")}</th>
                          <th className="py-2.5 px-3 text-center">{t("linked_activity_metrics")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {dailyList.map((r, idx) => {
                          const gross = parseFloat(r.revenue) - parseFloat(r.cogs);
                          const net = gross - parseFloat(r.expenses);
                          return (
                            <tr key={idx} className="hover:bg-background/50 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-text-primary whitespace-nowrap">
                                {formatDate(r.date, "dd MMM yyyy")}
                              </td>
                              <td className="py-2.5 px-3 text-right text-success font-semibold">{formatRWF(r.revenue)}</td>
                              <td className="py-2.5 px-3 text-right text-text-secondary">({formatRWF(r.cogs)})</td>
                              <td className="py-2.5 px-3 text-right font-medium text-text-primary">{formatRWF(gross)}</td>
                              <td className="py-2.5 px-3 text-right text-danger">({formatRWF(r.expenses)})</td>
                              <td className="py-2.5 px-3 text-right text-amber-600 font-mono text-[13px]">{formatRWF(r.procurement)}</td>
                              <td className={`py-2.5 px-3 text-right font-bold ${net >= 0 ? "text-success" : "text-danger"}`}>
                                {formatRWF(net)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <div className="flex justify-center gap-1.5 text-[12px]">
                                  {r.sales_count > 0 && (
                                    <span className="px-1.5 py-0.5 bg-green-50 border border-green-200 rounded text-green-700 font-medium">
                                      {r.sales_count} {t("sales_count_label")} ({r.customers_count} {t("cust_label")})
                                    </span>
                                  )}
                                  {r.procurements_count > 0 && (
                                    <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded text-amber-700 font-medium">
                                      {r.procurements_count} {t("proc_label")} ({r.suppliers_count} {t("supp_label")})
                                    </span>
                                  )}
                                  {r.sales_count === 0 && r.procurements_count === 0 && (
                                    <span className="text-text-secondary font-light">{t("no_activity")}</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
