import { useState, useEffect } from "react";
import { Percent, ShieldCheck, CheckCircle2 } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import Loading from "../components/Loading";
import { StorageEngine } from "../lib/storage";
import { rwf } from "../lib/format";

export default function TaxReport() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);

  useEffect(() => {
    setSales(StorageEngine.getSales());
    setLoading(false);
  }, []);

  if (loading) return <Loading label="Loading Rwanda Tax & EBM Summary..." />;

  const validSales = sales.filter(s => !s.is_voided);
  const totalVolume = validSales.reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const vat18 = totalVolume * 0.18;
  const netBeforeTax = totalVolume - vat18;

  return (
    <div className="flex h-full flex-col bg-bg">
      <ScreenHeader title="Tax & EBM Reports" back />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* VAT Payload Card */}
        <div className="rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-900 p-4 text-white shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider opacity-90">
            <span>ESTIMATED RWANDA 18% VAT</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9.5px]">EBM PAYLOAD</span>
          </div>
          <div className="mt-2 text-[26px] font-extrabold tabnum">{rwf(vat18)} RWF</div>
          <div className="mt-2 text-[11px] border-t border-white/20 pt-2 opacity-90">
            Based on gross sales volume of <strong className="tabnum">{rwf(totalVolume)} RWF</strong>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-card p-3 shadow-xs space-y-2">
          <div className="text-[12.5px] font-bold text-ink flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-600" /> Rwanda Revenue Authority Compliance
          </div>
          <div className="text-[11.5px] text-muted leading-relaxed">
            DataBridge automatically formats sales invoices for Rwanda EBM v2 integration and monthly VAT return filings.
          </div>
        </div>

        <div className="rounded-xl border border-line bg-card p-3 shadow-xs text-[12px] space-y-1.5">
          <div className="flex justify-between"><span>Gross Taxable Sales:</span><span className="font-bold text-ink tabnum">{rwf(totalVolume)} RWF</span></div>
          <div className="flex justify-between"><span>Net Revenue (Excl. Tax):</span><span className="font-bold text-primary tabnum">{rwf(netBeforeTax)} RWF</span></div>
          <div className="flex justify-between border-t border-line/60 pt-1 text-emerald-700 font-extrabold">
            <span>18% VAT Tax Output:</span>
            <span className="tabnum">{rwf(vat18)} RWF</span>
          </div>
        </div>
      </div>
    </div>
  );
}
