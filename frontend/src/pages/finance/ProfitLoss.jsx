import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

export default function ProfitLoss() {
  const { t: translate } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setLoading(true);
    api.get("/finance/pnl", { params: { year } })
       .then(d => setData(d.data))
       .catch(() => toast.error(translate("error")))
       .finally(() => setLoading(false));
  }, [year, translate]);

  const t = data?.totals || {};
  const byMonth = (data?.byMonth || []).map(m => ({
    ...m,
    grossProfit: parseFloat(m.revenue) - parseFloat(m.cogs),
    netProfit: parseFloat(m.revenue) - parseFloat(m.cogs) - parseFloat(m.expenses),
  }));

  return (
    <PageWrapper title={translate("profit_loss")} subtitle={translate("monthly_summary")}
      breadcrumbs={[{label: translate("finance"), path:"/app/invoices"},{label: translate("profit_loss"), path:"/app/finance/pnl"}]}>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={year} onChange={e=>setYear(e.target.value)} className="h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary">
          {[2024,2025,2026].map(y=><option key={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <StatCard title={translate("revenue")} value={formatRWF(t.revenue||0)} />
        <StatCard title={translate("gross_profit")} value={formatRWF(t.grossProfit||0)} />
        <StatCard title={translate("operating_expenses")} value={formatRWF(t.expenses||0)} />
        <StatCard title={translate("net_profit")} value={formatRWF(t.netProfit||0)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* P&L Statement */}
        <Card title={translate("profit_loss")} subtitle={`${translate("date")} ${year}`}>
          {loading ? <div className="animate-pulse space-y-2">{Array(8).fill(0).map((_,i)=><div key={i} className="h-5 bg-border rounded" />)}</div> : (
            <table className="w-full text-[13px]">
              <tbody>
                <tr className="bg-background">
                  <td className="py-2 px-3 font-semibold text-text-secondary uppercase text-[10px] tracking-wide">{translate("revenue")}</td>
                  <td />
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 text-text-primary">{translate("revenue")}</td>
                  <td className="py-2 px-3 text-right font-medium text-text-primary">{formatRWF(t.revenue||0)}</td>
                </tr>
                <tr className="bg-background"><td className="py-2 px-3 font-semibold text-text-secondary uppercase text-[10px] tracking-wide">{translate("cogs")}</td><td /></tr>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 text-text-secondary">{translate("cogs")}</td>
                  <td className="py-2 px-3 text-right text-danger">({formatRWF(t.cogs||0)})</td>
                </tr>
                <tr className="border-b-2 border-border bg-success/5">
                  <td className="py-2.5 px-3 font-bold text-text-primary">{translate("gross_profit")}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-success">{formatRWF(t.grossProfit||0)}</td>
                </tr>
                <tr className="bg-background"><td className="py-2 px-3 font-semibold text-text-secondary uppercase text-[10px] tracking-wide">{translate("operating_expenses")}</td><td /></tr>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 text-text-secondary">{translate("operating_expenses")}</td>
                  <td className="py-2 px-3 text-right text-danger">({formatRWF(t.expenses||0)})</td>
                </tr>
                <tr className={`border-t-2 border-border ${(t.netProfit||0) >= 0 ? "bg-success/5":"bg-danger/5"}`}>
                  <td className="py-2.5 px-3 font-bold text-text-primary">{translate("net_profit")}</td>
                  <td className={`py-2.5 px-3 text-right font-bold ${(t.netProfit||0) >= 0 ? "text-success":"text-danger"}`}>
                    {formatRWF(t.netProfit||0)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </Card>

        {/* Trend chart */}
        <Card title={translate("sales_trend")}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={byMonth}>
              <XAxis dataKey="month" tick={{fontSize:10}} />
              <YAxis tick={{fontSize:10}} tickFormatter={v=>(v/1000000).toFixed(1)+"M"} />
              <Tooltip formatter={v=>formatRWF(v)} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10B981" fill="#D1FAE5" name={translate("revenue")} />
              <Area type="monotone" dataKey="cogs" stackId="2" stroke="#F59E0B" fill="#FEF3C7" name={translate("cogs")} />
              <Area type="monotone" dataKey="netProfit" stackId="3" stroke="#3B82F6" fill="#DBEAFE" name={translate("net_profit")} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </PageWrapper>
  );
}
