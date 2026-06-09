import { NavLink } from "react-router-dom";
import { Store, Search, X } from "lucide-react";
import * as Icons from "lucide-react";
import { NAV_ITEMS } from "../../utils/constants";
import { useAuth } from "../../context/AuthContext";

function NavItem({ item, onClick }) {
  const Icon = Icons[item.icon] || Icons.Circle;
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
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
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
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-btn flex items-center justify-center shrink-0">
              <Store size={16} className="text-white" />
            </div>
            <span className="text-[15px] font-bold text-text-primary tracking-tight">KNOTTY SYSTEM</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-text-secondary hover:text-text-primary p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              type="text"
              placeholder="Search...  ⌘S"
              className="w-full h-8 bg-background border border-border rounded-btn pl-8 pr-3 text-[13px] text-text-secondary placeholder:text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {NAV_ITEMS.map((section) => {
            const visibleItems = section.items.filter(item =>
              !item.roles || !user || item.roles.includes(user.role)
            );
            if (!visibleItems.length) return null;
            return (
              <div key={section.section}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary px-3 mb-1">
                  {section.section}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavItem key={item.path} item={item} onClick={() => onClose?.()} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
