import { useState } from "react";
import { Plus, Users, Search, Edit, Trash2, Phone, Mail } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

const INITIAL_TENANTS = [
  { id: 1, name: "Iradukunda Eric", property: "Knotty Heights A1", unit: "Unit 101", phone: "0788111222", email: "eric@gmail.com", status: "active", paid: true },
  { id: 2, name: "Mutesi Solange", property: "Knotty Heights A1", unit: "Unit 102", phone: "0788333444", email: "solange@gmail.com", status: "active", paid: false },
  { id: 3, name: "Gasana Jean", property: "Commercial Plaza", unit: "Suite 4", phone: "0788555666", email: "jean@gmail.com", status: "active", paid: true },
];

export default function Tenants() {
  const { t } = useLanguage();
  const [tenants, setTenants] = useState(INITIAL_TENANTS);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: "", property: "", unit: "", phone: "", email: "", status: "active", paid: true });

  const filtered = tenants.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    t.property.toLowerCase().includes(search.toLowerCase())
  );

  function handleSave() {
    if (!form.name || !form.property) return toast.error("Please fill required fields");
    
    if (editItem) {
      setTenants(prev => prev.map(item => item.id === editItem.id ? { ...form, id: item.id } : item));
      toast.success(t("success"));
    } else {
      setTenants(prev => [...prev, { ...form, id: Date.now() }]);
      toast.success(t("success"));
    }
    setShowModal(false);
    setEditItem(null);
    setForm({ name: "", property: "", unit: "", phone: "", email: "", status: "active", paid: true });
  }

  function openEdit(item) {
    setEditItem(item);
    setForm(item);
    setShowModal(true);
  }

  function handleDelete(id) {
    if (!confirm(t("confirm_delete"))) return;
    setTenants(prev => prev.filter(item => item.id !== id));
    toast.success(t("success"));
  }

  const columns = [
    { key: "name", label: t("name"), render: (v, r) => (
      <div>
        <p className="font-medium text-text-primary">{v}</p>
        <p className="text-[11px] text-text-secondary">{r.phone}</p>
      </div>
    )},
    { key: "property", label: t("properties"), render: (v, r) => (
      <div>
        <p className="text-[13px] text-text-primary">{v}</p>
        <p className="text-[11px] text-text-secondary">{r.unit}</p>
      </div>
    )},
    { key: "paid", label: "Rent Status", render: v => (
      <Badge status={v ? 'success' : 'danger'} label={v ? 'Paid' : 'Pending'} />
    )},
    { key: "status", label: t("status"), render: v => <Badge status="neutral" label={v} /> },
    { key: "id", label: "", render: (v, r) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(r)} className="p-1 text-text-secondary hover:text-primary"><Edit size={14} /></button>
        <button onClick={() => handleDelete(r.id)} className="p-1 text-text-secondary hover:text-danger"><Trash2 size={14} /></button>
      </div>
    )}
  ];

  return (
    <PageWrapper title={t("tenants")} subtitle="Manage relationships with your tenants"
      breadcrumbs={[{ label: t("real_estate"), path: "/app/properties" }, { label: t("tenants"), path: "/app/tenants" }]}>
      
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input 
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`${t("search")}...`}
            className="w-full h-9 pl-9 pr-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-1 focus:ring-primary" 
          />
        </div>
        <Button icon={Plus} size="sm" onClick={() => { setEditItem(null); setForm({ name: "", property: "", unit: "", phone: "", email: "", status: "active", paid: true }); setShowModal(true); }}>{t("add")}</Button>
      </div>

      <Card>
        <Table columns={columns} data={filtered} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? t("edit") : t("add")}
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>{t("cancel")}</Button><Button onClick={handleSave}>{t("save")}</Button></>}>
        <div className="space-y-3">
          <Input label={t("name")} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Property" value={form.property} onChange={e => setForm({ ...form, property: e.target.value })} required />
            <Input label="Unit Number" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-text-primary mb-1">Rent Status</label>
              <select value={form.paid} onChange={e => setForm({ ...form, paid: e.target.value === "true" })} className="w-full h-9 px-3 border border-border rounded-card text-[13px] bg-surface">
                <option value="true">Paid</option>
                <option value="false">Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-text-primary mb-1">{t("status")}</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full h-9 px-3 border border-border rounded-card text-[13px] bg-surface">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="evicted">Evicted</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
