import { useState } from "react";
import { Plus, Search, Edit, Trash2, AlertCircle, CheckCircle2, Info } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

const PRIORITY_MAP = { high: "danger", medium: "warning", low: "neutral" };

const INITIAL_TASKS = [
  { id: 1, title: "Fix leaking pipe", property: "Inzira Properties A1", unit: "Unit 101", priority: "high", status: "pending", date: "2026-07-01" },
  { id: 2, title: "Paint exterior walls", property: "Commercial Plaza", unit: "General", priority: "medium", status: "in_progress", date: "2026-06-25" },
  { id: 3, title: "Electrical inspection", property: "Warehouse X", unit: "Main Area", priority: "low", status: "completed", date: "2026-06-20" },
];

export default function Maintenance() {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ title: "", property: "", unit: "", priority: "medium", status: "pending", date: new Date().toISOString().slice(0, 10) });

  const filtered = tasks.filter(task =>
    task.title.toLowerCase().includes(search.toLowerCase()) ||
    task.property.toLowerCase().includes(search.toLowerCase())
  );

  function handleSave() {
    if (!form.title || !form.property) return toast.error(t("error"));
    if (editItem) {
      setTasks(prev => prev.map(tk => tk.id === editItem.id ? { ...form, id: tk.id } : tk));
    } else {
      setTasks(prev => [...prev, { ...form, id: Date.now() }]);
    }
    toast.success(t("success"));
    setShowModal(false);
    setEditItem(null);
    setForm({ title: "", property: "", unit: "", priority: "medium", status: "pending", date: new Date().toISOString().slice(0, 10) });
  }

  function openEdit(item) {
    setEditItem(item);
    setForm(item);
    setShowModal(true);
  }

  function handleDelete(id) {
    if (!confirm(t("confirm_delete"))) return;
    setTasks(prev => prev.filter(tk => tk.id !== id));
    toast.success(t("success"));
  }

  const columns = [
    { key: "title", label: t("description"), render: (v, r) => (
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded flex items-center justify-center ${r.status === "completed" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
          {r.status === "completed" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
        </div>
        <div>
          <p className="font-medium text-text-primary">{v}</p>
          <p className="text-[11px] text-text-secondary">{r.property} • {r.unit}</p>
        </div>
      </div>
    )},
    { key: "priority", label: "Priority", render: v => <Badge status={PRIORITY_MAP[v]} label={v.toUpperCase()} /> },
    { key: "date", label: t("date"), render: v => v },
    { key: "status", label: t("status"), render: v => <Badge status={v === "completed" ? "success" : v === "in_progress" ? "warning" : "neutral"} label={v.replace("_", " ")} /> },
    { key: "id", label: "", render: (v, r) => (
      <div className="flex gap-1">
        <button onClick={() => openEdit(r)} className="p-1 text-text-secondary hover:text-primary"><Edit size={14} /></button>
        <button onClick={() => handleDelete(v)} className="p-1 text-text-secondary hover:text-danger"><Trash2 size={14} /></button>
      </div>
    )}
  ];

  return (
    <PageWrapper title={t("maintenance")} subtitle="Track repairs across your properties"
      breadcrumbs={[{ label: t("real_estate"), path: "/app/properties" }, { label: t("maintenance"), path: "/app/maintenance" }]}>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2.5 text-blue-800 text-[11px] shadow-sm">
        <Info size={16} className="text-blue-600 shrink-0" />
        <div>
          <span className="font-semibold">Frontend Prototype:</span> This Maintenance feature is a design preview. Changes are stored in-memory and reset on refresh.
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`${t("search")}...`}
            className="w-full h-9 pl-9 pr-3 border border-border rounded-card text-[11px] bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <Button icon={Plus} size="sm" onClick={() => { setEditItem(null); setForm({ title: "", property: "", unit: "", priority: "medium", status: "pending", date: new Date().toISOString().slice(0, 10) }); setShowModal(true); }}>
          {t("add")}
        </Button>
      </div>

      <Card>
        <Table columns={columns} data={filtered} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? t("edit") : t("add")}
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>{t("cancel")}</Button><Button onClick={handleSave}>{t("save")}</Button></>}>
        <div className="space-y-3">
          <Input label={t("description")} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Property" value={form.property} onChange={e => setForm({ ...form, property: e.target.value })} required />
            <Input label="Unit" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-text-primary mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full h-9 px-3 border border-border rounded-card text-[11px] bg-surface">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text-primary mb-1">{t("status")}</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full h-9 px-3 border border-border rounded-card text-[11px] bg-surface">
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <Input label={t("date")} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        </div>
      </Modal>
    </PageWrapper>
  );
}
