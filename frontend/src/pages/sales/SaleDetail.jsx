import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, XCircle } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Table from "../../components/ui/Table";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showVoid, setShowVoid] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    api.get(`/sales/${id}`).then(d => setSale(d.data)).catch(() => toast.error("Failed to load sale")).finally(() => setLoading(false));
  }, [id]);

  async function handleVoid() {
    if (!voidReason.trim()) return toast.error("Void reason required");
    setVoiding(true);
    try {
      await api.post(`/sales/${id}/void`, { void_reason: voidReason });
      toast.success("Sale voided"); setShowVoid(false);
      setSale(s => ({ ...s, is_voided: true, void_reason: voidReason }));
    } catch(e){ toast.error(e.response?.data?.error || "Failed to void"); }
    finally { setVoiding(false); }
  }

  function downloadPDF() {
    if (!sale?.invoice_id) return;
    const url = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/invoices/${sale.invoice_id}/pdf`;
    window.open(url, "_blank");
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!sale) return null;

  const itemColumns = [
    { key:"item_name", label:"Item" },
    { key:"size", label:"Size" },
    { key:"quantity", label:"Qty" },
    { key:"unit_price", label:"Unit Price", render:v => formatRWF(v) },
    { key:"subtotal", label:"Subtotal", render:v => <span className="font-semibold text-primary">{formatRWF(v)}</span> },
  ];

  return (
    <PageWrapper title={sale.invoice_number || `Sale #${id}`} subtitle={formatDate(sale.created_at, "dd MMM yyyy HH:mm")}
      breadcrumbs={[{label:"Sales",path:"/app/sales"},{label:sale.invoice_number||"Detail",path:`/app/sales/${id}`}]}>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate("/app/sales")}>Back</Button>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" icon={Download} onClick={downloadPDF}>Download PDF</Button>
          {!sale.is_voided && user.role !== "worker" && (
            <Button variant="danger" size="sm" icon={XCircle} onClick={() => setShowVoid(true)}>Void Sale</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          {/* Invoice header */}
          <div className="flex items-start justify-between mb-6 pb-4 border-b border-border">
            <div>
              <p className="text-[11px] text-text-secondary uppercase tracking-wide">Invoice Number</p>
              <p className="text-[20px] font-bold text-primary">{sale.invoice_number || "—"}</p>
              <p className="text-[13px] text-text-secondary mt-0.5">{sale.branch_name}</p>
            </div>
            <Badge status={sale.is_voided?"danger":"success"} label={sale.is_voided?"Voided":"Completed"} />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              ["Customer", sale.customer_name || "Walk-in"],
              ["Worker", sale.worker_name],
              ["Payment", sale.payment_method?.replace("_"," ")?.toUpperCase()],
              ["Date", formatDate(sale.created_at, "dd MMM yyyy HH:mm")],
            ].map(([l,v]) => (
              <div key={l}>
                <p className="text-[11px] text-text-secondary uppercase tracking-wide">{l}</p>
                <p className="text-[14px] font-medium text-text-primary">{v||"—"}</p>
              </div>
            ))}
          </div>

          <Table columns={itemColumns} data={sale.items || []} emptyMessage="No items" />

          <div className="mt-4 pt-4 border-t border-border flex justify-end">
            <div className="text-right">
              <p className="text-[13px] text-text-secondary">Total Amount</p>
              <p className="text-[22px] font-bold text-primary">{formatRWF(sale.total_amount)}</p>
            </div>
          </div>

          {sale.is_voided && (
            <div className="mt-4 p-3 bg-danger/5 border border-danger/20 rounded-card">
              <p className="text-[12px] text-danger font-medium">VOIDED: {sale.void_reason}</p>
            </div>
          )}
        </Card>

        <Card title="Sale Info">
          <div className="space-y-3">
            {[["Sale ID", `#${sale.id}`], ["Branch", sale.branch_name], ["Worker", sale.worker_name],
              ["Customer", sale.customer_name||"Walk-in"], ["Payment", sale.payment_method], ["Items", sale.items?.length||0]].map(([l,v]) => (
              <div key={l} className="flex justify-between">
                <span className="text-[13px] text-text-secondary">{l}</span>
                <span className="text-[13px] font-medium text-text-primary">{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Modal open={showVoid} onClose={() => setShowVoid(false)} title="Void Sale"
        footer={<><Button variant="secondary" onClick={() => setShowVoid(false)}>Cancel</Button><Button variant="danger" loading={voiding} onClick={handleVoid}>Void Sale</Button></>}>
        <p className="text-[13px] text-text-secondary mb-3">This will restore all stock quantities. This cannot be undone.</p>
        <textarea value={voidReason} onChange={e=>setVoidReason(e.target.value)} placeholder="Reason for voiding…"
          className="w-full h-24 px-3 py-2 border border-border rounded-card text-[13px] focus:outline-none focus:ring-2 focus:ring-danger resize-none" />
      </Modal>
    </PageWrapper>
  );
}
