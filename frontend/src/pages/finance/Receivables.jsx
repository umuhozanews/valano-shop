import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Scale, CheckCircle2, AlertTriangle } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";

const STATUS_BADGE = { paid: "success", partial: "warning", pending: "neutral", overdue: "danger" };

export default function Receivables() {
  const [records, setRecords]   = useState([]);
  const [summary, setSummary]   = useState(null);
  const [aged,    setAged]      = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search,  setSearch]    = useState("");
  const [tab,     setTab]       = useState("list");
  const [showForm, setShowForm] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [paying,  setPaying]    = useState(null);
  const [payAmt,  setPayAmt]    = useState("");
  const [form,    setForm]      = useState({ customer_id: "", amount: "", due_date: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, aRes, cRes] = await Promise.all([
        api.get("/accounts-receivable"),
        api.get("/accounts-receivable/aged"),
        api.get("/customers"),
      ]);
      const rData = rRes.data;
      setRecords(rData.data || []);
      setSummary(rData.summary || null);
      setAged(aRes.data || []);
      setCustomers(cRes.data?.data || cRes.data || []);
    } catch {
      toast.error("Failed to load receivables");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = records.filter(r =>
    r.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.post("/accounts-receivable", form);
      toast.success("Receivable created");
      setShowForm(false);
      setForm({ customer_id: "", amount: "", due_date: "", notes: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create");
    }
  }

  async function handlePayment(id) {
    if (!payAmt || isNaN(payAmt) || Number(payAmt) <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    try {
      await api.post(`/accounts-receivable/${id}/payment`, { amount: Number(payAmt) });
      toast.success("Payment recorded");
      setPaying(null);
      setPayAmt("");
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to record payment");
    }
  }

  return (
    <PageWrapper
      title="Accounts Receivable"
      subtitle="Track what customers owe you"
      breadcrumbs={[{ label: "Receivables", path: "/app/receivables" }]}
      action={
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[6px] text-[13px] font-medium hover:bg-primary/90">
          <Plus size={15} /> Add Receivable
        </button>
      }
    >
      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-surface border border-border rounded-[8px] p-4">
            <p className="text-[11px] text-text-secondary">Total Outstanding</p>
            <p className="text-[20px] font-bold text-danger mt-1">{formatRWF(summary.total_outstanding)}</p>
          </div>
          <div className="bg-surface border border-border rounded-[8px] p-4">
            <p className="text-[11px] text-text-secondary">Overdue</p>
            <p className="text-[20px] font-bold text-warning mt-1">{summary.overdue_count ?? 0} records</p>
          </div>
          <div className="bg-surface border border-border rounded-[8px] p-4">
            <p className="text-[11px] text-text-secondary">Due in 7 Days</p>
            <p className="text-[20px] font-bold text-primary mt-1">{summary.due_soon ?? 0} records</p>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <Card title="New Receivable" className="mb-4">
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[12px] text-text-secondary mb-1 block">Customer</label>
              <select required className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] bg-background"
                value={form.customer_id} onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))}>
                <option value="">Select customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[12px] text-text-secondary mb-1 block">Amount (RWF)</label>
              <input required type="number" min="1" className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] bg-background"
                value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <label className="text-[12px] text-text-secondary mb-1 block">Due Date</label>
              <input type="date" className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] bg-background"
                value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-[12px] text-text-secondary mb-1 block">Notes</label>
              <input type="text" className="w-full border border-border rounded-[6px] px-3 py-2 text-[13px] bg-background"
                value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional…" />
            </div>
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-[6px] text-[13px]">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-[6px] text-[13px] font-medium">Create</button>
            </div>
          </form>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-4">
        {["list", "aged"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors capitalize ${tab === t ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}>
            {t === "aged" ? "Aged Analysis" : "All Records"}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer…"
                className="w-full h-9 pl-9 pr-3 border border-border rounded-[6px] text-[13px] bg-surface focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-[13px] text-text-secondary">Loading…</div>
          ) : !filtered.length ? (
            <div className="py-12 text-center">
              <Scale size={36} className="mx-auto text-text-secondary/30 mb-3" />
              <p className="text-[14px] font-medium text-text-primary">No receivables yet</p>
              <p className="text-[13px] text-text-secondary mt-1">Add a receivable to start tracking customer debts</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(r => {
                const outstanding = Number(r.amount) - Number(r.amount_paid);
                const isOverdue = r.status === "overdue";
                return (
                  <div key={r.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-medium text-text-primary">{r.customer_name}</p>
                        {isOverdue && <AlertTriangle size={13} className="text-danger shrink-0" />}
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        {r.due_date ? `Due ${formatDate(r.due_date)}` : "No due date"}
                        {r.notes ? ` · ${r.notes}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-[13px] font-bold text-text-primary">{formatRWF(outstanding)}</p>
                      <p className="text-[11px] text-text-secondary">of {formatRWF(r.amount)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge status={STATUS_BADGE[r.status] || "neutral"} label={r.status} />
                      {r.status !== "paid" && (
                        paying?.id === r.id ? (
                          <div className="flex items-center gap-1">
                            <input type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)}
                              className="w-24 h-7 border border-border rounded px-2 text-[12px]" placeholder="Amount" />
                            <button onClick={() => handlePayment(r.id)}
                              className="px-2 py-1 bg-success text-white text-[11px] rounded">OK</button>
                            <button onClick={() => { setPaying(null); setPayAmt(""); }}
                              className="px-2 py-1 border border-border text-[11px] rounded">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setPaying(r)}
                            className="flex items-center gap-1 text-[11px] text-success hover:underline">
                            <CheckCircle2 size={13} /> Pay
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {tab === "aged" && (
        <Card title="Aged Receivables Analysis">
          {loading ? (
            <div className="py-12 text-center text-[13px] text-text-secondary">Loading…</div>
          ) : !aged.length ? (
            <div className="py-12 text-center text-[13px] text-text-secondary">No outstanding receivables</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    {["Customer", "0–30 days", "31–60 days", "61–90 days", "90+ days", "Total"].map(h => (
                      <th key={h} className="pb-2 text-left text-[11px] font-semibold text-text-secondary uppercase tracking-wide pr-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {aged.map((row, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-4 font-medium text-text-primary">{row.customer_name}</td>
                      <td className="py-2 pr-4 text-text-secondary">{formatRWF(row["0_30"])}</td>
                      <td className="py-2 pr-4 text-warning">{formatRWF(row["31_60"])}</td>
                      <td className="py-2 pr-4 text-warning">{formatRWF(row["61_90"])}</td>
                      <td className="py-2 pr-4 text-danger font-medium">{formatRWF(row["90_plus"])}</td>
                      <td className="py-2 font-bold text-text-primary">{formatRWF(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </PageWrapper>
  );
}
