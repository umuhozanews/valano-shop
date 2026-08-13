import { useState, useEffect, useCallback } from "react";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../../components/layout/PageWrapper";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import { useBusiness } from "../../context/BusinessContext";

export default function SalesList() {
  const { t } = useLanguage();
  const { activeBusiness } = useBusiness();
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search:"", start_date:"", end_date:"", payment_method:"" });

  const isRealEstate = activeBusiness.type === "real_estate";

  const PAYMENT_LABELS = { 
    cash: t("cash"), 
    mtn_momo: t("momo"), 
    airtel: "Airtel",
    bank_transfer: t("bank") 
  };

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit:20, ...Object.fromEntries(Object.entries(filters).filter(([,v])=>v)) };
      const { data } = await api.get("/sales", { params });
      setSales(data.data); setTotal(data.total); setStats(data.stats || {});
    } catch { toast.error(t("error")); }
    finally { setLoading(false); }
  }, [page, filters, t]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const columns = [
    { key:"invoice_number", label: isRealEstate ? "Receipt No" : t("invoice_no"), render:v => <span className="font-mono text-[12px] font-medium text-primary">{v||"—"}</span> },
    { key:"customer_name", label: isRealEstate ? t("tenants") : t("customer"), render:v => v || (isRealEstate ? "Unnamed Tenant" : "Walk-in") },
    { key:"worker_name", label: t("workers"), render:(v) => (
      <div><p className="font-medium">{v}</p></div>
    )},
    { key:"branch_name", label: "Branch", render:v => <Badge status="neutral" label={v || "Global"} /> },
    { key:"payment_method", label: t("payment_method"), render:v => <Badge status="neutral" label={PAYMENT_LABELS[v]||v} /> },
    { key:"total_amount", label: t("total"), render:v => <span className="font-semibold text-primary">{formatRWF(v)}</span> },
    { key:"created_at", label: t("date"), render:v => formatDate(v, "dd MMM yy HH:mm") },
    { key:"is_voided", label: t("status"), render:v => <Badge status={v?"danger":"success"} label={v? t("delete") : t("success")} /> },
    { key:"id", label:"", render:v => (
      <Button variant="ghost" size="sm" onClick={() => navigate(`/app/sales/${v}`)}>{t("view")}</Button>
    )},
  ];

  return (
    <PageWrapper title={isRealEstate ? t("rent_payments") : t("sales")} subtitle={t("all")}
      breadcrumbs={[{label: isRealEstate ? t("rent_payments") : t("sales"), path: "/app/sales"}]}>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <StatCard title={isRealEstate ? "Total Collected" : t("total_sales")} value={isRealEstate ? formatRWF(stats.revenue||0) : parseInt(stats.count)||0} />
        <StatCard title={isRealEstate ? "Pending Payments" : t("total_revenue")} value={isRealEstate ? "2,450,000 RWF" : formatRWF(stats.revenue||0)} />
        <Button variant="primary" size="lg" icon={Plus} onClick={() => navigate("/app/sales/new")} className="!h-auto flex-col gap-1 py-4">
          <span className="text-[11px]">{isRealEstate ? "Record Payment" : t("new_sale")}</span>
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))} placeholder={`${t("search")}…`}
              className="w-full h-9 pl-9 pr-3 border border-border rounded-card text-[11px] focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <input type="date" value={filters.start_date} onChange={e=>setFilters(f=>({...f,start_date:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[11px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface" />
          <input type="date" value={filters.end_date} onChange={e=>setFilters(f=>({...f,end_date:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[11px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface" />
        </div>

        <Table columns={columns} data={sales} loading={loading} emptyMessage={t("loading")} />

        {total > 20 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-[11px] text-text-secondary">Showing {(page-1)*20+1}–{Math.min(page*20,total)} of {total}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page===1} onClick={() => setPage(p=>p-1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page*20>=total} onClick={() => setPage(p=>p+1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
