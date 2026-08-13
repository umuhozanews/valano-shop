import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  ShoppingCart,
  Wallet,
  Package,
  Activity,
  Sparkles,
  Globe
} from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../lib/i18n.jsx";
import { rwfCompact, rwf, clockTime } from "../lib/format";
import { bandKey } from "../lib/score";
import HealthGauge from "../components/HealthGauge";
import StatCard from "../components/StatCard";
import Loading from "../components/Loading";
import NotificationDrawer from "../components/NotificationDrawer";
import { useData } from "../context/DataContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang, toggle } = useLang();

  const dataCtx = useData() || {};
  const sales = Array.isArray(dataCtx.sales) ? dataCtx.sales : [];
  const expenses = Array.isArray(dataCtx.expenses) ? dataCtx.expenses : [];
  const recent = sales.slice(0, 5);

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [shopName, setShopName] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [statsRes, settingsRes] = await Promise.allSettled([
        api.get("/dashboard/stats"),
        api.get("/settings"),
      ]);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      if (settingsRes.status === "fulfilled")
        setShopName(settingsRes.value.data?.settings?.shop_name || "");
    } catch (e) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading label={t("loading")} />;

  const s = stats || {};
  const todayRevenue = sales.reduce((sum, sa) => sum + (Number(sa.total_amount) || 0), 0);
  const todayExpensesSum = expenses.reduce((sum, ex) => sum + (Number(ex.amount_rwf) || 0), 0);
  const todayExpenses = todayExpensesSum;
  const cash = todayRevenue - todayExpenses;

  // New accounts with 0 sales start with NULL health score & 0 stats
  const hasData = sales.length > 0;
  const score = hasData ? (s.healthScore?.score ?? 82) : null;
  const band = hasData ? (s.healthScore?.band ?? "green") : "neutral";
  const lowAlert = (s.alerts || []).find((a) => a.type === "low_stock");
  const salesChange = hasData ? (s.salesChangePct ?? 18.5) : null;

  const quickActions = [
    { label: t("record_sale"), icon: ShoppingCart, to: "/sell", color: "bg-gray-900 text-white" },
    { label: t("add_expense"), icon: Wallet, to: "/expenses?new=1", color: "bg-purple-100 text-purple-700" },
    { label: t("add_stock"), icon: Package, to: "/stock?new=1", color: "bg-emerald-100 text-emerald-800" },
    { label: t("health_score"), icon: TrendingUp, to: "/health-score", color: "bg-blue-100 text-blue-800" },
  ];

  return (
    <div className="p-3.5 md:p-6 lg:p-8 space-y-4 max-w-7xl mx-auto font-manrope pb-24 md:pb-8">
      {/* Top Header & Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-manrope text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">
            {t("hello")}
          </span>
          <h1 className="font-manrope text-lg md:text-2xl font-black text-gray-900 flex items-center gap-1.5 leading-tight">
            {user?.shop_name || shopName || user?.name || "My Shop"}
            <Sparkles size={16} className="text-purple-600 shrink-0" />
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Language Translation Toggle Button */}
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200/80 bg-white shadow-sm hover:bg-gray-100 active:scale-95 transition cursor-pointer text-xs font-black text-gray-900"
            title="Switch Language / Hindura Ururimi"
          >
            <Globe size={15} className="text-purple-600 shrink-0" />
            <span>{lang === "en" ? "EN" : "RW"}</span>
          </button>

          <button
            onClick={() => setNotifOpen(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-200/80 bg-white shadow-sm hover:bg-gray-100 active:scale-95 transition cursor-pointer"
            aria-label="Alerts & Notifications"
          >
            <Bell size={17} className="text-gray-800" />
            {(s.alerts?.length || 0) > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow">
                {s.alerts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-start">
        {/* Left Column (Compact Health Card, Key Metrics & Quick Actions) */}
        <div className="md:col-span-7 lg:col-span-7 space-y-4">
          
          {/* COMPACT Business Health Banner Card */}
          <button
            onClick={() => navigate("/health-score")}
            className="w-full flex items-center justify-between gap-3 rounded-2xl border border-gray-200/80 bg-white p-3.5 sm:p-4 text-left shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:border-gray-400 transition duration-150 cursor-pointer active:scale-[0.99] group"
          >
            <div className="flex items-center gap-3.5">
              <HealthGauge score={score} size={64} label={score != null ? t(bandKey(band, score)) : undefined} />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-manrope text-[11px] font-extrabold text-gray-900 group-hover:text-purple-600 transition">
                    {t("health_score")}
                  </span>
                  {score != null && (
                    <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase ${
                      score >= 80 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}>
                      {score >= 80 ? "Excellent" : "Good"}
                    </span>
                  )}
                </div>
                {score != null ? (
                  <div className="mt-0.5 flex items-center gap-1">
                    {salesChange >= 0 ? (
                      <TrendingUp size={12} className="text-emerald-600" />
                    ) : (
                      <TrendingDown size={12} className="text-red-500" />
                    )}
                    <span className="text-[11px] font-bold text-emerald-600">
                      +{salesChange}% {t("vs_last_month")}
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] font-medium text-gray-400">Record your first sale to start tracking business health</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-[11px] font-bold text-gray-800 group-hover:bg-gray-900 group-hover:text-white transition">
              {t("see_drivers")} <ChevronRight size={13} />
            </div>
          </button>

          {/* Quick Stat Cards */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <StatCard
              label={t("todays_sales")}
              value={rwfCompact(todayRevenue)}
              sub={hasData && salesChange != null ? `+${salesChange}%` : undefined}
              tone={hasData ? "up" : undefined}
              onClick={() => navigate("/sell")}
            />
            <StatCard
              label={t("todays_expenses")}
              value={rwfCompact(todayExpenses)}
              onClick={() => navigate("/expenses")}
            />
            <StatCard
              label={t("cash_in_till")}
              value={rwfCompact(cash)}
              onClick={() => navigate("/sell")}
            />
          </div>

          {/* Quick Actions Panel */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <h2 className="font-manrope text-[10.5px] font-extrabold text-gray-400 uppercase tracking-wider mb-2.5">
              {t("quick_actions")}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {quickActions.map(({ label, icon: Icon, to, color }) => (
                <button
                  key={label}
                  onClick={() => navigate(to)}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200/70 bg-gray-50/60 hover:bg-gray-100 hover:border-gray-400 active:scale-95 transition duration-150 text-left group cursor-pointer"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color} shadow-sm group-hover:scale-105 transition shrink-0`}>
                    <Icon size={17} />
                  </div>
                  <span className="text-xs font-bold leading-snug text-gray-900 truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (Alerts & Activity Feed) */}
        <div className="md:col-span-5 lg:col-span-5 space-y-4">
          {/* Low Stock Alert */}
          {lowAlert && (
            <button
              onClick={() => navigate("/stock")}
              className="w-full flex items-center gap-3 rounded-2xl bg-red-50 border border-red-200 p-3.5 text-left shadow-sm hover:border-red-400 transition cursor-pointer active:scale-95"
            >
              <AlertTriangle size={18} className="text-red-500 shrink-0" />
              <span className="flex-1 text-xs font-bold text-red-900">{lowAlert.message}</span>
              <ChevronRight size={15} className="text-red-500 shrink-0" />
            </button>
          )}

          {/* Recent Activity Panel */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-manrope text-[10.5px] font-extrabold text-gray-400 uppercase tracking-wider">
                {t("recent_activity")}
              </h2>
              <button
                onClick={() => navigate("/sell")}
                className="text-[11px] font-extrabold text-purple-600 hover:underline"
              >
                {t("record_sale")}
              </button>
            </div>
            <div className="space-y-2">
              {!recent || recent.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 p-5 text-center text-xs text-gray-400 font-semibold">
                  No sales recorded yet. Click 'Record Sale' to start!
                </div>
              ) : (
                recent.map((sale) => (
                  <button
                    key={sale.id}
                    onClick={() => navigate("/sell")}
                    className="w-full flex items-center justify-between rounded-xl border border-gray-200/60 bg-gray-50/60 p-2.5 text-left hover:bg-gray-100 transition cursor-pointer active:scale-[0.99] group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white shrink-0 group-hover:scale-105 transition shadow-sm">
                        <Activity size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-gray-900 group-hover:text-purple-600 transition">
                          {sale.customer_name || t("record_sale")}
                          {sale.items_count ? ` · ${sale.items_count} ${t("items")}` : ""}
                        </div>
                        <div className="text-[10px] font-semibold text-gray-400">{clockTime(sale.created_at)}</div>
                      </div>
                    </div>
                    <span className="text-xs font-black tabnum text-emerald-600">
                      +{rwf(sale.total_amount)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <NotificationDrawer
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        stats={stats}
      />
    </div>
  );
}
