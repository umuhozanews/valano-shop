import { useState, useEffect, useCallback } from "react";
import { Plus, Search, MessageCircle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../../components/layout/PageWrapper";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import StatCard from "../../components/ui/StatCard";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

const SEG_MAP = { vip:"success", regular:"warning", new:"neutral" };

export default function CustomersList() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name:"", phone:"", location:"", type:"retailer", notes:"" });
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ search:"", type:"", segment:"" });
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit:20, ...Object.fromEntries(Object.entries(filters).filter(([,v])=>v)) };
      const { data } = await api.get("/customers", { params });
      setCustomers(data.data); setTotal(data.total); setSummary(data.summary||[]);
    } finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleAdd() {
    setSaving(true);
    try {
      await api.post("/customers", form);
      toast.success(t("success")); setShowModal(false); fetchData();
    } catch(e){ toast.error(e.response?.data?.error|| t("error")); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm(t("confirm_delete") || "Delete this customer?")) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success(t("success"));
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.error || t("error"));
    }
  }

  const getSegCount = (s) => parseInt(summary.find(x=>x.segment===s)?.cnt||0);

  const columns = [
    { key:"name", label: t("customer"), render:(v,r) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
          <span className="text-[13px] font-bold text-primary">{v?.charAt(0)}</span>
        </div>
        <div><p className="font-medium text-text-primary">{v}</p><p className="text-[13px] text-text-secondary">{r.phone||t("no_phone")}</p></div>
      </div>
    )},
    { key:"type", label: t("type"), render:v => <Badge status={v==="wholesaler"?"warning":"neutral"} label={v} /> },
    { key:"segment", label: t("segment"), render:v => <Badge status={SEG_MAP[v]||"neutral"} label={v} /> },
    { key:"total_orders", label: t("orders"), render:v => parseInt(v)||0 },
    { key:"total_spent", label: t("total_spent"), render:v => <span className="font-medium text-primary">{formatRWF(v||0)}</span> },
    { key:"last_purchase", label: t("last_purchase"), render:v => v ? formatDate(v) : "—" },
    { key:"id", label:"", render:(v,r) => (
      <div className="flex gap-1 items-center">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/app/customers/${v}`)}>{t("view")}</Button>
        {r.phone && (
          <button onClick={() => window.open(`https://wa.me/${r.phone.replace(/\D/g,"")}?text=Hello+${encodeURIComponent(r.name)},+from+INZIRA INSIGHTS+SYSTEM`,"_blank")}
            className="p-1 text-[#25D366] hover:opacity-80" title="WhatsApp">
            <MessageCircle size={14} />
          </button>
        )}
        <button onClick={() => handleDelete(v)} className="p-1 text-text-secondary hover:text-danger rounded" title={t("delete")}>
          <Trash2 size={14} />
        </button>
      </div>
    )},
  ];

  return (
    <PageWrapper title={t("customers")} subtitle={t("management")} breadcrumbs={[{label: t("customers"), path:"/app/customers"}]}>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <div onClick={() => setFilters(f => ({ ...f, segment: "" }))} className="cursor-pointer transition-all hover:scale-[1.01]" title="Click to show all customers">
          <StatCard title={t("total")} value={total} className={filters.segment === "" ? "border-2 border-primary shadow-sm" : ""} />
        </div>
        <div onClick={() => setFilters(f => ({ ...f, segment: "vip" }))} className="cursor-pointer transition-all hover:scale-[1.01]" title="Click to filter VIP customers">
          <StatCard title={`${t("vip")} (Over 500k RWF)`} value={getSegCount("vip")} className={filters.segment === "vip" ? "border-2 border-emerald-500 shadow-sm" : ""} />
        </div>
        <div onClick={() => setFilters(f => ({ ...f, segment: "regular" }))} className="cursor-pointer transition-all hover:scale-[1.01]" title="Click to filter Regular customers">
          <StatCard title={`${t("regular")} (Over 100k RWF)`} value={getSegCount("regular")} className={filters.segment === "regular" ? "border-2 border-amber-500 shadow-sm" : ""} />
        </div>
        <div onClick={() => setFilters(f => ({ ...f, segment: "new" }))} className="cursor-pointer transition-all hover:scale-[1.01]" title="Click to filter New customers">
          <StatCard title={t("new_label")} value={getSegCount("new")} className={filters.segment === "new" ? "border-2 border-blue-500 shadow-sm" : ""} />
        </div>
      </div>

      <Card action={<Button icon={Plus} size="sm" onClick={() => setShowModal(true)}>{t("add")}</Button>}>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))} placeholder={`${t("search")}…`}
              className="w-full h-9 pl-9 pr-3 border border-border rounded-card text-[14px] focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <select value={filters.segment} onChange={e=>setFilters(f=>({...f,segment:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[14px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary font-medium">
            <option value="">All Segments</option>
            <option value="vip">⭐ VIP (Over 500k RWF)</option>
            <option value="regular">🔥 Regular (Over 100k RWF)</option>
            <option value="new">🌱 New Customer</option>
          </select>
          <select value={filters.type} onChange={e=>setFilters(f=>({...f,type:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[14px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">{t("all_types")}</option><option value="retailer">{t("retailer")}</option><option value="wholesaler">{t("wholesaler")}</option>
          </select>
        </div>
        <Table columns={columns} data={customers} loading={loading} emptyMessage={t("loading")} />
        {total > 20 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-[14px] text-text-secondary">{t("showing")} {(page-1)*20+1}–{Math.min(page*20,total)} {t("of")} {total}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page===1} onClick={() => setPage(p=>p-1)}>{t("previous")}</Button>
              <Button variant="secondary" size="sm" disabled={page*20>=total} onClick={() => setPage(p=>p+1)}>{t("next")}</Button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={t("add")}
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>{t("cancel")}</Button><Button loading={saving} onClick={handleAdd}>{t("save")}</Button></>}>
        <div className="space-y-3">
          <Input label={t("name")} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
          <Input label={t("phone")} value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} />
          <Input label={t("location")} value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} />
          <div>
            <label className="block text-[14px] font-medium text-text-primary mb-1">{t("type")}</label>
            <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} className="w-full h-9 px-3 border border-border rounded-card text-[14px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="retailer">{t("retailer")}</option><option value="wholesaler">{t("wholesaler")}</option>
            </select>
          </div>
          <Input label={t("notes")} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
        </div>
      </Modal>
    </PageWrapper>
  );
}
