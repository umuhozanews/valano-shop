import { useState, useEffect, useCallback } from "react";
import { Store, Shield, Check, Factory, Home, User, Plus, Edit, Users, Package, Lock, Copy } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import { useBusiness } from "../../context/BusinessContext";
import { formatRWF } from "../../utils/formatters";

export default function SettingsPage() {
  const { t } = useLanguage();
  const { activeBusiness } = useBusiness();
  const [activeSection, setActiveSection] = useState("business");
  const [business, setBusiness] = useState({ name: "", address: "", phone: "", low_stock: 5, commission: 5, footer: "" });
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Shop Management State
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchWorkers, setBranchWorkers] = useState([]);
  const [branchStock, setBranchStock] = useState([]);
  const [loadingBranchDetails, setLoadingBranchDetails] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("staff"); // "staff" or "stock"

  // Modals
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);

  // Forms
  const [branchForm, setBranchForm] = useState({ name: "", location: "", phone: "" });
  const [workerForm, setWorkerForm] = useState({ name: "", email: "", phone: "", role: "worker", password: "", monthly_target: "0", commission_rate: "5" });
  const [stockForm, setStockForm] = useState({ name: "", category: "", size: "", color: "", quantity: "0", cost_price_rwf: "0", sell_price_rwf: "0", low_stock_threshold: "5" });
  const [cloneSourceBranchId, setCloneSourceBranchId] = useState("");

  const [editingBranch, setEditingBranch] = useState(null);
  const [editingWorker, setEditingWorker] = useState(null);

  const isIndustry = activeBusiness.type === "industry";
  const isRealEstate = activeBusiness.type === "real_estate";

  const SECTIONS = [
    { key: "business", label: t("business_info"), icon: isIndustry ? Factory : isRealEstate ? Home : Store, desc: "Manage shop details" },
    { key: "shops", label: "Shops & Access Control", icon: Store, desc: "Configure shops, staff & credentials" },
    { key: "profile", label: "User Profile", icon: User, desc: "Edit account info & password" },
    { key: "roles", label: t("roles_permissions"), icon: Shield, desc: "View system roles" },
  ];

  const ROLES = [
    { role: "admin", label: "Admin (Owner)", desc: "Full access to all modules including P&L, settings, and all reports", color: "bg-danger/10 text-danger" },
    { role: "manager", label: "Manager", desc: "Sales, stock, workers, procurement, customers, invoices — all except settings and owner P&L", color: "bg-warning/10 text-warning" },
    { role: "worker", label: "Worker", desc: "Record sales only — limited to POS screen and own sales history", color: "bg-neutral/10 text-text-secondary" },
  ];

  const fetchSettings = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/settings"),
      api.get("/auth/me")
    ]).then(([settingsRes, userRes]) => {
      const s = settingsRes.data.settings || {};
      setBusiness({
        name: s.shop_name || "",
        address: s.shop_address || "",
        phone: s.shop_phone || "",
        low_stock: s.default_low_stock_threshold || 5,
        commission: s.default_commission_rate || 5,
        footer: s.invoice_footer_text || "",
      });
      setBranches(settingsRes.data.branches || []);

      const u = userRes.data || {};
      setProfile({
        name: u.name || "",
        email: u.email || "",
        phone: u.phone || "",
      });
    }).catch(() => {
      toast.error(t("error"));
    }).finally(() => {
      setLoading(false);
    });
  }, [t]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Fetch workers & stock for selected branch
  const fetchBranchDetails = useCallback(async (branchId) => {
    setLoadingBranchDetails(true);
    try {
      const [workersRes, stockRes] = await Promise.all([
        api.get("/workers", { params: { branch_id: branchId } }),
        api.get("/stock", { params: { branch_id: branchId, limit: 100 } })
      ]);
      setBranchWorkers(workersRes.data || []);
      setBranchStock(stockRes.data?.data || stockRes.data || []);
    } catch {
      toast.error("Failed to load shop details");
    } finally {
      setLoadingBranchDetails(false);
    }
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetchBranchDetails(selectedBranch.id);
    }
  }, [selectedBranch, fetchBranchDetails]);

  async function saveBusiness() {
    setSaving(true);
    try {
      await api.put("/settings", {
        shop_name: business.name,
        shop_address: business.address,
        shop_phone: business.phone,
        default_low_stock_threshold: parseInt(business.low_stock) || 5,
        default_commission_rate: parseFloat(business.commission) || 5,
        invoice_footer_text: business.footer,
      });
      toast.success(t("success"));
    } catch {
      toast.error(t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    try {
      await api.put("/auth/me/profile", {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
      });
      toast.success(t("success"));
    } catch (err) {
      toast.error(err.response?.data?.error || t("error"));
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error("Passwords do not match");
    }
    setSaving(true);
    try {
      await api.put("/auth/me/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success("Password updated successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      toast.error(err.response?.data?.error || t("error"));
    } finally {
      setSaving(false);
    }
  }

  // Branch CRUD handlers
  async function handleSaveBranch() {
    if (!branchForm.name) return toast.error("Shop name is required");
    setSaving(true);
    try {
      if (editingBranch) {
        const { data } = await api.put(`/settings/branches/${editingBranch.id}`, branchForm);
        setBranches(prev => prev.map(b => b.id === editingBranch.id ? { ...b, ...data } : b));
        if (selectedBranch?.id === editingBranch.id) {
          setSelectedBranch(prev => ({ ...prev, ...data }));
        }
        toast.success("Shop updated successfully");
      } else {
        const { data } = await api.post("/settings/branches", branchForm);
        setBranches(prev => [...prev, data]);
        toast.success("New shop created successfully");
      }
      setShowBranchModal(false);
      setEditingBranch(null);
      setBranchForm({ name: "", location: "", phone: "" });
    } catch {
      toast.error("Failed to save shop");
    } finally {
      setSaving(false);
    }
  }

  // Worker CRUD handlers
  async function handleSaveWorker() {
    if (!workerForm.name || !workerForm.email) {
      return toast.error("Name and Email are required");
    }
    if (!editingWorker && !workerForm.password) {
      return toast.error("Password is required for new accounts");
    }
    setSaving(true);
    try {
      if (editingWorker) {
        const { data } = await api.put(`/workers/${editingWorker.id}`, {
          ...workerForm,
          branch_id: selectedBranch.id
        });
        setBranchWorkers(prev => prev.map(w => w.id === editingWorker.id ? data : w));
        toast.success("Staff profile updated");
      } else {
        const { data } = await api.post("/workers", {
          ...workerForm,
          branch_id: selectedBranch.id
        });
        setBranchWorkers(prev => [...prev, data]);
        toast.success("Staff account created successfully");
      }
      setShowWorkerModal(false);
      setEditingWorker(null);
      setWorkerForm({ name: "", email: "", phone: "", role: "worker", password: "", monthly_target: "0", commission_rate: "5" });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save staff member");
    } finally {
      setSaving(false);
    }
  }

  // Stock additions
  async function handleSaveStock() {
    if (!stockForm.name) return toast.error("Product name is required");
    setSaving(true);
    try {
      const { data } = await api.post("/stock", {
        ...stockForm,
        branch_id: selectedBranch.id
      });
      setBranchStock(prev => [data, ...prev]);
      toast.success("Product added to shop catalog");
      setShowStockModal(false);
      setStockForm({ name: "", category: "", size: "", color: "", quantity: "0", cost_price_rwf: "0", sell_price_rwf: "0", low_stock_threshold: "5" });
    } catch {
      toast.error("Failed to add product");
    } finally {
      setSaving(false);
    }
  }

  // Clone stock catalog
  async function handleCloneStock() {
    if (!cloneSourceBranchId) return toast.error("Please select a source shop");
    setSaving(true);
    try {
      await api.post(`/settings/branches/${selectedBranch.id}/clone-stock`, {
        from_branch_id: parseInt(cloneSourceBranchId)
      });
      toast.success("Stock catalog cloned successfully!");
      fetchBranchDetails(selectedBranch.id);
      setShowCloneModal(false);
    } catch {
      toast.error("Failed to clone catalog");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageWrapper title={t("settings")} subtitle={activeBusiness.name}
      breadcrumbs={[{ label: t("settings"), path: "/app/settings" }]}>

      <div className="flex gap-4">
        {/* Sidebar nav */}
        <div className="w-56 shrink-0">
          <Card className="p-2">
            <nav className="space-y-1">
              {SECTIONS.map(s => {
                const Icon = s.icon;
                return (
                  <button key={s.key} onClick={() => setActiveSection(s.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-card text-left transition-colors ${activeSection === s.key ? "bg-primary/10 text-primary" : "hover:bg-background text-text-secondary"}`}>
                    <Icon size={16} className="shrink-0" />
                    <div className="min-w-0">
                      <p className={`text-[13px] font-semibold ${activeSection === s.key ? "text-primary" : "text-text-primary"}`}>{s.label}</p>
                      <p className="text-[11px] text-text-secondary truncate">{s.desc}</p>
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
              <div className="h-64 bg-surface rounded-card" />
            </div>
          ) : (
            <>
              {activeSection === "business" && (
                <Card title={t("business_info")} subtitle="Update core shop settings">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="col-span-2">
                      <Input label={t("shop_name")} value={business.name} onChange={e => setBusiness(b => ({ ...b, name: e.target.value }))} />
                    </div>
                    <div className="col-span-2">
                      <Input label="Shop Address" value={business.address} onChange={e => setBusiness(b => ({ ...b, address: e.target.value }))} />
                    </div>
                    <Input label={t("phone")} value={business.phone} onChange={e => setBusiness(b => ({ ...b, phone: e.target.value }))} />
                    <Input label="Low Stock Alert Threshold" type="number" value={business.low_stock} onChange={e => setBusiness(b => ({ ...b, low_stock: e.target.value }))} />
                    <Input label="Default Commission Rate (%)" type="number" value={business.commission} onChange={e => setBusiness(b => ({ ...b, commission: e.target.value }))} />
                    <div className="col-span-2">
                      <label className="block text-[13px] font-medium text-text-primary mb-1">Invoice Footer Text</label>
                      <textarea value={business.footer} onChange={e => setBusiness(b => ({ ...b, footer: e.target.value }))} rows={2}
                        className="w-full p-2 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>
                  <Button loading={saving} onClick={saveBusiness}>{t("save")}</Button>
                </Card>
              )}

              {activeSection === "shops" && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                  
                  {/* Left Column: Shops List */}
                  <div className="xl:col-span-4 space-y-4">
                    <Card 
                      title="Active Shops" 
                      action={
                        <Button size="sm" icon={Plus} onClick={() => {
                          setEditingBranch(null);
                          setBranchForm({ name: "", location: "", phone: "" });
                          setShowBranchModal(true);
                        }}>
                          Add Shop
                        </Button>
                      }
                    >
                      <div className="space-y-2 mt-2">
                        {branches.map(b => (
                          <button
                            key={b.id}
                            onClick={() => setSelectedBranch(b)}
                            className={`w-full text-left p-3 rounded-card border transition-all ${selectedBranch?.id === b.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-surface hover:bg-background"}`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-semibold text-[13px] text-text-primary">{b.name}</span>
                              <Badge status="neutral" label={`${b.worker_count || 0} active staff`} />
                            </div>
                            <p className="text-[11px] text-text-secondary mt-1 truncate">{b.location || "No address specs"}</p>
                          </button>
                        ))}
                        {branches.length === 0 && (
                          <div className="text-center py-6 text-[12px] text-text-secondary">No shops created.</div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Right Column: Shop Detail Dashboard */}
                  <div className="xl:col-span-8">
                    {selectedBranch ? (
                      <div className="space-y-4">
                        {/* Shop Metadata Card */}
                        <Card 
                          title={selectedBranch.name} 
                          subtitle={`Address: ${selectedBranch.location || "—"} | Tel: ${selectedBranch.phone || "—"}`}
                          action={
                            <Button size="sm" variant="secondary" icon={Edit} onClick={() => {
                              setEditingBranch(selectedBranch);
                              setBranchForm({ name: selectedBranch.name, location: selectedBranch.location || "", phone: selectedBranch.phone || "" });
                              setShowBranchModal(true);
                            }}>
                              Edit Specs
                            </Button>
                          }
                        >
                          {/* Tabs */}
                          <div className="flex border-b border-border mt-2">
                            <button 
                              onClick={() => setActiveSubTab("staff")}
                              className={`px-4 py-2 text-[13px] font-semibold flex items-center gap-1.5 border-b-2 transition-all ${activeSubTab === "staff" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
                            >
                              <Users size={14} /> Staff & Login Credentials
                            </button>
                            <button 
                              onClick={() => setActiveSubTab("stock")}
                              className={`px-4 py-2 text-[13px] font-semibold flex items-center gap-1.5 border-b-2 transition-all ${activeSubTab === "stock" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
                            >
                              <Package size={14} /> Shop Stock Catalog
                            </button>
                          </div>

                          {/* Tab Content */}
                          <div className="pt-4">
                            {loadingBranchDetails ? (
                              <div className="animate-pulse space-y-3">
                                <div className="h-24 bg-border rounded-card" />
                                <div className="h-24 bg-border rounded-card" />
                              </div>
                            ) : (
                              <>
                                {/* STAFF TAB */}
                                {activeSubTab === "staff" && (
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                      <p className="text-[12px] text-text-secondary">Workers logging in here will see resources filtered to this shop.</p>
                                      <Button size="sm" icon={Plus} onClick={() => {
                                        setEditingWorker(null);
                                        setWorkerForm({ name: "", email: "", phone: "", role: "worker", password: "", monthly_target: "0", commission_rate: "5" });
                                        setShowWorkerModal(true);
                                      }}>
                                        Add Staff Account
                                      </Button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                      {branchWorkers.map(w => (
                                        <div key={w.id} className="border border-border rounded-card p-3 bg-surface hover:shadow-sm transition-all relative">
                                          <div className="flex justify-between items-start mb-2">
                                            <div>
                                              <p className="font-bold text-[13px] text-text-primary">{w.name}</p>
                                              <p className="text-[11px] text-text-secondary font-mono flex items-center gap-1 mt-0.5"><Lock size={10} /> {w.email}</p>
                                            </div>
                                            <Badge status={w.role === "manager" ? "warning" : "neutral"} label={w.role} />
                                          </div>
                                          <div className="flex justify-between items-center pt-2 border-t border-border/50 text-[11px] text-text-secondary">
                                            <span>Target: {formatRWF(w.monthly_target)}</span>
                                            <button 
                                              onClick={() => {
                                                setEditingWorker(w);
                                                setWorkerForm({ name: w.name, email: w.email, phone: w.phone || "", role: w.role, password: "", monthly_target: String(w.monthly_target), commission_rate: String(w.commission_rate) });
                                                setShowWorkerModal(true);
                                              }} 
                                              className="text-primary font-semibold hover:underline"
                                            >
                                              Manage
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                      {branchWorkers.length === 0 && (
                                        <div className="col-span-2 text-center py-8 text-[12px] text-text-secondary border border-dashed rounded-card">
                                          No staff accounts assigned to this shop. Add accounts so staff can log in.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* STOCK TAB */}
                                {activeSubTab === "stock" && (
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                      <p className="text-[12px] text-text-secondary">Individual product stock quantities and prices scoped for this branch.</p>
                                      <div className="flex gap-2">
                                        <Button size="sm" variant="secondary" icon={Copy} onClick={() => {
                                          setCloneSourceBranchId("");
                                          setShowCloneModal(true);
                                        }}>
                                          Clone Catalog Template
                                        </Button>
                                        <Button size="sm" icon={Plus} onClick={() => {
                                          setStockForm({ name: "", category: "", size: "", color: "", quantity: "0", cost_price_rwf: "0", sell_price_rwf: "0", low_stock_threshold: "5" });
                                          setShowStockModal(true);
                                        }}>
                                          Add Custom Product
                                        </Button>
                                      </div>
                                    </div>

                                    <Table 
                                      data={branchStock}
                                      emptyMessage="No stock items created for this shop yet. Use 'Add Custom' or clone catalog from another branch."
                                      columns={[
                                        { key: "name", label: "Product", render: (v, r) => (
                                          <div>
                                            <p className="font-semibold text-text-primary text-[12px]">{v}</p>
                                            <p className="text-[10px] text-text-secondary">{r.barcode}</p>
                                          </div>
                                        )},
                                        { key: "quantity", label: "Qty", render: v => <span className="font-bold">{v}</span> },
                                        { key: "sell_price_rwf", label: "Sell Price", render: v => formatRWF(v) },
                                        { key: "low_stock_threshold", label: "Alert Limit", render: v => <span className="text-text-secondary font-mono">{v}</span> }
                                      ]}
                                    />
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </Card>
                      </div>
                    ) : (
                      <Card className="text-center py-16">
                        <Store size={48} className="mx-auto text-text-secondary opacity-30 mb-3" />
                        <h4 className="text-[15px] font-bold text-text-primary mb-1">Select a shop</h4>
                        <p className="text-[12px] text-text-secondary max-w-sm mx-auto">Click one of the shops on the left side to customize specifications, create staff credentials, configure logins, and stock products.</p>
                      </Card>
                    )}
                  </div>
                </div>
              )}

              {activeSection === "profile" && (
                <div className="space-y-6">
                  {/* Edit Profile */}
                  <Card title="Account Profile" subtitle="Update your personal details">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="col-span-2">
                        <Input label="Real Name" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                      </div>
                      <Input label="Email Address" type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
                      <Input label="Phone Number" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                    <Button loading={saving} onClick={saveProfile}>{t("save")}</Button>
                  </Card>

                  {/* Change Password */}
                  <Card title="Change Password" subtitle="Set a new secure password for logging in">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <Input label="Current Password" type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))} />
                      <Input label="New Password" type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} />
                      <Input label="Confirm New Password" type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))} />
                    </div>
                    <Button loading={saving} onClick={changePassword}>Update Password</Button>
                  </Card>
                </div>
              )}

              {activeSection === "roles" && (
                <Card title={t("roles_permissions")} subtitle="Access control list mapping">
                  <div className="space-y-4">
                    {ROLES.map(r => (
                      <div key={r.role} className="p-4 border border-border rounded-card">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-2.5 py-1 rounded-badge text-[11px] font-bold uppercase ${r.color}`}>{r.label}</span>
                        </div>
                        <p className="text-[13px] text-text-secondary">{r.desc}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {["Dashboard", "Stock", "Sales", "Procurement", "Workers", "Customers", "Suppliers", "Invoices", "Expenses", "P&L", "Reports", "Settings"].map(mod => {
                            const allowed = r.role === "admin" ? true : r.role === "manager" ? mod !== "Settings" && mod !== "P&L" : mod === "Sales";
                            return (
                              <div key={mod} className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${allowed ? "bg-success" : "bg-border"}`}>
                                  {allowed && <Check size={10} className="text-white" />}
                                </div>
                                <span className={`text-[12px] ${allowed ? "text-text-primary" : "text-text-secondary line-through"}`}>{mod}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* BRANCH MODAL */}
      <Modal 
        open={showBranchModal} 
        onClose={() => setShowBranchModal(false)} 
        title={editingBranch ? "Edit Shop Specifications" : "Create New Shop"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBranchModal(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSaveBranch}>Save Shop</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input 
            label="Shop Name" 
            placeholder="e.g. Kigali Heights Retail" 
            value={branchForm.name} 
            onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} 
            required 
          />
          <Input 
            label="Shop Location / Specification" 
            placeholder="e.g. Gikondo Commercial Block A" 
            value={branchForm.location} 
            onChange={e => setBranchForm({ ...branchForm, location: e.target.value })} 
          />
          <Input 
            label="Contact Phone" 
            placeholder="+250788111222" 
            value={branchForm.phone} 
            onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })} 
          />
        </div>
      </Modal>

      {/* STAFF / WORKER MODAL */}
      <Modal
        open={showWorkerModal}
        onClose={() => setShowWorkerModal(false)}
        title={editingWorker ? `Manage Profile: ${editingWorker.name}` : "Create Staff Credentials"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowWorkerModal(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSaveWorker}>{editingWorker ? "Save Profile" : "Create Login"}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input 
            label="Worker Real Name" 
            placeholder="Jane Doe" 
            value={workerForm.name} 
            onChange={e => setWorkerForm({ ...workerForm, name: e.target.value })} 
            required 
          />
          <Input 
            label="Email Address (Login Username)" 
            type="email" 
            placeholder="jane@valano.rw" 
            value={workerForm.email} 
            onChange={e => setWorkerForm({ ...workerForm, email: e.target.value })} 
            required 
          />
          <Input 
            label="Worker Phone" 
            placeholder="+250788999999" 
            value={workerForm.phone} 
            onChange={e => setWorkerForm({ ...workerForm, phone: e.target.value })} 
          />
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-text-primary mb-1">Access Permissions Role</label>
              <select 
                value={workerForm.role} 
                onChange={e => setWorkerForm({ ...workerForm, role: e.target.value })}
                className="w-full h-9 px-3 border border-border rounded-card text-[13px] bg-surface"
              >
                <option value="worker">Worker (POS only)</option>
                <option value="manager">Manager (Shop CRUD)</option>
              </select>
            </div>
            <Input 
              label={editingWorker ? "New Password (optional)" : "Password (min 6 chars)"} 
              type="password" 
              placeholder="••••••••" 
              value={workerForm.password} 
              onChange={e => setWorkerForm({ ...workerForm, password: e.target.value })} 
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
            <Input 
              label="Monthly Sales Target (RWF)" 
              type="number" 
              value={workerForm.monthly_target} 
              onChange={e => setWorkerForm({ ...workerForm, monthly_target: e.target.value })} 
            />
            <Input 
              label="Commission Rate (%)" 
              type="number" 
              value={workerForm.commission_rate} 
              onChange={e => setWorkerForm({ ...workerForm, commission_rate: e.target.value })} 
            />
          </div>
        </div>
      </Modal>

      {/* CUSTOM STOCK MODAL */}
      <Modal
        open={showStockModal}
        onClose={() => setShowStockModal(false)}
        title="Add Product to Shop Catalog"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowStockModal(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSaveStock}>Create Product</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input 
            label="Product Name" 
            placeholder="e.g. Classic Puffer" 
            value={stockForm.name} 
            onChange={e => setStockForm({ ...stockForm, name: e.target.value })} 
            required 
          />
          <div className="grid grid-cols-3 gap-3">
            <Input 
              label="Category" 
              placeholder="e.g. Jackets" 
              value={stockForm.category} 
              onChange={e => setStockForm({ ...stockForm, category: e.target.value })} 
            />
            <Input 
              label="Size" 
              placeholder="M" 
              value={stockForm.size} 
              onChange={e => setStockForm({ ...stockForm, size: e.target.value })} 
            />
            <Input 
              label="Color" 
              placeholder="Black" 
              value={stockForm.color} 
              onChange={e => setStockForm({ ...stockForm, color: e.target.value })} 
            />
          </div>
          <div className="grid grid-cols-4 gap-2 border-t border-border/50 pt-2">
            <div className="col-span-1">
              <Input 
                label="Qty" 
                type="number" 
                value={stockForm.quantity} 
                onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} 
              />
            </div>
            <div className="col-span-1">
              <Input 
                label="Alert Limit" 
                type="number" 
                value={stockForm.low_stock_threshold} 
                onChange={e => setStockForm({ ...stockForm, low_stock_threshold: e.target.value })} 
              />
            </div>
            <div className="col-span-1">
              <Input 
                label="Cost (RWF)" 
                type="number" 
                value={stockForm.cost_price_rwf} 
                onChange={e => setStockForm({ ...stockForm, cost_price_rwf: e.target.value })} 
              />
            </div>
            <div className="col-span-1">
              <Input 
                label="Sell (RWF)" 
                type="number" 
                value={stockForm.sell_price_rwf} 
                onChange={e => setStockForm({ ...stockForm, sell_price_rwf: e.target.value })} 
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* CLONE STOCK MODAL */}
      <Modal
        open={showCloneModal}
        onClose={() => setShowCloneModal(false)}
        title="Copy Shop Catalog Template"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCloneModal(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleCloneStock}>Copy Products</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[13px] text-text-secondary leading-relaxed">
            This will copy all product definitions (name, category, size, color, cost, and sell price) from another shop to <strong>{selectedBranch?.name}</strong>. Products will be initialized with a starting quantity of 0.
          </p>
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1">Select Source Shop</label>
            <select 
              value={cloneSourceBranchId} 
              onChange={e => setCloneSourceBranchId(e.target.value)}
              className="w-full h-9 px-3 border border-border rounded-card text-[13px] bg-surface"
            >
              <option value="">-- Choose shop catalog to copy --</option>
              {branches.filter(b => b.id !== selectedBranch?.id).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
