import { useState, useEffect, useCallback } from "react";
import { Download, CheckCircle } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";

const STATUS_MAP = { paid:"success", pending:"warning", overdue:"danger", voided:"neutral" };

export default function InvoicesList() {
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status:"", start_date:"", end_date:"" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit:20, ...Object.fromEntries(Object.entries(filters).filter(([,v])=>v)) };
      const { data } = await api.get("/invoices", { params });
      setInvoices(data.data); setTotal(data.total); setSummary(data.summary||[]);
    } finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function markPaid(id) {
    try { await api.put(`/invoices/${id}/status`, { status:"paid" }); toast.success("Marked as paid"); fetchData(); }
    catch { toast.error("Failed"); }
  }

  const getSummary = (s) => summary.find(x=>x.status===s)||{cnt:0,total:0};

  const columns = [
    { key:"invoice_number", label:"Invoice #", render:v => <span className="font-mono text-[12px] font-medium text-primary">{v}</span> },
    { key:"customer_name", label:"Customer", render:v => v||"Walk-in" },
    { key:"branch_name", label:"Branch" },
    { key:"total_amount", label:"Amount", render:v => <span className="font-semibold text-primary">{formatRWF(v)}</span> },
    { key:"issued_at", label:"Issued", render:v => formatDate(v) },
    { key:"status", label:"Status", render:v => <Badge status={STATUS_MAP[v]||"neutral"} label={v} /> },
    { key:"id", label:"", render:(v,r) => (
      <div className="flex gap-1">
        <button onClick={() => window.open(`${import.meta.env.VITE_API_URL||"http://localhost:5000/api"}/invoices/${v}/pdf`,"_blank")}
          className="p-1 text-text-secondary hover:text-primary rounded" title="PDF"><Download size={14}/></button>
        {r.status==="pending" && (
          <button onClick={() => markPaid(v)} className="p-1 text-text-secondary hover:text-success rounded" title="Mark Paid"><CheckCircle size={14}/></button>
        )}
      </div>
    )},
  ];

  return (
    <PageWrapper title="Invoices" breadcrumbs={[{label:"Invoices",path:"/app/invoices"}]}>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        {[["Total",""],[  "Paid","paid"],["Pending","pending"],["Overdue","overdue"]].map(([label,key]) => {
          const s = key ? getSummary(key) : { cnt: summary.reduce((a,x)=>a+parseInt(x.cnt),0), total: summary.reduce((a,x)=>a+parseInt(x.total),0) };
          return <StatCard key={label} title={label} value={`${parseInt(s.cnt)} · ${formatRWF(s.total||0)}`} />;
        })}
      </div>
      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <select value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">All Status</option>
            {["paid","pending","overdue","voided"].map(s=><option key={s}>{s}</option>)}
          </select>
          <input type="date" value={filters.start_date} onChange={e=>setFilters(f=>({...f,start_date:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="date" value={filters.end_date} onChange={e=>setFilters(f=>({...f,end_date:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <Table columns={columns} data={invoices} loading={loading} emptyMessage="No invoices found" />
        {total>20 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
            <p className="text-[13px] text-text-secondary">{(page-1)*20+1}–{Math.min(page*20,total)} of {total}</p>
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
