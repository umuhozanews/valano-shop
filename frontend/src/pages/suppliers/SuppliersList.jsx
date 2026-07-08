import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import toast from "react-hot-toast";

const EMPTY = { name:"", wechat:"", whatsapp:"", city:"", country:"China", specialty:"", notes:"" };

export default function SuppliersList() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editS, setEditS] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/suppliers", { params: { search } }); setSuppliers(data.data || data || []); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSave() {
    setSaving(true);
    try {
      if (editS) await api.put(`/suppliers/${editS.id}`, form);
      else await api.post("/suppliers", form);
      toast.success("Saved"); setShowModal(false); fetchData();
    } catch(e){ toast.error(e.response?.data?.error||"Failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this supplier?")) return;
    try { await api.delete(`/suppliers/${id}`); toast.success("Deleted"); fetchData(); }
    catch { toast.error("Cannot delete — supplier has orders"); }
  }

  const columns = [
    { key:"name", label:"Supplier" },
    { key:"city", label:"City / Country", render:(v,r) => `${v||"—"}, ${r.country||"China"}` },
    { key:"specialty", label:"Specialty" },
    { key:"wechat", label:"WeChat" },
    { key:"orders_count", label:"Orders", render:v => parseInt(v)||0 },
    { key:"total_purchased_rwf", label:"Total Invested", render:v => formatRWF(Math.round(v||0)) },
    { key:"reliability_pct", label:"Reliability", render:v => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width:`${v||0}%` }} />
        </div>
        <span className="text-[12px]">{v||0}%</span>
      </div>
    )},
    { key:"id", label:"", render:(v,r) => (
      <div className="flex gap-1">
        <button onClick={() => { setEditS(r); setForm({name:r.name,wechat:r.wechat||"",whatsapp:r.whatsapp||"",city:r.city||"",country:r.country||"China",specialty:r.specialty||"",notes:r.notes||""}); setShowModal(true); }}
          className="p-1 text-text-secondary hover:text-primary rounded"><Edit size={14}/></button>
        <button onClick={() => handleDelete(v)} className="p-1 text-text-secondary hover:text-danger rounded"><Trash2 size={14}/></button>
      </div>
    )},
  ];

  return (
    <PageWrapper title="Suppliers" subtitle="China supplier contacts" breadcrumbs={[{label:"Suppliers",path:"/app/suppliers"}]}>
      <Card action={
        <div className="flex gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
              className="h-8 pl-8 pr-3 border border-border rounded-card text-[12px] focus:outline-none focus:ring-1 focus:ring-primary w-40" />
          </div>
          <Button icon={Plus} size="sm" onClick={() => { setEditS(null); setForm(EMPTY); setShowModal(true); }}>Add Supplier</Button>
        </div>
      }>
        <Table columns={columns} data={suppliers} loading={loading} emptyMessage="No suppliers found" />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editS ? "Edit Supplier" : "Add Supplier"}
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button><Button loading={saving} onClick={handleSave}>Save</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Input label="Supplier Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
          <Input label="WeChat ID" value={form.wechat} onChange={e=>setForm(f=>({...f,wechat:e.target.value}))} />
          <Input label="WhatsApp" value={form.whatsapp} onChange={e=>setForm(f=>({...f,whatsapp:e.target.value}))} />
          <Input label="City" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} />
          <Input label="Country" value={form.country} onChange={e=>setForm(f=>({...f,country:e.target.value}))} />
          <div className="col-span-2"><Input label="Specialty" value={form.specialty} onChange={e=>setForm(f=>({...f,specialty:e.target.value}))} /></div>
          <div className="col-span-2"><Input label="Notes" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
