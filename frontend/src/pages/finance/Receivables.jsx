import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Scale, CheckCircle2, AlertTriangle } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

const STATUS_BADGE = { paid: "success", partial: "warning", pending: "neutral", overdue: "danger" };

export default function Receivables() {
  const { t } = useLanguage();
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
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const filtered = records.filter(r =>
    r.customer_name?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.post("/accounts-receivable", form);
      toast.success(t("success"));
      setShowForm(false);
      setForm({ customer_id: "", amount: "", due_date: "", notes: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || t("error"));
    }
  }

  async function handlePayment(id) {
    if (!payAmt || isNaN(payAmt) || Number(payAmt) <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    try {
      await api.post(`/accounts-receivable/${id}/payment`, { amount: Number(payAmt) });
      toast.success(t("success"));
      setPaying(null);
      setPayAmt("");
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || t("error"));
    }
  }

  return (
    <PageWrapper
      title={t("accounts_receivable")}
      subtitle={t("track_customer_owe")}
      breadcrumbs={[{ label: t("receivables"), path: "/app/receivables" }]}
      action={
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[6px] text-[14px] font-medium hover:bg-primary/90">
          <Plus size={15} /> {t("add_receivable")}
        </button>
      }
    >
      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-surface border border-border rounded-[8px] p-4">
            <p className="text-[13px] text-text-secondary">{t("total_outstanding")}</p>
            <p className="text-[22px] font-bold text-danger mt-1">{formatRWF(summary.total_outstanding)}</p>
          </div>
          <div className="bg-surface border border-border rounded-[8px] p-4">
            <p className="text-[13px] text-text-secondary">{t("overdue")}</p>
            <p className="text-[22px] font-bold text-warning mt-1">{summary.overdue_count ?? 0} {t("records")}</p>
          </div>
          <div className="bg-surface border border-border rounded-[8px] p-4">
            <p className="text-[13px] text-text-secondary">{t("due_in_7_days")}</p>
            <p className="text-[22px] font-bold text-primary mt-1">{summary.due_soon ?? 0} {t("records")}</p>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <Card title={t("new_receivable")} className="mb-4">
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] text-text-secondary mb-1 block">{t("customer")}</label>
              <select required className="w-full border border-border rounded-[6px] px-3 py-2 text-[14px] bg-background"
                value={form.customer_id} onChange={e => setForm(p => ({ ...p, customer_id: e.target.value }))}>
                <option value="">{t("select_customer")}</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[13px] text-text-secondary mb-1 block">{t("amount_rwf")}</label>
              <input required type="number" min="1" className="w-full border border-border rounded-[6px] px-3 py-2 text-[14px] bg-background"
                value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <label className="text-[13px] text-text-secondary mb-1 block">{t("due_date")}</label>
              <input type="date" className="w-full border border-border rounded-[6px] px-3 py-2 text-[14px] bg-background"
                value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
            </div>
            <div>
              <label className="text-[13px] text-text-secondary mb-1 block">{t("notes")}</label>
              <input type="text" className="w-full border border-border rounded-[6px] px-3 py-2 text-[14px] bg-background"
                value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder={t("optional_label")} />
            </div>
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-[6px] text-[14px]">{t("cancel")}</button>
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-[6px] text-[14px] font-medium">{t("create")}</button>
            </div>
          </form>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-4">
        {["list", "aged"].map(tabKey => (
          <button key={tabKey} onClick={() => setTab(tabKey)}
            className={`px-4 py-2 text-[14px] font-medium border-b-2 transition-colors capitalize ${tab === tabKey ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}>
            {tabKey === "aged" ? t("aged_analysis") : t("all_records")}
          </button>
        ))}
      </div>

      {tab === "list" && (
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("search_customer")}
                className="w-full h-9 pl-9 pr-3 border border-border rounded-[6px] text-[14px] bg-surface focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-[14px] text-text-secondary">{t("loading")}</div>
          ) : !filtered.length ? (
            <div className="py-12 text-center">
              <Scale size={36} className="mx-auto text-text-secondary/30 mb-3" />
              <p className="text-[15px] font-medium text-text-primary">{t("no_receivables_yet")}</p>
              <p className="text-[14px] text-text-secondary mt-1">{t("no_receivables_desc")}</p>
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
                        <p className="text-[14px] font-medium text-text-primary">{r.customer_name}</p>
                        {isOverdue && <AlertTriangle size={13} className="text-danger shrink-0" />}
                      </div>
                      <p className="text-[13px] text-text-secondary mt-0.5">
                        {r.due_date ? `${t("due_prefix")} ${formatDate(r.due_date)}` : t("no_due_date")}
                        {r.notes ? ` · ${r.notes}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-[14px] font-bold text-text-primary">{formatRWF(outstanding)}</p>
                      <p className="text-[13px] text-text-secondary">{t("of")} {formatRWF(r.amount)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge status={STATUS_BADGE[r.status] || "neutral"} label={r.status} />
                      {r.status !== "paid" && (
                        paying?.id === r.id ? (
                          <div className="flex items-center gap-1">
                            <input type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)}
                              className="w-24 h-7 border border-border rounded px-2 text-[13px]" placeholder={t("amount")} />
                            <button onClick={() => handlePayment(r.id)}
                              className="px-2 py-1 bg-success text-white text-[13px] rounded">OK</button>
                            <button onClick={() => { setPaying(null); setPayAmt(""); }}
                              className="px-2 py-1 border border-border text-[13px] rounded">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setPaying(r)}
                            className="flex items-center gap-1 text-[13px] text-success hover:underline">
                            <CheckCircle2 size={13} /> {t("pay")}
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
        <Card title={t("aged_receivables")}>
          {loading ? (
            <div className="py-12 text-center text-[14px] text-text-secondary">{t("loading")}</div>
          ) : !aged.length ? (
            <div className="py-12 text-center text-[14px] text-text-secondary">{t("no_outstanding")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="border-b border-border">
                    {[t("customer"), "0–30 days", "31–60 days", "61–90 days", "90+ days", t("total")].map(h => (
                      <th key={h} className="pb-2 text-left text-[13px] font-semibold text-text-secondary uppercase tracking-wide pr-4">{h}</th>
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
