import { useState, useEffect, useMemo } from "react";
import { Plus, Truck, ChevronRight, MessageSquare, PackageCheck, PackagePlus, Trash2, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";

const STATUS_BADGE = {
  draft:      "neutral",
  ordered:    "warning",
  in_transit: "primary",
  arrived:    "primary",
  received:   "primary",
  stocked:    "success",
};

export default function PurchaseOrders() {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [stockItems, setStockItems] = useState([]);

  // Form State
  const [form, setForm] = useState({
    supplier_id: "",
    notes: "",
    arrival_date: "",
    order_date: new Date().toISOString().slice(0,10),
    items: [{ stock_item_id: "", item_name: "", quantity: 10, unit_cost_rwf: 0 }]
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get("/purchase-orders").then(r => setOrders(r.data?.data || r.data || [])),
      api.get("/suppliers").then(r => setSuppliers(r.data?.data || r.data || [])),
      api.get("/stock").then(r => setStockItems(r.data?.items || r.data || [])),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const sanitizeWhatsAppPhone = (phone) => {
    if (!phone) return "";
    let clean = String(phone).replace(/[^0-9+]/g, "");
    if (clean.startsWith("+")) clean = clean.slice(1);
    if (clean.startsWith("07") && clean.length === 10) clean = "250" + clean.slice(1);
    else if (clean.startsWith("7") && clean.length === 9) clean = "250" + clean;
    return clean;
  };

  const handleSendToWhatsApp = (o) => {
    const rawPhone = o.supplier_phone || (suppliers.find((s) => s.id === o.supplier_id)?.phone);
    const cleanPhone = sanitizeWhatsAppPhone(rawPhone);

    const lines = [];
    lines.push(`📦 *PURCHASE ORDER: PO-${o.id}*`);
    lines.push(`👤 *Supplier:* ${o.supplier_name || "Supplier"}`);
    lines.push(`📅 *Order Date:* ${new Date(o.order_date || o.created_at).toLocaleDateString("en-RW")}`);
    if (o.arrival_date) lines.push(`🚚 *Expected Delivery:* ${new Date(o.arrival_date).toLocaleDateString("en-RW")}`);
    lines.push("");
    lines.push(`*Items Ordered:*`);

    const items = o.items || [];
    items.forEach((it, idx) => {
      const subtotal = (Number(it.quantity) || 1) * (Number(it.unit_cost_rwf) || 0);
      lines.push(`${idx + 1}. *${it.item_name}* — ${it.quantity} units @ ${formatRWF(it.unit_cost_rwf)} (= ${formatRWF(subtotal)})`);
    });

    lines.push("--------------------------------");
    lines.push(`💰 *Total Estimated Cost:* ${formatRWF(o.total_cost_rwf || 0)}`);
    if (o.notes) {
      lines.push("");
      lines.push(`📝 *Notes:* ${o.notes}`);
    }
    lines.push("");
    lines.push(`_Sent via Inzira Insights_`);

    const encoded = encodeURIComponent(lines.join("\n"));
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  };

  const handleItemStockSelect = (index, stockId) => {
    const stk = stockItems.find((s) => String(s.id) === String(stockId));
    setForm((prev) => {
      const items = [...prev.items];
      if (stk) {
        items[index] = {
          ...items[index],
          stock_item_id: stk.id,
          item_name: stk.name,
          unit_cost_rwf: stk.cost_price_rwf || 0,
        };
      } else {
        items[index] = { ...items[index], stock_item_id: "" };
      }
      return { ...prev, items };
    });
  };

  const handleItemFieldChange = (index, field, value) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addLineItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { stock_item_id: "", item_name: "", quantity: 10, unit_cost_rwf: 0 }]
    }));
  };

  const removeLineItem = (index) => {
    if (form.items.length === 1) return;
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculatedTotal = useMemo(() => {
    return form.items.reduce((sum, it) => sum + ((Number(it.quantity) || 0) * (Number(it.unit_cost_rwf) || 0)), 0);
  }, [form.items]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.supplier_id) return alert("Please select a supplier.");
    if (!form.items[0]?.item_name?.trim()) return alert("Please add at least one product line item.");

    setSubmitting(true);
    try {
      const { data } = await api.post("/purchase-orders", form);
      setOrders(prev => [data, ...prev]);
      setShowForm(false);
      setForm({
        supplier_id: "",
        notes: "",
        arrival_date: "",
        order_date: new Date().toISOString().slice(0,10),
        items: [{ stock_item_id: "", item_name: "", quantity: 10, unit_cost_rwf: 0 }]
      });
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const advanceStatus = async (id, current) => {
    const next = {
      draft: "ordered",
      ordered: "in_transit",
      in_transit: "received",
      arrived: "stocked",
      received: "stocked"
    }[current];
    if (!next) return;
    try {
      await api.put(`/purchase-orders/${id}/status`, { status: next });
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update order status");
    }
  };

  return (
    <PageWrapper
      title="Purchase Orders"
      subtitle="Track stock orders from suppliers with WhatsApp dispatch & inventory stocking"
      breadcrumbs={[{ label: "Purchase Orders", path: "/app/purchase-orders" }]}
      action={
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[6px] text-[11px] font-medium hover:bg-primary/90">
          <Plus size={15} /> New Order
        </button>
      }
    >
      {showForm && (
        <Card title="New Supplier Purchase Order" className="mb-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[12px] text-text-secondary mb-1 block">Supplier *</label>
                <select className="w-full border border-border rounded-[6px] px-3 py-2 text-[11px] bg-background"
                  value={form.supplier_id} onChange={e => setForm(p => ({ ...p, supplier_id: e.target.value }))} required>
                  <option value="">Select supplier...</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.phone ? `(${s.phone})` : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] text-text-secondary mb-1 block">Order Date</label>
                <input type="date" className="w-full border border-border rounded-[6px] px-3 py-2 text-[11px] bg-background"
                  value={form.order_date} onChange={e => setForm(p => ({ ...p, order_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-[12px] text-text-secondary mb-1 block">Expected Arrival</label>
                <input type="date" className="w-full border border-border rounded-[6px] px-3 py-2 text-[11px] bg-background"
                  value={form.arrival_date} onChange={e => setForm(p => ({ ...p, arrival_date: e.target.value }))} />
              </div>
            </div>

            {/* Line Items Dynamic Builder */}
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-medium text-text-primary">Order Products</span>
                <button type="button" onClick={addLineItem} className="text-[11px] text-primary font-medium hover:underline flex items-center gap-1">
                  <Plus size={13} /> Add Line Item
                </button>
              </div>

              <div className="space-y-2">
                {form.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2.5 rounded-[6px] bg-background border border-border">
                    <div className="sm:col-span-4">
                      <label className="text-[10px] text-text-secondary block">Catalog Item</label>
                      <select
                        value={it.stock_item_id || ""}
                        onChange={(e) => handleItemStockSelect(idx, e.target.value)}
                        className="w-full border border-border rounded-[4px] px-2 py-1 text-[11px] bg-card"
                      >
                        <option value="">-- Custom item --</option>
                        {stockItems.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} ({formatRWF(s.cost_price_rwf)})</option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-text-secondary block">Item Name *</label>
                      <input
                        required
                        type="text"
                        placeholder="Item name"
                        value={it.item_name}
                        onChange={(e) => handleItemFieldChange(idx, "item_name", e.target.value)}
                        className="w-full border border-border rounded-[4px] px-2 py-1 text-[11px] bg-card"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-text-secondary block">Quantity</label>
                      <input
                        required
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleItemFieldChange(idx, "quantity", e.target.value)}
                        className="w-full border border-border rounded-[4px] px-2 py-1 text-[11px] bg-card"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-text-secondary block">Unit Cost</label>
                      <input
                        required
                        type="number"
                        min="0"
                        value={it.unit_cost_rwf}
                        onChange={(e) => handleItemFieldChange(idx, "unit_cost_rwf", e.target.value)}
                        className="w-full border border-border rounded-[4px] px-2 py-1 text-[11px] bg-card"
                      />
                    </div>

                    <div className="sm:col-span-1 text-right pt-3">
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => removeLineItem(idx)} className="text-danger hover:opacity-80 p-1">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-[12px] font-bold text-text-primary pt-2">
                <span>Estimated Total Cost:</span>
                <span className="text-primary text-[14px]">{formatRWF(calculatedTotal)}</span>
              </div>
            </div>

            <div>
              <label className="text-[12px] text-text-secondary mb-1 block">Notes / Delivery Instructions</label>
              <input type="text" className="w-full border border-border rounded-[6px] px-3 py-2 text-[11px] bg-background"
                placeholder="e.g. Deliver before noon..." value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-border rounded-[6px] text-[11px]">Cancel</button>
              <button type="submit" disabled={submitting}
                className="px-4 py-2 bg-primary text-white rounded-[6px] text-[11px] font-medium hover:bg-primary/90">
                {submitting ? "Creating..." : "Create Order"}
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? (
          <div className="text-center py-12 text-text-secondary text-[11px]">Loading orders...</div>
        ) : !orders.length ? (
          <div className="text-center py-12">
            <Truck size={36} className="mx-auto text-text-secondary/30 mb-3" />
            <p className="text-[12px] font-medium text-text-primary">No purchase orders yet</p>
            <p className="text-[11px] text-text-secondary mt-1">Create an order to start tracking stock from suppliers and dispatch to WhatsApp</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {orders.map(o => (
              <div key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 px-2 gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold bg-muted/20 px-1.5 py-0.5 rounded">PO-{o.id}</span>
                    <p className="text-[13px] font-bold text-text-primary">{o.supplier_name || `Supplier #${o.supplier_id}`}</p>
                    <Badge status={STATUS_BADGE[o.status] || "neutral"} label={o.status?.replace("_", " ")} />
                  </div>

                  <p className="text-[11px] text-text-secondary mt-1">
                    Ordered: {new Date(o.order_date || o.created_at).toLocaleDateString("en-RW")}
                    {o.arrival_date && ` · Expected Arrival: ${new Date(o.arrival_date).toLocaleDateString("en-RW")}`}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-medium text-text-primary">{o.items_count || (o.items || []).length} item line(s)</span>
                    <span>&bull;</span>
                    <span className="font-bold text-primary">{formatRWF(o.total_cost_rwf || 0)}</span>
                  </div>

                  {o.notes && <p className="text-[11px] text-text-secondary italic mt-1">{o.notes}</p>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* WhatsApp Dispatch Button */}
                  <button
                    onClick={() => handleSendToWhatsApp(o)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[6px] text-[11px] font-medium shadow-sm transition"
                    title="Open in WhatsApp"
                  >
                    <MessageSquare size={13} /> WhatsApp
                  </button>

                  {/* Lifecycle Stepper */}
                  {o.status !== "stocked" && (
                    <button onClick={() => advanceStatus(o.id, o.status)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-[6px] text-[11px] font-medium transition ${
                        o.status === "received" || o.status === "arrived"
                          ? "bg-primary text-white hover:bg-primary/90"
                          : "border border-border hover:bg-background text-text-primary"
                      }`}
                    >
                      {o.status === "ordered" ? "Mark In Transit" : o.status === "in_transit" ? "Mark Received" : "Mark Stocked"}
                      <ChevronRight size={12} />
                    </button>
                  )}

                  {o.status === "stocked" && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-success bg-success/10 px-2.5 py-1 rounded-[6px]">
                      <CheckCircle2 size={13} /> Stocked
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
