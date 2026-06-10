import { useState, useRef, useEffect } from "react";
import { Menu, Bell, ChevronRight, Home, LogOut, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Badge from "../ui/Badge";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

const ROLE_STATUS = {
  admin:   "success",
  owner:   "success",
  manager: "warning",
  accountant: "neutral",
  worker:  "neutral",
  viewer:  "neutral",
};

export default function Header({ onMenuClick, title, subtitle, breadcrumbs = [], notificationCount = 0 }) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  const crumbs = [{ label: t("dashboard"), path: "/app/dashboard" }, ...breadcrumbs];

  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleLogout() {
    logout();
    navigate("/app/login");
  }

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center px-6 gap-4 shrink-0">
      {/* Hamburger (mobile) */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-text-secondary hover:text-text-primary p-1"
      >
        <Menu size={20} />
      </button>

      {/* Title + breadcrumbs */}
      <div className="flex-1 min-w-0">
        <nav className="flex items-center gap-1 text-[12px] text-text-secondary mb-0.5">
          {crumbs.map((crumb, i) => (
            <span key={crumb.path} className="flex items-center gap-1">
              {i === 0 && <Home size={11} />}
              {i < crumbs.length - 1 ? (
                <>
                  <Link to={crumb.path} className="hover:text-primary transition-colors">
                    {crumb.label}
                  </Link>
                  <ChevronRight size={11} />
                </>
              ) : (
                <span className="text-text-primary font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>

        <div className="flex items-baseline gap-3">
          <h1 className="text-[22px] font-bold text-text-primary leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[13px] text-text-secondary hidden sm:block truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: bell + user */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notification bell */}
        <Link to="/app/notifications" className="relative text-text-secondary hover:text-text-primary p-1.5 rounded transition-colors">
          <Bell size={18} />
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-danger rounded-full flex items-center justify-center text-[9px] font-bold text-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </Link>

        {/* User dropdown */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(v => !v)}
              className="flex items-center gap-2.5 hover:bg-background rounded-card px-2 py-1.5 transition-colors"
            >
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-[13px] font-bold shrink-0">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[13px] font-medium text-text-primary leading-tight">
                  {user.name}
                </p>
                <Badge status={ROLE_STATUS[user.role] || "neutral"} label={user.role} />
              </div>
              <ChevronDown size={14} className="text-text-secondary hidden sm:block" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border rounded-card shadow-lg py-1 z-50">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-[12px] font-semibold text-text-primary truncate">{user.name}</p>
                  <p className="text-[11px] text-text-secondary truncate">{user.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-danger hover:bg-danger/5 transition-colors"
                >
                  <LogOut size={14} />
                  {t("sign_in")} (Out)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
