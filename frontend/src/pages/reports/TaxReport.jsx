import { useState, useEffect } from "react";
import { Download, Shield } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import toast from "react-hot-toast";

export default function TaxReport() {
  const [tab,      setTab]      = useState("vat");
  const [vatData,  setVatData]  = useState(null);
  const [rssbData, setRssbData] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [filters,  setFilters]  = useState({ start_date: "", end_date: "" });

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date)   params.end_date   = filters.end_date;

      const [vat, rssb] = await Promise.all([
        api.get("/reports/tax/vat",  { params }),
        api.get("/reports/tax/rssb", { params }),
      ]);
      setVatData(vat.data);
      setRssbData(rssb.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load tax reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function exportExcel(type) {
    try {
      const params = { export: "excel" };
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date)   params.end_date   = filters.end_date;
      const res = await api.get(`/reports/tax/${type}`, { params, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a"); a.href = url;
      a.download = `${type}-report.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  }

  const vat  = vatData?.byMonth  || [];
  const rssb = rssbData?.byMonth || [];

  return (
    <PageWrapper
      title="Tax Reports"
      subtitle="VAT and RSSB contribution summaries for RRA compliance"
      breadcrumbs={[{ label: "Reports", path: "/app/reports/sales" }, { label: "Tax Reports", path: "/app/reports/tax" }]}
    >
      {/* Date filters */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="text-[12px] text-text-secondary mb-1 block">From Date</label>
            <input type="date" className="border border-border rounded-[6px] px-3 py-2 text-[13px] bg-background h-9"
              value={filters.start_date} onChange={e => setFilters(f => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div>
            <label className="text-[12px] text-text-secondary mb-1 block">To Date</label>
            <input type="date" className="border border-border rounded-[6px] px-3 py-2 text-[13px] bg-background h-9"
              value={filters.end_date} onChange={e => setFilters(f => ({ ...f, end_date: e.target.value }))} />
          </div>
          <button onClick={load}
            className="px-4 py-2 bg-primary text-white rounded-[6px] text-[13px] font-medium hover:bg-primary/90 h-9">
            Apply Filter
          </button>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-4">
        {[
          { key: "vat",  label: "VAT Report (18%)" },
          { key: "rssb", label: "RSSB Contributions" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${tab === t.key ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* VAT Tab */}
      {tab === "vat" && (
        <div className="space-y-4">
          {vatData?.totals && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Gross Sales", value: formatRWF(vatData.totals.gross_sales) },
                { label: "Net Sales (ex-VAT)", value: formatRWF(vatData.totals.net_sales) },
                { label: "VAT Collected (18%)", value: formatRWF(vatData.totals.vat_collected) },
                { label: "Total Transactions", value: vatData.totals.transactions?.toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface border border-border rounded-[8px] p-4">
                  <p className="text-[11px] text-text-secondary">{label}</p>
                  <p className="text-[18px] font-bold text-text-primary mt-1">{value}</p>
                </div>
              ))}
            </div>
          )}

          <Card title="Monthly VAT Breakdown"
            action={
              <button onClick={() => exportExcel("vat")}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-[6px] text-[12px] text-text-secondary hover:text-text-primary">
                <Download size={13} /> Export Excel
              </button>
            }
          >
            {loading ? (
              <div className="py-12 text-center text-[13px] text-text-secondary">Loading…</div>
            ) : !vat.length ? (
              <div className="py-12 text-center">
                <Shield size={36} className="mx-auto text-text-secondary/30 mb-3" />
                <p className="text-[14px] font-medium text-text-primary">No VAT data in selected period</p>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Month", "Transactions", "Gross Sales", "Net Sales (ex-VAT)", "VAT Collected"].map(h => (
                      <th key={h} className="pb-2 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {vat.map((row, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-4 font-medium text-text-primary">
                        {row.month ? new Date(row.month).toLocaleDateString("en-RW", { year: "numeric", month: "short" }) : "—"}
                      </td>
                      <td className="py-2 pr-4 text-text-secondary">{row.transactions}</td>
                      <td className="py-2 pr-4 text-text-primary">{formatRWF(row.gross_sales)}</td>
                      <td className="py-2 pr-4 text-text-secondary">{formatRWF(row.net_sales)}</td>
                      <td className="py-2 font-bold text-primary">{formatRWF(row.vat_collected)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {/* RSSB Tab */}
      {tab === "rssb" && (
        <div className="space-y-4">
          {rssbData?.totals && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Gross Salaries", value: formatRWF(rssbData.totals.gross_salaries) },
                { label: "Employee 3%", value: formatRWF(rssbData.totals.employee_contribution) },
                { label: "Employer 5%", value: formatRWF(rssbData.totals.employer_contribution) },
                { label: "Total RSSB", value: formatRWF(rssbData.totals.total_rssb) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface border border-border rounded-[8px] p-4">
                  <p className="text-[11px] text-text-secondary">{label}</p>
                  <p className="text-[18px] font-bold text-text-primary mt-1">{value}</p>
                </div>
              ))}
            </div>
          )}

          <Card title="Monthly RSSB Contributions"
            action={
              <button onClick={() => exportExcel("rssb")}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-[6px] text-[12px] text-text-secondary hover:text-text-primary">
                <Download size={13} /> Export Excel
              </button>
            }
          >
            {loading ? (
              <div className="py-12 text-center text-[13px] text-text-secondary">Loading…</div>
            ) : !rssb.length ? (
              <div className="py-12 text-center">
                <Shield size={36} className="mx-auto text-text-secondary/30 mb-3" />
                <p className="text-[14px] font-medium text-text-primary">No salary expenses in selected period</p>
                <p className="text-[12px] text-text-secondary mt-1">Add expenses with category "Salaries" to generate RSSB report</p>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Month", "Gross Salaries", "Employee (3%)", "Employer (5%)", "Total RSSB"].map(h => (
                      <th key={h} className="pb-2 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rssb.map((row, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-4 font-medium text-text-primary">
                        {row.month ? new Date(row.month).toLocaleDateString("en-RW", { year: "numeric", month: "short" }) : "—"}
                      </td>
                      <td className="py-2 pr-4 text-text-primary">{formatRWF(row.gross_salaries)}</td>
                      <td className="py-2 pr-4 text-text-secondary">{formatRWF(row.employee_contribution)}</td>
                      <td className="py-2 pr-4 text-text-secondary">{formatRWF(row.employer_contribution)}</td>
                      <td className="py-2 font-bold text-primary">{formatRWF(row.total_rssb)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </PageWrapper>
  );
}
