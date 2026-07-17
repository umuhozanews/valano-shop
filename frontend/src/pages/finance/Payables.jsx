import { useState, useEffect, useCallback } from "react";
import { Plus, Search, CreditCard, CheckCircle2, AlertTriangle } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

const STATUS_BADGE = { paid: "success", partial: "warning", pending: "neutral", overdue: "danger" };

export default function Payables() {
  const { t } = useLanguage();
  const [records,   setRecords]   = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [showForm,  setShowForm]  = useState(false);
  const [paying,    setPaying]    = useState(null);
  const [payAmt,    setPayAmt]    = useState("");
  const [form,      setForm]      = useState({ supplier_id: "", amount: "", due_date: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        api.get("/accounts-payable"),
        api.get("/suppliers"),
      ]);
      const pData = pRes.data;
      setRecords(pData.data || []);
      setSummary(pData.summary || null);
      setSuppliers(sRes.data?.data || sRes.data || []);
    } catch {
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const filtered = records.filter(r =>
    (r.supplier_name || t("no_supplier")).toLowerCase().includes(search.toLowerCase()) ||
    (r.notes || "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await api.post("/accounts-payable", form);
      toast.success(t("success"));
      setShowForm(false);
      setForm({ supplier_id: "", amount: "", due_date: "", notes: "" });
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
      await api.post(`/accounts-payable/${id}/payment`, { amount: Number(payAmt) });
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
      title={t("accounts_payable")}
      subtitle={t("track_supplier_owe")}
      breadcrumbs={[{ label: t("payables"), path: "/app/payables" }]}
      action={
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[6px] text-[14px] font-medium hover:bg-primary/90">
          <Plus size={15} /> {t("add_payable")}
        </button>
      }
    >
      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-surface border border-border rounded-[8px] p-4">
            <p className="text-[13px] text-text-secondary">{t("total_we_owe")}</p>
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
        <Card title={t("new_payable")} className="mb-4">
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[13px] text-text-secondary mb-1 block">{t("supplier_optional")}</label>
              <select className="w-full border border-border rounded-[6px] px-3 py-2 text-[14px] bg-background"
                value={form.supplier_id} onChange={e => setForm(p => ({ ...p, supplier_id: e.target.value }))}>
                <option value="">{t("select_supplier")}</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder={t("what_debt_for")} />
            </div>
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-[6px] text-[14px]">{t("cancel")}</button>
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-[6px] text-[14px] font-medium">{t("create")}</button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("search_supplier_note")}
              className="w-full h-9 pl-9 pr-3 border border-border rounded-[6px] text-[14px] bg-surface focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[14px] text-text-secondary">{t("loading")}</div>
        ) : !filtered.length ? (
          <div className="py-12 text-center">
            <CreditCard size={36} className="mx-auto text-text-secondary/30 mb-3" />
            <p className="text-[15px] font-medium text-text-primary">{t("no_payables_yet")}</p>
            <p className="text-[14px] text-text-secondary mt-1">{t("no_payables_desc")}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(r => {
              const outstanding = Number(r.amount) - Number(r.amount_paid);
              const isOverdue   = r.status === "overdue";
              return (
                <div key={r.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium text-text-primary">
                        {r.supplier_name || t("no_supplier")}
                      </p>
                      {isOverdue && <AlertTriangle size={13} className="text-danger shrink-0" />}
                    </div>
                    <p className="text-[13px] text-text-secondary mt-0.5">
                      {r.due_date ? `${t("due_prefix")} ${formatDate(r.due_date)}` : t("no_due_date")}
                      {r.notes ? ` · ${r.notes}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className="text-[14px] font-bold text-danger">{formatRWF(outstanding)}</p>
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
                          className="flex items-center gap-1 text-[13px] text-primary hover:underline">
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
    </PageWrapper>
  );
}
