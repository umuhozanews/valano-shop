import { useState, useEffect, useCallback } from "react";
import { Plus, Eye, Edit, UserX, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../../components/layout/PageWrapper";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

const EMPTY = { name:"", email:"", phone:"", role:"worker", monthly_target:0, commission_rate:5, password:"", branch_id:"" };

export default function WorkersList() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editW, setEditW] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/workers", { params: { search, limit: 100 } });
      setWorkers(data);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    api.get("/settings").then(({ data }) => {
      setBranches(data.branches || []);
    }).catch(console.error);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        branch_id: form.branch_id ? parseInt(form.branch_id) : null
      };
      if (editW) await api.put(`/workers/${editW.id}`, payload);
      else await api.post("/workers", payload);
      toast.success(t("success"));
      setShowModal(false); fetchData();
    } catch(e){ toast.error(e.response?.data?.error|| t("error")); }
    finally { setSaving(false); }
  }

  async function deactivate(id) {
    if (!confirm(t("confirm_delete"))) return;
    try { await api.put(`/workers/${id}/deactivate`); toast.success(t("success")); fetchData(); }
    catch { toast.error(t("error")); }
  }

  function openEdit(w) {
    setEditW(w);
    setForm({ name:w.name, email:w.email, phone:w.phone||"", role:w.role,
              monthly_target:w.monthly_target, commission_rate:w.commission_rate, password:"", branch_id:w.branch_id||"" });
    setShowModal(true);
  }

  const columns = [
    { key:"name", label: t("name"), render:(v,r) => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
          <span className="text-[12px] font-bold text-primary">{v?.charAt(0)}</span>
        </div>
        <div><p className="font-medium text-text-primary">{v}</p><p className="text-[11px] text-text-secondary">{r.email}</p></div>
      </div>
    )},
    { key:"role", label: "Role", render:v => <Badge status={v==="manager"?"warning":"neutral"} label={v} /> },
    { key:"branch_name", label: "Branch", render:v => <Badge status="neutral" label={v || "Global"} /> },
    { key:"monthly_sales", label: t("sales"), render:v => parseInt(v)||0 },
    { key:"monthly_revenue", label: t("revenue"), render:v => <span className="text-primary font-medium">{formatRWF(v||0)}</span> },
    { key:"monthly_target", label: "Target", render:v => formatRWF(v) },
    { key:"is_active", label: t("status"), render:v => <Badge status={v?"success":"danger"} label={v?"Active":"Inactive"} /> },
    { key:"id", label:"", render:(v,r) => (
      <div className="flex gap-1">
        <button onClick={() => navigate(`/app/workers/${v}`)} className="p-1 text-text-secondary hover:text-primary rounded" title={t("view")}><Eye size={14}/></button>
        <button onClick={() => openEdit(r)} className="p-1 text-text-secondary hover:text-primary rounded" title={t("edit")}><Edit size={14}/></button>
        {r.is_active && <button onClick={() => deactivate(v)} className="p-1 text-text-secondary hover:text-danger rounded" title={t("delete")}><UserX size={14}/></button>}
      </div>
    )},
  ];

  return (
    <PageWrapper title={t("workers")} subtitle={t("management")} breadcrumbs={[{label: t("workers"), path:"/app/workers"}]}>
      <Card action={
        <div className="flex gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`${t("search")}…`}
              className="h-8 pl-8 pr-3 border border-border rounded-card text-[12px] focus:outline-none focus:ring-1 focus:ring-primary w-40" />
          </div>
          <Button icon={Plus} size="sm" onClick={() => { setEditW(null); setForm(EMPTY); setShowModal(true); }}>{t("add")}</Button>
        </div>
      }>
        <Table columns={columns} data={workers} loading={loading} emptyMessage={t("loading")} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editW ? t("edit") : t("add")}
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>{t("cancel")}</Button><Button loading={saving} onClick={handleSave}>{t("save")}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Input label={t("name")} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
          <Input label="Email" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} />
          <Input label={t("phone")} value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} />
          <div>
            <label className="block text-[11px] font-medium text-text-primary mb-1">Branch</label>
            <select value={form.branch_id} onChange={e=>setForm(f=>({...f,branch_id:e.target.value}))} className="w-full h-9 px-3 border border-border rounded-card text-[11px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface">
              <option value="">None (Global)</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text-primary mb-1">Role</label>
            <select value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))} className="w-full h-9 px-3 border border-border rounded-card text-[11px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface">
              <option value="worker">Worker</option><option value="manager">Manager</option>
            </select>
          </div>
          <Input label="Monthly Target (RWF)" type="number" value={form.monthly_target} onChange={e=>setForm(f=>({...f,monthly_target:e.target.value}))} />
          <Input label="Commission Rate %" type="number" value={form.commission_rate} onChange={e=>setForm(f=>({...f,commission_rate:e.target.value}))} />
          {!editW && <div className="col-span-2"><Input label={t("password")} type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} /></div>}
        </div>
      </Modal>
    </PageWrapper>
  );
}
