import { NavLink } from "react-router-dom";
import { Store, Search, X, Globe, ChevronDown, Factory, Home, Key, Box, Truck, Users, LayoutDashboard, Package, ShoppingCart, UserCheck, FileText, Receipt, TrendingUp, BarChart2, ClipboardList, Award, Shield, Bell, Settings } from "lucide-react";
import { NAV_ITEMS, BUSINESSES } from "../../utils/constants";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useBusiness } from "../../context/BusinessContext";
import { useState } from "react";

const ICONS = {
  LayoutDashboard, Package, ShoppingCart, Truck, Users, UserCheck, Globe,
  FileText, Receipt, TrendingUp, BarChart2, ClipboardList, Award, Shield,
  Bell, Settings, Factory, Home, Key, Box
};

function NavItem({ item, onClick, t }) {
  const Icon = ICONS[item.icon] || ICONS.Box;
  const translationKey = item.label.toLowerCase().replace(/ & /g, "_").replace(/ /g, "_");
  
  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-[4px] text-[14px] transition-colors relative group
        ${
          isActive
            ? "bg-background text-text-primary font-medium border-l-[3px] border-primary pl-[9px]"
            : "text-text-secondary hover:text-text-primary hover:bg-background border-l-[3px] border-transparent pl-[9px]"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} className={isActive ? "text-primary" : "text-neutral"} />
          <span>{t(translationKey)}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const { t, lang, switchLanguage } = useLanguage();
  const { activeBusiness, switchBusiness } = useBusiness();
  const [showBizSwitcher, setShowBizSwitcher] = useState(false);

  const items = NAV_ITEMS(activeBusiness);

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full z-40 flex flex-col bg-surface border-r border-border
          w-[260px] transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Business Switcher */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <button 
              onClick={() => setShowBizSwitcher(!showBizSwitcher)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-primary/5 border border-primary/10 rounded-card hover:bg-primary/10 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded flex items-center justify-center text-white shrink-0" style={{ backgroundColor: activeBusiness.color }}>
                  {activeBusiness.type === "industry" ? <Factory size={14} /> : activeBusiness.type === "real_estate" ? <Home size={14} /> : <Store size={14} />}
                </div>
                <span className="text-[13px] font-bold text-text-primary truncate">{activeBusiness.name}</span>
              </div>
              <ChevronDown size={14} className={`text-text-secondary transition-transform ${showBizSwitcher ? 'rotate-180' : ''}`} />
            </button>

            {showBizSwitcher && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-card shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1">
                <p className="px-3 py-1.5 text-[10px] font-bold text-text-secondary uppercase tracking-wider">{t("switch_business")}</p>
                {BUSINESSES.map(b => (
                  <button
                    key={b.id}
                    onClick={() => { switchBusiness(b.id); setShowBizSwitcher(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-[13px] hover:bg-background transition-colors ${activeBusiness.id === b.id ? 'bg-primary/5 text-primary font-medium' : 'text-text-secondary'}`}
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center text-white shrink-0" style={{ backgroundColor: b.color }}>
                      {b.type === "industry" ? <Factory size={11} /> : b.type === "real_estate" ? <Home size={11} /> : <Store size={11} />}
                    </div>
                    {b.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {items.map((section) => {
            const visibleItems = section.items.filter(item =>
              !item.roles || !user || item.roles.includes(user.role)
            );
            if (!visibleItems.length) return null;
            
            const sectionKey = section.section.toLowerCase().replace(/ /g, "_");
            
            return (
              <div key={section.section}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary px-3 mb-1">
                  {t(sectionKey)}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavItem key={item.path} item={item} onClick={() => onClose?.()} t={t} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Language Toggle at Bottom */}
        <div className="p-4 border-t border-border flex gap-2">
          <button 
            onClick={() => switchLanguage(lang === "en" ? "rw" : "en")}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-background border border-border rounded-card text-[12px] font-medium text-text-primary hover:bg-surface transition-colors"
          >
            <Globe size={13} />
            {lang === "en" ? "Kinyarwanda" : "English"}
          </button>
        </div>
      </aside>
    </>
  );
}
