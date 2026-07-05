import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Printer, Trash2, Landmark, Download } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const [sale, setSale] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/sales/${id}`),
      api.get("/settings").catch(() => ({ data: {} })),
    ]).then(([d, s]) => {
      setSale(d.data);
      setShopSettings(s.data?.settings || null);
      if (searchParams.get("print") === "true") {
        setTimeout(() => window.print(), 500);
      }
    })
    .catch(() => toast.error(t("error")))
    .finally(() => setLoading(false));
  }, [id, t, searchParams]);

  useEffect(() => {
    const styleId = "invoice-vivid-styles";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .writing-vertical {
        writing-mode: vertical-rl;
        transform: rotate(180deg);
      }
      .motion-gradient-bg {
        background-color: #FAF9F8;
        background-image: 
          radial-gradient(at 0% 0%, rgba(124, 58, 237, 0.05) 0px, transparent 50%),
          radial-gradient(at 100% 0%, rgba(99, 102, 241, 0.04) 0px, transparent 50%),
          radial-gradient(at 50% 100%, rgba(124, 58, 237, 0.02) 0px, transparent 50%);
      }
      .animate-reveal-up {
        animation: revealUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes revealUp {
        from {
          opacity: 0;
          transform: translateY(16px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .stagger-children > * {
        opacity: 0;
        animation: revealUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      .stagger-children > *:nth-child(1) { animation-delay: 50ms; }
      .stagger-children > *:nth-child(2) { animation-delay: 100ms; }
      .stagger-children > *:nth-child(3) { animation-delay: 150ms; }
      .stagger-children > *:nth-child(4) { animation-delay: 200ms; }
      .stagger-children > *:nth-child(5) { animation-delay: 250ms; }
      @page {
        size: portrait;
        margin: 0;
      }
      @media print {
        body * {
          visibility: hidden !important;
        }
        #print-invoice-card, #print-invoice-card * {
          visibility: visible !important;
        }
        #print-invoice-card {
          position: fixed !important;
          left: 0 !important;
          top: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 40px !important;
          border: none !important;
          box-shadow: none !important;
          background: #ffffff !important;
          z-index: 9999999 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `;
    document.head.appendChild(style);
  }, []);

  async function handleVoid() {
    if (!confirm(t("confirm_delete"))) return;
    const reason = window.prompt("Enter void reason (required):", "");
    if (!reason?.trim()) return toast.error("Void reason is required");
    try {
      await api.post(`/sales/${id}/void`, { void_reason: reason.trim() });
      toast.success(t("success"));
      navigate("/app/sales");
    } catch { toast.error(t("error")); }
  }

  async function downloadPDF() {
    if (!sale.invoice_id) return toast.error("Invoice not generated yet");
    try {
      const response = await api.get(`/invoices/${sale.invoice_id}/pdf`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `${sale.invoice_number || 'invoice'}.pdf`;
      link.click();
      toast.success(t("success") || "Downloaded");
    } catch {
      toast.error(t("error") || "Download failed");
    }
  }

  if (loading) return <PageWrapper title="..." subtitle="..." breadcrumbs={[]}><div className="animate-pulse h-64 bg-surface rounded-card" /></PageWrapper>;
  if (!sale) return <PageWrapper title="Not Found" subtitle="..." breadcrumbs={[]}><Card>Sale not found</Card></PageWrapper>;

  return (
    <PageWrapper title={`${t("invoice_no")} ${sale.invoice_number}`} subtitle={formatDate(sale.created_at, "dd MMMM yyyy HH:mm")}
      breadcrumbs={[{label: t("sales"), path:"/app/sales"}, {label: sale.invoice_number, path:`/app/sales/${id}`}]}>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={() => navigate("/app/sales")}>{t("all")}</Button>
          <Badge status={sale.is_voided ? "danger" : "success"} label={sale.is_voided ? t("delete") : t("success")} />
        </div>
        {!sale.is_voided && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={Download} onClick={downloadPDF}>PDF</Button>
            <Button variant="primary" size="sm" icon={Printer} onClick={() => window.print()}>{t("print")}</Button>
            <Button variant="danger" size="sm" icon={Trash2} onClick={handleVoid}>{t("void_sale")}</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Management Metadata */}
        <div className="xl:col-span-4 space-y-6">
          <Card title="Sales Metadata">
            <div className="space-y-4 text-[13px]">
              <div>
                <p className="text-text-secondary font-medium mb-1">Customer / Tenant</p>
                <p className="font-semibold text-text-primary text-[14px]">{sale.customer_name || "Walk-in Customer"}</p>
                {sale.customer_phone && <p className="text-text-secondary text-[12px]">{sale.customer_phone}</p>}
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-text-secondary font-medium mb-1">{t("payment_method")}</p>
                <p className="font-semibold text-text-primary uppercase text-[12px]">{sale.payment_method?.replace("_", " ")}</p>
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-text-secondary font-medium mb-1">Recorded By</p>
                <p className="font-semibold text-text-primary">{sale.worker_name}</p>
              </div>
              <div className="pt-3 border-t border-border">
                <p className="text-text-secondary font-medium mb-1">Sales Branch</p>
                <p className="font-semibold text-text-primary">{sale.branch_name}</p>
                {sale.branch_location && <p className="text-text-secondary text-[12px]">{sale.branch_location}</p>}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Vivid Precision Mobile Invoice Generator */}
        <div className="xl:col-span-8 flex justify-center">
          <div 
            id="print-invoice-card"
            className="w-full max-w-[390px] min-h-[700px] shadow-2xl rounded-2xl border border-[#e5e0d8] overflow-hidden flex flex-col bg-white relative animate-reveal-up"
            style={{ fontFamily: "'Hanken Grotesk', 'Inter', sans-serif" }}
          >
            {/* 1. Header Section (Mesh Gradient Background) */}
            <div className="relative pt-8 pb-6 pl-16 pr-6 motion-gradient-bg border-b border-[#e5e0d8]/40 z-0">
              {/* Left Vertical Accent & Branding */}
              <div className="absolute left-4 w-8 top-8 flex flex-col items-center select-none z-10">
                <div className="writing-vertical text-[#7C3AED] font-black text-[14px] tracking-[0.25em] uppercase"
                     style={{ transform: "rotate(180deg)", writingMode: "vertical-rl" }}>
                  {shopSettings?.shop_name || sale.branch_name || "KNOTTY"}
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] mt-2" />
              </div>

              {/* Top Row: Sender Info & Invoice Title */}
              <div className="flex justify-between items-start mb-6">
                <div className="text-[11px] text-text-secondary leading-relaxed font-sans">
                  <p className="font-bold text-text-primary text-[12px] mb-0.5">{shopSettings?.shop_name || sale.branch_name || "KNOTTY FASHION"}</p>
                  <p>{shopSettings?.shop_address || sale.branch_location || "Kigali, Rwanda"}</p>
                  {(shopSettings?.shop_phone || sale.branch_phone) && (
                    <p>Tel: {shopSettings?.shop_phone || sale.branch_phone}</p>
                  )}
                </div>
                <div className="text-right">
                  <h1 className="text-[32px] font-extrabold tracking-tight text-[#7C3AED] leading-none mb-1 font-sans">
                    <span className="inline-block overflow-hidden">
                      {"Invoice".split("").map((char, idx) => (
                        <span 
                          key={idx} 
                          className="inline-block animate-reveal-up" 
                          style={{ animationDelay: `${idx * 40}ms` }}
                        >
                          {char}
                        </span>
                      ))}
                    </span>
                  </h1>
                </div>
              </div>

              {/* Middle Row: Bill To & Invoice Info */}
              <div className="grid grid-cols-2 gap-4 text-[11px] leading-normal">
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Bill to:</p>
                  <p className="font-extrabold text-text-primary text-[14px] tracking-tight leading-tight mb-1">
                    {sale.customer_name || "Walk-in Customer"}
                  </p>
                  <div className="text-[11px] text-text-secondary space-y-0.5 font-sans">
                    {sale.customer_phone && <p>Tel: {sale.customer_phone}</p>}
                    <p>E-mail: {sale.customer_email || "customer@valano.rw"}</p>
                    <p>Address: Kigali, Rwanda</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1 text-right">Invoice number:</p>
                  <p className="font-extrabold text-text-primary text-[18px] tracking-tight leading-tight text-right mb-1">
                    #{sale.invoice_number}
                  </p>
                  <p className="text-[11px] text-text-secondary text-right">
                    Kigali, {formatDate(sale.created_at, "d. MM. yyyy")}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Body Section (White Background) */}
            <div className="flex-1 pt-6 pb-8 pl-16 pr-6 bg-white flex flex-col justify-between">
              <div>
                {/* Service Table Header */}
                <div className="grid grid-cols-12 gap-2 border-b border-border pb-2 text-[10px] font-bold text-text-primary uppercase tracking-wider">
                  <div className="col-span-6">Service description</div>
                  <div className="col-span-2 text-right">Quantity</div>
                  <div className="col-span-2 text-right">Price</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>

                {/* Items Rows */}
                <div className="relative mt-2">
                  {/* Left vertical purple accent line next to items */}
                  <div className="absolute left-[-32px] top-1.5 bottom-1.5 w-[3px] bg-[#7C3AED] rounded-full" />
                  
                  <div className="space-y-3 stagger-children">
                    {sale.items?.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="grid grid-cols-12 gap-2 text-[11px] items-center"
                      >
                        <div className="col-span-6">
                          <p className="font-semibold text-text-primary leading-snug">{item.item_name}</p>
                          {(item.size || item.color) && (
                            <p className="text-[9px] text-text-secondary mt-0.5">
                              {item.size ? `Size: ${item.size}` : ""}{item.color ? ` • Color: ${item.color}` : ""}
                            </p>
                          )}
                        </div>
                        <div className="col-span-2 text-right font-mono font-medium text-text-secondary">{item.quantity}</div>
                        <div className="col-span-2 text-right font-mono font-medium text-text-secondary">
                          {formatRWF(item.unit_price).replace(/\s?RWF/, "")}
                        </div>
                        <div className="col-span-2 text-right font-mono font-bold text-text-primary">
                          {formatRWF(item.quantity * item.unit_price).replace(/\s?RWF/, "")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Totals and Bank Info */}
              <div className="mt-8">
                {/* Totals Block */}
                <div className="flex flex-col items-end space-y-1">
                  <div className="flex items-center gap-6">
                    <span className="text-[11px] font-bold text-text-primary">Total:</span>
                    <span className="text-[14px] font-semibold text-text-secondary font-mono">
                      {formatRWF(sale.total_amount)}
                    </span>
                  </div>
                  {sale.balance_due > 0 ? (
                    <>
                      <div className="flex items-center gap-6">
                        <span className="text-[11px] font-bold text-text-primary">Amount paid:</span>
                        <span className="text-[14px] font-semibold text-text-secondary font-mono">
                          {formatRWF(sale.amount_paid)}
                        </span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-[11px] font-bold text-text-primary">Balance due:</span>
                        <span className="text-[16px] font-extrabold text-danger font-mono">
                          {formatRWF(sale.balance_due)}
                        </span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-[11px] font-bold text-text-primary">Due date:</span>
                        <span className="text-[12px] font-extrabold text-[#7C3AED] font-mono">
                          {sale.due_date ? formatDate(sale.due_date, "dd. MM. yyyy") : "—"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-6">
                      <span className="text-[11px] font-bold text-text-primary">Balance due:</span>
                      <span className="text-[16px] font-extrabold text-success font-mono">
                        {formatRWF(0)} (Paid)
                      </span>
                    </div>
                  )}
                </div>

                {/* Bank Info & Signature Line */}
                <div className="grid grid-cols-2 gap-4 mt-8 pt-4 border-t border-border">
                  <div>
                    <p className="text-[10px] font-bold text-text-primary uppercase tracking-wider mb-2">Contact Information:</p>
                    <div className="space-y-1 text-[10px] font-mono text-[#7C3AED] font-semibold leading-none">
                      {(shopSettings?.shop_phone || sale.branch_phone) && (
                        <p>Tel: {shopSettings?.shop_phone || sale.branch_phone}</p>
                      )}
                      <p>{shopSettings?.shop_address || sale.branch_location || "Kigali, Rwanda"}</p>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between items-end">
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-text-primary uppercase tracking-wider">Invoiced by {shopSettings?.shop_name || sale.branch_name || "KNOTTY FASHION"}</p>
                    </div>
                    <div className="w-full max-w-[120px] border-b border-border mt-6" />
                  </div>
                </div>

                {/* Footer disclaimer */}
                <div className="text-[9px] text-text-secondary/50 leading-normal text-center mt-6 border-t border-border pt-4">
                  <p className="font-medium">
                    This is a computer-generated document. Technical data is verified automatically.
                  </p>
                  <p className="mt-0.5">{shopSettings?.invoice_footer_text || `© 2026 ${shopSettings?.shop_name || "KNOTTY FASHION"}. All rights reserved.`}</p>
                </div>
              </div>
            </div>

            {/* Bottom Accent Bar */}
            <div className="h-2 bg-[#7C3AED] w-full shrink-0" />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
