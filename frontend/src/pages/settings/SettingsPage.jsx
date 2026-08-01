import { useState, useEffect, useCallback } from "react";
import { Store, Shield, User, Check, Globe, Users, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { useLanguage, LANGUAGES } from "../../context/LanguageContext";
import { SECTORS, DISTRICTS } from "../../utils/constants";

const SECTIONS = [
  { key: "business", label: "Business Info",     icon: Store,  desc: "Shop name, location, sector" },
  { key: "team",     label: "Team & Workers",    icon: Users,  desc: "Add cashiers, managers, accountants" },
  { key: "consent",  label: "Data & Consent",    icon: Shield, desc: "Control how your data is used" },
  { key: "profile",  label: "User Profile",      icon: User,   desc: "Account details & password" },
  { key: "roles",    label: "Roles & Access",    icon: Shield, desc: "View system role permissions" },
];

const WORKER_ROLES = [
  { value: "cashier",   label: "Cashier — POS only" },
  { value: "manager",   label: "Manager — POS + stock + customers" },
  { value: "accountant",label: "Accountant — Finance + reports" },
];

const ROLE_DEFS = [
  { role: "pulse_admin",       label: "Pulse Admin",     color: "bg-danger/10 text-danger",
    desc: "Full platform access — manages all SMEs, lenders, model performance, and system settings." },
  { role: "sme_owner",         label: "SME Owner",       color: "bg-primary/10 text-primary",
    desc: "Full business access — all modules including P&L, health score, settings, and all reports." },
  { role: "admin",             label: "Admin",           color: "bg-primary/10 text-primary",
    desc: "Same as SME Owner for the assigned business." },
  { role: "manager",           label: "Manager",         color: "bg-warning/10 text-warning",
    desc: "Sales, stock, purchase orders, customers, invoices — excludes finance/settings." },
  { role: "accountant",        label: "Accountant",      color: "bg-success/10 text-success",
    desc: "Finances, expenses, invoices, P&L, stock, and all reports. Read-only on sales." },
  { role: "cashier",           label: "Cashier",         color: "bg-neutral/10 text-text-secondary",
    desc: "POS screen and own sales history only." },
  { role: "databridge_advisor",label: "DataBridge Advisor", color: "bg-primary/10 text-primary",
    desc: "Advisory sessions management and SME insight access." },
  { role: "lender",            label: "Lender",          color: "bg-warning/10 text-warning",
    desc: "Portfolio view, risk flags, credit scores for their referred SMEs only." },
];

const ACCESS_MATRIX = {
  sme_owner:  ["Dashboard","POS","Sales","Stock","Purchase Orders","Suppliers","Customers","Receivables","Expenses","Invoices","P&L","Reports","Tax Reports","Health Score","Settings"],
  manager:    ["Dashboard","POS","Sales","Stock","Purchase Orders","Customers","Invoices"],
  accountant: ["Dashboard","Sales","Stock","Expenses","Invoices","P&L","Reports","Tax Reports","Receivables"],
  cashier:    ["POS"],
  lender:     ["Health Score","Reports"],
};

export default function SettingsPage() {
  const { t, lang, switchLanguage } = useLanguage();
  const [activeSection, setActiveSection] = useState("business");
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const [business, setBusiness] = useState({
    name: "", address: "", phone: "", low_stock: 5, footer: "", sector: "", district: "",
  });
  const [profile,  setProfile]  = useState({ name: "", email: "", phone: "" });
  const [pwForm,   setPwForm]   = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [consent,  setConsent]  = useState({ scoring: false, lender_sharing: false });

  // Team management
  const [team,        setTeam]        = useState([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [showNewWorker, setShowNewWorker] = useState(false);
  const [showWorkerPass, setShowWorkerPass] = useState(false);
  const [workerSaving,  setWorkerSaving]   = useState(false);
  const [newWorker, setNewWorker] = useState({ name: "", email: "", phone: "", role: "cashier", password: "" });

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/settings"),
      api.get("/auth/me"),
    ]).then(([sRes, uRes]) => {
      const s = sRes.data?.settings || {};
      setBusiness({
        name:        s.shop_name || "",
        address:     s.shop_address || "",
        phone:       s.shop_phone || "",
        email:       s.shop_email || "andrenikobatuye@gmail.com",
        tin_number:  s.tin_number || "103777856",
        sdc_id:      s.sdc_id || "SDC010013000",
        mrc_number:  s.mrc_number || "MIS00013705",
        cashier_tin: s.cashier_tin || "103777856",
        vat_rate:    s.vat_rate || 18,
        low_stock:   s.default_low_stock_threshold || 5,
        footer:      s.invoice_footer_text || "",
        sector:      s.sector_default || "",
        district:    s.district_default || "",
      });
      const u = uRes.data || {};
      setProfile({ name: u.name || "", email: u.email || "", phone: u.phone || "" });
      setConsent({
        scoring:        u.consent_status === "granted",
        lender_sharing: u.lender_sharing === true,
      });
    }).catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function saveBusiness() {
    setSaving(true);
    try {
      await api.put("/settings", {
        shop_name:                   business.name,
        shop_address:                business.address,
        shop_phone:                  business.phone,
        shop_email:                  business.email,
        tin_number:                  business.tin_number,
        sdc_id:                      business.sdc_id,
        mrc_number:                  business.mrc_number,
        cashier_tin:                 business.cashier_tin,
        vat_rate:                    parseFloat(business.vat_rate) || 18,
        default_low_stock_threshold: parseInt(business.low_stock) || 5,
        invoice_footer_text:         business.footer,
        sector_default:              business.sector,
        district_default:            business.district,
      });
      toast.success("Business info & EBM fiscal details saved");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await api.put("/auth/me/profile", { name: profile.name, email: profile.email, phone: profile.phone });
      toast.success("Profile updated");
    } catch (err) { toast.error(err.response?.data?.error || "Failed to update"); }
    finally { setSaving(false); }
  }

  async function changePassword() {
    if (pwForm.newPassword !== pwForm.confirmPassword)
      return toast.error("Passwords do not match");
    if (pwForm.newPassword.length < 6)
      return toast.error("Password must be at least 6 characters");
    setSaving(true);
    try {
      await api.put("/auth/me/password", {
        currentPassword: pwForm.currentPassword,
        newPassword:     pwForm.newPassword,
      });
      toast.success("Password updated");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) { toast.error(err.response?.data?.error || "Failed to update"); }
    finally { setSaving(false); }
  }

  async function saveConsent() {
    setSaving(true);
    try {
      await api.put("/auth/consent", {
        consent_status:  consent.scoring ? "granted" : "withdrawn",
        lender_sharing:  consent.lender_sharing,
      });
      toast.success("Consent preferences saved");
    } catch (err) { toast.error(err.response?.data?.error || "Failed to save consent"); }
    finally { setSaving(false); }
  }

  async function loadTeam() {
    setTeamLoading(true);
    try {
      const { data } = await api.get("/auth/team");
      setTeam(data || []);
    } catch { toast.error("Failed to load team"); }
    finally { setTeamLoading(false); }
  }

  useEffect(() => {
    if (activeSection === "team") loadTeam();
  }, [activeSection]);

  async function createWorker(e) {
    e.preventDefault();
    if (!newWorker.name || !newWorker.email || !newWorker.password || !newWorker.role)
      return toast.error("Name, email, role and password are required");
    setWorkerSaving(true);
    try {
      await api.post("/auth/users", newWorker);
      toast.success(`${newWorker.name} added to your team`);
      setNewWorker({ name: "", email: "", phone: "", role: "cashier", password: "" });
      setShowNewWorker(false);
      loadTeam();
    } catch (err) { toast.error(err.response?.data?.error || "Failed to create worker"); }
    finally { setWorkerSaving(false); }
  }

  async function toggleWorkerActive(w) {
    try {
      await api.put(`/auth/users/${w.id}`, { is_active: !w.is_active });
      toast.success(`${w.name} ${!w.is_active ? "activated" : "deactivated"}`);
      loadTeam();
    } catch { toast.error("Failed to update"); }
  }

  return (
    <PageWrapper title="Settings" subtitle="Manage your Inzira Insights account"
      breadcrumbs={[{ label: "Settings", path: "/app/settings" }]}>

      <div className="flex gap-4">
        {/* Section nav */}
        <div className="w-52 shrink-0">
          <Card className="p-2">
            <nav className="space-y-1">
              {SECTIONS.map(s => {
                const Icon = s.icon;
                return (
                  <button key={s.key} onClick={() => setActiveSection(s.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-left transition-colors
                      ${activeSection === s.key ? "bg-primary/10 text-primary" : "hover:bg-background text-text-secondary"}`}>
                    <Icon size={15} className="shrink-0" />
                    <div className="min-w-0">
                      <p className={`text-[14px] font-semibold ${activeSection === s.key ? "text-primary" : "text-text-primary"}`}>{s.label}</p>
                      <p className="text-[13px] text-text-secondary truncate">{s.desc}</p>
                    </div>
                  </button>
                );
              })}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-64 bg-surface rounded-[8px]" />
            </div>
          ) : (
            <>
              {/* ── Business Info ──────────────────────────────────────── */}
              {activeSection === "business" && (
                <Card title="Business Information" subtitle="Update your shop name, location, and sector">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="col-span-2">
                      <Input label="Business Name" value={business.name}
                        onChange={e => setBusiness(b => ({ ...b, name: e.target.value }))} />
                    </div>
                    <div className="col-span-2">
                      <Input label="Address" value={business.address}
                        onChange={e => setBusiness(b => ({ ...b, address: e.target.value }))} />
                    </div>
                    <Input label="Phone" value={business.phone}
                      onChange={e => setBusiness(b => ({ ...b, phone: e.target.value }))} />
                    <Input label="Business Email" value={business.email}
                      onChange={e => setBusiness(b => ({ ...b, email: e.target.value }))} />
                    
                    <Input label="Taxpayer TIN Number (TIN)" value={business.tin_number}
                      onChange={e => setBusiness(b => ({ ...b, tin_number: e.target.value }))} />
                    <Input label="SDC ID (EBM Machine ID)" value={business.sdc_id}
                      onChange={e => setBusiness(b => ({ ...b, sdc_id: e.target.value }))} />
                    <Input label="MRC Serial Number" value={business.mrc_number}
                      onChange={e => setBusiness(b => ({ ...b, mrc_number: e.target.value }))} />
                    <Input label="VAT Standard Rate (%)" type="number" value={business.vat_rate}
                      onChange={e => setBusiness(b => ({ ...b, vat_rate: e.target.value }))} />

                    <Input label="Low Stock Alert Threshold" type="number" value={business.low_stock}
                      onChange={e => setBusiness(b => ({ ...b, low_stock: e.target.value }))} />

                    {/* Sector */}
                    <div>
                      <label className="block text-[14px] font-medium text-text-primary mb-1">Sector</label>
                      <select value={business.sector}
                        onChange={e => setBusiness(b => ({ ...b, sector: e.target.value }))}
                        className="w-full h-9 px-3 border border-border rounded-[6px] text-[14px] bg-surface">
                        <option value="">Select sector…</option>
                        {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* District */}
                    <div>
                      <label className="block text-[14px] font-medium text-text-primary mb-1">District</label>
                      <select value={business.district}
                        onChange={e => setBusiness(b => ({ ...b, district: e.target.value }))}
                        className="w-full h-9 px-3 border border-border rounded-[6px] text-[14px] bg-surface">
                        <option value="">Select district…</option>
                        {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[14px] font-medium text-text-primary mb-1">Invoice Footer Text</label>
                      <textarea value={business.footer}
                        onChange={e => setBusiness(b => ({ ...b, footer: e.target.value }))} rows={2}
                        className="w-full p-2 border border-border rounded-[6px] text-[14px] bg-surface focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>

                  {/* Language toggle */}
                  <div className="mb-4 p-3 bg-background rounded-[6px] border border-border">
                    <div className="flex items-center gap-2 mb-3">
                      <Globe size={15} className="text-primary" />
                      <div>
                        <p className="text-[14px] font-medium text-text-primary">Interface Language</p>
                        <p className="text-[13px] text-text-secondary">Currently: {LANGUAGES.find(l => l.code === lang)?.label}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {LANGUAGES.map(l => (
                        <button key={l.code} onClick={() => switchLanguage(l.code)}
                          className={`flex-1 py-2 rounded-[6px] text-[13px] font-medium transition-colors border ${lang === l.code ? "bg-primary text-white border-primary" : "bg-surface text-text-secondary border-border hover:border-primary/50"}`}>
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button loading={saving} onClick={saveBusiness}>Save Business Info</Button>
                </Card>
              )}

              {/* ── Team & Workers ─────────────────────────────────────── */}
              {activeSection === "team" && (
                <div className="space-y-4">
                  <Card title="Your Team" subtitle="Workers who have access to your business account">
                    <div className="mb-4">
                      <button onClick={() => setShowNewWorker(o => !o)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-btn text-[14px] font-medium hover:bg-primary/90 transition-colors">
                        <Plus size={14} /> Add Worker
                      </button>
                    </div>

                    {showNewWorker && (
                      <form onSubmit={createWorker}
                        className="mb-5 p-4 border border-primary/20 bg-primary/5 rounded-[8px] space-y-3">
                        <p className="text-[14px] font-semibold text-primary">New Worker Account</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[13px] font-medium text-text-primary mb-1">Full Name</label>
                            <input required value={newWorker.name}
                              onChange={e => setNewWorker(w => ({ ...w, name: e.target.value }))}
                              placeholder="Jean Muneza"
                              className="w-full h-9 px-3 border border-border rounded-[6px] text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                          </div>
                          <div>
                            <label className="block text-[13px] font-medium text-text-primary mb-1">Email</label>
                            <input required type="email" value={newWorker.email}
                              onChange={e => setNewWorker(w => ({ ...w, email: e.target.value }))}
                              placeholder="jean@yourbusiness.rw"
                              className="w-full h-9 px-3 border border-border rounded-[6px] text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                          </div>
                          <div>
                            <label className="block text-[13px] font-medium text-text-primary mb-1">Role</label>
                            <select required value={newWorker.role}
                              onChange={e => setNewWorker(w => ({ ...w, role: e.target.value }))}
                              className="w-full h-9 px-3 border border-border rounded-[6px] text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
                              {WORKER_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[13px] font-medium text-text-primary mb-1">Phone (optional)</label>
                            <input value={newWorker.phone}
                              onChange={e => setNewWorker(w => ({ ...w, phone: e.target.value }))}
                              placeholder="+250 7XX XXX XXX"
                              className="w-full h-9 px-3 border border-border rounded-[6px] text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[13px] font-medium text-text-primary mb-1">Password</label>
                          <div className="relative max-w-xs">
                            <input required type={showWorkerPass ? "text" : "password"} value={newWorker.password}
                              onChange={e => setNewWorker(w => ({ ...w, password: e.target.value }))}
                              placeholder="Temporary password for them"
                              className="w-full h-9 px-3 pr-9 border border-border rounded-[6px] text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                            <button type="button" onClick={() => setShowWorkerPass(s => !s)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                              {showWorkerPass ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          </div>
                          <p className="text-[12px] text-text-secondary mt-1">Share this with them — they can change it after signing in.</p>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button type="submit" disabled={workerSaving}
                            className="px-4 py-2 bg-primary text-white rounded-btn text-[14px] font-medium disabled:opacity-60 hover:bg-primary/90">
                            {workerSaving ? "Adding…" : "Add to Team"}
                          </button>
                          <button type="button" onClick={() => setShowNewWorker(false)}
                            className="px-4 py-2 border border-border rounded-btn text-[14px] text-text-secondary hover:bg-background">
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}

                    {teamLoading ? (
                      <p className="text-[14px] text-text-secondary py-6 text-center">Loading team…</p>
                    ) : team.length === 0 ? (
                      <div className="py-10 text-center border border-dashed border-border rounded-[8px]">
                        <Users size={32} className="mx-auto text-border mb-3" />
                        <p className="text-[15px] font-semibold text-text-primary">No workers yet</p>
                        <p className="text-[14px] text-text-secondary mt-1">Add cashiers, managers, or accountants to your team.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border border border-border rounded-[8px] overflow-hidden">
                        {team.map(w => {
                          const roleColor = {
                            cashier: "bg-gray-100 text-gray-600",
                            manager: "bg-amber-100 text-amber-700",
                            accountant: "bg-green-100 text-green-700",
                          }[w.role] || "bg-blue-100 text-blue-700";
                          return (
                            <div key={w.id} className={`flex items-center gap-3 px-4 py-3 ${w.is_active ? "" : "opacity-50"}`}>
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-[14px] font-bold text-primary">
                                  {w.name?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-semibold text-text-primary truncate">{w.name}</p>
                                <p className="text-[13px] text-text-secondary truncate">{w.email}</p>
                              </div>
                              <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full capitalize hidden sm:inline ${roleColor}`}>
                                {w.role}
                              </span>
                              <span className={`text-[12px] px-2 py-0.5 rounded-full ${w.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                                {w.is_active ? "Active" : "Inactive"}
                              </span>
                              <button onClick={() => toggleWorkerActive(w)}
                                className="text-[12px] px-3 py-1 border border-border rounded-[6px] text-text-secondary hover:bg-background transition-colors shrink-0">
                                {w.is_active ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {/* ── Data & Consent ─────────────────────────────────────── */}
              {activeSection === "consent" && (
                <div className="space-y-4">
                  <Card title="Data Usage Consent"
                    subtitle="Control how Inzira Insights uses your business data">
                    <p className="text-[14px] text-text-secondary mb-5 leading-relaxed">
                      Inzira Insights uses your sales, expenses, and inventory data to calculate a
                      Health Score that helps you understand your business performance. You can choose
                      whether this data is also shared with verified lenders for credit scoring.
                    </p>

                    <div className="space-y-4">
                      <label className="flex items-start gap-4 p-4 border border-border rounded-[8px] cursor-pointer hover:bg-background">
                        <input type="checkbox" checked={consent.scoring}
                          onChange={e => setConsent(c => ({ ...c, scoring: e.target.checked }))}
                          className="mt-0.5 h-4 w-4 accent-primary" />
                        <div>
                          <p className="text-[14px] font-medium text-text-primary">Allow Health Score Calculation</p>
                          <p className="text-[13px] text-text-secondary mt-0.5">
                            Your operational data (sales, expenses, stock) will be used to calculate
                            your monthly Health Score. This score is visible to you only.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start gap-4 p-4 border border-border rounded-[8px] cursor-pointer hover:bg-background">
                        <input type="checkbox" checked={consent.lender_sharing}
                          onChange={e => setConsent(c => ({ ...c, lender_sharing: e.target.checked }))}
                          className="mt-0.5 h-4 w-4 accent-primary" />
                        <div>
                          <p className="text-[14px] font-medium text-text-primary">Share Score with Lenders</p>
                          <p className="text-[13px] text-text-secondary mt-0.5">
                            Allow verified lenders (banks, SACCOs, MFIs) who have referred you to Inzira
                            to view your Health Score and basic business metrics. No raw transaction data is shared.
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="mt-6 p-3 bg-primary/5 border border-primary/20 rounded-[8px]">
                      <p className="text-[13px] text-text-secondary">
                        You can withdraw consent at any time. If you withdraw consent for scoring,
                        your Health Score will be set to NULL and lenders will no longer see your data.
                        This complies with Rwanda Data Protection Law (Law N°058/2021).
                      </p>
                    </div>

                    <div className="mt-5">
                      <Button loading={saving} onClick={saveConsent}>Save Consent Preferences</Button>
                    </div>
                  </Card>
                </div>
              )}

              {/* ── Profile ───────────────────────────────────────────── */}
              {activeSection === "profile" && (
                <div className="space-y-5">
                  <Card title="Account Profile" subtitle="Your personal details">
                    <div className="grid grid-cols-2 gap-4 mb-5">
                      <div className="col-span-2">
                        <Input label="Full Name" value={profile.name}
                          onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                      </div>
                      <Input label="Email Address" type="email" value={profile.email}
                        onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
                      <Input label="Phone Number" value={profile.phone}
                        onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <Button loading={saving} onClick={saveProfile}>Save Profile</Button>
                  </Card>

                  <Card title="Change Password" subtitle="Set a new login password">
                    <div className="grid grid-cols-3 gap-4 mb-5">
                      <Input label="Current Password" type="password" value={pwForm.currentPassword}
                        onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))} />
                      <Input label="New Password" type="password" value={pwForm.newPassword}
                        onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))} />
                      <Input label="Confirm New Password" type="password" value={pwForm.confirmPassword}
                        onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))} />
                    </div>
                    <Button loading={saving} onClick={changePassword}>Update Password</Button>
                  </Card>
                </div>
              )}

              {/* ── Roles ─────────────────────────────────────────────── */}
              {activeSection === "roles" && (
                <Card title="Roles & Permissions" subtitle="Access levels in Inzira Insights">
                  <div className="space-y-4">
                    {ROLE_DEFS.map(r => {
                      const modules = ACCESS_MATRIX[r.role] || [];
                      return (
                        <div key={r.role} className="p-4 border border-border rounded-[8px]">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2.5 py-1 rounded-[4px] text-[13px] font-bold uppercase ${r.color}`}>{r.label}</span>
                          </div>
                          <p className="text-[14px] text-text-secondary mb-3">{r.desc}</p>
                          {modules.length > 0 && (
                            <div className="grid grid-cols-3 gap-1.5">
                              {modules.map(m => (
                                <div key={m} className="flex items-center gap-1.5">
                                  <div className="w-4 h-4 rounded-full bg-success flex items-center justify-center">
                                    <Check size={9} className="text-white" />
                                  </div>
                                  <span className="text-[13px] text-text-primary">{m}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
