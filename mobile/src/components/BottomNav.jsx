import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Home,
  ShoppingCart,
  Package,
  Wallet,
  Grid,
  FileText,
  TrendingUp,
  BookOpen,
  BarChart3,
  Users,
  Activity,
  Settings
} from "lucide-react";
import { useLang } from "../lib/i18n.jsx";
import Sheet from "./Sheet";

const PRIMARY_ITEMS = [
  { to: "/", key: "nav_home", icon: Home, end: true },
  { to: "/sell", key: "nav_sell", icon: ShoppingCart },
  { to: "/stock", key: "nav_stock", icon: Package },
  { to: "/expenses", key: "nav_expenses", icon: Wallet },
];

const MORE_ITEMS = [
  { to: "/invoices", label: "Invoices", icon: FileText, desc: "Customer factures & billing" },
  { to: "/pnl", label: "Profit & Loss", icon: TrendingUp, desc: "Executive financial P&L" },
  { to: "/books", label: "Financial Books", icon: BookOpen, desc: "Journal, Ledger & Trial balance" },
  { to: "/reports", label: "Reports & Tax", icon: BarChart3, desc: "Sales, stock & EBM tax reports" },
  { to: "/suppliers", label: "Suppliers", icon: Users, desc: "Supplier contacts & orders" },
  { to: "/health-score", label: "Business Health", icon: Activity, desc: "SACCO credit score readiness" },
  { to: "/settings", label: "Settings", icon: Settings, desc: "Profile & exchange rates" },
];

export default function BottomNav() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        className="sticky bottom-0 z-30 flex items-center justify-around border-t border-gray-200/80 bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.04)] font-manrope select-none w-full"
        style={{ height: 64, paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {PRIMARY_ITEMS.map(({ to, key, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className="flex flex-1 flex-col items-center justify-center py-1 transition"
          >
            {({ isActive }) => (
              <div className="flex flex-col items-center gap-0.5">
                <div
                  className={`flex h-8 w-12 items-center justify-center rounded-full transition-all duration-200 ${
                    isActive ? "bg-[#D4F06B] text-gray-900 shadow-sm scale-105" : "text-gray-400 hover:text-gray-700"
                  }`}
                >
                  <Icon size={19} strokeWidth={isActive ? 2.4 : 1.8} />
                </div>
                <span
                  className={`text-[10px] font-extrabold tracking-tight ${
                    isActive ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {t(key)}
                </span>
              </div>
            )}
          </NavLink>
        ))}

        {/* More Apps Quick Button */}
        <button
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center justify-center py-1 text-gray-400 hover:text-gray-700 transition cursor-pointer"
        >
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex h-8 w-12 items-center justify-center rounded-full text-gray-400">
              <Grid size={19} strokeWidth={1.8} />
            </div>
            <span className="text-[10px] font-bold text-gray-400">More</span>
          </div>
        </button>
      </nav>

      {/* More Modules Sheet */}
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Platform Modules & Financials">
        <div className="grid grid-cols-1 gap-2.5 pt-2 pb-6 font-manrope">
          {MORE_ITEMS.map(({ to, label, icon: Icon, desc }) => (
            <button
              key={to}
              onClick={() => {
                setMoreOpen(false);
                navigate(to);
              }}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-gray-200/80 bg-white hover:bg-[#F4FBE4] hover:border-[#D4F06B] hover:shadow-sm active:scale-95 transition cursor-pointer text-left group"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D4F06B] text-gray-900 group-hover:scale-105 transition shadow-sm">
                <Icon size={18} />
              </div>
              <div className="flex-1 truncate">
                <h4 className="text-xs font-bold text-gray-900 group-hover:text-purple-600 transition">{label}</h4>
                <p className="text-[11px] text-gray-500 truncate">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
