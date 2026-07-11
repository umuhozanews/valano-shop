import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Tag, Box, TrendingUp } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

export default function StockDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [item, setItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/stock/${id}`),
      api.get(`/stock/${id}/history`),
    ]).then(([d, h]) => {
      setItem(d.data); setHistory(h.data);
    }).catch(() => toast.error(t("error")))
      .finally(() => setLoading(false));
  }, [id, t]);

  if (loading) return <PageWrapper title="..." subtitle="..." breadcrumbs={[]}><div className="animate-pulse h-64 bg-surface rounded-card" /></PageWrapper>;
  if (!item) return <PageWrapper title="Not Found" subtitle="..." breadcrumbs={[]}><Card>Item not found</Card></PageWrapper>;

  const historyColumns = [
    { key:"type", label: t("actions"), render: v => <span className="capitalize">{v?.replace("_"," ")}</span> },
    { key:"quantity", label: t("quantity"), render: v => <span className={v > 0 ? "text-success font-medium" : "text-danger font-medium"}>{v > 0 ? `+${v}` : v}</span> },
    { key:"done_by", label: t("workers") },
    { key:"date", label: t("date"), render: v => formatDate(v, "dd MMM yyyy HH:mm") },
  ];

  return (
    <PageWrapper title={item.name} subtitle={item.category}
      breadcrumbs={[{label: t("stock"), path:"/app/stock"}, {label: item.name, path:`/app/stock/${id}`}]}>
      
      <div className="flex items-center gap-3 mb-6">
        <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={() => navigate("/app/stock")}>{t("all")}</Button>
        <Badge status={item.quantity > item.low_stock_threshold ? "success" : "warning"} label={item.status.replace("_"," ")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card title={t("item_name")}>
            <div className="space-y-4">
              {[
                [t("barcode"), item.barcode],
                [t("size"), item.size || "—"],
                [t("color"), item.color || "—"],
                [t("category"), item.category],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between border-b border-border pb-2 last:border-0">
                  <span className="text-[14px] text-text-secondary">{l}</span>
                  <span className="text-[14px] font-medium text-text-primary">{v}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card title={t("selling_price")}>
            <div className="space-y-4">
              {[
                [t("cost_price"), formatRWF(item.cost_price_rwf)],
                [t("selling_price"), formatRWF(item.sell_price_rwf)],
                [t("quantity"), item.quantity],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between border-b border-border pb-2 last:border-0">
                  <span className="text-[14px] text-text-secondary">{l}</span>
                  <span className="text-[15px] font-bold text-primary">{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title={t("recent_activity")}>
            <Table columns={historyColumns} data={history} />
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
