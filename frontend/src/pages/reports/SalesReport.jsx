import { useState, useEffect, useCallback } from "react";
import { Download, FileText, Search } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import { useBusiness } from "../../context/BusinessContext";

export default function SalesReport() {
  const { t } = useLanguage();
  const { activeBusiness } = useBusiness();
  const [data, setData] = useState({ sales:[], totals:{} });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ start_date:"", end_date:"" });

  const isRealEstate = activeBusiness.type === "real_estate";
  const isIndustry = activeBusiness.type === "industry";

  useEffect(() => {
    setLoading(true);
    api.get("/reports/sales", { params: filters })
       .then(d => setData(d.data))
       .catch(() => toast.error(t("error")))
       .finally(() => setLoading(false));
  }, [filters, t]);

  const columns = [
    { key:"invoice_number", label: isRealEstate ? "Receipt No" : isIndustry ? "Order No" : t("invoice_no") },
    { key:"customer_name", label: isRealEstate ? t("tenants") : isIndustry ? "Client Company" : t("customer"), render:v => v || "Walk-in" },
    { key:"worker_name", label: t("workers") },
    { key:"total_amount", label: t("total"), render:v => formatRWF(v) },
    { key:"payment_method", label: t("payment_method"), render:v => v?.toUpperCase() },
    { key:"created_at", label: t("date"), render:v => formatDate(v, "dd MMM yyyy") },
  ];

  const reportTitle = isRealEstate ? t("rent_payments") : isIndustry ? t("wholesale_orders") : t("retail_sales");

  return (
    <PageWrapper title={reportTitle} subtitle={t("reports")}
      breadcrumbs={[{label: t("reports"), path:"/app/reports/sales"}, {label: reportTitle, path:"/app/reports/sales"}]}>

      <div className="flex flex-wrap gap-3 mb-4">
        <input type="date" value={filters.start_date} onChange={e=>setFilters(f=>({...f,start_date:e.target.value}))} className="h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
        <input type="date" value={filters.end_date} onChange={e=>setFilters(f=>({...f,end_date:e.target.value}))} className="h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <StatCard title={isRealEstate ? "Rent Collected" : t("total_sales")} value={data.totals?.count||0} />
        <StatCard title={t("total_revenue")} value={formatRWF(data.totals?.revenue||0)} />
      </div>

      <Card title={isRealEstate ? "Rent History" : isIndustry ? "Orders" : t("sales")}>
        <Table columns={columns} data={data.sales} loading={loading} />
      </Card>
    </PageWrapper>
  );
}
