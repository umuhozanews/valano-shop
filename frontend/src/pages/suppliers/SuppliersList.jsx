import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit, Trash2, MessageCircle } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import { openWhatsAppChat } from "../../utils/whatsapp";

const EMPTY = { name:"", wechat:"", whatsapp:"", city:"", country:"China", specialty:"", notes:"" };

export default function SuppliersList() {
  const { t } = useLanguage();
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
      toast.success(t("success")); setShowModal(false); fetchData();
    } catch(e){ toast.error(e.response?.data?.error || t("error")); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm(t("delete_supplier_confirm"))) return;
    try { await api.delete(`/suppliers/${id}`); toast.success(t("success")); fetchData(); }
    catch { toast.error("Cannot delete — supplier has orders"); }
  }

  const columns = [
    { key:"name", label: t("supplier_col"), render:(v, r) => (
      <div>
        <p className="font-semibold text-text-primary">{v}</p>
        {r.whatsapp && <p className="text-[11px] text-emerald-600 font-mono">WA: {r.whatsapp}</p>}
      </div>
    )},
    { key:"city", label: t("city_country"), render:(v,r) => `${v||"—"}, ${r.country||"China"}` },
    { key:"specialty", label: t("specialty") },
    { key:"whatsapp", label: "WhatsApp Direct", render:(v, r) => (
      <button
        type="button"
        onClick={() => {
          if (!v) {
            const phonePrompt = prompt(`Enter WhatsApp phone number for ${r.name}:`, "");
            if (phonePrompt) openWhatsAppChat(phonePrompt, `Hello ${r.name}, we are reaching out from INZIRA Insights regarding stock supplies.`);
          } else {
            openWhatsAppChat(v, `Hello ${r.name}, we are reaching out from INZIRA Insights regarding stock supplies.`);
          }
        }}
        className="flex items-center gap-1.5 px-3 py-1 rounded-card bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold transition-all shadow-sm"
        title="Open WhatsApp chat with supplier"
      >
        <MessageCircle size={14} />
        <span>{v ? "WhatsApp" : "Add & Chat"}</span>
      </button>
    )},
    { key:"wechat", label: t("wechat") },
    { key:"orders_count", label: t("orders_count"), render:v => parseInt(v)||0 },
    { key:"total_purchased_rwf", label: t("total_invested"), render:v => formatRWF(Math.round(v||0)) },
    { key:"reliability_pct", label: t("reliability"), render:v => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width:`${v||0}%` }} />
        </div>
        <span className="text-[13px]">{v||0}%</span>
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
    <PageWrapper title={t("suppliers")} subtitle={t("suppliers_subtitle")} breadcrumbs={[{label: t("suppliers"), path:"/app/suppliers"}]}>
      <Card action={
        <div className="flex gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`${t("search")}…`}
              className="h-8 pl-8 pr-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-1 focus:ring-primary w-40" />
          </div>
          <Button icon={Plus} size="sm" onClick={() => { setEditS(null); setForm(EMPTY); setShowModal(true); }}>{t("add_supplier")}</Button>
        </div>
      }>
        <Table columns={columns} data={suppliers} loading={loading} emptyMessage={t("no_suppliers_found")} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editS ? t("edit_supplier") : t("add_supplier")}
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>{t("cancel")}</Button><Button loading={saving} onClick={handleSave}>{t("save")}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Input label={t("supplier_name")} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
          <Input label={t("wechat_id")} value={form.wechat} onChange={e=>setForm(f=>({...f,wechat:e.target.value}))} />
          <Input label={t("whatsapp")} value={form.whatsapp} onChange={e=>setForm(f=>({...f,whatsapp:e.target.value}))} />
          <Input label={t("city")} value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} />
          <Input label={t("country")} value={form.country} onChange={e=>setForm(f=>({...f,country:e.target.value}))} />
          <div className="col-span-2"><Input label={t("specialty")} value={form.specialty} onChange={e=>setForm(f=>({...f,specialty:e.target.value}))} /></div>
          <div className="col-span-2"><Input label={t("notes")} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
