import { useState } from "react";
import { Plus, Factory, Search, Edit, Trash2 } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

const INITIAL_PRODUCTION = [
  { id: 1, name: "Production Run #44", item: "Summer T-Shirt", quantity: 500, status: "in_progress", progress: 65 },
  { id: 2, name: "Production Run #43", item: "Denim Jeans", quantity: 200, status: "completed", progress: 100 },
  { id: 3, name: "Production Run #45", item: "Woolen Jackets", quantity: 150, status: "planned", progress: 0 },
];

export default function Production() {
  const { t } = useLanguage();
  const [production, setProduction] = useState(INITIAL_PRODUCTION);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: "", item: "", quantity: "", status: "planned", progress: 0 });

  const STATUS_LABELS = {
    planned: t("planned"),
    in_progress: t("in_progress"),
    completed: t("completed"),
    cancelled: t("cancelled")
  };

  const filtered = production.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.item.toLowerCase().includes(search.toLowerCase())
  );

  function handleSave() {
    if (!form.name || !form.item) return toast.error(t("error"));
    
    if (editItem) {
      setProduction(prev => prev.map(p => p.id === editItem.id ? { ...form, id: p.id } : p));
      toast.success(t("success"));
    } else {
      setProduction(prev => [...prev, { ...form, id: Date.now() }]);
      toast.success(t("success"));
    }
    setShowModal(false);
    setEditItem(null);
    setForm({ name: "", item: "", quantity: "", status: "planned", progress: 0 });
  }

  function openEdit(p) {
    setEditItem(p);
    setForm(p);
    setShowModal(true);
  }

  function handleDelete(id) {
    if (!confirm(t("confirm_delete"))) return;
    setProduction(prev => prev.filter(p => p.id !== id));
    toast.success(t("success"));
  }

  const columns = [
    { key: "name", label: t("production_nav"), render: (v, r) => (
      <div>
        <p className="font-medium text-text-primary">{v}</p>
        <p className="text-[11px] text-text-secondary">{r.item}</p>
      </div>
    )},
    { key: "quantity", label: t("quantity"), render: v => <span className="font-semibold">{v}</span> },
    { key: "progress", label: "Progress", render: v => (
      <div className="w-32">
        <div className="flex justify-between mb-1">
          <span className="text-[10px] text-text-secondary">{v}%</span>
        </div>
        <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${v}%` }} />
        </div>
      </div>
    )},
    { key: "status", label: t("status"), render: v => (
      <Badge status={v === 'completed' ? 'success' : v === 'in_progress' ? 'warning' : 'neutral'} label={STATUS_LABELS[v] || v} />
    )},
    { key: "id", label: "", render: (v, r) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(r)} className="p-1 text-text-secondary hover:text-primary"><Edit size={14} /></button>
        <button onClick={() => handleDelete(r.id)} className="p-1 text-text-secondary hover:text-danger"><Trash2 size={14} /></button>
      </div>
    )}
  ];

  return (
    <PageWrapper title={t("production_nav")} subtitle={t("production_nav")}
      breadcrumbs={[{ label: t("production_nav"), path: "/app/production" }]}>
      
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input 
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`${t("search")}...`}
            className="w-full h-9 pl-9 pr-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-1 focus:ring-primary" 
          />
        </div>
        <Button icon={Plus} size="sm" onClick={() => { setEditItem(null); setForm({ name: "", item: "", quantity: "", status: "planned", progress: 0 }); setShowModal(true); }}>{t("add")}</Button>
      </div>

      <Card>
        <Table columns={columns} data={filtered} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? t("edit") : t("add")}
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>{t("cancel")}</Button><Button onClick={handleSave}>{t("save")}</Button></>}>
        <div className="space-y-3">
          <Input label="Batch Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Production Run #46" required />
          <Input label="Item to Produce" value={form.item} onChange={e => setForm({ ...form, item: e.target.value })} placeholder="e.g. Cotton T-Shirts" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("quantity")} type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
            <Input label="Progress (%)" type="number" min="0" max="100" value={form.progress} onChange={e => setForm({ ...form, progress: e.target.value })} />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1">{t("status")}</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full h-9 px-3 border border-border rounded-card text-[13px] bg-surface">
              <option value="planned">{t("planned")}</option>
              <option value="in_progress">{t("in_progress")}</option>
              <option value="completed">{t("completed")}</option>
              <option value="cancelled">{t("cancelled")}</option>
            </select>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
