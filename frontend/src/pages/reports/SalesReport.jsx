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

  const handleExport = async (format) => {
    try {
      const response = await api.get("/reports/sales", {
        params: { ...filters, export: format },
        responseType: "blob",
      });
      const blob = new Blob([response.data], {
        type: format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `sales_report_${new Date().toISOString().slice(0, 10)}.${format === "pdf" ? "pdf" : "xlsx"}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t("error"));
    }
  };

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

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input type="date" value={filters.start_date} onChange={e=>setFilters(f=>({...f,start_date:e.target.value}))} className="h-9 px-3 border border-border rounded-card text-[11px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary font-medium" />
        <input type="date" value={filters.end_date} onChange={e=>setFilters(f=>({...f,end_date:e.target.value}))} className="h-9 px-3 border border-border rounded-card text-[11px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary font-medium" />
        <div className="flex gap-2 ml-auto">
          {data.sales?.length > 0 && (
            <>
              <Button variant="secondary" size="sm" icon={FileText} onClick={() => handleExport("pdf")}>PDF</Button>
              <Button variant="secondary" size="sm" icon={Download} onClick={() => handleExport("excel")}>Excel</Button>
            </>
          )}
        </div>
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
