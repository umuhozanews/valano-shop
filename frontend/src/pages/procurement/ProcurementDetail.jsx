import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Circle, Package } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Table from "../../components/ui/Table";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";

const STATUS_FLOW = ["ordered","in_transit","at_customs","arrived","stocked"];
const STATUS_LABELS = { ordered:"Ordered", in_transit:"In Transit", at_customs:"At Customs", arrived:"Arrived", stocked:"Stocked" };

export default function ProcurementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showStockIn, setShowStockIn] = useState(false);
  const [branches, setBranches] = useState([]);
  const [stockBranch, setStockBranch] = useState("");
  const [stockItems, setStockItems] = useState([]);
  const [stocking, setStocking] = useState(false);

  useEffect(() => {
    api.get(`/procurement/${id}`)
       .then(d => { setOrder(d.data); setStockItems((d.data.items||[]).map(i=>({...i,actual_qty:i.quantity}))); })
       .catch(() => toast.error("Failed to load order"))
       .finally(() => setLoading(false));
    api.get("/settings").then(d => setBranches(d.data.branches||[]));
  }, [id]);

  async function advanceStatus() {
    const currentIdx = STATUS_FLOW.indexOf(order.status);
    const next = STATUS_FLOW[currentIdx + 1];
    if (!next) return;
    try {
      await api.put(`/procurement/${id}/status`, { status: next });
      setOrder(o => ({...o, status: next}));
      toast.success(`Status updated to ${STATUS_LABELS[next]}`);
    } catch(e){ toast.error("Failed to update status"); }
  }

  async function handleStockIn() {
    if (!stockBranch) return toast.error("Select a branch");
    setStocking(true);
    try {
      await api.post(`/procurement/${id}/stock-in`, {
        branch_id: stockBranch,
        items: stockItems.map(i => ({ procurement_item_id: i.id, actual_qty: i.actual_qty })),
      });
      toast.success("Items stocked in successfully");
      setShowStockIn(false);
      setOrder(o => ({...o, status:"stocked"}));
    } catch(e){ toast.error(e.response?.data?.error||"Stock-in failed"); }
    finally { setStocking(false); }
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!order) return null;

  const currentIdx = STATUS_FLOW.indexOf(order.status);
  const canAdvance = currentIdx < STATUS_FLOW.length - 1 && order.status !== "stocked";
  const nextStatus = STATUS_FLOW[currentIdx + 1];

  const itemColumns = [
    { key:"item_name", label:"Item" },
    { key:"size", label:"Size" },
    { key:"color", label:"Color" },
    { key:"quantity", label:"Qty Ordered" },
    { key:"unit_cost", label:"Unit Cost", render:(v,r) => `${v} ${r.currency||"CNY"}` },
  ];

  return (
    <PageWrapper title={`Order #${id}`} subtitle={order.supplier_name}
      breadcrumbs={[{label:"Procurement",path:"/app/procurement"},{label:`Order #${id}`,path:`/app/procurement/${id}`}]}>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate("/app/procurement")}>Back</Button>
        <div className="ml-auto flex gap-2">
          {canAdvance && <Button size="sm" onClick={advanceStatus}>→ Mark as {STATUS_LABELS[nextStatus]}</Button>}
          {order.status === "arrived" && <Button variant="primary" size="sm" icon={Package} onClick={() => setShowStockIn(true)}>Stock In</Button>}
        </div>
      </div>

      {/* Status timeline */}
      <Card className="mb-4">
        <div className="flex items-center gap-0">
          {STATUS_FLOW.map((status, i) => {
            const done = i <= currentIdx;
            const current = i === currentIdx;
            return (
              <div key={status} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${done?"bg-primary border-primary":"border-border bg-surface"}`}>
                    {done ? <CheckCircle size={16} className="text-white" /> : <Circle size={16} className="text-border" />}
                  </div>
                  <p className={`text-[12px] font-medium mt-1 ${current?"text-primary":done?"text-text-primary":"text-text-secondary"}`}>
                    {STATUS_LABELS[status]}
                  </p>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < currentIdx?"bg-primary":"bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" title="Order Items">
          <Table columns={itemColumns} data={order.items || []} emptyMessage="No items" />
        </Card>

        <Card title="Order Info">
          <div className="space-y-3">
            {[
              ["Supplier", order.supplier_name],
              ["Order Date", formatDate(order.order_date)],
              ["Expected Arrival", order.arrival_date ? formatDate(order.arrival_date) : "—"],
              ["Currency", order.currency],
              ["Exchange Rate", order.exchange_rate ? `${order.exchange_rate} →RWF` : "—"],
              ["Shipping Cost", formatRWF(order.shipping_cost)],
              ["Customs Cost", formatRWF(order.customs_cost)],
              ["Notes", order.notes || "—"],
            ].map(([l,v]) => (
              <div key={l} className="flex justify-between gap-2">
                <span className="text-[13px] text-text-secondary shrink-0">{l}</span>
                <span className="text-[13px] font-medium text-text-primary text-right">{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Stock In Modal */}
      <Modal open={showStockIn} onClose={() => setShowStockIn(false)} title="Stock In Items"
        footer={<><Button variant="secondary" onClick={() => setShowStockIn(false)}>Cancel</Button><Button loading={stocking} onClick={handleStockIn}>Confirm Stock In</Button></>}>
        <div className="space-y-3">
          <div>
            <label className="block text-[14px] font-medium text-text-primary mb-1">Assign to Branch</label>
            <select value={stockBranch} onChange={e=>setStockBranch(e.target.value)}
              className="w-full h-9 px-3 border border-border rounded-card text-[14px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface">
              <option value="">Select branch…</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            {stockItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <span className="text-[14px] text-text-primary flex-1">{item.item_name} ({item.size} {item.color})</span>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-text-secondary">Received:</span>
                  <input type="number" min="0" max={item.quantity} value={item.actual_qty}
                    onChange={e => setStockItems(si => si.map((x,j) => j===i ? {...x,actual_qty:parseInt(e.target.value)||0} : x))}
                    className="w-16 h-8 px-2 border border-border rounded text-[13px] text-center focus:outline-none focus:ring-1 focus:ring-primary" />
                  <span className="text-[13px] text-text-secondary">/ {item.quantity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
