import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../../components/layout/PageWrapper";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";

const STATUS_MAP = { ordered:"neutral", in_transit:"warning", at_customs:"danger", arrived:"success", stocked:"success" };
const EMPTY_ORDER = { supplier_id:"", order_date:"", arrival_date:"", currency:"CNY", exchange_rate:195, shipping_cost:0, customs_cost:0, notes:"", items:[] };
const EMPTY_ITEM = { item_name:"", category:"", size:"", color:"", quantity:1, unit_cost:0 };

export default function ProcurementList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(EMPTY_ORDER);
  const [saving, setSaving] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/procurement");
      setOrders(data.data); setTotal(data.total); setSummary(data.summary || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchOrders();
    api.get("/suppliers").then(d => setSuppliers(d.data || []));
  }, [fetchOrders]);

  const getSummaryCount = (status) => parseInt(summary.find(s => s.status === status)?.cnt || 0);

  function addItem() { setForm(f => ({...f, items: [...f.items, {...EMPTY_ITEM}]})); }
  function updateItem(idx, field, val) {
    setForm(f => ({ ...f, items: f.items.map((it, i) => i===idx ? {...it,[field]:val} : it) }));
  }
  function removeItem(idx) { setForm(f => ({...f, items: f.items.filter((_,i) => i!==idx)})); }

  const itemsTotal = form.items.reduce((s,i) => s + (parseFloat(i.unit_cost)||0) * (parseInt(i.quantity)||0), 0);
  const totalRWF = itemsTotal * (parseFloat(form.exchange_rate)||0) + parseFloat(form.shipping_cost||0) + parseFloat(form.customs_cost||0);

  async function handleSave() {
    setSaving(true);
    try {
      await api.post("/procurement", form);
      toast.success("Order created"); setShowModal(false); setForm(EMPTY_ORDER); setStep(1); fetchOrders();
    } catch(e){ toast.error(e.response?.data?.error||"Failed to save"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this procurement order?")) return;
    try {
      await api.delete(`/procurement/${id}`);
      toast.success("Order deleted");
      fetchOrders();
    } catch {
      toast.error("Failed to delete order");
    }
  }

  const columns = [
    { key:"id", label:"Order #", render:v => <span className="font-mono font-medium text-primary">#{v}</span> },
    { key:"supplier_name", label:"Supplier" },
    { key:"order_date", label:"Order Date", render:v => formatDate(v) },
    { key:"arrival_date", label:"Arrival Date", render:v => v ? formatDate(v) : "—" },
    { key:"items_count", label:"Items" },
    { key:"items_cost", label:"Total Cost", render:v => formatRWF(v) },
    { key:"status", label:"Status", render:v => <Badge status={STATUS_MAP[v]||"neutral"} label={v?.replace("_"," ")||"—"} /> },
    { key:"id", label:"", render:(v) => (
      <div className="flex gap-2 items-center justify-end">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/app/procurement/${v}`)}>View</Button>
        <button onClick={() => handleDelete(v)} className="p-1 text-text-secondary hover:text-danger rounded" title="Delete Order">
          <Trash2 size={14} />
        </button>
      </div>
    )},
  ];

  return (
    <PageWrapper title="Procurement" subtitle="China import orders management"
      breadcrumbs={[{label:"Procurement",path:"/app/procurement"}]}>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <StatCard title="Total Orders" value={total} />
        <StatCard title="In Transit" value={getSummaryCount("in_transit")} />
        <StatCard title="At Customs" value={getSummaryCount("at_customs")} />
        <StatCard title="Arrived" value={getSummaryCount("arrived")} />
      </div>

      <Card action={<Button icon={Plus} size="sm" onClick={() => { setShowModal(true); setStep(1); setForm(EMPTY_ORDER); }}>New Order</Button>}>
        <Table columns={columns} data={orders} loading={loading} emptyMessage="No procurement orders yet" />
      </Card>

      {/* New Order Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={`New Order — Step ${step} of 3`}
        footer={<>
          {step > 1 && <Button variant="secondary" onClick={() => setStep(s=>s-1)}>Back</Button>}
          {step < 3 ? <Button onClick={() => setStep(s=>s+1)}>Next</Button>
                    : <Button loading={saving} onClick={handleSave}>Create Order</Button>}
        </>}>

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="block text-[13px] font-medium text-text-primary mb-1">Supplier</label>
              <select value={form.supplier_id} onChange={e=>setForm(f=>({...f,supplier_id:e.target.value}))}
                className="w-full h-9 px-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface">
                <option value="">Select supplier…</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Order Date" type="date" value={form.order_date} onChange={e=>setForm(f=>({...f,order_date:e.target.value}))} />
              <Input label="Expected Arrival" type="date" value={form.arrival_date} onChange={e=>setForm(f=>({...f,arrival_date:e.target.value}))} />
              <div>
                <label className="block text-[13px] font-medium text-text-primary mb-1">Currency</label>
                <select value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}
                  className="w-full h-9 px-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface">
                  <option>CNY</option><option>USD</option><option>EUR</option>
                </select>
              </div>
              <Input label={`Exchange Rate (→RWF)`} type="number" value={form.exchange_rate} onChange={e=>setForm(f=>({...f,exchange_rate:e.target.value}))} />
              <Input label="Shipping Cost (RWF)" type="number" value={form.shipping_cost} onChange={e=>setForm(f=>({...f,shipping_cost:e.target.value}))} />
              <Input label="Customs Cost (RWF)" type="number" value={form.customs_cost} onChange={e=>setForm(f=>({...f,customs_cost:e.target.value}))} />
            </div>
            <Input label="Notes" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="space-y-2 max-h-80 overflow-y-auto mb-3">
              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-6 gap-2 items-end">
                  <input placeholder="Item name" value={item.item_name} onChange={e=>updateItem(i,"item_name",e.target.value)}
                    className="col-span-2 h-8 px-2 border border-border rounded text-[12px] focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input placeholder="Size" value={item.size} onChange={e=>updateItem(i,"size",e.target.value)}
                    className="h-8 px-2 border border-border rounded text-[12px] focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input placeholder="Color" value={item.color} onChange={e=>updateItem(i,"color",e.target.value)}
                    className="h-8 px-2 border border-border rounded text-[12px] focus:outline-none focus:ring-1 focus:ring-primary" />
                  <input type="number" placeholder="Qty" value={item.quantity} onChange={e=>updateItem(i,"quantity",e.target.value)}
                    className="h-8 px-2 border border-border rounded text-[12px] focus:outline-none focus:ring-1 focus:ring-primary" />
                  <div className="flex gap-1">
                    <input type="number" placeholder="Cost" value={item.unit_cost} onChange={e=>updateItem(i,"unit_cost",e.target.value)}
                      className="flex-1 h-8 px-2 border border-border rounded text-[12px] focus:outline-none focus:ring-1 focus:ring-primary" />
                    <button onClick={() => removeItem(i)} className="text-danger hover:text-red-700">×</button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={addItem}>+ Add Item</Button>
            <p className="text-[13px] text-text-secondary mt-3">Items total: <strong>{itemsTotal.toFixed(2)} {form.currency}</strong></p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-text-primary mb-3">Order Summary</h4>
            {[
              ["Items Cost", `${itemsTotal.toFixed(2)} ${form.currency} = ${formatRWF(itemsTotal * (parseFloat(form.exchange_rate)||0))}`],
              ["Shipping", formatRWF(form.shipping_cost)],
              ["Customs", formatRWF(form.customs_cost)],
            ].map(([l,v]) => (
              <div key={l} className="flex justify-between py-1 border-b border-border">
                <span className="text-[13px] text-text-secondary">{l}</span>
                <span className="text-[13px] font-medium text-text-primary">{v}</span>
              </div>
            ))}
            <div className="flex justify-between py-2">
              <span className="font-semibold text-text-primary">TOTAL LANDED</span>
              <span className="font-bold text-[16px] text-primary">{formatRWF(totalRWF)}</span>
            </div>
            {form.items.length > 0 && (
              <p className="text-[12px] text-text-secondary">Avg cost per unit: {formatRWF(Math.round(totalRWF / form.items.reduce((s,i) => s+(parseInt(i.quantity)||0), 0)))}</p>
            )}
          </div>
        )}
      </Modal>
    </PageWrapper>
  );
}
