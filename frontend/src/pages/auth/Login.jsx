import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Mail, Eye, EyeOff, Store, Loader2, Globe } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import toast from "react-hot-toast";

export default function Login() {
  const { user, login } = useAuth();
  const { t, lang, switchLanguage } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user) {
    return <Navigate to={user.role === "worker" ? "/app/sales" : "/app/dashboard"} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success(`${t("welcome_back")}, ${u.name.split(" ")[0]}!`);
    } catch (err) {
      setError(err.response?.data?.error || t("login_failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-50">
        <button 
          onClick={() => switchLanguage(lang === "en" ? "rw" : "en")}
          className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-badge text-[13px] font-medium text-text-primary hover:bg-background transition-colors"
        >
          <Globe size={14} />
          {lang === "en" ? "Kinyarwanda" : "English"}
        </button>
      </div>

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-12"
           style={{ backgroundColor: "#006C49" }}>
        {/* Decorative shapes */}
        <div className="absolute top-0 left-0 w-[480px] h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-60px] left-[-60px] w-[200px] h-[200px] rounded-full bg-white/5" />
          <div className="absolute bottom-[-80px] right-[-40px] w-[280px] h-[280px] rounded-full bg-white/5" />
          <div className="absolute top-[40%] left-[30%] w-[120px] h-[120px] rounded-full bg-white/5" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-btn flex items-center justify-center">
              <Store size={20} className="text-white" />
            </div>
            <span className="text-white text-[22px] font-bold tracking-tight">INZIRA INSIGHTS</span>
          </div>
          <p className="text-white/70 text-[14px]">Business Management System</p>
        </div>

        <div className="relative">
          <p className="text-white text-[28px] font-bold leading-tight mb-3">
            Manage your clothing business from one place.
          </p>
          <p className="text-white/60 text-[14px] leading-relaxed">
            Track stock, record sales, manage workers, and generate reports — all designed for Kigali's fast-moving wholesale market.
          </p>
        </div>

        <div className="relative flex gap-3">
          {["Stock", "Sales", "Reports"].map((tag) => (
            <span key={tag} className="px-3 py-1.5 bg-white/10 rounded-badge text-white/80 text-[12px] font-medium">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-primary rounded-btn flex items-center justify-center">
              <Store size={16} className="text-white" />
            </div>
            <span className="text-[16px] font-bold text-text-primary">INZIRA INSIGHTS</span>
          </div>

          <h2 className="text-[24px] font-bold text-text-primary mb-1">{t("welcome_back")}</h2>
          <p className="text-[14px] text-text-secondary mb-2">{t("sign_in_account")}</p>
          <p className="text-[10px] text-text-secondary/50 mb-8 italic">System active for: rukundojosephtuyishime@gmail.com</p>

          {error && (
            <div className="mb-4 px-3 py-2.5 bg-danger/10 border border-danger/20 rounded-card flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
              <p className="text-[13px] text-danger font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-text-primary mb-1">{t("email")}</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@inzira-insights.rw" required
                  className="w-full h-10 pl-9 pr-3 border border-border rounded-card bg-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-text-primary mb-1">{t("password")}</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                  className="w-full h-10 px-3 pr-10 border border-border rounded-card bg-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-border text-primary focus:ring-primary" />
              <span className="text-[13px] text-text-secondary">{t("remember_me")}</span>
            </label>

            <button
              type="submit" disabled={loading}
              className="w-full h-11 bg-primary text-white rounded-btn text-[14px] font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> {t("signing_in")}</> : t("sign_in")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
