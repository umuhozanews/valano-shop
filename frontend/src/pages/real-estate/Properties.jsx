import { useState } from "react";
import { Plus, Home, MapPin, Search, Edit, Trash2 } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

const INITIAL_PROPERTIES = [
  { id: 1, name: "Knotty Heights A1", address: "Gacuriro, Kigali", units: 4, type: "Apartment", status: "occupied" },
  { id: 2, name: "Knotty Heights A2", address: "Gacuriro, Kigali", units: 4, type: "Apartment", status: "occupied" },
  { id: 3, name: "Commercial Plaza", address: "Kiyovu, Kigali", units: 10, type: "Commercial", status: "partial" },
  { id: 4, name: "Warehouse X", address: "Freezone, Kigali", units: 1, type: "Industrial", status: "vacant" },
];

export default function Properties() {
  const { t } = useLanguage();
  const [properties, setProperties] = useState(INITIAL_PROPERTIES);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: "", address: "", units: "", type: "Apartment", status: "vacant" });

  const STATUS_LABELS = {
    occupied: t("occupied"),
    vacant: t("vacant"),
    partial: t("partial")
  };

  const filtered = properties.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.address.toLowerCase().includes(search.toLowerCase())
  );

  function handleSave() {
    if (!form.name || !form.address) return toast.error(t("error"));
    
    if (editItem) {
      setProperties(prev => prev.map(p => p.id === editItem.id ? { ...form, id: p.id } : p));
      toast.success(t("success"));
    } else {
      setProperties(prev => [...prev, { ...form, id: Date.now() }]);
      toast.success(t("success"));
    }
    setShowModal(false);
    setEditItem(null);
    setForm({ name: "", address: "", units: "", type: "Apartment", status: "vacant" });
  }

  function openEdit(p) {
    setEditItem(p);
    setForm(p);
    setShowModal(true);
  }

  function handleDelete(id) {
    if (!confirm(t("confirm_delete"))) return;
    setProperties(prev => prev.filter(p => p.id !== id));
    toast.success(t("success"));
  }

  const columns = [
    { key: "name", label: t("name"), render: (v, r) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center text-primary">
          <Home size={14} />
        </div>
        <div>
          <p className="font-medium text-text-primary">{v}</p>
          <p className="text-[11px] text-text-secondary">{r.type}</p>
        </div>
      </div>
    )},
    { key: "address", label: t("address_label"), render: v => (
      <div className="flex items-center gap-1 text-text-secondary">
        <MapPin size={12} />
        <span className="text-[12px]">{v}</span>
      </div>
    )},
    { key: "units", label: "Units", render: v => <span className="font-medium">{v}</span> },
    { key: "status", label: t("status"), render: v => (
      <Badge status={v === 'occupied' ? 'success' : v === 'vacant' ? 'danger' : 'warning'} label={STATUS_LABELS[v] || v} />
    )},
    { key: "id", label: "", render: (v, r) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(r)} className="p-1 text-text-secondary hover:text-primary"><Edit size={14} /></button>
        <button onClick={() => handleDelete(r.id)} className="p-1 text-text-secondary hover:text-danger"><Trash2 size={14} /></button>
      </div>
    )}
  ];

  return (
    <PageWrapper title={t("properties")} subtitle="Manage your real estate portfolio"
      breadcrumbs={[{ label: t("real_estate"), path: "/app/properties" }, { label: t("properties"), path: "/app/properties" }]}>
      
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input 
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`${t("search")}...`}
            className="w-full h-9 pl-9 pr-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-1 focus:ring-primary" 
          />
        </div>
        <Button icon={Plus} size="sm" onClick={() => { setEditItem(null); setForm({ name: "", address: "", units: "", type: "Apartment", status: "vacant" }); setShowModal(true); }}>{t("add")}</Button>
      </div>

      <Card>
        <Table columns={columns} data={filtered} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? t("edit") : t("add")}
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>{t("cancel")}</Button><Button onClick={handleSave}>{t("save")}</Button></>}>
        <div className="space-y-3">
          <Input label={t("name")} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <Input label={t("address_label")} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Units" type="number" value={form.units} onChange={e => setForm({ ...form, units: e.target.value })} />
            <div>
              <label className="block text-[13px] font-medium text-text-primary mb-1">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full h-9 px-3 border border-border rounded-card text-[13px] bg-surface">
                <option>Apartment</option>
                <option>Commercial</option>
                <option>Industrial</option>
                <option>Land</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1">{t("status")}</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full h-9 px-3 border border-border rounded-card text-[13px] bg-surface">
              <option value="occupied">{t("occupied")}</option>
              <option value="partial">{t("partial")}</option>
              <option value="vacant">{t("vacant")}</option>
            </select>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
