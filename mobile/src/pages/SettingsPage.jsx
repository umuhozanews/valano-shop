import { Settings as SettingsIcon, Globe, Shield, LogOut, User } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../lib/i18n.jsx";
import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { lang, toggle } = useLang();
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col bg-bg">
      <ScreenHeader title="Settings & Account" back />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* User Card */}
        <div className="flex items-center gap-3 rounded-2xl bg-card border border-line p-4 shadow-xs">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white font-extrabold text-[18px]">
            {user?.name?.charAt(0).toUpperCase() || "R"}
          </div>
          <div>
            <div className="text-[15px] font-extrabold text-ink">{user?.name || "Rukundo Joseph"}</div>
            <div className="text-[12px] text-muted">{user?.email || "rukundojosephtuyishime@gmail.com"}</div>
            <div className="mt-1 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary capitalize">
              {user?.role || "Admin / Owner"}
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="rounded-xl border border-line bg-card p-3 shadow-xs space-y-3">
          <div className="text-[11px] font-bold text-muted uppercase tracking-wider">App Preferences</div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-primary" />
              <div>
                <div className="text-[13px] font-bold text-ink">Language</div>
                <div className="text-[11px] text-muted">Switch interface language</div>
              </div>
            </div>
            <button onClick={toggle} className="rounded-lg bg-primary/10 px-3 py-1 text-[11.5px] font-bold text-primary">
              {lang === "en" ? "English 🇬🇧" : "Kinyarwanda 🇷🇼"}
            </button>
          </div>
        </div>

        {/* System Info */}
        <div className="rounded-xl border border-line bg-card p-3 shadow-xs space-y-2 text-[12px]">
          <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">DataBridge Information</div>
          <div className="flex justify-between"><span>App Version:</span><span className="font-mono font-bold text-ink">v2.0.0 (Capacitor + PWA)</span></div>
          <div className="flex justify-between"><span>Platform Deployment:</span><span className="font-bold text-emerald-600">Cloudflare Pages</span></div>
          <div className="flex justify-between"><span>Offline Data Engine:</span><span className="font-bold text-primary">StorageEngine (Indexed)</span></div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600/10 py-3 text-[13px] font-bold text-red-600 border border-red-600/20 shadow-xs"
        >
          <LogOut size={16} /> Sign Out of DataBridge
        </button>
      </div>
    </div>
  );
}
