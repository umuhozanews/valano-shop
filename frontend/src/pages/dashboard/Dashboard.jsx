import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, PlusCircle, Package, TrendingUp, TrendingDown, AlertTriangle, Activity, ArrowRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import { useAuth } from "../../context/AuthContext";

// ─── Health Score Gauge ───────────────────────────────────────────────────────
function HealthGauge({ score, band }) {
  const color = band === "green" ? "#10B981" : band === "amber" ? "#F59E0B" : "#EF4444";
  const label = band === "green" ? "Healthy" : band === "amber" ? "Watch" : "At Risk";
  // SVG arc: 0–100 maps to 0–180° (half-circle)
  const pct   = Math.min(100, Math.max(0, score ?? 0));
  const angle = (pct / 100) * 180;
  const rad   = (angle - 90) * (Math.PI / 180);
  const cx    = 80; const cy = 80; const r = 60;
  const ex    = cx + r * Math.cos(rad);
  const ey    = cy + r * Math.sin(rad);

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="100" viewBox="0 0 160 100">
        {/* Track */}
        <path d="M 20 80 A 60 60 0 0 1 140 80" fill="none" stroke="#E5E7EB" strokeWidth="12" strokeLinecap="round" />
        {/* Fill */}
        {score !== null && score !== undefined && (
          <path
            d={`M 20 80 A 60 60 0 ${angle > 90 ? 1 : 0} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`}
            fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          />
        )}
        {/* Score text */}
        <text x="80" y="75" textAnchor="middle" fontSize="26" fontWeight="700" fill={color}>
          {score ?? "–"}
        </text>
        <text x="80" y="92" textAnchor="middle" fontSize="11" fill="#6B7280">{label}</text>
      </svg>
      <p className="text-[11px] text-text-secondary -mt-1">out of 100</p>
    </div>
  );
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────
function AlertBanner({ alerts }) {
  if (!alerts?.length) return null;
  return (
    <div className="space-y-2 mb-4">
      {alerts.map((a, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-[6px] bg-warning/10 border border-warning/30">
          <AlertTriangle size={15} className="text-warning mt-0.5 shrink-0" />
          <p className="text-[13px] text-text-primary">{a.message}</p>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, icon: Icon, color = "text-primary" }) {
  return (
    <div className="bg-surface border border-border rounded-[8px] p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] text-text-secondary">{label}</p>
        {Icon && <Icon size={16} className={color} />}
      </div>
      <p className="text-[22px] font-bold text-text-primary">{value}</p>
      {sub && <p className="text-[11px] text-text-secondary mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user }  = useAuth();

  const [stats,    setStats]    = useState(null);
  const [trend,    setTrend]    = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [activity, setActivity] = useState([]);
  const [score,    setScore]    = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const get = url => api.get(url).then(r => r.data).catch(() => null);
    Promise.all([
      get("/dashboard/stats"),
      get("/dashboard/sales-trend?days=7"),
      get("/dashboard/low-stock-alerts"),
      get("/dashboard/activity-feed"),
    ]).then(([s, tr, ls, act]) => {
      if (s)   setStats(s);
      if (tr)  setTrend(Array.isArray(tr) ? tr : []);
      if (ls)  setLowStock(Array.isArray(ls) ? ls : []);
      if (act) setActivity(Array.isArray(act) ? act : []);
      if (s?.healthScore) setScore(s.healthScore);
    }).finally(() => setLoading(false));
  }, []);

  const salesChange = stats?.salesChangePct;

  return (
    <PageWrapper
      title={`Welcome, ${user?.name?.split(" ")[0] || "there"}`}
      subtitle="Here's your business snapshot for today"
      breadcrumbs={[{ label: "Dashboard", path: "/app/dashboard" }]}
    >
      {/* Alert banners */}
      {!loading && <AlertBanner alerts={stats?.alerts} />}

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <button onClick={() => navigate("/app/sales/new")}
          className="flex flex-col items-center gap-1.5 py-4 bg-primary text-white rounded-[8px] hover:bg-primary/90 transition-colors">
          <ShoppingCart size={20} />
          <span className="text-[12px] font-semibold">New Sale</span>
        </button>
        <button onClick={() => navigate("/app/expenses")}
          className="flex flex-col items-center gap-1.5 py-4 bg-surface border border-border rounded-[8px] hover:bg-background transition-colors">
          <PlusCircle size={20} className="text-text-primary" />
          <span className="text-[12px] font-semibold text-text-primary">Add Expense</span>
        </button>
        <button onClick={() => navigate("/app/stock")}
          className="flex flex-col items-center gap-1.5 py-4 bg-surface border border-border rounded-[8px] hover:bg-background transition-colors">
          <Package size={20} className="text-text-primary" />
          <span className="text-[12px] font-semibold text-text-primary">Receive Stock</span>
        </button>
      </div>

      {/* Row 1 — KPIs + Health Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-2 gap-3">
          {loading ? Array(4).fill(0).map((_,i) => (
            <div key={i} className="bg-surface border border-border rounded-[8px] p-4 animate-pulse h-24" />
          )) : <>
            <KPI label="Revenue Today"      value={formatRWF(stats?.todayRevenue)}   sub={`${stats?.todayTransactions ?? 0} transactions`} icon={ShoppingCart} />
            <KPI label="Net Cash Today"     value={formatRWF(stats?.netCashToday)}   sub="Sales minus expenses" icon={TrendingUp} color={stats?.netCashToday >= 0 ? "text-success" : "text-danger"} />
            <KPI label="Monthly Revenue"    value={formatRWF(stats?.monthlyRevenue)} sub={salesChange !== null ? `${salesChange > 0 ? "+" : ""}${salesChange}% vs last month` : undefined}
              icon={salesChange > 0 ? TrendingUp : TrendingDown} color={salesChange >= 0 ? "text-success" : "text-danger"} />
            <KPI label="Monthly Profit"     value={formatRWF(stats?.monthlyProfit)}  sub="Revenue minus expenses & COGS" icon={Activity} />
          </>}
        </div>

        {/* Health Score Gauge */}
        <Card title="Business Health Score" subtitle="Calculated from your data">
          {loading ? (
            <div className="h-28 animate-pulse bg-border rounded" />
          ) : (
            <>
              <HealthGauge score={score?.score} band={score?.band} />
              {score?.score < 50 && (
                <button onClick={() => navigate("/app/health-score")}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-[12px] text-primary font-medium hover:underline">
                  Get advisory help <ArrowRight size={13} />
                </button>
              )}
              {!score && (
                <p className="text-center text-[12px] text-text-secondary mt-2">
                  No score yet — add sales and expenses to get scored
                </p>
              )}
            </>
          )}
        </Card>
      </div>

      {/* Row 2 — Sales Trend + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card title="7-Day Sales Trend" className="lg:col-span-2">
          {loading ? <div className="h-48 animate-pulse bg-border rounded" /> : (
            trend.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trend}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v/1000).toFixed(0) + "k"} />
                  <Tooltip formatter={v => [formatRWF(v), "Revenue"]} />
                  <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-[13px] text-text-secondary">
                No sales data yet — make your first sale to see the trend
              </div>
            )
          )}
        </Card>

        <Card title="Low Stock Alerts" subtitle={`${lowStock.length} items need attention`}>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {lowStock.length ? lowStock.map(item => (
              <div key={item.id} className="flex items-center justify-between py-1">
                <p className="text-[13px] text-text-primary truncate flex-1">{item.name}</p>
                <span className={`text-[12px] font-bold ml-2 ${item.quantity === 0 ? "text-danger" : "text-warning"}`}>
                  {item.quantity === 0 ? "OUT" : item.quantity}
                </span>
              </div>
            )) : (
              <p className="text-[13px] text-success py-4 text-center">✓ All stock levels OK</p>
            )}
          </div>
          {lowStock.length > 0 && (
            <button onClick={() => navigate("/app/stock")}
              className="mt-3 w-full text-[12px] text-primary font-medium hover:underline text-center">
              View all stock →
            </button>
          )}
        </Card>
      </div>

      {/* Row 3 — Recent Activity */}
      <Card title="Recent Activity">
        <div className="divide-y divide-border">
          {activity.slice(0, 8).map(a => (
            <div key={a.id} className="flex items-center gap-3 py-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Activity size={13} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] text-text-primary font-medium">
                  {a.user_name || "System"} — {a.action?.replace(/_/g, " ")}
                </p>
                <p className="text-[11px] text-text-secondary">
                  {new Date(a.created_at).toLocaleString("en-RW", { dateStyle: "short", timeStyle: "short" })}
                </p>
              </div>
            </div>
          ))}
          {!activity.length && (
            <p className="text-[13px] text-text-secondary py-6 text-center">No recent activity</p>
          )}
        </div>
      </Card>
    </PageWrapper>
  );
}
