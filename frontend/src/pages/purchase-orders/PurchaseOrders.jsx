import { useState, useEffect } from "react";
import { Plus, Truck, ChevronRight } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import { useLanguage } from "../../context/LanguageContext";

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

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/purchase-orders", form);
      setOrders(prev => [data, ...prev]);
      setShowForm(false);
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

  return (
    <PageWrapper
      title={t("purchase_orders")}
      subtitle={t("track_stock_orders")}
      breadcrumbs={[{ label: t("purchase_orders"), path: "/app/purchase-orders" }]}
      action={
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[6px] text-[14px] font-medium hover:bg-primary/90">
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
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
            <div>
              <label className="text-[13px] text-text-secondary mb-1 block">{t("notes")}</label>
              <input type="text" className="w-full border border-border rounded-[6px] px-3 py-2 text-[14px] bg-background"
                placeholder={t("optional_notes")} value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="sm:col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-border rounded-[6px] text-[14px]">{t("cancel")}</button>
              <button type="submit"
                className="px-4 py-2 bg-primary text-white rounded-[6px] text-[14px] font-medium">{t("create_order")}</button>
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
              <div key={o.id} className="flex items-center justify-between py-3 px-1">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-text-primary">{o.supplier_name || `Supplier #${o.supplier_id}`}</p>
                  <p className="text-[13px] text-text-secondary mt-0.5">
                    {new Date(o.order_date || o.created_at).toLocaleDateString("en-RW")}
                    {o.expected_arrival && ` · ${t("expected_prefix")} ${new Date(o.expected_arrival).toLocaleDateString("en-RW")}`}
                  </p>
                  {o.notes && <p className="text-[13px] text-text-secondary">{o.notes}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge status={STATUS_BADGE[o.status] || "neutral"} label={o.status?.replace("_", " ")} />
                  {o.status !== "stocked" && (
                    <button onClick={() => advanceStatus(o.id, o.status)}
                      className="flex items-center gap-1 text-[13px] text-primary hover:underline">
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
