import { useState, useEffect } from "react";
import { Download, FileText } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import StatCard from "../../components/ui/StatCard";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import toast from "react-hot-toast";

const STATUS_MAP = { in_stock:"success", low_stock:"warning", out_of_stock:"danger" };
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function StockReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState([]);

  useEffect(() => { api.get("/settings").then(d => setBranches(d.data.branches||[])); }, []);

  async function generate() {
    setLoading(true);
    try {
      const { data: d } = await api.get("/reports/stock", { params: branchId ? { branch_id: branchId } : {} });
      setData(d);
    } catch { toast.error("Failed to generate"); }
    finally { setLoading(false); }
  }

  const exportExcel = () => window.open(`${API}/reports/stock?export=excel${branchId?`&branch_id=${branchId}`:""}`, "_blank");
  const exportPDF = () => window.open(`${API}/reports/stock?export=pdf${branchId?`&branch_id=${branchId}`:""}`, "_blank");

  const columns = [
    { key:"name", label:"Item" }, { key:"category", label:"Category" }, { key:"size", label:"Size" },
    { key:"branch_name", label:"Branch" },
    { key:"quantity", label:"Qty", render:(v,r) => <span className={r.status==="out_of_stock"?"text-danger font-bold":r.status==="low_stock"?"text-warning font-bold":"font-medium"}>{v}</span> },
    { key:"cost_price_rwf", label:"Cost", render:v=>formatRWF(v) },
    { key:"sell_price_rwf", label:"Sell", render:v=>formatRWF(v) },
    { key:"total_value", label:"Value", render:v=><span className="font-medium text-primary">{formatRWF(v)}</span> },
    { key:"status", label:"Status", render:v=><Badge status={STATUS_MAP[v]||"neutral"} label={v?.replace("_"," ")||"—"} /> },
  ];

  return (
    <PageWrapper title="Stock Report" breadcrumbs={[{label:"Reports",path:"/app/reports/stock"},{label:"Stock",path:"/app/reports/stock"}]}>
      <Card className="mb-4">
        <div className="flex gap-3">
          <select value={branchId} onChange={e=>setBranchId(e.target.value)} className="h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">All Branches</option>
            {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <div className="flex gap-2 ml-auto">
            <Button loading={loading} onClick={generate}>Generate</Button>
            {data && <><Button variant="secondary" size="sm" icon={FileText} onClick={exportPDF}>PDF</Button><Button variant="secondary" size="sm" icon={Download} onClick={exportExcel}>Excel</Button></>}
          </div>
        </div>
      </Card>

      {data && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
            <StatCard title="Total Items" value={data.totals?.items||0} />
            <StatCard title="Total Value" value={formatRWF(data.totals?.value||0)} />
            <StatCard title="Low Stock" value={data.totals?.low||0} />
            <StatCard title="Out of Stock" value={data.totals?.out||0} />
          </div>
          <Card>
            <Table columns={columns} data={data.data} emptyMessage="No items" />
          </Card>
        </>
      )}
    </PageWrapper>
  );
}
