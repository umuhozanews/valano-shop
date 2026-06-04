import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Package } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import api from "../../utils/api";
import { formatRWF, formatDate, formatRelative } from "../../utils/formatters";
import toast from "react-hot-toast";

const STATUS_MAP = { in_stock:"success", low_stock:"warning", out_of_stock:"danger" };

export default function StockDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [barcodeUrl, setBarcodeUrl] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/stock/${id}`),
      api.get(`/stock/${id}/history`),
    ]).then(([itemRes, histRes]) => {
      setItem(itemRes.data);
      setHistory(histRes.data);
      setBarcodeUrl(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/stock/${id}/barcode`);
    }).catch(() => toast.error("Failed to load item")).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!item) return null;

  const histColumns = [
    { key:"date", label:"Date", render:v => formatDate(v, "dd MMM yyyy HH:mm") },
    { key:"type", label:"Type", render:v => <Badge status={v==="sale"?"success":v==="transfer"?"warning":"neutral"} label={v} /> },
    { key:"quantity", label:"Qty Change" },
    { key:"done_by", label:"Done By" },
    { key:"from_branch", label:"From → To", render:(v,r) => r.from_branch ? `${v} → ${r.to_branch}` : "—" },
  ];

  return (
    <PageWrapper title={item.name} subtitle={`${item.category} · ${item.size || ""} · ${item.color || ""}`}
      breadcrumbs={[{label:"Stock",path:"/app/stock"},{label:item.name,path:`/app/stock/${id}`}]}>
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate("/app/stock")} className="mb-4">Back to Stock</Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Item info */}
        <Card className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {[
              ["Item Name", item.name], ["Category", item.category], ["Size", item.size], ["Color", item.color],
              ["Branch", item.branch_name], ["Barcode", item.barcode], ["Cost Price", formatRWF(item.cost_price_rwf)],
              ["Sell Price", formatRWF(item.sell_price_rwf)],
              ["Margin", item.cost_price_rwf > 0 ? `${(((item.sell_price_rwf - item.cost_price_rwf) / item.cost_price_rwf)*100).toFixed(1)}%` : "—"],
              ["Low Stock Threshold", item.low_stock_threshold],
              ["Added", formatDate(item.created_at)],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-[11px] text-text-secondary uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-[14px] font-medium text-text-primary">{val || "—"}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Stock level + barcode */}
        <div className="space-y-4">
          <Card>
            <div className="text-center">
              <p className="text-[11px] text-text-secondary uppercase tracking-wide mb-2">Current Stock</p>
              <p className={`text-[48px] font-bold ${item.status==="out_of_stock"?"text-danger":item.status==="low_stock"?"text-warning":"text-primary"}`}>
                {item.quantity}
              </p>
              <p className="text-[13px] text-text-secondary mb-3">units remaining</p>
              <Badge status={STATUS_MAP[item.status]||"neutral"} label={item.status?.replace("_"," ")||"—"} />
            </div>
          </Card>
          {barcodeUrl && (
            <Card title="Barcode">
              <img src={barcodeUrl} alt="barcode" className="w-full" onError={() => setBarcodeUrl(null)} />
              <p className="text-center text-[11px] font-mono text-text-secondary mt-1">{item.barcode}</p>
            </Card>
          )}
        </div>
      </div>

      <Card title="Movement History">
        <Table columns={histColumns} data={history} emptyMessage="No movement history yet" />
      </Card>
    </PageWrapper>
  );
}
