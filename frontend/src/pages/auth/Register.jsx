import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, ChevronDown, Check, Globe, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage, LANGUAGES } from "../../context/LanguageContext";
import { SECTORS, DISTRICTS } from "../../utils/constants";
import toast from "react-hot-toast";

const STEPS = ["Account", "Business", "Access"];

function PasswordStrength({ password }) {
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Lowercase letter", ok: /[a-z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-green-500"];
  const labels = ["Weak", "Weak", "Fair", "Good", "Strong"];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {checks.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < score ? colors[score] : "bg-border"}`} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {checks.map(c => (
            <span key={c.label} className={`text-[12px] flex items-center gap-1 ${c.ok ? "text-green-600" : "text-text-secondary"}`}>
              <Check size={10} className={c.ok ? "text-green-600" : "text-border"} />
              {c.label}
            </span>
          ))}
        </div>
        <span className={`text-[12px] font-semibold ${score >= 3 ? "text-green-600" : score >= 2 ? "text-yellow-600" : "text-red-500"}`}>
          {labels[score]}
        </span>
      </div>
    </div>
  );
}

function MultiSectorSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggle(sector) {
    if (value.includes(sector)) onChange(value.filter(s => s !== sector));
    else if (value.length < 3) onChange([...value, sector]);
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full min-h-[40px] px-3 py-2 border border-border rounded-card bg-surface text-[15px] text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary">
        <div className="flex flex-wrap gap-1 flex-1 min-w-0">
          {value.length === 0 && <span className="text-text-secondary">Select up to 3 sectors…</span>}
          {value.map(s => (
            <span key={s} className="flex items-center gap-1 bg-primary/10 text-primary text-[13px] font-medium px-2 py-0.5 rounded-full">
              {s}
              <button type="button" onClick={e => { e.stopPropagation(); toggle(s); }}
                className="hover:text-primary/60"><X size={11} /></button>
            </span>
          ))}
        </div>
        <ChevronDown size={14} className={`text-text-secondary shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-card shadow-lg z-50 max-h-52 overflow-y-auto">
          {SECTORS.map(s => {
            const selected = value.includes(s);
            const disabled = !selected && value.length >= 3;
            return (
              <button key={s} type="button" onClick={() => !disabled && toggle(s)}
                className={`w-full flex items-center justify-between px-3 py-2 text-[14px] transition-colors ${
                  disabled ? "text-text-secondary cursor-not-allowed opacity-50"
                  : selected ? "bg-primary/5 text-primary font-medium"
                  : "hover:bg-background text-text-primary"
                }`}>
                {s}
                {selected && <Check size={13} className="text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Register() {
  const { login, register } = useAuth();
  const { lang, switchLanguage } = useLanguage();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    accountType: "sme_owner",
    firstName: "", lastName: "", email: "",
    businessName: "", sectors: [], district: "", phone: "",
    password: "", confirmPassword: "",
  });

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); setError(""); }

  async function handleNext(e) {
    e.preventDefault();
    if (step === 0) {
      if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim())
        return setError("Please fill in your first name, last name and email.");
      setStep(1);
    } else if (step === 1) {
      if (!form.businessName.trim())
        return setError("Please enter your organization or business name.");
      setStep(2);
    } else {
      await handleSubmit();
    }
  }

  async function handleSubmit() {
    if (!form.password) return setError("Please set a password.");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    if (form.password.length < 8) return setError("Password must be at least 8 characters.");

    setLoading(true);
    setError("");
    try {
      const res = await register({
        accountType: form.accountType,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        businessName: form.businessName.trim(),
        sectors: form.sectors,
        district: form.district || undefined,
        phone: form.phone || undefined,
        password: form.password,
      });
      toast.success(`Welcome to INZIRA, ${form.firstName}! Account created.`);
      const role = res?.user?.role || form.accountType;
      const targetPath = role === "lender" ? "/app/lender" : role === "databridge_advisor" ? "/app/advisor" : "/app/dashboard";
      navigate(targetPath);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Language switcher */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-1 bg-surface border border-border rounded-badge px-2 py-1">
        <Globe size={12} className="text-text-secondary mr-0.5" />
        {LANGUAGES.map(l => (
          <button key={l.code} onClick={() => switchLanguage(l.code)}
            className={`px-2 py-0.5 rounded text-[13px] font-medium transition-colors ${lang === l.code ? "bg-primary text-white" : "text-text-secondary hover:text-text-primary"}`}>
            {l.label}
          </button>
        ))}
      </div>

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-12 relative overflow-hidden"
           style={{ backgroundColor: "#006C49" }}>
        <div className="absolute top-[-60px] left-[-60px] w-[200px] h-[200px] rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-[-80px] right-[-40px] w-[280px] h-[280px] rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute top-[40%] left-[30%] w-[120px] h-[120px] rounded-full bg-white/5 pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-4 mb-3">
            <img src="/inzira-logo.jpg" alt="INZIRA" className="h-16 w-16 rounded-full object-cover border-2 border-white/30" />
            <div>
              <span className="text-white text-[26px] font-bold tracking-tight block leading-tight">INZIRA</span>
              <span className="text-white/80 text-[18px] font-light tracking-wide block">Insight</span>
            </div>
          </div>
          <p className="text-white/70 text-[15px]">Free Business Management System</p>
        </div>

        <div className="relative space-y-5">
          {[
            { emoji: "📊", title: "Track every sale", desc: "POS system with split payments, receipts and sales history" },
            { emoji: "📦", title: "Manage your stock", desc: "Know what's running low before you run out" },
            { emoji: "📚", title: "Auto accounting", desc: "Journal, ledger and trial balance built automatically" },
            { emoji: "👥", title: "Team access", desc: "Add cashiers, managers and accountants with role-based access" },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="text-[22px]">{f.emoji}</span>
              <div>
                <p className="text-white font-semibold text-[15px]">{f.title}</p>
                <p className="text-white/60 text-[13px]">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="relative text-white/40 text-[13px]">
          Free to start. No credit card required.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <img src="/inzira-logo.jpg" alt="INZIRA" className="h-10 w-10 rounded-full object-cover" />
            <div>
              <span className="text-[15px] font-bold text-primary block leading-tight">INZIRA</span>
              <span className="text-[12px] text-text-secondary block">Insight</span>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-6">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold transition-colors ${
                  i < step ? "bg-primary text-white" : i === step ? "bg-primary text-white" : "bg-border text-text-secondary"
                }`}>
                  {i < step ? <Check size={13} /> : i + 1}
                </div>
                <span className={`text-[13px] font-medium hidden sm:block ${i === step ? "text-primary" : "text-text-secondary"}`}>{s}</span>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-px ${i < step ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>

          <h2 className="text-[24px] font-bold text-text-primary mb-0.5">
            {step === 0 ? "Create your account" : step === 1 ? "Tell us about your business" : "Set your password"}
          </h2>
          <p className="text-[14px] text-text-secondary mb-6">
            {step === 0 ? "Start managing your business for free" : step === 1 ? "We'll personalize your workspace" : "Keep your account secure"}
          </p>

          {error && (
            <div className="mb-4 px-3 py-2.5 bg-danger/10 border border-danger/20 rounded-card flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
              <p className="text-[14px] text-danger font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleNext} className="space-y-4">
            {/* Step 0 — Account info & Role Selection */}
            {step === 0 && (
              <>
                <div>
                  <label className="block text-[14px] font-medium text-text-primary mb-1.5">I am registering as a:</label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { key: "sme_owner", label: "SME Business", icon: "🏢", desc: "Sales, stock & score" },
                      { key: "lender", label: "Lender / Bank", icon: "🏦", desc: "Credit risk portfolio" },
                      { key: "databridge_advisor", label: "Advisor", icon: "🎓", desc: "Consulting & interventions" },
                    ].map(t => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => set("accountType", t.key)}
                        className={`p-2.5 rounded-card border text-left transition-all ${
                          form.accountType === t.key
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "border-border hover:border-primary/40 bg-surface"
                        }`}
                      >
                        <span className="text-[18px] block mb-0.5">{t.icon}</span>
                        <p className="text-[13px] font-bold text-text-primary leading-tight">{t.label}</p>
                        <p className="text-[11px] text-text-secondary leading-tight mt-0.5">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[14px] font-medium text-text-primary mb-1">First Name</label>
                    <input value={form.firstName} onChange={e => set("firstName", e.target.value)}
                      placeholder="Jean" required
                      className="w-full h-10 px-3 border border-border rounded-card bg-surface text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-[14px] font-medium text-text-primary mb-1">Last Name</label>
                    <input value={form.lastName} onChange={e => set("lastName", e.target.value)}
                      placeholder="Mutoni" required
                      className="w-full h-10 px-3 border border-border rounded-card bg-surface text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" />
                  </div>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-text-primary mb-1">Work Email Address</label>
                  <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                    placeholder="you@organization.rw" required
                    className="w-full h-10 px-3 border border-border rounded-card bg-surface text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-text-primary mb-1">Phone <span className="text-text-secondary font-normal">(optional)</span></label>
                  <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
                    placeholder="+250 7XX XXX XXX"
                    className="w-full h-10 px-3 border border-border rounded-card bg-surface text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" />
                </div>
              </>
            )}

            {/* Step 1 — Business / Organization info */}
            {step === 1 && (
              <>
                <div>
                  <label className="block text-[14px] font-medium text-text-primary mb-1">
                    {form.accountType === "lender"
                      ? "Bank / Financial Institution Name"
                      : form.accountType === "databridge_advisor"
                      ? "Advisory Firm / Organization Name"
                      : "Business / Shop Name"}
                  </label>
                  <input value={form.businessName} onChange={e => set("businessName", e.target.value)}
                    placeholder={
                      form.accountType === "lender"
                        ? "e.g. Equity Bank Rwanda"
                        : form.accountType === "databridge_advisor"
                        ? "e.g. Business Growth Advisory"
                        : "e.g. Mutoni General Store"
                    } required
                    className="w-full h-10 px-3 border border-border rounded-card bg-surface text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" />
                  <p className="text-[12px] text-text-secondary mt-1">This name identifies your account across Inzira Insights.</p>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-text-primary mb-1">
                    {form.accountType === "sme_owner" ? "Business Sector" : "Focus Sector / Industry"} <span className="text-text-secondary font-normal">(choose up to 3)</span>
                  </label>
                  <MultiSectorSelect value={form.sectors} onChange={v => set("sectors", v)} />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-text-primary mb-1">District / Region <span className="text-text-secondary font-normal">(optional)</span></label>
                  <select value={form.district} onChange={e => set("district", e.target.value)}
                    className="w-full h-10 px-3 border border-border rounded-card bg-surface text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary">
                    <option value="">Select district…</option>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </>
            )}

            {/* Step 2 — Password */}
            {step === 2 && (
              <>
                <div>
                  <label className="block text-[14px] font-medium text-text-primary mb-1">Password</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} value={form.password}
                      onChange={e => set("password", e.target.value)}
                      placeholder="Min. 8 characters" required
                      className="w-full h-10 px-3 pr-10 border border-border rounded-card bg-surface text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary" />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <PasswordStrength password={form.password} />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-text-primary mb-1">Confirm Password</label>
                  <div className="relative">
                    <input type={showConfirm ? "text" : "password"} value={form.confirmPassword}
                      onChange={e => set("confirmPassword", e.target.value)}
                      placeholder="Repeat your password" required
                      className={`w-full h-10 px-3 pr-10 border rounded-card bg-surface text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
                        form.confirmPassword && form.password !== form.confirmPassword
                          ? "border-danger focus:ring-danger/30" : "border-border"
                      }`} />
                    <button type="button" onClick={() => setShowConfirm(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-[12px] text-danger mt-1">Passwords do not match</p>
                  )}
                </div>

                {/* Summary */}
                <div className="bg-primary/5 border border-primary/15 rounded-card p-3 space-y-1">
                  <p className="text-[13px] font-semibold text-primary">Your account summary</p>
                  <p className="text-[13px] text-text-primary">{form.firstName} {form.lastName} · {form.email}</p>
                  <p className="text-[13px] text-text-secondary">{form.businessName}{form.district ? ` · ${form.district}` : ""}</p>
                  {form.sectors.length > 0 && (
                    <p className="text-[13px] text-text-secondary">{form.sectors.join(" · ")}</p>
                  )}
                </div>
              </>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-11 bg-primary text-white rounded-btn text-[15px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Creating account…</>
                : step < 2 ? "Continue →" : "Create Free Account"
              }
            </button>

            {step > 0 && (
              <button type="button" onClick={() => { setStep(s => s - 1); setError(""); }}
                className="w-full h-10 border border-border rounded-btn text-[15px] text-text-secondary hover:bg-background transition-colors">
                ← Back
              </button>
            )}
          </form>

          <p className="text-center text-[14px] text-text-secondary mt-6">
            Already have an account?{" "}
            <Link to="/app/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
