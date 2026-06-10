import { useState, useEffect, useCallback } from "react";
import { Plus, Tag, Search, Edit, Clock, Trash2 } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import Card from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import { useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import toast from "react-hot-toast";
import { ITEM_CATEGORIES, SIZES } from "../../utils/constants";
import { useLanguage } from "../../context/LanguageContext";

const STATUS_MAP = { in_stock: "success", low_stock: "warning", out_of_stock: "danger" };

const EMPTY_FORM = { name:"", category:"", size:"", color:"", quantity:0, cost_price_rwf:"", sell_price_rwf:"", low_stock_threshold:5 };

export default function StockList() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search:"", category:"", status:"" });
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const STATUS_LABEL = { 
    in_stock: t("in_stock"), 
    low_stock: t("low_stock"), 
    out_of_stock: t("out_of_stock") 
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) };
      const { data } = await api.get("/stock", { params });
      setItems(data.data); setTotal(data.total);

      const [all] = await Promise.all([api.get("/stock", { params: { limit: 1000, ...Object.fromEntries(Object.entries(filters).filter(([k,v]) => v && k !== "status")) } })]);
      const it = all.data.data;
      setSummary({
        total: all.data.total,
        value: it.reduce((s,x) => s + x.quantity * x.cost_price_rwf, 0),
        low: it.filter(x => x.status === "low_stock").length,
        out: it.filter(x => x.status === "out_of_stock").length,
      });
    } catch (e) { toast.error(t("error")); }
    finally { setLoading(false); }
  }, [page, filters, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSave() {
    setSaving(true);
    try {
      if (editItem) await api.put(`/stock/${editItem.id}`, form);
      else await api.post("/stock", form);
      toast.success(t("success"));
      setShowModal(false); fetchData();
    } catch(e){ toast.error(e.response?.data?.error || t("error")); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm(t("confirm_delete"))) return;
    try { await api.delete(`/stock/${id}`); toast.success(t("success")); fetchData(); }
    catch { toast.error(t("error")); }
  }

  function openEdit(item) {
    setEditItem(item);
    setForm({ name:item.name, category:item.category, size:item.size, color:item.color,
              quantity:item.quantity, cost_price_rwf:item.cost_price_rwf, sell_price_rwf:item.sell_price_rwf,
              low_stock_threshold:item.low_stock_threshold });
    setShowModal(true);
  }

  const columns = [
    { key:"name", label: t("item_name"), render:(v,r) => (
      <div>
        <p className="font-medium text-text-primary">{v}</p>
        <p className="text-[11px] text-text-secondary">{r.category}</p>
      </div>
    )},
    { key:"barcode", label: t("barcode"), render:v => <span className="font-mono text-[11px] text-text-secondary">{v}</span> },
    { key:"size", label: `${t("size")} / ${t("color")}`, render:(v,r) => (
      <div className="flex flex-wrap gap-1">
        {v && <span className="px-1.5 py-0.5 bg-background border border-border rounded text-[11px]">{v}</span>}
        {r.color && <span className="px-1.5 py-0.5 bg-background border border-border rounded text-[11px]">{r.color}</span>}
      </div>
    )},
    { key:"quantity", label: t("quantity"), render:(v,r) => (
      <span className={`font-semibold ${r.status==="out_of_stock"?"text-danger":r.status==="low_stock"?"text-warning":"text-text-primary"}`}>{v}</span>
    )},
    { key:"cost_price_rwf", label: t("cost_price"), render:v => formatRWF(v) },
    { key:"sell_price_rwf", label: t("selling_price"), render:v => formatRWF(v) },
    { key:"status", label: t("status"), render:v => <Badge status={STATUS_MAP[v]||"neutral"} label={STATUS_LABEL[v]||v} /> },
    { key:"id", label:"", render:(v,r) => (
      <div className="flex gap-1">
        <button onClick={() => navigate(`/app/stock/${v}`)} className="p-1 text-text-secondary hover:text-primary rounded" title={t("view")}><Clock size={14}/></button>
        <button onClick={() => openEdit(r)} className="p-1 text-text-secondary hover:text-primary rounded" title={t("edit")}><Edit size={14}/></button>
        <button onClick={() => handleDelete(v)} className="p-1 text-text-secondary hover:text-danger rounded" title={t("delete")}><Trash2 size={14}/></button>
      </div>
    )},
  ];

  return (
    <PageWrapper title={t("stock")} subtitle={t("stock")}
      breadcrumbs={[{label: t("stock"), path: "/app/stock"}]}>

      {/* Summary */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <StatCard title={t("total")} value={summary.total||0} />
        <StatCard title={t("stock_value")} value={formatRWF(summary.value||0)} />
        <StatCard title={t("low_stock")} value={summary.low||0} />
        <StatCard title={t("out_of_stock")} value={summary.out||0} />
      </div>

      <Card>
        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))} placeholder={`${t("search")}…`}
              className="w-full h-9 pl-9 pr-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <select value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface">
            <option value="">{t("category")} ({t("all")})</option>
            {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface">
            <option value="">{t("status")} ({t("all")})</option>
            <option value="in_stock">{t("in_stock")}</option>
            <option value="low_stock">{t("low_stock")}</option>
            <option value="out_of_stock">{t("out_of_stock")}</option>
          </select>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" icon={Tag} onClick={() => navigate("/app/stock/labels")}>{t("print")}</Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => { setEditItem(null); setForm(EMPTY_FORM); setShowModal(true); }}>{t("add")}</Button>
          </div>
        </div>

        <Table columns={columns} data={items} loading={loading} emptyMessage={t("loading")} />

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-[13px] text-text-secondary">{t("loading")} {(page-1)*20+1}–{Math.min(page*20,total)} of {total}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page===1} onClick={() => setPage(p=>p-1)}>{t("all")}</Button>
              <Button variant="secondary" size="sm" disabled={page*20>=total} onClick={() => setPage(p=>p+1)}>{t("all")}</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? t("edit") : t("add_item")}
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>{t("cancel")}</Button><Button loading={saving} onClick={handleSave}>{t("save")}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Input label={t("item_name")} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1">{t("category")}</label>
            <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full h-9 px-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface">
              <option value="">{t("category")}…</option>
              {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1">{t("size")}</label>
            <select value={form.size} onChange={e=>setForm(f=>({...f,size:e.target.value}))} className="w-full h-9 px-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface">
              <option value="">{t("size")}…</option>
              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Input label={t("color")} value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))} />
          <Input label={t("quantity")} type="number" value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} />
          <Input label={t("min_stock")} type="number" value={form.low_stock_threshold} onChange={e=>setForm(f=>({...f,low_stock_threshold:e.target.value}))} />
          <Input label={t("cost_price")} type="number" value={form.cost_price_rwf} onChange={e=>setForm(f=>({...f,cost_price_rwf:e.target.value}))} />
          <Input label={t("selling_price")} type="number" value={form.sell_price_rwf} onChange={e=>setForm(f=>({...f,sell_price_rwf:e.target.value}))} />
        </div>
      </Modal>
    </PageWrapper>
  );
}
