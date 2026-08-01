import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, PlusCircle, Package, TrendingUp, TrendingDown, AlertTriangle, Activity, ArrowRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

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
      <p className="text-[13px] text-text-secondary -mt-1">out of 100</p>
    </div>
  );
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────
function AlertBanner({ alerts, navigate }) {
  if (!alerts?.length) return null;

  const getRoute = (type) => {
    switch (type) {
      case "health_score": return "/app/health-score";
      case "low_stock": return "/app/stock";
      case "sales_drop": return "/app/reports/sales";
      case "expense_spike": return "/app/expenses";
      case "net_loss": return "/app/finance/pnl";
      default: return "/app/dashboard";
    }
  };

  return (
    <div className="space-y-2 mb-4">
      {alerts.map((a, i) => {
        const route = getRoute(a.type);
        const isLoss = a.type === "net_loss";
        return (
          <div
            key={i}
            onClick={() => navigate(route)}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-[8px] border cursor-pointer transition-all hover:shadow-md ${
              isLoss
                ? "bg-danger/10 border-danger/40 text-danger hover:bg-danger/15"
                : "bg-warning/10 border-warning/40 text-text-primary hover:bg-warning/20"
            }`}
            title="Click to view details & take action"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className={isLoss ? "text-danger shrink-0" : "text-warning shrink-0"} />
              <p className="text-[14px] font-semibold">{a.message}</p>
            </div>
            <div className={`flex items-center gap-1 text-[13px] font-bold shrink-0 ${isLoss ? "text-danger" : "text-primary"}`}>
              <span className="hover:underline">Fix & View Details</span>
              <ArrowRight size={14} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, icon: Icon, color = "text-primary", isLoss = false, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface border rounded-[8px] p-4 transition-all hover:shadow-sm ${
        isLoss ? "border-danger/50 bg-danger/5 hover:bg-danger/10" : "border-border hover:border-primary/50"
      } ${onClick ? "cursor-pointer" : ""}`}
      title="Click to view full breakdown"
    >
      <div className="flex items-center justify-between mb-2">
        <p className={`text-[13px] font-semibold ${isLoss ? "text-danger" : "text-text-secondary"}`}>{label}</p>
        {Icon && <Icon size={16} className={isLoss ? "text-danger" : color} />}
      </div>
      <p className={`text-[24px] font-bold ${isLoss ? "text-danger" : "text-text-primary"}`}>{value}</p>
      {sub && (
        <div className="flex items-center justify-between mt-1">
          <p className={`text-[13px] ${isLoss ? "text-danger/80 font-medium" : "text-text-secondary"}`}>{sub}</p>
          <ArrowRight size={12} className={isLoss ? "text-danger" : "text-text-secondary group-hover:text-primary"} />
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const { t }     = useLanguage();

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
  const isNetCashLoss = (stats?.netCashToday ?? 0) < 0;
  const isMonthlyLoss = (stats?.monthlyProfit ?? 0) < 0;

  // Combine alerts with explicit Net Loss alert if applicable
  const combinedAlerts = [...(stats?.alerts || [])];
  if (isMonthlyLoss) {
    combinedAlerts.unshift({
      type: "net_loss",
      message: `⚠️ NET LOSS WARNING: Your business is operating at a Net Loss of ${formatRWF(Math.abs(stats.monthlyProfit))} this month (Expenses & COGS exceed Revenue).`
    });
  }

  return (
    <PageWrapper
      title={`${t("welcome_back")}, ${user?.name?.split(" ")[0] || ""}`}
      subtitle={t("dashboard_subtitle")}
      breadcrumbs={[{ label: t("dashboard"), path: "/app/dashboard" }]}
    >
      {/* Clickable Alert Banners */}
      {!loading && <AlertBanner alerts={combinedAlerts} navigate={navigate} />}

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <button onClick={() => navigate("/app/sales/new")}
          className="flex flex-col items-center gap-1.5 py-4 bg-primary text-white rounded-[8px] hover:bg-primary/90 transition-colors shadow-sm">
          <ShoppingCart size={20} />
          <span className="text-[13px] font-semibold">{t("new_sale")}</span>
        </button>
        <button onClick={() => navigate("/app/expenses")}
          className="flex flex-col items-center gap-1.5 py-4 bg-surface border border-border rounded-[8px] hover:bg-background transition-colors shadow-sm">
          <PlusCircle size={20} className="text-text-primary" />
          <span className="text-[13px] font-semibold text-text-primary">{t("add_expense")}</span>
        </button>
        <button onClick={() => navigate("/app/stock")}
          className="flex flex-col items-center gap-1.5 py-4 bg-surface border border-border rounded-[8px] hover:bg-background transition-colors shadow-sm">
          <Package size={20} className="text-text-primary" />
          <span className="text-[13px] font-semibold text-text-primary">{t("receive_stock")}</span>
        </button>
      </div>

      {/* Row 1 — KPIs + Health Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-2 gap-3">
          {loading ? Array(4).fill(0).map((_,i) => (
            <div key={i} className="bg-surface border border-border rounded-[8px] p-4 animate-pulse h-24" />
          )) : <>
            <KPI label={t("revenue_today")} value={formatRWF(stats?.todayRevenue)} sub={`${stats?.todayTransactions ?? 0} ${t("transactions")}`} icon={ShoppingCart} onClick={() => navigate("/app/sales")} />
            
            <KPI
              label={isNetCashLoss ? "Net Cash Deficit (Loss)" : t("net_cash_today")}
              value={formatRWF(stats?.netCashToday)}
              sub={isNetCashLoss ? "Expenses exceed sales today" : t("sales_minus_expenses")}
              icon={isNetCashLoss ? TrendingDown : TrendingUp}
              color={isNetCashLoss ? "text-danger" : "text-success"}
              isLoss={isNetCashLoss}
              onClick={() => navigate("/app/finance/pnl")}
            />
            
            <KPI
              label={t("monthly_revenue")}
              value={formatRWF(stats?.monthlyRevenue)}
              sub={salesChange !== null ? `${salesChange > 0 ? "+" : ""}${salesChange}% ${t("vs_last_month")}` : undefined}
              icon={salesChange > 0 ? TrendingUp : TrendingDown}
              color={salesChange >= 0 ? "text-success" : "text-danger"}
              onClick={() => navigate("/app/reports/sales")}
            />
            
            <KPI
              label={isMonthlyLoss ? "🚨 MONTHLY NET LOSS" : t("monthly_profit")}
              value={formatRWF(stats?.monthlyProfit)}
              sub={isMonthlyLoss ? "Expenses exceed revenue (Loss)" : t("revenue_minus_cogs")}
              icon={isMonthlyLoss ? TrendingDown : Activity}
              color={isMonthlyLoss ? "text-danger" : "text-success"}
              isLoss={isMonthlyLoss}
              onClick={() => navigate("/app/finance/pnl")}
            />
          </>}
        </div>

        {/* Health Score Gauge — Fully Clickable to Advisory Page */}
        <div onClick={() => navigate("/app/health-score")} className="cursor-pointer group">
          <Card title={t("business_health_score")} subtitle={t("health_score_subtitle")} className="h-full hover:border-primary/50 transition-all group-hover:shadow-sm">
            {loading ? (
              <div className="h-28 animate-pulse bg-border rounded" />
            ) : (
              <>
                <HealthGauge score={score?.score} band={score?.band} />
                <button
                  onClick={(e) => { e.stopPropagation(); navigate("/app/health-score"); }}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-[13px] text-primary font-bold hover:underline bg-primary/5 rounded-[6px]"
                >
                  {t("get_advisory_help")} <ArrowRight size={14} />
                </button>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Row 2 — Sales & Net Profit/Loss Trend + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div onClick={() => navigate("/app/finance/pnl")} className="lg:col-span-2 cursor-pointer group">
          <Card title="Sales & Net Profit / Loss Trend (7 Days)" subtitle="Click to view full P&L financial statement →" className="hover:border-primary/50 transition-all group-hover:shadow-sm">
            {loading ? <div className="h-48 animate-pulse bg-border rounded" /> : (
              trend.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trend}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v?.slice(5)} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v/1000).toFixed(0) + "k"} />
                    <Tooltip formatter={(value, name) => [
                      formatRWF(value),
                      name === "net_profit" ? (value < 0 ? "🚨 NET LOSS" : "NET PROFIT") : "Revenue"
                    ]} />
                    <Legend />
                    <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="3 3" label={{ value: "0 RWF", fill: "#6B7280", fontSize: 10 }} />
                    <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue" dot={false} />
                    <Line type="monotone" dataKey="net_profit" stroke="#EF4444" strokeWidth={2.5} name="Net Profit / Loss" dot={{ r: 4, fill: "#EF4444" }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-[14px] text-text-secondary">
                  {t("no_sales_data")}
                </div>
              )
            )}
          </Card>
        </div>

        <Card title={t("low_stock_alerts")} subtitle={`${lowStock.length} ${t("items_need_attention")}`}>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {lowStock.length ? lowStock.map(item => (
              <div
                key={item.id}
                onClick={() => navigate("/app/stock")}
                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-background cursor-pointer transition-colors"
                title="Click to manage stock"
              >
                <p className="text-[14px] text-text-primary truncate flex-1 font-medium">{item.name}</p>
                <span className={`text-[13px] font-bold ml-2 ${item.quantity === 0 ? "text-danger" : "text-warning"}`}>
                  {item.quantity === 0 ? "OUT" : `${item.quantity} left`}
                </span>
              </div>
            )) : (
              <p className="text-[14px] text-success py-4 text-center">{t("all_stock_ok")}</p>
            )}
          </div>
          {lowStock.length > 0 && (
            <button onClick={() => navigate("/app/stock")}
              className="mt-3 w-full text-[13px] text-primary font-bold hover:underline text-center flex items-center justify-center gap-1">
              <span>{t("view_all_stock")}</span>
              <ArrowRight size={13} />
            </button>
          )}
        </Card>
      </div>

      {/* Row 3 — Recent Activity */}
      <div onClick={() => navigate("/app/reports/audit")} className="cursor-pointer group">
        <Card title={t("recent_activity")} subtitle="Click to open full audit logs →" className="hover:border-primary/50 transition-all group-hover:shadow-sm">
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
                  <p className="text-[13px] text-text-secondary">
                    {new Date(a.created_at).toLocaleString("en-RW", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
              </div>
            ))}
            {!activity.length && (
              <p className="text-[14px] text-text-secondary py-6 text-center">{t("no_recent_activity")}</p>
            )}
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
