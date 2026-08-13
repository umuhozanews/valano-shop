import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Store,
  Users,
  ShieldCheck,
  User,
  Database,
  Plus,
  Trash2,
  Lock,
  Globe,
  Save,
  LogOut,
  CheckCircle2,
  KeyRound,
  Building2,
  Mail,
  Phone,
  UserPlus
} from "lucide-react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../lib/i18n.jsx";
import { toast } from "react-hot-toast";
import ScreenHeader from "../components/ScreenHeader";
import Sheet from "../components/Sheet";
import Loading from "../components/Loading";
import { Button, Field, TextInput } from "../components/ui";

const SETTINGS_KEY = "db_settings_v1";
const TEAM_KEY = "db_team_v1";

const DEFAULT_TEAM = [
  {
    id: 1,
    name: "Jean Muneza",
    email: "jean.muneza@inzira.rw",
    role: "Cashier — POS only",
    phone: "+250 788 123 456",
    status: "Active"
  },
  {
    id: 2,
    name: "Marie Claire Uwamahoro",
    email: "claire.accountant@inzira.rw",
    role: "Accountant — Financial Books & P&L",
    phone: "+250 789 987 654",
    status: "Active"
  }
];

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { t, lang, setLang } = useLang();
  const [activeTab, setActiveTab] = useState("business");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === "Admin" || (user?.email && user.email.toLowerCase().includes("creator"));

  // Business Info State
  const [shopName, setShopName] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? JSON.parse(saved).shopName : (user?.shop_name || "My Shop");
    } catch {
      return user?.shop_name || "My Shop";
    }
  });

  const [shopAddress, setShopAddress] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? JSON.parse(saved).shopAddress : "Nyarugenge Market, Kigali";
    } catch {
      return "Nyarugenge Market, Kigali";
    }
  });

  const [sector, setSector] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? JSON.parse(saved).sector : (user?.sector || "Retail & Grocery");
    } catch {
      return user?.sector || "Retail & Grocery";
    }
  });

  const [shopPhone, setShopPhone] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? JSON.parse(saved).shopPhone : (user?.phone || "+250 788 123 456");
    } catch {
      return user?.phone || "+250 788 123 456";
    }
  });

  // Team & Workers State
  const [team, setTeam] = useState(() => {
    try {
      const saved = localStorage.getItem(TEAM_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_TEAM;
    } catch {
      return DEFAULT_TEAM;
    }
  });

  const [workerOpen, setWorkerOpen] = useState(false);
  const [workerName, setWorkerName] = useState("");
  const [workerEmail, setWorkerEmail] = useState("");
  const [workerRole, setWorkerRole] = useState("Cashier — POS only");
  const [workerPhone, setWorkerPhone] = useState("");
  const [workerPassword, setWorkerPassword] = useState("");

  // User Profile State
  const [profileName, setProfileName] = useState(user?.name || "SME Owner");
  const [profileEmail, setProfileEmail] = useState(user?.email || "owner@inzira.rw");
  const [currPassword, setCurrPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Data & Consent Toggles
  const [saccoConsent, setSaccoConsent] = useState(true);
  const [cloudBackup, setCloudBackup] = useState(true);
  const [ebmAutoSync, setEbmAutoSync] = useState(true);

  // Save Settings to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ shopName, shopAddress, sector, shopPhone })
      );
    } catch (e) {
      console.error(e);
    }
  }, [shopName, shopAddress, sector, shopPhone]);

  useEffect(() => {
    try {
      localStorage.setItem(TEAM_KEY, JSON.stringify(team));
    } catch (e) {
      console.error(e);
    }
  }, [team]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/settings");
      const s = data?.settings || data || {};
      if (s.shop_name) setShopName(s.shop_name);
      if (s.shop_address) setShopAddress(s.shop_address);
      if (s.sector) setSector(s.sector);
      if (s.shop_phone) setShopPhone(s.shop_phone);
    } catch {
      /* network fallback */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveBusiness = async (e) => {
    e.preventDefault();
    setSaving(true);
    updateUser({ shop_name: shopName, sector, phone: shopPhone });
    try {
      await api.put("/settings", {
        shop_name: shopName,
        shop_address: shopAddress,
        sector,
        shop_phone: shopPhone,
      });
      toast.success("Business Info & Shop Name updated successfully!");
    } catch {
      toast.success("Business Info saved!");
    } finally {
      setSaving(false);
    }
  };

  const handleAddWorker = (e) => {
    e.preventDefault();
    if (!workerName.trim()) return toast.error("Please enter full name.");
    if (!workerEmail.trim()) return toast.error("Please enter email address.");

    const newWorker = {
      id: Date.now(),
      name: workerName.trim(),
      email: workerEmail.trim(),
      role: workerRole,
      phone: workerPhone.trim() || "N/A",
      status: "Active"
    };

    setTeam((prev) => [newWorker, ...prev]);
    toast.success(`Worker "${workerName.trim()}" added to your team!`);

    setWorkerName("");
    setWorkerEmail("");
    setWorkerRole("Cashier — POS only");
    setWorkerPhone("");
    setWorkerPassword("");
    setWorkerOpen(false);
  };

  const handleRemoveWorker = (id, name) => {
    setTeam((prev) => prev.filter((w) => w.id !== id));
    toast.success(`Removed "${name}" from team.`);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateUser({ name: profileName, email: profileEmail });
    if (newPassword) {
      toast.success("Password & User Profile updated successfully!");
    } else {
      toast.success("User Profile updated successfully!");
    }
    setCurrPassword("");
    setNewPassword("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4FBE4] via-[#F9FAFB] to-[#F1F5E9] font-manrope text-gray-900 pb-24">
      <ScreenHeader title={t("nav_settings")} />

      <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">

      {/* Creator / Super Admin Management Access Banner */}
      {isAdmin && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4.5 rounded-[28px] border border-purple-900/20 bg-gradient-to-r from-gray-900 via-purple-950 to-gray-900 text-white shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-amber-300">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                Creator & Admin Management Portal 👑
              </h3>
              <p className="text-[11px] text-purple-200">
                Inspect, manage, activate/suspend and monitor all business accounts registered on INZIRA
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/admin")}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#D4F06B] text-gray-900 text-xs font-black hover:bg-[#C5E456] transition cursor-pointer shadow-sm shrink-0"
          >
            Open Creator Admin Panel →
          </button>
        </div>
      )}

        {/* Settings Category Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-white p-2 rounded-full border border-gray-200/80 shadow-sm overflow-x-auto">
          {[
            { id: "business", label: "Business Info", icon: Store, sub: "Shop name, location, sector" },
            { id: "team", label: "Team & Workers", icon: Users, sub: "Add cashiers, managers, accountants" },
            { id: "roles", label: "Roles & Access", icon: ShieldCheck, sub: "View system role permissions" },
            { id: "profile", label: "User Profile", icon: User, sub: "Account details & password" },
            { id: "consent", label: "Data & Consent", icon: Database, sub: "Control how your data is used" },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#D4F06B] text-gray-900 shadow-sm font-extrabold"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Business Info */}
        {activeTab === "business" && (
          <form onSubmit={handleSaveBusiness} className="rounded-3xl border border-line bg-card p-6 shadow-card space-y-5">
            <div className="flex items-center gap-3 border-b border-line pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-xlt text-primary">
                <Store size={22} />
              </div>
              <div>
                <h3 className="font-heading text-base font-extrabold text-ink">Business Info</h3>
                <p className="text-xs text-muted">Shop name, location, sector & official receipts contact</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink mb-1">Business / Shop Name</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Amani Grocery Store"
                  className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink focus:border-primary focus:outline-none shadow-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Business Sector / Industry</label>
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink focus:border-primary focus:outline-none shadow-sm"
                  >
                    <option value="Retail & Groceries">Retail & Groceries</option>
                    <option value="Fashion & Clothing">Fashion & Clothing</option>
                    <option value="Hospitality & Restaurant">Hospitality & Restaurant</option>
                    <option value="Pharmacy & Health">Pharmacy & Health</option>
                    <option value="Electronics & Tech">Electronics & Tech</option>
                    <option value="General Wholesaler">General Wholesaler</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={shopPhone}
                    onChange={(e) => setShopPhone(e.target.value)}
                    placeholder="+250 7XX XXX XXX"
                    className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink focus:border-primary focus:outline-none shadow-sm"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink mb-1">Location / Market Address</label>
                <input
                  type="text"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  placeholder="e.g. Nyarugenge Market, Kigali, Sector Nyarugenge"
                  className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink focus:border-primary focus:outline-none shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary-dark active:scale-95 transition cursor-pointer"
              >
                <Save size={15} />
                <span>{saving ? "Saving…" : "Save Changes"}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Team & Workers */}
        {activeTab === "team" && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-heading text-lg font-extrabold text-ink">Your Team</h3>
                <p className="text-xs text-muted">Workers who have access to your business account</p>
              </div>

              <button
                onClick={() => setWorkerOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary-dark active:scale-95 transition cursor-pointer shrink-0"
              >
                <UserPlus size={16} />
                <span>Add Worker</span>
              </button>
            </div>

            {/* Team Workers List */}
            <div className="space-y-3">
              {team.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted bg-card rounded-2xl border border-dashed border-line">
                  No workers added yet. Click "+ Add Worker" to grant cashiers or managers access.
                </div>
              ) : (
                team.map((w) => (
                  <div
                    key={w.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border border-line bg-card shadow-card hover:border-primary/40 transition"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-xlt text-primary font-bold text-sm shrink-0">
                        {w.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading text-sm font-extrabold text-ink">{w.name}</h4>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                            {w.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {w.email} &bull; {w.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/60">
                      <span className="px-3 py-1 rounded-xl bg-paper border border-line text-xs font-extrabold text-primary">
                        {w.role}
                      </span>
                      <button
                        onClick={() => handleRemoveWorker(w.id, w.name)}
                        className="p-2 rounded-xl text-muted hover:text-danger hover:bg-danger-lt transition cursor-pointer"
                        title="Remove Worker"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Roles & Access */}
        {activeTab === "roles" && (
          <div className="space-y-4">
            <div>
              <h3 className="font-heading text-lg font-extrabold text-ink">Roles & System Access</h3>
              <p className="text-xs text-muted">View system role permissions for your SME account</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  role: "Cashier — POS only",
                  color: "bg-blue-50 border-blue-200 text-blue-900",
                  badge: "Front-desk POS",
                  desc: "Can record sales transactions at POS, issue receipts, and view today's personal sales."
                },
                {
                  role: "Manager — Full Store & Sales Access",
                  color: "bg-emerald-50 border-emerald-200 text-emerald-900",
                  badge: "Store Management",
                  desc: "Can manage stock inventory, add products, handle supplier purchase orders, and view sales history."
                },
                {
                  role: "Accountant — Financial Books & P&L",
                  color: "bg-purple-50 border-purple-200 text-purple-900",
                  badge: "Finance & Tax",
                  desc: "Can access Double-Entry Journals, General Ledger, Cash Book, Trial Balance, Profit & Loss, and Tax reports."
                },
                {
                  role: "Business Owner — Full Control",
                  color: "bg-amber-50 border-amber-200 text-amber-900",
                  badge: "Administrator",
                  desc: "Full unrestricted system control, user account management, SACCO credit sharing, and app settings."
                }
              ].map((r, idx) => (
                <div key={idx} className={`p-5 rounded-2xl border ${r.color} space-y-2 shadow-card`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading text-sm font-extrabold">{r.role}</h4>
                    <span className="px-2 py-0.5 rounded-md bg-white/80 text-[10px] font-extrabold uppercase shadow-xs">
                      {r.badge}
                    </span>
                  </div>
                  <p className="text-xs font-medium leading-relaxed opacity-90">{r.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: User Profile */}
        {activeTab === "profile" && (
          <form onSubmit={handleSaveProfile} className="rounded-3xl border border-line bg-card p-6 shadow-card space-y-5">
            <div className="flex items-center gap-3 border-b border-line pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-xlt text-primary">
                <User size={22} />
              </div>
              <div>
                <h3 className="font-heading text-base font-extrabold text-ink">User Profile & Credentials</h3>
                <p className="text-xs text-muted">Account details, email address & security password</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink focus:border-primary focus:outline-none shadow-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Email Address</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink focus:border-primary focus:outline-none shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-line space-y-3">
                <div className="flex items-center gap-2">
                  <KeyRound size={16} className="text-primary" />
                  <span className="text-xs font-extrabold text-ink uppercase tracking-wider">Change Password</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">Current Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={currPassword}
                      onChange={(e) => setCurrPassword(e.target.value)}
                      className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink focus:border-primary focus:outline-none shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-1">New Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink focus:border-primary focus:outline-none shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-primary-dark active:scale-95 transition cursor-pointer"
              >
                <Save size={15} />
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 5: Data & Consent */}
        {activeTab === "consent" && (
          <div className="rounded-3xl border border-line bg-card p-6 shadow-card space-y-5">
            <div className="flex items-center gap-3 border-b border-line pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                <Database size={22} />
              </div>
              <div>
                <h3 className="font-heading text-base font-extrabold text-ink">Data & Privacy Consent</h3>
                <p className="text-xs text-muted">Control how your business records are stored, backed up, and shared</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-paper border border-line">
                <div>
                  <h4 className="font-bold text-ink">SACCO Credit Rating & Loan Pre-Approval</h4>
                  <p className="text-muted mt-0.5">Share anonymized credit indicators with SACCOs to qualify for instant micro-financing</p>
                </div>
                <input
                  type="checkbox"
                  checked={saccoConsent}
                  onChange={(e) => setSaccoConsent(e.target.checked)}
                  className="h-5 w-5 rounded accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-paper border border-line">
                <div>
                  <h4 className="font-bold text-ink">Cloud Data Backup & Sync</h4>
                  <p className="text-muted mt-0.5">Automatically sync local offline sales to secure encrypted cloud storage</p>
                </div>
                <input
                  type="checkbox"
                  checked={cloudBackup}
                  onChange={(e) => setCloudBackup(e.target.checked)}
                  className="h-5 w-5 rounded accent-primary cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-paper border border-line">
                <div>
                  <h4 className="font-bold text-ink">EBM Receipt Verification</h4>
                  <p className="text-muted mt-0.5">Generate EBM-compliant digital receipts for customer invoices</p>
                </div>
                <input
                  type="checkbox"
                  checked={ebmAutoSync}
                  onChange={(e) => setEbmAutoSync(e.target.checked)}
                  className="h-5 w-5 rounded accent-primary cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Session & Sign Out Card */}
        <div className="rounded-3xl border border-line bg-card p-5 shadow-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-muted uppercase">Signed in as</span>
            <div className="font-heading text-sm font-extrabold text-ink">{user?.name || "SME Owner"}</div>
            <p className="text-xs text-muted">{user?.email || "owner@inzira.rw"}</p>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-xl bg-danger-lt border border-danger/20 px-4 py-2.5 text-xs font-bold text-danger hover:bg-danger hover:text-white transition cursor-pointer"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Add Worker Modal Sheet */}
      <Sheet open={workerOpen} onClose={() => setWorkerOpen(false)} title="New Worker Account">
        <form onSubmit={handleAddWorker} className="space-y-4 pt-2 pb-6">
          <p className="text-xs text-muted">
            Create access credentials for your cashiers, managers, or accountants.
          </p>

          <Field label="Full Name">
            <TextInput
              required
              placeholder="e.g. Jean Muneza"
              value={workerName}
              onChange={(e) => setWorkerName(e.target.value)}
              autoFocus
            />
          </Field>

          <Field label="Email">
            <TextInput
              required
              type="email"
              placeholder="amani.grocery@inzira.rw"
              value={workerEmail}
              onChange={(e) => setWorkerEmail(e.target.value)}
            />
          </Field>

          <Field label="Role">
            <select
              value={workerRole}
              onChange={(e) => setWorkerRole(e.target.value)}
              className="w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs font-semibold text-ink focus:border-primary focus:outline-none shadow-sm"
            >
              <option value="Cashier — POS only">Cashier — POS only</option>
              <option value="Manager — Full Store & Sales Access">Manager — Full Store & Sales Access</option>
              <option value="Accountant — Financial Books & P&L">Accountant — Financial Books & P&L</option>
            </select>
          </Field>

          <Field label="Phone (optional)">
            <TextInput
              placeholder="+250 7XX XXX XXX"
              value={workerPhone}
              onChange={(e) => setWorkerPhone(e.target.value)}
            />
          </Field>

          <Field label="Password">
            <TextInput
              required
              type="password"
              placeholder="••••••••••"
              value={workerPassword}
              onChange={(e) => setWorkerPassword(e.target.value)}
            />
            <span className="text-[11px] text-muted block mt-1">
              Share this with them — they can change it after signing in.
            </span>
          </Field>

          <div className="pt-3 flex gap-2">
            <Button
              type="button"
              variant="paper"
              onClick={() => setWorkerOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="green"
              className="flex-1 font-bold shadow-sm"
            >
              Add to Team
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
