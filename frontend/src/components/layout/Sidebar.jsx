import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Globe, UserCheck,
  FileText, CreditCard, TrendingUp, BarChart2, ClipboardList, Shield,
  Bell, Settings, Activity, Scale, Receipt, X,
} from "lucide-react";
import { NAV_ITEMS } from "../../utils/constants";
import { useAuth } from "../../context/AuthContext";
import { useLanguage, LANGUAGES } from "../../context/LanguageContext";

const ICONS = {
  LayoutDashboard, Package, ShoppingCart, Truck, Globe, UserCheck,
  FileText, CreditCard, TrendingUp, BarChart2, ClipboardList, Shield,
  Bell, Settings, Activity, Scale, Receipt,
};

function NavItem({ item, t, onClose }) {
  const Icon = ICONS[item.icon] || Package;
  return (
    <NavLink
      to={item.path}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-[6px] text-[14px] font-medium transition-colors
        ${isActive
          ? "bg-white/15 text-white border-l-[3px] border-white pl-[9px]"
          : "text-white/70 hover:text-white hover:bg-white/10 border-l-[3px] border-transparent pl-[9px]"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={15} className={isActive ? "text-white" : "text-white/60"} />
          <span>{t(item.tKey) || item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const { lang, t, switchLanguage } = useLanguage();

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside 
        style={{ backgroundColor: "#006C49" }}
        className={`
          fixed top-0 left-0 h-full z-40 flex flex-col border-r border-white/10
          w-[240px] transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >

        {/* Brand */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/inzira-logo.jpg" alt="Inzira Insight" className="h-10 w-10 rounded-full object-cover shrink-0" />
            <div>
              <p className="text-[15px] font-bold text-white tracking-tight leading-tight">INZIRA</p>
              <p className="text-[12px] text-white/60 leading-tight">Insight</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-white/10">
            <X size={16} className="text-white/70" />
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
                <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-white/40 px-3 mb-1">
                  {t(section.tKey) || section.section}
                </p>
                <div className="space-y-0.5">
                  {visible.map(item => (
                    <NavItem key={item.path} item={item} t={t} onClose={onClose} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User + Language */}
        <div className="p-3 border-t border-white/10 space-y-2">
          {user && (
            <div className="px-3 py-2 bg-white/10 rounded-[6px]">
              <p className="text-[13px] font-semibold text-white truncate">{user.name}</p>
              <p className="text-[13px] text-white/60 capitalize">{user.role?.replace(/_/g, " ")}</p>
            </div>
          )}
          <div className="flex gap-1">
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => switchLanguage(l.code)}
                className={`flex-1 py-1.5 rounded-[6px] text-[12px] font-medium transition-colors ${lang === l.code ? "bg-white text-primary" : "bg-white/10 text-white/70 hover:text-white"}`}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}
