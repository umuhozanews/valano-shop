import { useState, useEffect } from "react";
import { Package, ShoppingCart, TrendingUp, Users, AlertTriangle, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import PageWrapper from "../../components/layout/PageWrapper";
import StatCard from "../../components/ui/StatCard";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import api from "../../utils/api";
import { formatRWF, formatRelative } from "../../utils/formatters";

const ACTION_COLORS = { SALE_CREATED:"text-success", STOCK_CREATED:"text-primary", LOGIN:"text-neutral", SALE_VOIDED:"text-warning", WORKER_CREATED:"text-primary" };
const PIE_COLORS = ["#10B981","#F59E0B","#EF4444"];

function SkeletonCard() {
  return <div className="bg-surface border border-border rounded-card p-6 animate-pulse"><div className="h-4 bg-border rounded w-3/4 mb-3" /><div className="h-8 bg-border rounded w-1/2 mb-2" /><div className="h-3 bg-border rounded w-1/3" /></div>;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState([]);
  const [health, setHealth] = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [activity, setActivity] = useState([]);
  const [branchComp, setBranchComp] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/dashboard/stats"),
      api.get("/dashboard/sales-trend?days=30"),
      api.get("/dashboard/stock-health"),
      api.get("/dashboard/top-items?limit=10"),
      api.get("/dashboard/worker-leaderboard"),
      api.get("/dashboard/low-stock-alerts"),
      api.get("/dashboard/activity-feed"),
      api.get("/dashboard/branch-comparison"),
    ]).then(([s, tr, h, ti, lb, ls, act, bc]) => {
      setStats(s.data); setTrend(tr.data); setHealth(h.data);
      setTopItems(ti.data); setLeaderboard(lb.data); setLowStock(ls.data);
      setActivity(act.data); setBranchComp(bc.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const healthData = health ? [
    { name: "In Stock", value: parseInt(health.in_stock) },
    { name: "Low Stock", value: parseInt(health.low_stock) },
    { name: "Out of Stock", value: parseInt(health.out_of_stock) },
  ] : [];

  const rankBadge = (i) => ["🥇","🥈","🥉"][i] || i+1;

  return (
    <PageWrapper title="Dashboard" subtitle="Real-time business overview"
      breadcrumbs={[{ label: "Dashboard", path: "/app/dashboard" }]}>

      {/* ROW 1 — Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {loading ? Array(4).fill(0).map((_,i) => <SkeletonCard key={i} />) : <>
          <StatCard title="Total Stock Value" value={formatRWF(stats?.totalStockValue)} icon={Package} color="primary" />
          <StatCard title="Today's Revenue" value={formatRWF(stats?.todayRevenue)} icon={ShoppingCart} color="success" />
          <StatCard title="Monthly Profit" value={formatRWF(stats?.monthlyProfit)} icon={TrendingUp} color="primary-dark" />
          <StatCard title="Active Workers" value={stats?.activeWorkers || 0} icon={Users} color="neutral" />
        </>}
      </div>

      {/* ROW 2 — Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <Card title="30-Day Sales Trend" className="lg:col-span-3">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v/1000).toFixed(0)+"k"} />
              <Tooltip formatter={(v, n) => [formatRWF(v), n === "branch1" ? "Nyabugogo" : "Kimironko"]} />
              <Legend />
              <Line type="monotone" dataKey="branch1" stroke="#10B981" strokeWidth={2} dot={false} name="Nyabugogo" />
              <Line type="monotone" dataKey="branch2" stroke="#3B82F6" strokeWidth={2} dot={false} name="Kimironko" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Stock Health" subtitle={`${parseInt(health?.in_stock||0)+parseInt(health?.low_stock||0)+parseInt(health?.out_of_stock||0)} total items`} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={healthData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
                {healthData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {["In Stock","Low Stock","Out of Stock"].map((label, i) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                <span className="text-[11px] text-text-secondary">{label}: {healthData[i]?.value || 0}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ROW 3 — More charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card title="Revenue by Branch">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={branchComp}>
              <XAxis dataKey="branch" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v/1000).toFixed(0)+"k"} />
              <Tooltip formatter={v => formatRWF(v)} />
              <Bar dataKey="revenue" fill="#10B981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Top Items This Month">
          <div className="space-y-2">
            {topItems.slice(0,6).map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-bold text-text-secondary w-4">{i+1}</span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-text-primary truncate">{item.name}</p>
                    <p className="text-[11px] text-text-secondary">{item.total_sold} sold</p>
                  </div>
                </div>
                <span className="text-[13px] font-semibold text-primary shrink-0">{formatRWF(item.revenue)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ROW 4 — 3 panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Leaderboard */}
        <Card title="Worker Leaderboard" subtitle="This month's top performers">
          <div className="space-y-3">
            {leaderboard.map((w, i) => (
              <div key={w.id} className="flex items-center gap-3">
                <span className="text-[18px]">{rankBadge(i)}</span>
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-[12px] font-bold text-primary">{w.name?.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-text-primary truncate">{w.name}</p>
                  <p className="text-[11px] text-text-secondary">{w.branch}</p>
                  <div className="mt-1 w-full h-1 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all"
                         style={{ width: `${w.monthly_target > 0 ? Math.min(100, Math.round(w.revenue / w.monthly_target * 100)) : 0}%` }} />
                  </div>
                </div>
                <p className="text-[12px] font-semibold text-primary shrink-0">{formatRWF(w.revenue)}</p>
              </div>
            ))}
            {!leaderboard.length && <p className="text-[13px] text-text-secondary text-center py-4">No data yet</p>}
          </div>
        </Card>

        {/* Low Stock */}
        <Card title="Low Stock Alerts" action={
          <Badge status={lowStock.length ? "danger" : "success"} label={`${lowStock.length} items`} />
        }>
          <div className="space-y-2">
            {lowStock.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-text-primary truncate">{item.name}</p>
                  <p className="text-[11px] text-text-secondary">{item.branch_name}</p>
                </div>
                <Badge status={item.quantity === 0 ? "danger" : "warning"} label={`${item.quantity} left`} />
              </div>
            ))}
            {!lowStock.length && (
              <p className="text-[13px] text-success text-center py-4">✓ All items well stocked</p>
            )}
          </div>
        </Card>

        {/* Activity Feed */}
        <Card title="Live Activity">
          <div className="space-y-3">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-background flex items-center justify-center shrink-0 mt-0.5">
                  <Activity size={12} className={ACTION_COLORS[a.action] || "text-neutral"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-text-primary font-medium">
                    {a.user_name || "System"} — {a.action.replace("_", " ")}
                  </p>
                  <p className="text-[11px] text-text-secondary">{formatRelative(a.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
