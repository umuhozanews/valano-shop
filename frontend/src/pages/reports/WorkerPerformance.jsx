import { useState, useEffect, useCallback } from "react";
import { Download, Users, TrendingUp, Award, DollarSign, Search, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import StatCard from "../../components/ui/StatCard";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM_BG = [
  "border-amber-400 bg-amber-50/50 shadow-amber-100",
  "border-slate-300 bg-slate-50/50 shadow-slate-100",
  "border-orange-300 bg-orange-50/50 shadow-orange-100"
];
const TEXT_COLORS = [
  "text-amber-700",
  "text-slate-700",
  "text-orange-700"
];

export default function WorkerPerformance() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(() => {
    const start = new Date();
    start.setDate(1); // Default to 1st of current month
    const end = new Date();
    return {
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10)
    };
  });

  const fetchPerformance = useCallback(async () => {
    setLoading(true);
    try {
      const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const { data: d } = await api.get("/reports/worker-performance", { params: activeFilters });
      setData(Array.isArray(d) ? d : []);
    } catch {
      toast.error(t("error") || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }, [filters, t]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const exportExcel = async () => {
    try {
      const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const response = await api.get("/reports/worker-performance", {
        params: { ...activeFilters, export: "excel" },
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `worker_performance_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t("success") || "Exported successfully");
    } catch {
      toast.error("Failed to export Excel");
    }
  };

  // Calculations
  const totalRevenue = data.reduce((s, w) => s + parseFloat(w.revenue || 0), 0);
  const totalSales = data.reduce((s, w) => s + parseInt(w.sales_count || 0), 0);
  const totalCommission = data.reduce((s, w) => s + parseFloat(w.commission_due || 0), 0);
  
  const activeTargetsCount = data.filter(w => parseFloat(w.monthly_target) > 0).length;
  const avgAchievement = activeTargetsCount > 0 
    ? Math.round(data.reduce((s, w) => s + parseFloat(w.achievement_pct || 0), 0) / activeTargetsCount)
    : 0;

  const topPerformer = data.length > 0 ? data[0] : null;

  // Chart data mapping
  const chartData = data.map(w => ({
    name: (w.name || "Worker").split(" ")[0], // Keep it clean
    Revenue: parseFloat(w.revenue || 0),
    Target: parseFloat(w.monthly_target || 0)
  }));

  // Filtering table
  const filteredData = data.filter(w => 
    (w.name || "").toLowerCase().includes(search.toLowerCase()) || 
    (w.branch || "").toLowerCase().includes(search.toLowerCase())
  );

  const getAchievementColor = (pct) => {
    if (pct >= 100) return "bg-success text-success";
    if (pct >= 75) return "bg-primary text-primary";
    if (pct >= 50) return "bg-warning text-warning";
    return "bg-danger text-danger";
  };

  const getAchievementBadgeStatus = (pct) => {
    if (pct >= 100) return "success";
    if (pct >= 75) return "primary";
    if (pct >= 50) return "warning";
    return "danger";
  };

  const columns = [
    { key: "name", label: t("worker") || "Worker", render: (v, r, i) => {
      const idx = data.findIndex(w => w.id === r.id);
      const isTop3 = idx >= 0 && idx < 3;
      return (
        <div className="flex items-center gap-3">
          <span className="w-6 text-center text-[11px] font-semibold">
            {isTop3 ? MEDALS[idx] : idx + 1}
          </span>
          <div>
            <p className="font-semibold text-text-primary text-[11px]">{v}</p>
            <p className="text-[11px] text-text-secondary">{r.branch}</p>
          </div>
        </div>
      );
    }},
    { key: "sales_count", label: t("sales") || "Sales", render: v => <span className="font-mono">{v}</span> },
    { key: "revenue", label: t("revenue") || "Revenue", render: v => <span className="font-bold text-text-primary">{formatRWF(v)}</span> },
    { key: "monthly_target", label: t("target") || "Target", render: v => <span className="font-mono text-text-secondary">{formatRWF(v)}</span> },
    { key: "achievement_pct", label: t("achievement") || "Achievement", render: (v, r) => (
      <div className="flex items-center gap-3">
        <div className="w-20 h-2 bg-border rounded-full overflow-hidden shrink-0">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${getAchievementColor(v).split(" ")[0]}`} 
            style={{ width: `${Math.min(100, v)}%` }} 
          />
        </div>
        <div>
          <span className="text-[12px] font-bold text-text-primary mr-1">{v}%</span>
          <Badge status={getAchievementBadgeStatus(v)} label={v >= 100 ? "Superstar" : v >= 75 ? "High Achiever" : v >= 50 ? "On Track" : "Needs Focus"} />
        </div>
      </div>
    )},
    { key: "commission_due", label: t("commission") || "Commission", render: v => <span className="font-semibold text-success">{formatRWF(v)}</span> },
    { key: "id", label: "", render: (v) => (
      <Button variant="ghost" size="sm" icon={Eye} onClick={() => navigate(`/app/workers/${v}`)}>
        {t("view") || "Profile"}
      </Button>
    )}
  ];

  return (
    <PageWrapper 
      title={t("worker_performance") || "Worker Performance"} 
      subtitle="Track sales contributions, target achievements, and worker commissions"
      breadcrumbs={[{ label: t("reports") || "Reports" }, { label: t("worker_performance") || "Worker Performance" }]}
    >
      
      {/* Search & Filter Header */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">Start Date</label>
              <input 
                type="date" 
                value={filters.start_date} 
                onChange={e => setFilters(f => ({ ...f, start_date: e.target.value }))}
                className="h-9 px-3 border border-border rounded-card text-[11px] bg-surface focus:outline-none focus:ring-1 focus:ring-primary font-medium" 
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary uppercase mb-1">End Date</label>
              <input 
                type="date" 
                value={filters.end_date} 
                onChange={e => setFilters(f => ({ ...f, end_date: e.target.value }))}
                className="h-9 px-3 border border-border rounded-card text-[11px] bg-surface focus:outline-none focus:ring-1 focus:ring-primary font-medium" 
              />
            </div>
          </div>
          <div className="flex gap-2 self-end">
            <Button variant="secondary" size="md" icon={Download} onClick={exportExcel} disabled={data.length === 0}>
              Excel Report
            </Button>
          </div>
        </div>
      </Card>

      {data.length === 0 && !loading && (
        <Card className="text-center py-12">
          <Users className="mx-auto text-text-secondary opacity-30 mb-3" size={48} />
          <h3 className="text-[12px] font-bold text-text-primary mb-1">No sales data recorded</h3>
          <p className="text-[11px] text-text-secondary">Please adjust the date ranges or record new sales to see performance reports.</p>
        </Card>
      )}

      {data.length > 0 && (
        <div className="space-y-6">
          {/* Key Metric Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              title="Total Sales Revenue" 
              value={formatRWF(totalRevenue)} 
              icon={TrendingUp} 
              color="success" 
            />
            <StatCard 
              title="Commissions Payable" 
              value={formatRWF(totalCommission)} 
              icon={DollarSign} 
              color="primary" 
            />
            <StatCard 
              title="Top Performer" 
              value={topPerformer ? topPerformer.name : "N/A"} 
              trend={topPerformer ? Math.round(topPerformer.achievement_pct) : 0} 
              trendLabel="target achieved"
              icon={Award} 
              color="warning" 
            />
            <StatCard 
              title="Average Achievement" 
              value={`${avgAchievement}%`} 
              icon={Users} 
              color="primary" 
            />
          </div>

          {/* Top 3 Performers Visual Showcase (Podium) */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-bold text-text-primary flex items-center gap-2">
              <span>🏆</span> Top Achievers Podium
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.slice(0, 3).map((w, idx) => (
                <div 
                  key={w.id} 
                  className={`border rounded-card p-5 relative overflow-hidden transition-all hover:scale-[1.01] ${PODIUM_BG[idx]}`}
                >
                  {/* Rank Stamp */}
                  <div className="absolute top-4 right-4 text-[26px] font-black opacity-80 select-none">
                    {MEDALS[idx]}
                  </div>

                  <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    {idx === 0 ? "Gold Leader" : idx === 1 ? "Silver Runner-Up" : "Bronze Finalist"}
                  </p>
                  
                  <h4 className="text-[18px] font-black text-text-primary mt-2 leading-tight">
                    {w.name}
                  </h4>
                  <p className="text-[12px] text-text-secondary">{w.branch}</p>

                  <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-2 gap-2 text-[12px]">
                    <div>
                      <p className="text-text-secondary font-medium">Revenue</p>
                      <p className={`text-[11px] font-extrabold ${TEXT_COLORS[idx]}`}>{formatRWF(w.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-text-secondary font-medium">Achievement</p>
                      <p className="text-[11px] font-extrabold text-text-primary">{w.achievement_pct}%</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="w-full h-1.5 bg-border/40 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${getAchievementColor(w.achievement_pct).split(" ")[0]}`} 
                        style={{ width: `${Math.min(100, w.achievement_pct)}%` }} 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recharts Analytics Section & Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Chart */}
            <Card className="lg:col-span-8 flex flex-col" title="Target vs. Revenue Comparison">
              <div className="h-72 w-full mt-4 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#6C7A71" fontSize={12} tickLine={false} />
                    <YAxis 
                      stroke="#6C7A71" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${v/1000}k` : v}
                    />
                    <Tooltip 
                      formatter={(v) => [formatRWF(v), ""]} 
                      contentStyle={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: "8px" }} 
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="Revenue" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="Target" fill="#93C5FD" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Quick Insights List */}
            <Card className="lg:col-span-4" title="Performance Insights">
              <div className="space-y-4 mt-3 text-[11px] text-text-secondary leading-relaxed">
                <div className="p-3 bg-surface border border-border rounded-card">
                  <p className="font-bold text-text-primary mb-1 text-[11px]">🚀 Target Achieved</p>
                  <p>
                    <strong>{data.filter(w => w.achievement_pct >= 100).length}</strong> out of <strong>{data.length}</strong> active workers have successfully reached or surpassed their monthly target.
                  </p>
                </div>

                <div className="p-3 bg-surface border border-border rounded-card">
                  <p className="font-bold text-text-primary mb-1 text-[11px]">💰 Average Sales Volume</p>
                  <p>
                    The average revenue per worker this period is <strong>{formatRWF(Math.round(totalRevenue / data.length))}</strong> over a total of <strong>{totalSales}</strong> sales events.
                  </p>
                </div>

                <div className="p-3 bg-surface border border-border rounded-card">
                  <p className="font-bold text-text-primary mb-1 text-[11px]">🔔 Action Required</p>
                  <p>
                    <strong>{data.filter(w => w.achievement_pct < 50 && w.monthly_target > 0).length}</strong> worker(s) are performing under 50% target and may require mentoring or training support.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Searchable Performance Table */}
          <Card title="Worker Standings & Commissions">
            <div className="flex justify-between items-center mb-4 mt-2">
              <div className="relative w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input 
                  value={search} 
                  onChange={e => setSearch(e.target.value)} 
                  placeholder="Search workers or branches…"
                  className="w-full h-9 pl-9 pr-3 border border-border rounded-card text-[11px] focus:outline-none focus:ring-1 focus:ring-primary bg-surface font-medium" 
                />
              </div>
            </div>
            <Table columns={columns} data={filteredData} emptyMessage="No matches found" />
          </Card>
        </div>
      )}
    </PageWrapper>
  );
}
