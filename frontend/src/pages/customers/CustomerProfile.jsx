import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";

const SEG_MAP = { vip:"success", regular:"warning", new:"neutral" };

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/customers/${id}`).then(d => setCustomer(d.data))
       .catch(() => toast.error("Failed to load")).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!customer) return null;

  const saleColumns = [
    { key:"invoice_number", label:"Invoice", render:v => <span className="font-mono text-[12px] text-primary">{v||"—"}</span> },
    { key:"items_count", label:"Items" },
    { key:"payment_method", label:"Payment" },
    { key:"total_amount", label:"Total", render:v => <span className="font-medium text-primary">{formatRWF(v)}</span> },
    { key:"branch_name", label:"Branch" },
    { key:"created_at", label:"Date", render:v => formatDate(v) },
  ];

  return (
    <PageWrapper title={customer.name} subtitle={`${customer.type} · ${customer.location||"—"}`}
      breadcrumbs={[{label:"Customers",path:"/app/customers"},{label:customer.name,path:`/app/customers/${id}`}]}>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate("/app/customers")}>Back</Button>
        {customer.phone && (
          <Button variant="secondary" size="sm" icon={MessageCircle}
            onClick={() => window.open(`https://wa.me/${customer.phone.replace(/\D/g,"")}?text=Hello+${encodeURIComponent(customer.name)},+from+INZIRA INSIGHTS+SHOP`,"_blank")}>
            WhatsApp
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <span className="text-[24px] font-bold text-primary">{customer.name?.charAt(0)}</span>
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-[12px]">{customer.name}</h3>
              <div className="flex gap-1 mt-1">
                <Badge status={customer.type==="wholesaler"?"warning":"neutral"} label={customer.type} />
                <Badge status={SEG_MAP[customer.segment]||"neutral"} label={customer.segment} />
              </div>
            </div>
          </div>
          {[["Phone", customer.phone||"—"], ["Location", customer.location||"—"], ["Notes", customer.notes||"—"]].map(([l,v]) => (
            <div key={l} className="mb-2">
              <p className="text-[11px] text-text-secondary uppercase tracking-wide">{l}</p>
              <p className="text-[11px] text-text-primary">{v}</p>
            </div>
          ))}
        </Card>

        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-2 gap-3">
          {[
            ["Total Orders", parseInt(customer.total_orders)||0],
            ["Total Spent", formatRWF(customer.total_spent||0)],
            ["Avg Order Value", formatRWF(Math.round((customer.total_spent||0)/(customer.total_orders||1)))],
            ["Last Purchase", customer.last_purchase ? formatDate(customer.last_purchase) : "—"],
          ].map(([label, val]) => (
            <Card key={label}>
              <p className="text-[11px] text-text-secondary uppercase tracking-wide mb-1">{label}</p>
              <p className="text-[18px] font-bold text-text-primary">{val}</p>
            </Card>
          ))}
        </div>
      </div>

      <Card title="Purchase History">
        <Table columns={saleColumns} data={customer.sales||[]} emptyMessage="No purchases yet" />
      </Card>
    </PageWrapper>
  );
}
