import { useState, useEffect } from "react";
import { Plus, Truck, ChevronRight, MessageCircle, Send } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import { useLanguage } from "../../context/LanguageContext";
import { sendOrderToWhatsApp } from "../../utils/whatsapp";

const STATUS_BADGE = {
  ordered:    "warning",
  in_transit: "primary",
  arrived:    "primary",
  stocked:    "success",
};

export default function PurchaseOrders() {
  const { t } = useLanguage();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState({ supplier_id: "", notes: "", arrival_date: "", order_date: new Date().toISOString().slice(0,10) });

  useEffect(() => {
    Promise.all([
      api.get("/purchase-orders").then(r => setOrders(r.data?.data || r.data || [])),
      api.get("/suppliers").then(r => setSuppliers(r.data?.data || r.data || [])),
    ]).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e, sendWhatsApp = false) => {
    if (e) e.preventDefault();
    if (!form.supplier_id) return alert(t("select_supplier"));
    try {
      const { data } = await api.post("/purchase-orders", form);
      setOrders(prev => [data, ...prev]);
      setShowForm(false);
      
      const supplierObj = suppliers.find(s => String(s.id) === String(form.supplier_id));
      if (sendWhatsApp && supplierObj) {
        sendOrderToWhatsApp({
          supplierName: supplierObj.name,
          supplierPhone: supplierObj.whatsapp || supplierObj.phone || "",
          orderId: data.id,
          orderDate: form.order_date,
          expectedArrival: form.arrival_date,
          notes: form.notes,
        });
      }

      setForm({ supplier_id: "", notes: "", arrival_date: "", order_date: new Date().toISOString().slice(0,10) });
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create order");
    }
  };

  const advanceStatus = async (id, current) => {
    const next = { ordered: "in_transit", in_transit: "arrived", arrived: "stocked" }[current];
    if (!next) return;
    try {
      await api.put(`/purchase-orders/${id}/status`, { status: next });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: next } : o));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update");
    }
  };

  const handleSendWhatsAppOrder = (o) => {
    const supplierObj = suppliers.find(s => String(s.id) === String(o.supplier_id)) || {};
    let phone = supplierObj.whatsapp || o.supplier_whatsapp || supplierObj.phone || "";
    if (!phone) {
      phone = prompt(`Enter WhatsApp number for ${o.supplier_name || 'supplier'}:`, "");
    }
    sendOrderToWhatsApp({
      supplierName: o.supplier_name || supplierObj.name,
      supplierPhone: phone,
      orderId: o.id,
      orderDate: o.order_date || o.created_at,
      expectedArrival: o.expected_arrival,
      notes: o.notes,
    });
  };

  return (
    <PageWrapper
      title={t("purchase_orders")}
      subtitle={t("track_stock_orders")}
      breadcrumbs={[{ label: t("purchase_orders"), path: "/app/purchase-orders" }]}
      action={
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[6px] text-[14px] font-medium hover:bg-primary/90 shadow-sm">
          <Plus size={15} /> {t("new_order")}
        </button>
      }
    >
      {showForm && (
        <Card title={t("new_purchase_order")} className="mb-4">
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[13px] text-text-secondary mb-1 block">{t("supplier_label")}</label>
              <select className="w-full border border-border rounded-[6px] px-3 py-2 text-[14px] bg-background"
                value={form.supplier_id} onChange={e => setForm(p => ({ ...p, supplier_id: e.target.value }))} required>
                <option value="">{t("select_supplier")}</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} {s.whatsapp ? `(WA: ${s.whatsapp})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[13px] text-text-secondary mb-1 block">{t("order_date")}</label>
              <input type="date" className="w-full border border-border rounded-[6px] px-3 py-2 text-[14px] bg-background"
                value={form.order_date} onChange={e => setForm(p => ({ ...p, order_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-[13px] text-text-secondary mb-1 block">{t("expected_arrival")}</label>
              <input type="date" className="w-full border border-border rounded-[6px] px-3 py-2 text-[14px] bg-background"
                value={form.arrival_date} onChange={e => setForm(p => ({ ...p, arrival_date: e.target.value }))} />
            </div>
            <div className="sm:col-span-3">
              <label className="text-[13px] text-text-secondary mb-1 block">Order Items / Quantities / Notes</label>
              <input type="text" className="w-full border border-border rounded-[6px] px-3 py-2 text-[14px] bg-background"
                placeholder="e.g. 50 Units of Indasa Sandpaper P38, 20 Units of Paint Primer" value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="sm:col-span-3 flex flex-wrap gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-border rounded-[6px] text-[14px]">{t("cancel")}</button>
              <button type="submit"
                className="px-4 py-2 bg-primary text-white rounded-[6px] text-[14px] font-medium">{t("create_order")}</button>
              <button type="button" onClick={(e) => handleCreate(e, true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[6px] text-[14px] font-bold shadow-sm">
                <MessageCircle size={15} /> Create & Send via WhatsApp
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading ? (
          <div className="text-center py-12 text-text-secondary text-[14px]">{t("loading_orders")}</div>
        ) : !orders.length ? (
          <div className="text-center py-12">
            <Truck size={36} className="mx-auto text-text-secondary/30 mb-3" />
            <p className="text-[15px] font-medium text-text-primary">{t("no_orders_yet")}</p>
            <p className="text-[14px] text-text-secondary mt-1">{t("no_orders_desc")}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {orders.map(o => (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5 px-1 hover:bg-background/40 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14.5px] font-bold text-text-primary">{o.supplier_name || `Supplier #${o.supplier_id}`}</p>
                    <span className="text-[12px] font-mono text-text-secondary">PO-#${o.id}</span>
                  </div>
                  <p className="text-[13px] text-text-secondary mt-0.5">
                    {new Date(o.order_date || o.created_at).toLocaleDateString("en-RW")}
                    {o.expected_arrival && ` · ${t("expected_prefix")} ${new Date(o.expected_arrival).toLocaleDateString("en-RW")}`}
                  </p>
                  {o.notes && <p className="text-[13px] text-text-primary mt-1 bg-surface px-2 py-1 rounded border border-border/60 inline-block">{o.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppOrder(o)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-bold rounded-card transition-all shadow-sm"
                    title="Dispatch order details to supplier via WhatsApp"
                  >
                    <MessageCircle size={14} />
                    <span>Send on WhatsApp</span>
                  </button>
                  <Badge status={STATUS_BADGE[o.status] || "neutral"} label={o.status?.replace("_", " ")} />
                  {o.status !== "stocked" && (
                    <button onClick={() => advanceStatus(o.id, o.status)}
                      className="flex items-center gap-1 text-[13px] text-primary font-semibold hover:underline ml-1">
                      {t("advance")} <ChevronRight size={12} />
                    </button>
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
