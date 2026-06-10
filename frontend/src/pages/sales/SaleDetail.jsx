import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, Trash2, Mail, Download } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/sales/${id}`)
       .then(d => setSale(d.data))
       .catch(() => toast.error(t("error")))
       .finally(() => setLoading(false));
  }, [id, t]);

  async function handleVoid() {
    if (!confirm(t("confirm_delete"))) return;
    try {
      await api.post(`/sales/${id}/void`);
      toast.success(t("success"));
      navigate("/app/sales");
    } catch { toast.error(t("error")); }
  }

  if (loading) return <PageWrapper title="..." subtitle="..." breadcrumbs={[]}><div className="animate-pulse h-64 bg-surface rounded-card" /></PageWrapper>;
  if (!sale) return <PageWrapper title="Not Found" subtitle="..." breadcrumbs={[]}><Card>Sale not found</Card></PageWrapper>;

  const columns = [
    { key:"item_name", label: t("item_name") },
    { key:"quantity", label: t("quantity") },
    { key:"unit_price", label: t("selling_price"), render: v => formatRWF(v) },
    { key:"total", label: t("total"), render: (_,r) => formatRWF(r.quantity * r.unit_price) },
  ];

  return (
    <PageWrapper title={`${t("invoice_no")} ${sale.invoice_number}`} subtitle={formatDate(sale.created_at, "dd MMMM yyyy HH:mm")}
      breadcrumbs={[{label: t("sales"), path:"/app/sales"}, {label: sale.invoice_number, path:`/app/sales/${id}`}]}>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={() => navigate("/app/sales")}>{t("all")}</Button>
          <Badge status={sale.is_voided ? "danger" : "success"} label={sale.is_voided ? t("delete") : t("success")} />
        </div>
        {!sale.is_voided && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={Printer}>{t("print")}</Button>
            <Button variant="danger" size="sm" icon={Trash2} onClick={handleVoid}>{t("void_sale")}</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title={t("sale_details")}>
            <Table columns={columns} data={sale.items} />
            <div className="mt-6 flex flex-col items-end gap-2 pr-4">
              <div className="flex justify-between w-48 text-[14px]">
                <span className="text-text-secondary">{t("subtotal")}</span>
                <span className="font-medium text-text-primary">{formatRWF(sale.total_amount)}</span>
              </div>
              <div className="flex justify-between w-48 text-[16px] pt-2 border-t border-border mt-2">
                <span className="font-bold text-text-primary">{t("grand_total")}</span>
                <span className="font-bold text-primary">{formatRWF(sale.total_amount)}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title={t("customer")}>
            <div className="space-y-3">
              <p className="text-[14px] font-semibold text-text-primary">{sale.customer_name || "Walk-in Customer"}</p>
              <div className="pt-3 border-t border-border">
                <p className="text-[11px] text-text-secondary uppercase font-bold tracking-wider mb-1">{t("payment_method")}</p>
                <p className="text-[13px] font-medium text-text-primary uppercase">{sale.payment_method?.replace("_"," ")}</p>
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-[11px] text-text-secondary uppercase font-bold tracking-wider mb-1">{t("workers")}</p>
                <p className="text-[13px] font-medium text-text-primary">{sale.worker_name}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
