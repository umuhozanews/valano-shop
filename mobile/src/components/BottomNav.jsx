import { NavLink } from "react-router-dom";
import { Home, ShoppingCart, Package, Wallet, Users } from "lucide-react";
import { useLang } from "../lib/i18n.jsx";

const ITEMS = [
  { to: "/", key: "nav_home", icon: Home, end: true },
  { to: "/sell", key: "nav_sell", icon: ShoppingCart },
  { to: "/stock", key: "nav_stock", icon: Package },
  { to: "/expenses", key: "nav_expenses", icon: Wallet },
  { to: "/suppliers", key: "nav_suppliers", icon: Users },
];

export default function BottomNav() {
  const { t } = useLang();
  return (
    <nav
      className="sticky bottom-0 z-20 flex items-stretch border-t border-line bg-card shadow-nav"
      style={{ height: 66, paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {ITEMS.map(({ to, key, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className="flex flex-1 flex-col items-center justify-center gap-0.5"
        >
          {({ isActive }) => (
            <>
              <Icon
                size={21}
                strokeWidth={isActive ? 2.4 : 1.8}
                className={isActive ? "text-primary" : "text-muted"}
              />
              <span
                className={`text-[9.5px] font-semibold ${
                  isActive ? "text-primary" : "text-muted"
                }`}
              >
                {t(key)}
              </span>
              {isActive && <span className="mt-0.5 h-1 w-1 rounded-full bg-primary" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
