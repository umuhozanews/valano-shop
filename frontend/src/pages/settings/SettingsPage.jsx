import { useState } from "react";
import { Store, Bell, Shield, Palette, ChevronRight, Check, Factory, Home } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import { useBusiness } from "../../context/BusinessContext";

export default function SettingsPage() {
  const { t } = useLanguage();
  const { activeBusiness } = useBusiness();
  const [activeSection, setActiveSection] = useState("business");
  const [business, setBusiness] = useState({ name: activeBusiness.name, owner:"Rukundo joseph", phone:"0788000111", email:"info@valano.rw", city:"Kigali", currency:"RWF" });
  const [saving, setSaving] = useState(false);

  const isIndustry = activeBusiness.type === "industry";
  const isRealEstate = activeBusiness.type === "real_estate";

  const SECTIONS = [
    { key:"business",      label: t("business_info"),    icon: isIndustry ? Factory : isRealEstate ? Home : Store,   desc: t("description") },
    { key:"roles",         label: t("roles_permissions"),icon:Shield,  desc: t("status") },
    { key:"notifications", label: t("notifications"),    icon:Bell,    desc: t("status") },
  ];

  const ROLES = [
    { role:"admin",   label:"Admin (Owner)",  desc:"Full access to all modules including P&L, settings, and all reports", color:"bg-danger/10 text-danger" },
    { role:"manager", label:"Manager",        desc:"Sales, stock, workers, procurement, customers, invoices — all except settings and owner P&L", color:"bg-warning/10 text-warning" },
    { role:"worker",  label:"Worker",         desc:"Record sales only — limited to POS screen and own sales history", color:"bg-neutral/10 text-text-secondary" },
  ];

  const NOTIF_PREFS = [
    { key:"low_stock",   label: isIndustry ? "Low Material Alerts" : isRealEstate ? "Rent Due Alerts" : t("low_stock_alerts"), default:true },
    { key:"large_sale",  label: isRealEstate ? "Large Payment Received" : "Large Sale Notifications", default:true },
  ];

  const [notifPrefs, setNotifPrefs] = useState(Object.fromEntries(NOTIF_PREFS.map(n => [n.key, n.default])));

  async function saveSection() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    toast.success(t("success"));
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
            <Card title={t("business_info")} subtitle={t("description")}>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="col-span-2">
                  <Input label={t("shop_name")} value={business.name} onChange={e => setBusiness(b => ({...b, name:e.target.value}))} />
                </div>
                <Input label={t("name")} value={business.owner} onChange={e => setBusiness(b => ({...b, owner:e.target.value}))} />
                <Input label={t("phone")} value={business.phone} onChange={e => setBusiness(b => ({...b, phone:e.target.value}))} />
                <Input label={t("email")} value={business.email} onChange={e => setBusiness(b => ({...b, email:e.target.value}))} />
                <Input label={t("city")} value={business.city} onChange={e => setBusiness(b => ({...b, city:e.target.value}))} />
                <div>
                  <label className="block text-[13px] font-medium text-text-primary mb-1">{t("currency")}</label>
                  <select value={business.currency} onChange={e => setBusiness(b => ({...b, currency:e.target.value}))}
                    className="w-full h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>RWF</option><option>USD</option>
                  </select>
                </div>
              </div>
              <Button loading={saving} onClick={saveSection}>{t("save")}</Button>
            </Card>
          )}

          {activeSection === "roles" && (
            <Card title={t("roles_permissions")} subtitle={t("status")}>
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
            <Card title={t("notifications")} subtitle={t("status")}>
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
              <Button loading={saving} onClick={saveSection}>{t("save")}</Button>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
