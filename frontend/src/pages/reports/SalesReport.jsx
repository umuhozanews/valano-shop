import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function SalesReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ start_date:"", end_date:"", branch_id:"" });

  async function generate() {
    setLoading(true);
    try {
      const { data: d } = await api.get("/reports/sales", { params: Object.fromEntries(Object.entries(filters).filter(([,v])=>v)) });
      setData(d);
    } catch { toast.error("Failed to generate report"); }
    finally { setLoading(false); }
  }

  function exportPDF() {
    const p = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v])=>v)));
    p.set("export","pdf");
    window.open(`${API}/reports/sales?${p}`,"_blank");
  }

  function exportExcel() {
    const p = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v])=>v)));
    p.set("export","excel");
    window.open(`${API}/reports/sales?${p}`,"_blank");
  }

  const workerCols = [
    { key:"name", label:"Worker" }, { key:"branch", label:"Branch" },
    { key:"sales", label:"Sales" },
    { key:"revenue", label:"Revenue", render:v => formatRWF(v) },
    { key:"avg_sale", label:"Avg Sale", render:v => formatRWF(Math.round(v)) },
  ];

  return (
    <PageWrapper title="Sales Report" breadcrumbs={[{label:"Reports",path:"/app/reports/sales"},{label:"Sales",path:"/app/reports/sales"}]}>
      <Card className="mb-4">
        <div className="flex flex-wrap gap-3">
          <input type="date" value={filters.start_date} onChange={e=>setFilters(f=>({...f,start_date:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="date" value={filters.end_date} onChange={e=>setFilters(f=>({...f,end_date:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
          <div className="flex gap-2 ml-auto">
            <Button loading={loading} onClick={generate}>Generate</Button>
            {data && <><Button variant="secondary" size="sm" icon={FileText} onClick={exportPDF}>PDF</Button><Button variant="secondary" size="sm" icon={Download} onClick={exportExcel}>Excel</Button></>}
          </div>
        </div>
      </Card>

      {data && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatCard title="Total Sales" value={parseInt(data.totals?.total_sales)||0} />
            <StatCard title="Total Revenue" value={formatRWF(data.totals?.total_revenue||0)} />
            <StatCard title="Avg Sale Value" value={formatRWF(Math.round(data.totals?.avg_sale||0))} />
          </div>
          <Card title="Daily Sales" className="mb-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.daily}>
                <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={v=>v?.slice(5)} />
                <YAxis tick={{fontSize:10}} tickFormatter={v=>(v/1000).toFixed(0)+"k"} />
                <Tooltip formatter={v=>formatRWF(v)} />
                <Bar dataKey="revenue" fill="#10B981" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Worker Breakdown">
            <Table columns={workerCols} data={data.workers} emptyMessage="No data" />
          </Card>
        </>
      )}
    </PageWrapper>
  );
}
