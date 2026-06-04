import { useState, useEffect } from "react";
import { Download, FileText } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import StatCard from "../../components/ui/StatCard";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import toast from "react-hot-toast";

export default function ProfitLoss() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    api.get("/settings").then(d => setBranches(d.data.branches||[]));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get("/finance/pnl", { params: { year, branch_id: branchId } })
       .then(d => setData(d.data))
       .catch(() => toast.error("Failed to load P&L"))
       .finally(() => setLoading(false));
  }, [year, branchId]);

  const t = data?.totals || {};
  const byMonth = (data?.byMonth || []).map(m => ({
    ...m,
    grossProfit: parseFloat(m.revenue) - parseFloat(m.cogs),
    netProfit: parseFloat(m.revenue) - parseFloat(m.cogs) - parseFloat(m.expenses),
  }));

  const pnlRows = [
    { label:"Sales Revenue", value: t.revenue, isHeader:false },
    { type:"group", label:"COST OF GOODS SOLD", rows:[
      { label:"Purchase Cost", value: -(t.cogs||0) },
    ]},
    { type:"total", label:"GROSS PROFIT", value: t.grossProfit, margin: t.grossMargin },
    { type:"group", label:"OPERATING EXPENSES", rows:[
      { label:"Total Expenses", value: -(t.expenses||0) },
    ]},
    { type:"total", label:"NET PROFIT", value: t.netProfit, margin: t.netMargin, highlight: true },
  ];

  function fmt(n) { return n == null ? "—" : formatRWF(Math.abs(n||0)); }

  return (
    <PageWrapper title="Profit & Loss" subtitle="Financial performance overview"
      breadcrumbs={[{label:"Finance",path:"/app/invoices"},{label:"P&L",path:"/app/finance/pnl"}]}>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={year} onChange={e=>setYear(e.target.value)} className="h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary">
          {[2024,2025,2026].map(y=><option key={y}>{y}</option>)}
        </select>
        <select value={branchId} onChange={e=>setBranchId(e.target.value)} className="h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All Branches</option>
          {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <StatCard title="Revenue" value={formatRWF(t.revenue||0)} />
        <StatCard title="Gross Profit" value={formatRWF(t.grossProfit||0)} trendLabel={t.grossMargin ? `${t.grossMargin}% margin` : undefined} />
        <StatCard title="Total Expenses" value={formatRWF(t.expenses||0)} />
        <StatCard title="Net Profit" value={formatRWF(t.netProfit||0)} trendLabel={t.netMargin ? `${t.netMargin}% margin` : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* P&L Statement */}
        <Card title="P&L Statement" subtitle={`Year ${year}`}>
          {loading ? <div className="animate-pulse space-y-2">{Array(8).fill(0).map((_,i)=><div key={i} className="h-5 bg-border rounded" />)}</div> : (
            <table className="w-full text-[13px]">
              <tbody>
                <tr className="bg-background">
                  <td className="py-2 px-3 font-semibold text-text-secondary uppercase text-[10px] tracking-wide">REVENUE</td>
                  <td />
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 text-text-primary">Sales Revenue</td>
                  <td className="py-2 px-3 text-right font-medium text-text-primary">{formatRWF(t.revenue||0)}</td>
                </tr>
                <tr className="bg-background"><td className="py-2 px-3 font-semibold text-text-secondary uppercase text-[10px] tracking-wide">COST OF GOODS SOLD</td><td /></tr>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 text-text-secondary">Purchase Cost</td>
                  <td className="py-2 px-3 text-right text-danger">({formatRWF(t.cogs||0)})</td>
                </tr>
                <tr className="border-b-2 border-border bg-success/5">
                  <td className="py-2.5 px-3 font-bold text-text-primary">GROSS PROFIT</td>
                  <td className="py-2.5 px-3 text-right font-bold text-success">{formatRWF(t.grossProfit||0)} <span className="text-[11px] font-normal">({t.grossMargin}%)</span></td>
                </tr>
                <tr className="bg-background"><td className="py-2 px-3 font-semibold text-text-secondary uppercase text-[10px] tracking-wide">OPERATING EXPENSES</td><td /></tr>
                <tr className="border-b border-border">
                  <td className="py-2 px-3 text-text-secondary">Total Expenses</td>
                  <td className="py-2 px-3 text-right text-danger">({formatRWF(t.expenses||0)})</td>
                </tr>
                <tr className={`border-t-2 border-border ${(t.netProfit||0) >= 0 ? "bg-success/5":"bg-danger/5"}`}>
                  <td className="py-2.5 px-3 font-bold text-text-primary">NET PROFIT</td>
                  <td className={`py-2.5 px-3 text-right font-bold ${(t.netProfit||0) >= 0 ? "text-success":"text-danger"}`}>
                    {formatRWF(t.netProfit||0)} <span className="text-[11px] font-normal">({t.netMargin}%)</span>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </Card>

        {/* Trend chart */}
        <Card title="Monthly Trend">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={byMonth}>
              <XAxis dataKey="month" tick={{fontSize:10}} />
              <YAxis tick={{fontSize:10}} tickFormatter={v=>(v/1000000).toFixed(1)+"M"} />
              <Tooltip formatter={v=>formatRWF(v)} />
              <Legend />
              <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10B981" fill="#D1FAE5" name="Revenue" />
              <Area type="monotone" dataKey="cogs" stackId="2" stroke="#F59E0B" fill="#FEF3C7" name="COGS" />
              <Area type="monotone" dataKey="netProfit" stackId="3" stroke="#3B82F6" fill="#DBEAFE" name="Net Profit" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </PageWrapper>
  );
}
