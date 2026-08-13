import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  X,
  TrendingUp,
  AlertTriangle,
  Package,
  ArrowUpRight,
  Sparkles,
  BarChart2,
  ChevronRight,
  CheckCircle,
} from "lucide-react";
import { rwf, rwfCompact } from "../lib/format";
import HealthGauge from "./HealthGauge";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";

export default function NotificationDrawer({ open, onClose, stats }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const dataCtx = useData() || {};

  const userStock = Array.isArray(dataCtx.stock) ? dataCtx.stock : [];
  const userSales = Array.isArray(dataCtx.sales) ? dataCtx.sales : [];
  const userExpenses = Array.isArray(dataCtx.expenses) ? dataCtx.expenses : [];

  const [activeTab, setActiveTab] = useState("all");
  const [readIds, setReadIds] = useState(new Set());

  // User-specific metrics calculation
  const todayRevenue = userSales.reduce((sum, sa) => sum + (Number(sa.total_amount) || 0), 0);
  const todayExpensesSum = userExpenses.reduce((sum, ex) => sum + (Number(ex.amount_rwf) || 0), 0);
  const lowStockItems = userStock.filter(
    (i) => (Number(i.quantity) || 0) <= (Number(i.low_stock_threshold) || 5)
  );

  const hasData = userSales.length > 0;
  const healthScore = hasData ? (stats?.healthScore?.score ?? 82) : null;

  // Build dynamic notifications generated strictly from current user's actual data
  const notifications = useMemo(() => {
    const list = [];

    // 1. Dynamic Low Stock Alerts for Logged-In User
    lowStockItems.slice(0, 5).forEach((item, idx) => {
      const isOut = (Number(item.quantity) || 0) === 0;
      list.push({
        id: `user-low-stock-${item.id || idx}`,
        type: "alert",
        icon: AlertTriangle,
        iconBg: isOut
          ? "bg-red-100 text-red-700 border-red-200"
          : "bg-amber-100 text-amber-700 border-amber-200",
        title: isOut
          ? `Out of Stock: ${item.name}`
          : `Low Stock Alert: ${item.name}`,
        desc: isOut
          ? `0 ${item.unit || "pcs"} left in store. Add stock to continue selling.`
          : `Only ${item.quantity} ${item.unit || "pcs"} left in store (below threshold of ${item.low_stock_threshold || 5}).`,
        time: "Active alert",
        actionLabel: "Restock Now",
        actionTo: "/stock",
      });
    });

    // 2. Dynamic Sales Performance Notification for Logged-In User
    if (userSales.length > 0) {
      list.push({
        id: "user-sales-today",
        type: "analytics",
        icon: TrendingUp,
        iconBg: "bg-emerald-100 text-emerald-700 border-emerald-200",
        title: `Today's Revenue: ${rwf(todayRevenue)} RWF`,
        desc: `Recorded ${userSales.length} sales today. Net cash balance: ${rwf(todayRevenue - todayExpensesSum)} RWF.`,
        time: "Today",
        actionLabel: "View Sales",
        actionTo: "/sell",
      });
    } else {
      list.push({
        id: "user-welcome-start",
        type: "analytics",
        icon: Sparkles,
        iconBg: "bg-purple-100 text-purple-700 border-purple-200",
        title: `Welcome, ${user?.name || "Merchant"}!`,
        desc: `Your account for "${user?.shop_name || "My Shop"}" is settled. Record your first sale to see live revenue insights.`,
        time: "Just now",
        actionLabel: "Record Sale",
        actionTo: "/sell",
      });
    }

    // 3. Dynamic Health Score Status for Logged-In User
    if (hasData && healthScore !== null) {
      list.push({
        id: "user-health-score",
        type: "analytics",
        icon: Sparkles,
        iconBg: "bg-blue-100 text-blue-700 border-blue-200",
        title: `Business Health Score: ${healthScore}/100`,
        desc: "Your transaction credit health status is active. Check factors to boost SACCO credit.",
        time: "Today",
        actionLabel: "View Health Score",
        actionTo: "/health-score",
      });
    }

    return list;
  }, [lowStockItems, userSales, todayRevenue, todayExpensesSum, user, hasData, healthScore]);

  const markAllRead = () => {
    setReadIds(new Set(notifications.map((n) => n.id)));
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "alerts") return n.type === "alert";
    if (activeTab === "analytics") return n.type === "analytics";
    return true;
  });

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 font-manrope">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sheet Content Container */}
      <div className="relative w-full max-w-lg rounded-t-[28px] sm:rounded-[32px] bg-white border border-gray-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Top Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-sm">
              <Bell size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-gray-900">
                  Notification Center
                </h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-black text-white">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-semibold">{user?.shop_name || "My Shop"} Alerts & Insights</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {/* Quick Business Health Metric Bar */}
          <div
            onClick={() => {
              onClose();
              navigate("/health-score");
            }}
            className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 bg-white hover:border-gray-400 transition cursor-pointer group shadow-sm"
          >
            <div className="flex items-center gap-3">
              <HealthGauge score={healthScore} size={48} showLabel={false} />
              <div>
                <span className="text-xs font-black text-gray-900 group-hover:text-purple-600 transition flex items-center gap-1">
                  Business Health Gauge <ChevronRight size={14} />
                </span>
                <span className="text-[11px] text-gray-500 font-semibold block">
                  {hasData ? `Score: ${healthScore}/100` : "Tap to calculate health score"}
                </span>
              </div>
            </div>
            <span className="text-xs font-extrabold text-purple-600 underline group-hover:no-underline">
              Analyze
            </span>
          </div>

          {/* Tabs Filter & Mark All Read */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-full border border-gray-200 text-xs font-bold">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-full transition ${
                  activeTab === "all"
                    ? "bg-white text-gray-900 shadow-sm font-black"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setActiveTab("alerts")}
                className={`px-3 py-1.5 rounded-full transition ${
                  activeTab === "alerts"
                    ? "bg-white text-gray-900 shadow-sm font-black"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Alerts ({lowStockItems.length})
              </button>
              <button
                onClick={() => setActiveTab("analytics")}
                className={`px-3 py-1.5 rounded-full transition ${
                  activeTab === "analytics"
                    ? "bg-white text-gray-900 shadow-sm font-black"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Analytics
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-extrabold text-purple-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-gray-200 text-xs font-semibold text-gray-400 space-y-2">
                <CheckCircle size={28} className="mx-auto text-emerald-500 mb-1" />
                <p className="font-bold text-gray-900">All clear!</p>
                <p>No active notifications or low stock alerts for this account.</p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const Icon = item.icon;
                const isRead = readIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    className={`relative p-4 rounded-2xl border transition duration-200 ${
                      isRead
                        ? "bg-gray-50/60 border-gray-100 opacity-80"
                        : "bg-white border-gray-200 shadow-sm hover:border-gray-400"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${item.iconBg}`}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black text-gray-900">{item.title}</h4>
                          <span className="text-[10px] font-semibold text-gray-400">
                            {item.time}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium leading-relaxed">{item.desc}</p>

                        {/* Action Link Button */}
                        {item.actionLabel && (
                          <div className="pt-2">
                            <button
                              onClick={() => {
                                setReadIds((prev) => new Set(prev).add(item.id));
                                onClose();
                                navigate(item.actionTo);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-black text-purple-600 hover:underline cursor-pointer"
                            >
                              {item.actionLabel} <ArrowUpRight size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-white p-4 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-900 transition cursor-pointer"
          >
            Close Notification Center
          </button>
        </div>
      </div>
    </div>
  );
}
