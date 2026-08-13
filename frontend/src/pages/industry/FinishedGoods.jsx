import { useState, useEffect, useCallback } from "react";
import { Plus, Tag, Search, Edit, Clock, Trash2, Package } from "lucide-react";
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

export default function FinishedGoods() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/stock");
      setItems(data.data);
    } catch { toast.error(t("error")); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  const columns = [
    { key:"name", label: t("finished_goods"), render:(v,r) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-success/10 rounded flex items-center justify-center text-success">
          <Package size={14} />
        </div>
        <div>
          <p className="font-medium text-text-primary">{v}</p>
          <p className="text-[11px] text-text-secondary">{r.category} • {r.size}</p>
        </div>
      </div>
    )},
    { key:"quantity", label: t("quantity"), render: v => <span className="font-semibold">{v}</span> },
    { key:"cost_price_rwf", label: t("cost_price"), render: v => formatRWF(v) },
    { key:"sell_price_rwf", label: t("selling_price"), render: v => formatRWF(v) },
    { key:"status", label: t("status"), render: v => <Badge status={STATUS_MAP[v]||"neutral"} label={t(v)} /> },
    { key:"id", label: "", render: () => (
      <div className="flex gap-1">
        <button className="p-1 text-text-secondary hover:text-primary"><Edit size={14} /></button>
        <button className="p-1 text-text-secondary hover:text-danger"><Trash2 size={14} /></button>
      </div>
    )}
  ];

  return (
    <PageWrapper title={t("finished_goods")} subtitle="Inventory ready for wholesale"
      breadcrumbs={[{ label: t("production_nav"), path: "/app/production" }, { label: t("finished_goods"), path: "/app/finished-goods" }]}>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <StatCard title="Total Units" value={items.reduce((s,i)=>s+i.quantity,0)} />
        <StatCard title="Total Value" value={formatRWF(items.reduce((s,i)=>s+i.quantity*i.sell_price_rwf,0))} />
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`${t("search")}…`}
              className="w-full h-9 pl-9 pr-3 border border-border rounded-card text-[11px] focus:outline-none focus:ring-1 focus:ring-primary bg-surface" />
          </div>
          <Button icon={Plus} size="sm" onClick={() => setShowModal(true)}>{t("add")}</Button>
        </div>
        <Table columns={columns} data={filtered} loading={loading} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={t("add")}>
        <div className="space-y-3">
          <Input label="Item Name" placeholder="e.g. Completed Uniform Batch" />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("quantity")} type="number" />
            <Input label={t("selling_price")} type="number" />
          </div>
          <Button className="w-full" onClick={() => setShowModal(false)}>{t("save")}</Button>
        </div>
      </Modal>
    </PageWrapper>
  );
}
