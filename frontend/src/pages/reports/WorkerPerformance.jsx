import { useState } from "react";
import { Download } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import toast from "react-hot-toast";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const MEDALS = ["🥇","🥈","🥉"];

export default function WorkerPerformance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ start_date:"", end_date:"" });

  async function generate() {
    setLoading(true);
    try {
      const { data: d } = await api.get("/reports/worker-performance", { params: Object.fromEntries(Object.entries(filters).filter(([,v])=>v)) });
      setData(d);
    } catch { toast.error("Failed to generate"); }
    finally { setLoading(false); }
  }

  const exportExcel = () => {
    const p = new URLSearchParams({...Object.fromEntries(Object.entries(filters).filter(([,v])=>v)), export:"excel"});
    window.open(`${API}/reports/worker-performance?${p}`, "_blank");
  };

  const columns = [
    { key:"name", label:"#  Worker", render:(v,r,i) => (
      <div className="flex items-center gap-2">
        <span className="text-[16px]">{MEDALS[data.indexOf(r)] || (data.indexOf(r)+1)}</span>
        <div><p className="font-medium text-text-primary">{v}</p><p className="text-[11px] text-text-secondary">{r.branch}</p></div>
      </div>
    )},
    { key:"sales_count", label:"Sales" },
    { key:"revenue", label:"Revenue", render:v=><span className="font-semibold text-primary">{formatRWF(v)}</span> },
    { key:"monthly_target", label:"Target", render:v=>formatRWF(v) },
    { key:"achievement_pct", label:"Achievement", render:(v,r) => (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100,v)}%` }} />
        </div>
        <span className="text-[12px] font-medium">{v}%</span>
      </div>
    )},
    { key:"commission_due", label:"Commission Due", render:v=><span className="font-medium text-success">{formatRWF(v)}</span> },
  ];

  return (
    <PageWrapper title="Worker Performance" breadcrumbs={[{label:"Reports"},{label:"Worker Performance"}]}>
      <Card className="mb-4">
        <div className="flex flex-wrap gap-3">
          <input type="date" value={filters.start_date} onChange={e=>setFilters(f=>({...f,start_date:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="date" value={filters.end_date} onChange={e=>setFilters(f=>({...f,end_date:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
          <div className="flex gap-2 ml-auto">
            <Button loading={loading} onClick={generate}>Generate</Button>
            {data.length > 0 && <Button variant="secondary" size="sm" icon={Download} onClick={exportExcel}>Excel</Button>}
          </div>
        </div>
      </Card>

      {data.length > 0 && (
        <>
          <Card className="mb-4">
            <Table columns={columns} data={data} emptyMessage="No data" />
          </Card>
          <Card title="Commission Summary">
            <div className="flex justify-between text-[14px] font-semibold text-text-primary">
              <span>Total Commission Payable</span>
              <span className="text-success">{formatRWF(data.reduce((s,w) => s+parseInt(w.commission_due||0), 0))}</span>
            </div>
          </Card>
        </>
      )}
    </PageWrapper>
  );
}
