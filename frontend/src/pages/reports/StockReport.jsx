import { useState, useEffect } from "react";
import { Download, FileText } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import toast from "react-hot-toast";

const STATUS_MAP = { in_stock:"success", low_stock:"warning", out_of_stock:"danger" };

export default function StockReport() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { generate(); }, []);

  async function generate() {
    setLoading(true);
    try {
      const { data: d } = await api.get("/reports/stock");
      setData(d);
    } catch { toast.error("Failed to generate stock report"); }
    finally   { setLoading(false); }
  }

  async function exportExcel() {
    try {
      const res = await api.get("/reports/stock", { params: { export:"excel" }, responseType:"blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement("a"); a.href = url;
      a.download = `stock_report_${new Date().toISOString().slice(0,10)}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Export failed"); }
  }

  const rows   = data?.data   || [];
  const totals = data?.totals || {};

  return (
    <PageWrapper title="Stock Report" subtitle="Full inventory snapshot"
      breadcrumbs={[{ label:"Reports", path:"/app/reports/sales" }, { label:"Stock Report", path:"/app/reports/stock" }]}
      action={
        <div className="flex gap-2">
          <button onClick={generate}
            className="px-3 py-2 border border-border rounded-[6px] text-[13px] text-text-primary hover:bg-background">
            Refresh
          </button>
          {data && (
            <button onClick={exportExcel}
              className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-[6px] text-[13px] text-text-secondary hover:text-text-primary">
              <Download size={13} /> Excel
            </button>
          )}
        </div>
      }
    >
      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Total Items",    value: totals.items || 0 },
          { label: "Stock Value",    value: formatRWF(totals.value || 0) },
          { label: "Low Stock",      value: totals.low  || 0 },
          { label: "Out of Stock",   value: totals.out  || 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface border border-border rounded-[8px] p-4">
            <p className="text-[11px] text-text-secondary">{label}</p>
            <p className="text-[20px] font-bold text-text-primary mt-1">{value}</p>
          </div>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="py-12 text-center text-[13px] text-text-secondary">Loading stock report…</div>
        ) : !rows.length ? (
          <div className="py-12 text-center text-[13px] text-text-secondary">No stock items found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  {["Product","Kinyarwanda","Category","Unit","Qty","Cost (RWF)","Sell (RWF)","Total Value","Status"].map(h => (
                    <th key={h} className="pb-2 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(r => (
                  <tr key={r.id}>
                    <td className="py-2 pr-3 font-medium text-text-primary">{r.name}</td>
                    <td className="py-2 pr-3 text-text-secondary">{r.name_rw || "—"}</td>
                    <td className="py-2 pr-3 text-text-secondary">{r.category || "—"}</td>
                    <td className="py-2 pr-3 text-text-secondary">{r.unit || "pcs"}</td>
                    <td className={`py-2 pr-3 font-bold ${r.stock_status==="out_of_stock"?"text-danger":r.stock_status==="low_stock"?"text-warning":"text-text-primary"}`}>{r.quantity}</td>
                    <td className="py-2 pr-3 text-text-secondary">{formatRWF(r.cost_price_rwf)}</td>
                    <td className="py-2 pr-3 text-text-secondary">{formatRWF(r.sell_price_rwf)}</td>
                    <td className="py-2 pr-3 font-medium text-primary">{formatRWF(r.total_cost_value)}</td>
                    <td className="py-2"><Badge status={STATUS_MAP[r.stock_status]||"neutral"} label={r.stock_status?.replace(/_/g," ")||"—"} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td colSpan={7} className="pt-2 font-bold text-text-primary text-[13px]">TOTAL</td>
                  <td className="pt-2 font-bold text-primary">{formatRWF(totals.value)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
