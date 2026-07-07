import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Globe, UserCheck,
  FileText, CreditCard, TrendingUp, BarChart2, ClipboardList, Shield,
  Bell, Settings, Activity, Scale, Receipt, X,
} from "lucide-react";
import { NAV_ITEMS } from "../../utils/constants";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

const ICONS = {
  LayoutDashboard, Package, ShoppingCart, Truck, Globe, UserCheck,
  FileText, CreditCard, TrendingUp, BarChart2, ClipboardList, Shield,
  Bell, Settings, Activity, Scale, Receipt,
};

function NavItem({ item, onClose }) {
  const Icon = ICONS[item.icon] || Package;
  return (
    <NavLink
      to={item.path}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-[6px] text-[13.5px] transition-colors
        ${isActive
          ? "bg-primary/10 text-primary font-semibold border-l-[3px] border-primary pl-[9px]"
          : "text-text-secondary hover:text-text-primary hover:bg-background border-l-[3px] border-transparent pl-[9px]"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={16} className={isActive ? "text-primary" : "text-neutral"} />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const { lang, switchLanguage } = useLanguage();

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-40 flex flex-col bg-surface border-r border-border
        w-[240px] transition-transform duration-200
        ${open ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:z-auto
      `}>

        {/* Brand */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <p className="text-[15px] font-bold text-primary tracking-tight">Inzira Insights</p>
            <p className="text-[11px] text-text-secondary">Rwanda SME Platform</p>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-background">
            <X size={16} className="text-text-secondary" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {NAV_ITEMS.map((section) => {
            const visible = section.items.filter(
              item => !item.roles || !user || item.roles.includes(user.role)
            );
            if (!visible.length) return null;
            return (
              <div key={section.section}>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-text-secondary px-3 mb-1">
                  {section.section}
                </p>
                <div className="space-y-0.5">
                  {visible.map(item => (
                    <NavItem key={item.path} item={item} onClose={onClose} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User + Language */}
        <div className="p-3 border-t border-border space-y-2">
          {user && (
            <div className="px-3 py-2 bg-background rounded-[6px]">
              <p className="text-[12px] font-semibold text-text-primary truncate">{user.name}</p>
              <p className="text-[11px] text-text-secondary capitalize">{user.role?.replace("_", " ")}</p>
            </div>
          )}
          <button
            onClick={() => switchLanguage(lang === "en" ? "rw" : "en")}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-background border border-border rounded-[6px] text-[12px] font-medium text-text-primary hover:bg-surface transition-colors"
          >
            🌐 {lang === "en" ? "Kinyarwanda" : "English"}
          </button>
        </div>
      </aside>
    </>
  );
}
