import { NavLink } from "react-router-dom";
import {
  Home,
  ShoppingCart,
  Package,
  Wallet,
  Users,
  Activity,
  FileText,
  TrendingUp,
  BookOpen,
  BarChart3,
  Settings,
  Globe,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../lib/i18n.jsx";
import Logomark from "./Logomark";
import OfflineBadge from "./OfflineBadge";

const NAV_ITEMS = [
  { to: "/", key: "nav_home", icon: Home, end: true },
  { to: "/sell", key: "nav_sell", icon: ShoppingCart },
  { to: "/stock", key: "nav_stock", icon: Package },
  { to: "/expenses", key: "nav_expenses", icon: Wallet },
  { to: "/invoices", key: "nav_invoices", icon: FileText },
  { to: "/pnl", key: "nav_pnl", icon: TrendingUp },
  { to: "/books", key: "nav_books", icon: BookOpen },
  { to: "/reports", key: "nav_reports", icon: BarChart3 },
  { to: "/suppliers", key: "nav_suppliers", icon: Users },
  { to: "/health-score", key: "health_score", icon: Activity },
  { to: "/settings", key: "nav_settings", icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { t, lang, toggle } = useLang();

  return (
    <aside className="hidden md:flex w-64 flex-col justify-between border-r border-gray-200/80 bg-white p-5 shrink-0 select-none shadow-[0_10px_30px_rgba(0,0,0,0.03)] h-screen overflow-y-auto font-manrope">
      <div className="flex flex-col gap-5">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Logomark size={36} />
            <div>
              <h1 className="font-manrope text-lg font-black text-gray-900 leading-tight">
                DataBridge
              </h1>
              <p className="text-[10px] font-extrabold text-purple-600 tracking-wider">
                INZIRA INSIGHTS
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5">
          <span className="px-3 text-[10px] font-extrabold tracking-wider text-gray-400 uppercase">
            Menu Navigation
          </span>
          {NAV_ITEMS.map(({ to, key, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group flex items-center justify-between rounded-full px-4 py-2.5 text-xs font-bold transition-all duration-200 ${
                  isActive
                    ? "bg-[#D4F06B] text-gray-900 shadow-md shadow-[#D4F06B]/20"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon
                      size={17}
                      className={isActive ? "text-gray-900" : "text-gray-400 group-hover:text-gray-700"}
                      strokeWidth={isActive ? 2.4 : 1.8}
                    />
                    <span>{t(key)}</span>
                  </div>
                  {isActive && <ChevronRight size={14} className="text-gray-900/80" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Footer Section */}
      <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 mt-4">
        {/* Language & Network Status */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={toggle}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] font-extrabold text-gray-800 hover:bg-gray-100 transition"
          >
            <Globe size={13} className="text-purple-600" />
            <span>{lang.toUpperCase()}</span>
          </button>
          <OfflineBadge />
        </div>

        {/* User Card & Logout */}
        <div className="flex items-center justify-between rounded-2xl bg-gray-50 border border-gray-200/60 p-2.5">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D4F06B] font-manrope text-xs font-black text-gray-900">
              {(user?.name || "Shop")[0].toUpperCase()}
            </div>
            <div className="truncate">
              <div className="truncate text-xs font-bold text-gray-900">{user?.name || "My Shop"}</div>
              <div className="truncate text-[10.5px] text-gray-500">{user?.email || "Shopkeeper"}</div>
            </div>
          </div>
          <button
            onClick={logout}
            title={t("logout")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 transition"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
