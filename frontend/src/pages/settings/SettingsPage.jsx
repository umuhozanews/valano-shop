import { useState } from "react";
import { Store, MapPin, Users, Bell, Shield, Palette, ChevronRight, Check, Plus, Trash2 } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";

const SECTIONS = [
  { key:"business",      label:"Business Info",    icon:Store,   desc:"Name, logo, contacts" },
  { key:"branches",      label:"Branches",          icon:MapPin,  desc:"Manage locations" },
  { key:"roles",         label:"Roles & Access",    icon:Shield,  desc:"Permission settings" },
  { key:"notifications", label:"Notifications",     icon:Bell,    desc:"Alert preferences" },
];

const BRANCHES_INIT = [
  { id:1, name:"Nyabugogo",  address:"Nyabugogo Bus Terminal, Kigali",  manager:"Habimana Jean Pierre", phone:"0788112233" },
  { id:2, name:"Kimironko",  address:"Kimironko Market, Kigali",        manager:"Mukamana Alice",        phone:"0788556677" },
];

const ROLES = [
  { role:"admin",   label:"Admin (Owner)",  desc:"Full access to all modules including P&L, settings, and all reports", color:"bg-danger/10 text-danger" },
  { role:"manager", label:"Manager",        desc:"Sales, stock, workers, procurement, customers, invoices — all except settings and owner P&L", color:"bg-warning/10 text-warning" },
  { role:"worker",  label:"Worker",         desc:"Record sales only — limited to POS screen and own sales history", color:"bg-neutral/10 text-text-secondary" },
];

const NOTIF_PREFS = [
  { key:"low_stock",   label:"Low Stock Alerts",        default:true },
  { key:"large_sale",  label:"Large Sale Notifications", default:true },
  { key:"daily_summary",label:"Daily Summary Report",   default:false },
  { key:"procurement", label:"Procurement Status Updates",default:true },
  { key:"worker_login",label:"Worker Login Alerts",     default:false },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("business");
  const [business, setBusiness] = useState({ name:"KNOTTY SYSTEM", owner:"Rukundo joseph", phone:"0788000111", email:"info@valano.rw", city:"Kigali", currency:"RWF" });
  const [branches, setBranches] = useState(BRANCHES_INIT);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [branchForm, setBranchForm] = useState({ name:"", address:"", manager:"", phone:"" });
  const [notifPrefs, setNotifPrefs] = useState(Object.fromEntries(NOTIF_PREFS.map(n => [n.key, n.default])));
  const [saving, setSaving] = useState(false);

  async function saveSection() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    toast.success("Settings saved successfully");
  }

  function addBranch() {
    setBranches(b => [...b, { id: Date.now(), ...branchForm }]);
    setShowBranchModal(false);
    setBranchForm({ name:"", address:"", manager:"", phone:"" });
    toast.success("Branch added");
  }

  function deleteBranch(id) {
    if (!confirm("Remove this branch?")) return;
    setBranches(b => b.filter(x => x.id !== id));
    toast.success("Branch removed");
  }

  return (
    <PageWrapper title="Settings" subtitle="System configuration and preferences"
      breadcrumbs={[{ label:"Settings", path:"/app/settings" }]}>

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
                      <p className={`text-[13px] font-medium ${activeSection === s.key ? "text-primary" : "text-text-primary"}`}>{s.label}</p>
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

          {activeSection === "business" && (
            <Card title="Business Information" subtitle="Core details about your shop">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="col-span-2">
                  <Input label="Business Name" value={business.name} onChange={e => setBusiness(b => ({...b, name:e.target.value}))} />
                </div>
                <Input label="Owner Name" value={business.owner} onChange={e => setBusiness(b => ({...b, owner:e.target.value}))} />
                <Input label="Phone Number" value={business.phone} onChange={e => setBusiness(b => ({...b, phone:e.target.value}))} />
                <Input label="Email Address" value={business.email} onChange={e => setBusiness(b => ({...b, email:e.target.value}))} />
                <Input label="City" value={business.city} onChange={e => setBusiness(b => ({...b, city:e.target.value}))} />
                <div>
                  <label className="block text-[13px] font-medium text-text-primary mb-1">Currency</label>
                  <select value={business.currency} onChange={e => setBusiness(b => ({...b, currency:e.target.value}))}
                    className="w-full h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>RWF</option><option>USD</option>
                  </select>
                </div>
              </div>
              <Button loading={saving} onClick={saveSection}>Save Changes</Button>
            </Card>
          )}

          {activeSection === "branches" && (
            <Card title="Branch Locations" action={
              <Button icon={Plus} size="sm" onClick={() => setShowBranchModal(true)}>Add Branch</Button>
            }>
              <div className="space-y-3">
                {branches.map(b => (
                  <div key={b.id} className="flex items-start justify-between p-4 bg-background border border-border rounded-card">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                        <MapPin size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary text-[14px]">{b.name}</p>
                        <p className="text-[12px] text-text-secondary mt-0.5">{b.address}</p>
                        <p className="text-[12px] text-text-secondary">Manager: {b.manager} · {b.phone}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteBranch(b.id)} className="p-1 text-text-secondary hover:text-danger rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeSection === "roles" && (
            <Card title="Roles & Permissions" subtitle="Access control for each user role">
              <div className="space-y-4">
                {ROLES.map(r => (
                  <div key={r.role} className="p-4 border border-border rounded-card">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2.5 py-1 rounded-badge text-[11px] font-bold uppercase ${r.color}`}>{r.label}</span>
                    </div>
                    <p className="text-[13px] text-text-secondary">{r.desc}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {["Dashboard","Stock","Sales","Procurement","Workers","Customers","Suppliers","Invoices","Expenses","P&L","Reports","Settings"].map(mod => {
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

          {activeSection === "notifications" && (
            <Card title="Notification Preferences" subtitle="Choose which alerts to receive">
              <div className="space-y-4 mb-6">
                {NOTIF_PREFS.map(n => (
                  <div key={n.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="text-[14px] font-medium text-text-primary">{n.label}</p>
                    </div>
                    <button
                      onClick={() => setNotifPrefs(p => ({...p, [n.key]: !p[n.key]}))}
                      className={`relative w-11 h-6 rounded-full transition-colors ${notifPrefs[n.key] ? "bg-primary" : "bg-border"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${notifPrefs[n.key] ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                  </div>
                ))}
              </div>
              <Button loading={saving} onClick={saveSection}>Save Preferences</Button>
            </Card>
          )}
        </div>
      </div>

      <Modal open={showBranchModal} onClose={() => setShowBranchModal(false)} title="Add Branch"
        footer={<><Button variant="secondary" onClick={() => setShowBranchModal(false)}>Cancel</Button><Button onClick={addBranch}>Add Branch</Button></>}>
        <div className="space-y-3">
          <Input label="Branch Name" value={branchForm.name} onChange={e => setBranchForm(f => ({...f, name:e.target.value}))} />
          <Input label="Address" value={branchForm.address} onChange={e => setBranchForm(f => ({...f, address:e.target.value}))} />
          <Input label="Manager Name" value={branchForm.manager} onChange={e => setBranchForm(f => ({...f, manager:e.target.value}))} />
          <Input label="Phone" value={branchForm.phone} onChange={e => setBranchForm(f => ({...f, phone:e.target.value}))} />
        </div>
      </Modal>
    </PageWrapper>
  );
}
