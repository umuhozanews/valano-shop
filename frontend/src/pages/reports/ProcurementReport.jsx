import { useState } from "react";
import { Download } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";

const STATUS_MAP = { ordered:"neutral", in_transit:"warning", at_customs:"danger", arrived:"success", stocked:"success" };

export default function ProcurementReport() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ start_date:"", end_date:"" });

  async function generate() {
    setLoading(true);
    try {
      const { data: d } = await api.get("/reports/procurement", { params: Object.fromEntries(Object.entries(filters).filter(([,v])=>v)) });
      setData(d);
    } catch { toast.error("Failed to generate"); }
    finally { setLoading(false); }
  }

  const exportExcel = async () => {
    try {
      const activeFilters = Object.fromEntries(Object.entries(filters).filter(([,v])=>v));
      const response = await api.get("/reports/procurement", {
        params: { ...activeFilters, export: "excel" },
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `procurement_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to export Excel");
    }
  };

  const columns = [
    { key:"id", label:"Order #", render:v=>`#${v}` },
    { key:"supplier_name", label:"Supplier" },
    { key:"order_date", label:"Date", render:v=>formatDate(v) },
    { key:"currency", label:"Currency" },
    { key:"items_cost_cny", label:"Items Cost", render:(v,r)=>`${parseFloat(v).toFixed(0)} ${r.currency}` },
    { key:"shipping_cost", label:"Shipping", render:(v,r)=>formatRWF(parseFloat(v||0)) },
    { key:"customs_cost", label:"Customs", render:v=>formatRWF(parseFloat(v||0)) },
    { key:"items_cost_rwf", label:"Total RWF", render:v=><span className="font-semibold text-primary">{formatRWF(Math.round(v||0))}</span> },
    { key:"status", label:"Status", render:v=><Badge status={STATUS_MAP[v]||"neutral"} label={v?.replace("_"," ")||"—"} /> },
  ];

  return (
    <PageWrapper title="Procurement Report" breadcrumbs={[{label:"Reports"},{label:"Procurement"}]}>
      <Card className="mb-4">
        <div className="flex flex-wrap gap-3">
          <input type="date" value={filters.start_date} onChange={e=>setFilters(f=>({...f,start_date:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[11px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="date" value={filters.end_date} onChange={e=>setFilters(f=>({...f,end_date:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[11px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
          <div className="flex gap-2 ml-auto">
            <Button loading={loading} onClick={generate}>Generate</Button>
            {data.length > 0 && <Button variant="secondary" size="sm" icon={Download} onClick={exportExcel}>Excel</Button>}
          </div>
        </div>
      </Card>
      {data.length > 0 && <Card><Table columns={columns} data={data} emptyMessage="No data" /></Card>}
    </PageWrapper>
  );
}
