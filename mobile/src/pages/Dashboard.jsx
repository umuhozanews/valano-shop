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
} from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../lib/i18n.jsx";
import { rwfCompact, rwf, clockTime } from "../lib/format";
import { bandKey } from "../lib/score";
import OfflineBadge from "../components/OfflineBadge";
import HealthGauge from "../components/HealthGauge";
import StatCard from "../components/StatCard";
import Loading from "../components/Loading";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = useLang();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [shopName, setShopName] = useState("");
  const [recent, setRecent] = useState([]);

  const load = useCallback(async () => {
    try {
      const [statsRes, settingsRes, salesRes] = await Promise.allSettled([
        api.get("/dashboard/stats"),
        api.get("/settings"),
        api.get("/sales", { params: { limit: 5 } }),
      ]);
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      if (settingsRes.status === "fulfilled")
        setShopName(settingsRes.value.data?.settings?.shop_name || "");
      if (salesRes.status === "fulfilled") setRecent(salesRes.value.data?.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading label={t("loading")} />;

  const s = stats || {};
  const todayRevenue = s.todayRevenue ?? 0;
  const todayExpenses = Math.max(0, (s.todayRevenue ?? 0) - (s.netCashToday ?? 0));
  const cash = s.netCashToday ?? 0;
  const score = s.healthScore?.score ?? null;
  const band = s.healthScore?.band ?? null;
  const lowAlert = (s.alerts || []).find((a) => a.type === "low_stock");
  const salesChange = s.salesChangePct;

  const quickActions = [
    { label: t("record_sale"), icon: ShoppingCart, to: "/sell" },
    { label: t("add_expense"), icon: Wallet, to: "/expenses?new=1" },
    { label: t("add_stock"), icon: Package, to: "/stock?new=1" },
    { label: t("health_score"), icon: TrendingUp, to: "/health-score" },
  ];

  return (
    <div className="pb-6">
      {/* Greeting */}
      <div
        className="flex items-center justify-between px-5 pb-1"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}
      >
        <div>
          <span className="font-body text-[11.5px] text-muted">{t("hello")}</span>
          <div className="font-heading text-[18px] font-extrabold text-ink">
            {shopName || user?.name || "My Shop"}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <OfflineBadge />
          <button
            onClick={() => navigate("/health-score")}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card"
            aria-label="Alerts"
          >
            <Bell size={16} className="text-ink" />
            {(s.alerts?.length || 0) > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[8px] font-bold text-white">
                {s.alerts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Health card */}
      <button
        onClick={() => navigate("/health-score")}
        className="mx-5 mt-4 flex w-[calc(100%-40px)] items-center gap-4 rounded-2xl border border-line bg-card p-4 text-left shadow-card"
      >
        <HealthGauge score={score} size={92} label={score != null ? t(bandKey(band, score)) : undefined} />
        <div className="flex-1">
          <span className="font-body text-[11px] font-semibold text-muted">{t("health_score")}</span>
          {score != null ? (
            <>
              <div className="mt-1.5 flex items-center gap-1">
                {salesChange >= 0 ? (
                  <TrendingUp size={12} className="text-success" />
                ) : (
                  <TrendingDown size={12} className="text-danger" />
                )}
                <span
                  className={`text-[11px] font-semibold ${
                    salesChange >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {salesChange == null
                    ? "—"
                    : `${salesChange >= 0 ? "+" : ""}${salesChange}% ${t("vs_last_month")}`}
                </span>
              </div>
            </>
          ) : (
            <p className="mt-1 text-[11px] text-muted">{t("no_score")}</p>
          )}
          <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-primary">
            {t("see_drivers")} <ChevronRight size={13} />
          </div>
        </div>
      </button>

      {/* Stat cards */}
      <div className="mt-3 flex gap-2.5 px-5">
        <StatCard
          label={t("todays_sales")}
          value={rwfCompact(todayRevenue)}
          sub={salesChange != null ? `${salesChange >= 0 ? "+" : ""}${salesChange}%` : undefined}
          tone={salesChange >= 0 ? "up" : "down"}
        />
        <StatCard label={t("todays_expenses")} value={rwfCompact(todayExpenses)} />
        <StatCard label={t("cash_in_till")} value={rwfCompact(cash)} tone={cash >= 0 ? undefined : "down"} />
      </div>

      {/* Low stock alert */}
      {lowAlert && (
        <button
          onClick={() => navigate("/stock")}
          className="mx-5 mt-3 flex w-[calc(100%-40px)] items-center gap-2.5 rounded-xl bg-danger-lt px-3.5 py-3 text-left"
        >
          <AlertTriangle size={17} className="text-danger" />
          <span className="flex-1 text-[12px] font-semibold text-[#7A2E22]">{lowAlert.message}</span>
          <ChevronRight size={15} className="text-danger" />
        </button>
      )}

      {/* Quick actions */}
      <div className="mt-4 px-5">
        <span className="font-body text-[11.5px] font-bold text-ink">{t("quick_actions")}</span>
        <div className="mt-2 grid grid-cols-4 gap-2.5">
          {quickActions.map(({ label, icon: Icon, to }) => (
            <button key={label} onClick={() => navigate(to)} className="flex flex-col items-center gap-1.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-xlt">
                <Icon size={19} className="text-primary" />
              </div>
              <span className="text-center text-[9px] font-semibold leading-tight text-ink">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="mt-4 px-5">
        <span className="font-body text-[11.5px] font-bold text-ink">{t("recent_activity")}</span>
        <div className="mt-2 flex flex-col gap-2">
          {recent.length === 0 && (
            <div className="rounded-xl border border-line bg-card px-3 py-4 text-center text-[12px] text-muted">
              {t("no_activity")}
            </div>
          )}
          {recent.map((sale) => (
            <button
              key={sale.id}
              onClick={() => navigate("/sell")}
              className="flex items-center justify-between rounded-xl border border-line bg-card px-3 py-2.5 text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-lt">
                  <Activity size={14} className="text-success" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-ink">
                    {sale.customer_name || t("record_sale")}
                    {sale.items_count ? ` · ${sale.items_count} ${t("items")}` : ""}
                  </div>
                  <div className="text-[10px] text-muted">{clockTime(sale.created_at)}</div>
                </div>
              </div>
              <span className="text-[12.5px] font-bold tabnum text-success">
                +{rwf(sale.total_amount)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
