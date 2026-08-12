import { useNavigate } from "react-router-dom";
import { 
  FileText, TrendingUp, BookOpen, BarChart3, Package, Percent, 
  Activity, Bell, ShieldCheck, Settings as SettingsIcon, LogOut, ChevronRight
} from "lucide-react";
import Sheet from "./Sheet";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../lib/i18n.jsx";

export default function SystemDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { lang, toggle } = useLang();

  function go(path) {
    onClose();
    navigate(path);
  }

  return (
    <Sheet open={open} onClose={onClose} title="System Menu & Advanced Tools">
      <div className="space-y-4 p-4 pb-8">
        {/* User Info Header */}
        <div className="flex items-center justify-between rounded-xl bg-primary/10 p-3 border border-primary/20">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-extrabold text-white text-[14px]">
              {user?.name?.charAt(0).toUpperCase() || "R"}
            </div>
            <div>
              <div className="text-[13px] font-bold text-ink">{user?.name || "Rukundo Joseph"}</div>
              <div className="text-[10px] font-semibold text-primary capitalize">{user?.role || "Admin / SME Owner"}</div>
            </div>
          </div>
          <button
            onClick={toggle}
            className="rounded-lg bg-card px-2.5 py-1 text-[11px] font-bold text-ink border border-line shadow-xs"
          >
            🌐 {lang.toUpperCase()}
          </button>
        </div>

        {/* Section 1: Invoices & Financials */}
        <div>
          <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Finance & Invoices</div>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => go("/invoices")}
              className="flex items-center justify-between rounded-xl border border-line bg-card p-3 text-left shadow-xs hover:border-primary active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <FileText size={18} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-ink">Invoices & Receivables</div>
                  <div className="text-[10.5px] text-muted">Customer debts & invoice tracking</div>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted" />
            </button>

            <button
              onClick={() => go("/pnl")}
              className="flex items-center justify-between rounded-xl border border-line bg-card p-3 text-left shadow-xs hover:border-primary active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-ink">Profit & Loss Statement</div>
                  <div className="text-[10.5px] text-muted">Net revenue, expenses & profit margin</div>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted" />
            </button>

            <button
              onClick={() => go("/books")}
              className="flex items-center justify-between rounded-xl border border-line bg-card p-3 text-left shadow-xs hover:border-primary active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                  <BookOpen size={18} />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-ink">Financial Books</div>
                  <div className="text-[10.5px] text-muted">General Ledger & Cash Flow</div>
                </div>
              </div>
              <ChevronRight size={16} className="text-muted" />
            </button>
          </div>
        </div>

        {/* Section 2: Reports */}
        <div>
          <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">System Reports</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => go("/reports/sales")}
              className="flex flex-col items-center justify-center rounded-xl border border-line bg-card p-3 text-center shadow-xs hover:border-primary active:scale-[0.98] transition-all"
            >
              <BarChart3 size={20} className="text-primary mb-1" />
              <span className="text-[11px] font-bold text-ink">Sales Report</span>
            </button>

            <button
              onClick={() => go("/reports/stock")}
              className="flex flex-col items-center justify-center rounded-xl border border-line bg-card p-3 text-center shadow-xs hover:border-primary active:scale-[0.98] transition-all"
            >
              <Package size={20} className="text-amber-600 mb-1" />
              <span className="text-[11px] font-bold text-ink">Stock Report</span>
            </button>

            <button
              onClick={() => go("/reports/tax")}
              className="flex flex-col items-center justify-center rounded-xl border border-line bg-card p-3 text-center shadow-xs hover:border-primary active:scale-[0.98] transition-all"
            >
              <Percent size={20} className="text-emerald-600 mb-1" />
              <span className="text-[11px] font-bold text-ink">Tax Reports</span>
            </button>
          </div>
        </div>

        {/* Section 3: Intelligence */}
        <div>
          <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Intelligence & Alerts</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => go("/health-score")}
              className="flex items-center gap-2.5 rounded-xl border border-line bg-card p-3 shadow-xs hover:border-primary active:scale-[0.98] transition-all"
            >
              <Activity size={18} className="text-emerald-600" />
              <div className="text-left">
                <div className="text-[12px] font-bold text-ink">Health Score</div>
                <div className="text-[10px] text-muted">Business health score</div>
              </div>
            </button>

            <button
              onClick={() => go("/notifications")}
              className="flex items-center gap-2.5 rounded-xl border border-line bg-card p-3 shadow-xs hover:border-primary active:scale-[0.98] transition-all"
            >
              <Bell size={18} className="text-amber-600" />
              <div className="text-left">
                <div className="text-[12px] font-bold text-ink">Notifications</div>
                <div className="text-[10px] text-muted">System alerts</div>
              </div>
            </button>
          </div>
        </div>

        {/* Section 4: Admin & Settings */}
        <div>
          <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2">Admin & Settings</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => go("/audit")}
              className="flex items-center gap-2.5 rounded-xl border border-line bg-card p-3 shadow-xs hover:border-primary active:scale-[0.98] transition-all"
            >
              <ShieldCheck size={18} className="text-blue-600" />
              <div className="text-left">
                <div className="text-[12px] font-bold text-ink">Audit Log</div>
                <div className="text-[10px] text-muted">Security logs</div>
              </div>
            </button>

            <button
              onClick={() => go("/settings")}
              className="flex items-center gap-2.5 rounded-xl border border-line bg-card p-3 shadow-xs hover:border-primary active:scale-[0.98] transition-all"
            >
              <SettingsIcon size={18} className="text-muted" />
              <div className="text-left">
                <div className="text-[12px] font-bold text-ink">Settings</div>
                <div className="text-[10px] text-muted">App configuration</div>
              </div>
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => {
            onClose();
            logout();
            navigate("/login");
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600/10 py-3 text-[13px] font-bold text-red-600 border border-red-600/20 shadow-xs"
        >
          <LogOut size={16} /> Sign Out of DataBridge
        </button>
      </div>
    </Sheet>
  );
}
