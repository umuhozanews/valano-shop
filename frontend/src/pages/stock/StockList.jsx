import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit, Clock, Trash2 } from "lucide-react";
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
import { ITEM_CATEGORIES, STOCK_UNITS } from "../../utils/constants";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";

const STATUS_MAP   = { in_stock: "success", low_stock: "warning", out_of_stock: "danger" };
const EMPTY_FORM   = { name:"", name_rw:"", category:"", unit:"pcs", quantity:0, cost_price_rwf:"", sell_price_rwf:"", low_stock_threshold:5 };

export default function StockList() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [items,   setItems]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [filters, setFilters] = useState({ search:"", category:"", status:"" });
  const [showModal, setShowModal] = useState(false);
  const [editItem,  setEditItem]  = useState(null);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);

  const canEdit = ["pulse_admin","sme_owner","admin","manager"].includes(user?.role);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) };
      const { data } = await api.get("/stock", { params });
      setItems(data.data || []); setTotal(data.total || 0);

      const { data: all } = await api.get("/stock", { params: { limit: 1000 } });
      const it = all.data || [];
      setSummary({
        total: all.total || it.length,
        value: it.reduce((s,x) => s + (x.quantity * (x.cost_price_rwf || 0)), 0),
        low:   it.filter(x => x.status === "low_stock").length,
        out:   it.filter(x => x.status === "out_of_stock").length,
      });
    } catch { toast.error("Failed to load stock"); }
    finally   { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSave() {
    if (!form.name) return toast.error("Product name is required");
    if (!form.sell_price_rwf) return toast.error("Selling price is required");
    setSaving(true);
    try {
      const payload = {
        name:                form.name,
        name_rw:             form.name_rw || null,
        category:            form.category || null,
        unit:                form.unit || "pcs",
        quantity:            parseInt(form.quantity) || 0,
        cost_price_rwf:      parseFloat(form.cost_price_rwf) || 0,
        sell_price_rwf:      parseFloat(form.sell_price_rwf) || 0,
        low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
      };
      if (editItem) await api.put(`/stock/${editItem.id}`, payload);
      else          await api.post("/stock", payload);
      toast.success(editItem ? "Product updated" : "Product added");
      setShowModal(false); fetchData();
    } catch(e) { toast.error(e.response?.data?.error || "Failed to save"); }
    finally   { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this product?")) return;
    try { await api.delete(`/stock/${id}`); toast.success("Product deleted"); fetchData(); }
    catch { toast.error("Failed to delete"); }
  }

  function openEdit(item) {
    setEditItem(item);
    setForm({
      name:                item.name,
      name_rw:             item.name_rw || "",
      category:            item.category || "",
      unit:                item.unit || "pcs",
      quantity:            item.quantity,
      cost_price_rwf:      item.cost_price_rwf,
      sell_price_rwf:      item.sell_price_rwf,
      low_stock_threshold: item.low_stock_threshold,
    });
    setShowModal(true);
  }

  const columns = [
    { key:"name", label:"Product", render:(v,r) => (
      <div>
        <p className="font-medium text-text-primary">{v}</p>
        {r.name_rw && <p className="text-[11px] text-text-secondary">{r.name_rw}</p>}
        <p className="text-[11px] text-text-secondary">{r.category}{r.unit ? ` · ${r.unit}` : ""}</p>
      </div>
    )},
    { key:"barcode",       label:"Barcode",  render:v => <span className="font-mono text-[11px] text-text-secondary">{v || "—"}</span> },
    { key:"quantity",      label:"Qty",      render:(v,r) => (
      <span className={`font-semibold ${r.status==="out_of_stock"?"text-danger":r.status==="low_stock"?"text-warning":"text-text-primary"}`}>{v} {r.unit}</span>
    )},
    { key:"cost_price_rwf",  label:"Cost",   render:v => formatRWF(v) },
    { key:"sell_price_rwf",  label:"Sell",   render:v => formatRWF(v) },
    { key:"status",       label:"Status",    render:v => <Badge status={STATUS_MAP[v]||"neutral"} label={v?.replace(/_/g," ")||"—"} /> },
    { key:"id", label:"", render:(v,r) => (
      <div className="flex gap-1">
        <button onClick={() => navigate(`/app/stock/${v}`)} className="p-1 text-text-secondary hover:text-primary rounded"><Clock size={14}/></button>
        {canEdit && <>
          <button onClick={() => openEdit(r)} className="p-1 text-text-secondary hover:text-primary rounded"><Edit size={14}/></button>
          <button onClick={() => handleDelete(v)} className="p-1 text-text-secondary hover:text-danger rounded"><Trash2 size={14}/></button>
        </>}
      </div>
    )},
  ];

  return (
    <PageWrapper title="Stock" subtitle="Manage your product inventory"
      breadcrumbs={[{ label:"Stock", path:"/app/stock" }]}
      action={canEdit && (
        <button onClick={() => { setEditItem(null); setForm(EMPTY_FORM); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[6px] text-[11px] font-medium hover:bg-primary/90">
          <Plus size={15} /> Add Product
        </button>
      )}
    >
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <StatCard title="Total Items"    value={summary.total || 0} />
        <StatCard title="Stock Value"    value={formatRWF(summary.value || 0)} />
        <StatCard title="Low Stock"      value={summary.low || 0} color="warning" />
        <StatCard title="Out of Stock"   value={summary.out || 0} color="danger" />
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))} placeholder="Search products…"
              className="w-full h-9 pl-9 pr-3 border border-border rounded-[6px] text-[11px] focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <select value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))}
            className="h-9 px-3 border border-border rounded-[6px] text-[11px] bg-surface">
            <option value="">All Categories</option>
            {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}
            className="h-9 px-3 border border-border rounded-[6px] text-[11px] bg-surface">
            <option value="">All Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>

        <Table columns={columns} data={items} loading={loading} emptyMessage="No products yet" />

        {total > 20 && (
          <div className="flex justify-center gap-2 mt-4">
            <button disabled={page===1} onClick={() => setPage(p=>p-1)}
              className="px-3 py-1.5 border border-border rounded text-[12px] disabled:opacity-40">Prev</button>
            <span className="px-3 py-1.5 text-[12px] text-text-secondary">Page {page} of {Math.ceil(total/20)}</span>
            <button disabled={page>=Math.ceil(total/20)} onClick={() => setPage(p=>p+1)}
              className="px-3 py-1.5 border border-border rounded text-[12px] disabled:opacity-40">Next</button>
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? "Edit Product" : "Add Product"}
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button><Button loading={saving} onClick={handleSave}>Save</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Input label="Product Name (English)" value={form.name}
              onChange={e=>setForm(f=>({...f,name:e.target.value}))} required />
          </div>
          <div className="col-span-2">
            <Input label="Izina mu Kinyarwanda (optional)" value={form.name_rw}
              onChange={e=>setForm(f=>({...f,name_rw:e.target.value}))} placeholder="e.g. Umuceri" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text-primary mb-1">Category</label>
            <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
              className="w-full h-9 px-3 border border-border rounded-[6px] text-[11px] bg-surface">
              <option value="">Select…</option>
              {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text-primary mb-1">Unit of Measure</label>
            <select value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))}
              className="w-full h-9 px-3 border border-border rounded-[6px] text-[11px] bg-surface">
              {STOCK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <Input label="Quantity"           type="number" value={form.quantity}            onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} />
          <Input label="Low Stock Alert at" type="number" value={form.low_stock_threshold} onChange={e=>setForm(f=>({...f,low_stock_threshold:e.target.value}))} />
          <Input label="Cost Price (RWF)"   type="number" value={form.cost_price_rwf}      onChange={e=>setForm(f=>({...f,cost_price_rwf:e.target.value}))} />
          <Input label="Selling Price (RWF)" type="number" value={form.sell_price_rwf}     onChange={e=>setForm(f=>({...f,sell_price_rwf:e.target.value}))} required />
        </div>
      </Modal>
    </PageWrapper>
  );
}
