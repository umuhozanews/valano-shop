import { useState, useEffect, useCallback } from "react";
import { Search, Filter, FileText, ExternalLink, Download } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";

export default function InvoicesList() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search:"", status:"" });

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/invoices", { params: filters });
      const list = Array.isArray(data) ? data : (data.data || []);
      setInvoices(list);
    } catch { toast.error(t("error")); }
    finally { setLoading(false); }
  }, [filters, t]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const downloadPDF = async (invoiceId, invoiceNumber) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `${invoiceNumber || 'invoice'}.pdf`;
      link.click();
      toast.success(t("success") || "Downloaded");
    } catch {
      toast.error(t("error") || "Download failed");
    }
  };

  const columns = [
    { key:"invoice_number", label: t("invoice_no"), render:v => <span className="font-mono text-[12px] font-medium text-primary">{v}</span> },
    { key:"customer_name", label: t("customer"), render:v => v || "Walk-in" },
    { key:"total_amount", label: t("total"), render:v => <span className="font-semibold">{formatRWF(v)}</span> },
    { key:"issued_at", label: t("date"), render:v => formatDate(v, "dd MMM yyyy") },
    { key:"id", label:"", render:(v, r) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" icon={ExternalLink} onClick={() => navigate(`/app/sales/${r.sale_id}`)}>{t("view")}</Button>
        <Button variant="ghost" size="sm" icon={Download} onClick={() => downloadPDF(r.id, r.invoice_number)}>PDF</Button>
      </div>
    )},
  ];

  return (
    <PageWrapper title={t("invoices")} subtitle={t("finance")}
      breadcrumbs={[{label: t("finance"), path:"/app/invoices"}, {label: t("invoices"), path:"/app/invoices"}]}>

      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))} placeholder={`${t("search")}…`}
              className="w-full h-9 pl-9 pr-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>

        <Table columns={columns} data={invoices} loading={loading} />
      </Card>
    </PageWrapper>
  );
}
