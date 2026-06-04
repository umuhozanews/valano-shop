import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Download } from "lucide-react";
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

const PAYMENT_LABELS = { cash:"Cash", mtn_momo:"MTN MoMo", airtel:"Airtel" };

export default function SalesList() {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search:"", start_date:"", end_date:"", payment_method:"" });

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit:20, ...Object.fromEntries(Object.entries(filters).filter(([,v])=>v)) };
      const { data } = await api.get("/sales", { params });
      setSales(data.data); setTotal(data.total); setStats(data.stats || {});
    } catch { toast.error("Failed to load sales"); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const columns = [
    { key:"invoice_number", label:"Invoice", render:v => <span className="font-mono text-[12px] font-medium text-primary">{v||"—"}</span> },
    { key:"customer_name", label:"Customer", render:v => v || "Walk-in" },
    { key:"worker_name", label:"Worker / Branch", render:(v,r) => (
      <div><p className="font-medium">{v}</p><p className="text-[11px] text-text-secondary">{r.branch_name}</p></div>
    )},
    { key:"items_count", label:"Items", render:v => <span className="font-medium">{v}</span> },
    { key:"payment_method", label:"Payment", render:v => <Badge status="neutral" label={PAYMENT_LABELS[v]||v} /> },
    { key:"total_amount", label:"Total", render:v => <span className="font-semibold text-primary">{formatRWF(v)}</span> },
    { key:"created_at", label:"Date", render:v => formatDate(v, "dd MMM yy HH:mm") },
    { key:"is_voided", label:"Status", render:v => <Badge status={v?"danger":"success"} label={v?"Voided":"Completed"} /> },
    { key:"id", label:"", render:v => (
      <Button variant="ghost" size="sm" onClick={() => navigate(`/app/sales/${v}`)}>View</Button>
    )},
  ];

  return (
    <PageWrapper title="Sales" subtitle="All recorded transactions"
      breadcrumbs={[{label:"Sales",path:"/app/sales"}]}>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <StatCard title="Total Sales" value={parseInt(stats.count)||0} />
        <StatCard title="Total Revenue" value={formatRWF(stats.revenue||0)} />
        <StatCard title="Avg Sale Value" value={formatRWF(Math.round(stats.avg_sale||0))} />
        <Button variant="primary" size="lg" icon={Plus} onClick={() => navigate("/app/sales/new")} className="!h-auto flex-col gap-1 py-4">
          <span className="text-[15px]">New Sale</span>
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={filters.search} onChange={e=>setFilters(f=>({...f,search:e.target.value}))} placeholder="Search invoice or customer…"
              className="w-full h-9 pl-9 pr-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <input type="date" value={filters.start_date} onChange={e=>setFilters(f=>({...f,start_date:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface" />
          <input type="date" value={filters.end_date} onChange={e=>setFilters(f=>({...f,end_date:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface" />
          <select value={filters.payment_method} onChange={e=>setFilters(f=>({...f,payment_method:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-primary bg-surface">
            <option value="">All Payments</option>
            <option value="cash">Cash</option>
            <option value="mtn_momo">MTN MoMo</option>
            <option value="airtel">Airtel</option>
          </select>
        </div>

        <Table columns={columns} data={sales} loading={loading} emptyMessage="No sales found" />

        {total > 20 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-[13px] text-text-secondary">Showing {(page-1)*20+1}–{Math.min(page*20,total)} of {total}</p>
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
