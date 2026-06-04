import { useState, useEffect, useCallback } from "react";
import { Plus, Upload, Tag, Search, Filter, MoreVertical, Edit, ArrowLeftRight, Clock, Trash2, X } from "lucide-react";
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
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";
import { ITEM_CATEGORIES, SIZES } from "../../utils/constants";

const STATUS_MAP = { in_stock: "success", low_stock: "warning", out_of_stock: "danger" };
const STATUS_LABEL = { in_stock: "In Stock", low_stock: "Low Stock", out_of_stock: "Out of Stock" };

const EMPTY_FORM = { name:"", category:"", size:"", color:"", branch_id:"", quantity:0, cost_price_rwf:"", sell_price_rwf:"", low_stock_threshold:5 };

export default function StockList() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({ search:"", branch_id:"", category:"", status:"" });
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferItem, setTransferItem] = useState(null);
  const [transfer, setTransfer] = useState({ to_branch:"", quantity:1, notes:"" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) };
      const { data } = await api.get("/stock", { params });
      setItems(data.data); setTotal(data.total);

      // Summary
      const [all] = await Promise.all([api.get("/stock", { params: { limit: 1000, ...Object.fromEntries(Object.entries(filters).filter(([k,v]) => v && k !== "status")) } })]);
      const it = all.data.data;
      setSummary({
        total: all.data.total,
        value: it.reduce((s,x) => s + x.quantity * x.cost_price_rwf, 0),
        low: it.filter(x => x.status === "low_stock").length,
        out: it.filter(x => x.status === "out_of_stock").length,
      });
    } catch (e) { toast.error("Failed to load stock"); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchData(); api.get("/settings").then(d => setBranches(d.data.branches || [])).catch(()=>{}); }, [fetchData]);

  async function handleSave() {
    setSaving(true);
    try {
      if (editItem) await api.put(`/stock/${editItem.id}`, form);
      else await api.post("/stock", form);
      toast.success(editItem ? "Item updated" : "Item added");
      setShowModal(false); fetchData();
    } catch(e){ toast.error(e.response?.data?.error || "Save failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this item?")) return;
    try { await api.delete(`/stock/${id}`); toast.success("Deleted"); fetchData(); }
    catch { toast.error("Delete failed"); }
  }

  async function handleTransfer() {
    try {
      await api.post("/stock/transfer", { item_id: transferItem.id, from_branch: transferItem.branch_id, ...transfer });
      toast.success("Transfer complete"); setShowTransfer(false); fetchData();
    } catch(e){ toast.error(e.response?.data?.error || "Transfer failed"); }
  }

  function openEdit(item) {
    setEditItem(item);
    setForm({ name:item.name, category:item.category, size:item.size, color:item.color, branch_id:item.branch_id,
              quantity:item.quantity, cost_price_rwf:item.cost_price_rwf, sell_price_rwf:item.sell_price_rwf,
              low_stock_threshold:item.low_stock_threshold });
    setShowModal(true);
  }

  const margin = form.cost_price_rwf && form.sell_price_rwf
    ? (((form.sell_price_rwf - form.cost_price_rwf) / form.cost_price_rwf) * 100).toFixed(1)
    : null;

  const columns = [
    { key:"name", label:"Item", render:(v,r) => (
      <div>
        <p className="font-medium text-text-primary">{v}</p>
        <p className="text-[11px] text-text-secondary">{r.category}</p>
      </div>
    )},
    { key:"barcode", label:"Barcode", render:v => <span className="font-mono text-[11px] text-text-secondary">{v}</span> },
    { key:"size", label:"Size / Color", render:(v,r) => (
      <div className="flex flex-wrap gap-1">
        {v && <span className="px-1.5 py-0.5 bg-background border border-border rounded text-[11px]">{v}</span>}
        {r.color && <span className="px-1.5 py-0.5 bg-background border border-border rounded text-[11px]">{r.color}</span>}
      </div>
    )},
    { key:"quantity", label:"Qty", render:(v,r) => (
      <span className={`font-semibold ${r.status==="out_of_stock"?"text-danger":r.status==="low_stock"?"text-warning":"text-text-primary"}`}>{v}</span>
    )},
    { key:"cost_price_rwf", label:"Cost", render:v => formatRWF(v) },
    { key:"sell_price_rwf", label:"Sell", render:v => formatRWF(v) },
    { key:"margin_pct", label:"Margin", render:v => <span className={`font-medium ${v>=30?"text-success":"text-text-secondary"}`}>{v}%</span> },
    { key:"branch_name", label:"Branch", render:v => <Badge status="neutral" label={v||"—"} /> },
    { key:"status", label:"Status", render:v => <Badge status={STATUS_MAP[v]||"neutral"} label={STATUS_LABEL[v]||v} /> },
    { key:"id", label:"", render:(v,r) => (
      <div className="flex gap-1">
        <button onClick={() => navigate(`/app/stock/${v}`)} className="p-1 text-text-secondary hover:text-primary rounded" title="Detail"><Clock size={14}/></button>
        <button onClick={() => openEdit(r)} className="p-1 text-text-secondary hover:text-primary rounded" title="Edit"><Edit size={14}/></button>
        <button onClick={() => { setTransferItem(r); setTransfer({to_branch:"",quantity:1,notes:""}); setShowTransfer(true); }} className="p-1 text-text-secondary hover:text-warning rounded" title="Transfer"><ArrowLeftRight size={14}/></button>
        <button onClick={() => handleDelete(v)} className="p-1 text-text-secondary hover:text-danger rounded" title="Delete"><Trash2 size={14}/></button>
      </div>
    )},
  ];

  return (
    <PageWrapper title="Stock Management" subtitle="Inventory across all branches"
      breadcrumbs={[{label:"Stock",path:"/app/stock"}]}>

      {/* Summary */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <StatCard title="Total Items" value={summary.total||0} />
        <StatCard title="Total Value" value={formatRWF(summary.value||0)} />
        <StatCard title="Low Stock" value={summary.low||0} />
        <StatCard title="Out of Stock" value={summary.out||0} />
      </div>

      <Card>
        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))} placeholder="Search items…"
              className="w-full h-9 pl-9 pr-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <select value={filters.branch_id} onChange={e=>setFilters(f=>({...f,branch_id:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface">
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface">
            <option value="">All Categories</option>
            {["Jackets","Shirts","Trousers","Dresses","Shoes","Hoodies","Accessories","Other"].map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface">
            <option value="">All Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" icon={Tag} onClick={() => navigate("/app/stock/labels")}>Print Labels</Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => { setEditItem(null); setForm(EMPTY_FORM); setShowModal(true); }}>Add Item</Button>
          </div>
        </div>

        <Table columns={columns} data={items} loading={loading} emptyMessage="No stock items found" />

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-[13px] text-text-secondary">Showing {(page-1)*20+1}–{Math.min(page*20,total)} of {total}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page===1} onClick={() => setPage(p=>p-1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page*20>=total} onClick={() => setPage(p=>p+1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editItem ? "Edit Item" : "Add Stock Item"}
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button><Button loading={saving} onClick={handleSave}>Save</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Input label="Item Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1">Category</label>
            <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full h-9 px-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface">
              <option value="">Select…</option>
              {["Jackets","Shirts","Trousers","Dresses","Shoes","Hoodies","Accessories","Other"].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1">Branch</label>
            <select value={form.branch_id} onChange={e=>setForm(f=>({...f,branch_id:e.target.value}))} className="w-full h-9 px-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface">
              <option value="">Select…</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1">Size</label>
            <select value={form.size} onChange={e=>setForm(f=>({...f,size:e.target.value}))} className="w-full h-9 px-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface">
              <option value="">Select…</option>
              {["XS","S","M","L","XL","XXL","One Size","30","32","34","36","37","38","39","40","41","42","43","44"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <Input label="Color" value={form.color} onChange={e=>setForm(f=>({...f,color:e.target.value}))} />
          <Input label="Quantity" type="number" value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))} />
          <Input label="Low Stock Threshold" type="number" value={form.low_stock_threshold} onChange={e=>setForm(f=>({...f,low_stock_threshold:e.target.value}))} />
          <Input label="Cost Price (RWF)" type="number" value={form.cost_price_rwf} onChange={e=>setForm(f=>({...f,cost_price_rwf:e.target.value}))} />
          <div>
            <Input label="Sell Price (RWF)" type="number" value={form.sell_price_rwf} onChange={e=>setForm(f=>({...f,sell_price_rwf:e.target.value}))}
              hint={margin !== null ? `Margin: ${margin}%` : undefined} />
          </div>
        </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal open={showTransfer} onClose={() => setShowTransfer(false)} title="Transfer Stock"
        footer={<><Button variant="secondary" onClick={() => setShowTransfer(false)}>Cancel</Button><Button onClick={handleTransfer}>Transfer</Button></>}>
        <div className="space-y-3">
          <p className="text-[13px] text-text-secondary">Item: <strong className="text-text-primary">{transferItem?.name}</strong></p>
          <p className="text-[13px] text-text-secondary">Available: <strong className="text-text-primary">{transferItem?.quantity}</strong></p>
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1">To Branch</label>
            <select value={transfer.to_branch} onChange={e=>setTransfer(t=>({...t,to_branch:e.target.value}))} className="w-full h-9 px-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface">
              <option value="">Select branch…</option>
              {branches.filter(b => b.id != transferItem?.branch_id).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <Input label="Quantity" type="number" min="1" max={transferItem?.quantity} value={transfer.quantity} onChange={e=>setTransfer(t=>({...t,quantity:parseInt(e.target.value)}))} />
          <Input label="Notes (optional)" value={transfer.notes} onChange={e=>setTransfer(t=>({...t,notes:e.target.value}))} />
        </div>
      </Modal>
    </PageWrapper>
  );
}
