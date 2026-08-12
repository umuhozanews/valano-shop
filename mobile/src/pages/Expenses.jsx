import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Wallet, TrendingDown, TrendingUp } from "lucide-react";
import api, { errorMessage } from "../lib/api";
import { useLang } from "../lib/i18n.jsx";
import { rwf, timeAgo, todayISO } from "../lib/format";
import ScreenHeader from "../components/ScreenHeader";
import Loading from "../components/Loading";
import Sheet from "../components/Sheet";
import { Button, Field, TextInput } from "../components/ui";

const CAT_COLORS = ["#1F5C4E", "#E8A33D", "#2F8F6E", "#C24B3D", "#8A8272", "#2F7A67"];

const EMPTY = { category: "", amount: "", description: "", expense_date: todayISO() };

export default function Expenses() {
  const { t, lang } = useLang();
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [listRes, sumRes] = await Promise.allSettled([
        api.get("/expenses", { params: { limit: 20 } }),
        api.get("/expenses/summary"),
      ]);
      if (listRes.status === "fulfilled") setEntries(listRes.value.data?.data || []);
      if (sumRes.status === "fulfilled") setSummary(sumRes.value.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (params.get("new") === "1") {
      setOpen(true);
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const { thisMonth, lastMonth, bars, maxBar } = useMemo(() => {
    const tm = summary.reduce((s, r) => s + Number(r.this_month || 0), 0);
    const lm = summary.reduce((s, r) => s + Number(r.last_month || 0), 0);
    const bars = summary
      .filter((r) => Number(r.this_month) > 0)
      .sort((a, b) => Number(b.this_month) - Number(a.this_month))
      .slice(0, 5);
    const maxBar = bars.reduce((m, r) => Math.max(m, Number(r.this_month)), 1);
    return { thisMonth: tm, lastMonth: lm, bars, maxBar };
  }, [summary]);

  const changePct = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;
  const down = changePct != null && changePct <= 0;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSave() {
    if (!form.category.trim()) return toast.error(t("category"));
    if (!Number(form.amount)) return toast.error(t("amount"));
    setSaving(true);
    try {
      await api.post("/expenses", {
        category: form.category.trim(),
        amount: Number(form.amount),
        description: form.description.trim() || null,
        expense_date: form.expense_date || todayISO(),
      });
      toast.success(t("save"));
      setForm(EMPTY);
      setOpen(false);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not add the expense."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading label={t("loading")} />;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title={t("expenses_title")}
        right={
          <button
            onClick={() => setOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary"
            aria-label={t("add")}
          >
            <Plus size={16} className="text-white" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {/* Summary card */}
        <div className="rounded-2xl border border-line bg-card p-4">
          <span className="text-[11px] font-semibold text-muted">{t("this_month_so_far")}</span>
          <div className="mt-1 font-heading text-[24px] font-extrabold tabnum text-ink">
            {rwf(thisMonth)} RWF
          </div>
          {changePct != null && (
            <div className="mt-1 flex items-center gap-1">
              {down ? (
                <TrendingDown size={12} className="text-success" />
              ) : (
                <TrendingUp size={12} className="text-danger" />
              )}
              <span className={`text-[11px] font-semibold ${down ? "text-success" : "text-danger"}`}>
                {Math.abs(changePct)}% {down ? "less than" : "more than"} {t("vs_last_month")}
              </span>
            </div>
          )}

          <div className="mt-3.5 flex flex-col gap-2">
            {bars.length === 0 && (
              <span className="text-[12px] text-muted">{t("no_expenses")}</span>
            )}
            {bars.map((r, i) => (
              <div key={r.category || i}>
                <div className="mb-1 flex justify-between text-[11px] font-semibold text-ink">
                  <span>{r.category || "—"}</span>
                  <span className="tabnum text-muted">{rwf(r.this_month)} RWF</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-line">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${(Number(r.this_month) / maxBar) * 100}%`,
                      background: CAT_COLORS[i % CAT_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent entries */}
        <div className="mt-3.5">
          <span className="font-body text-[11.5px] font-bold text-ink">{t("recent_entries")}</span>
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {entries.length === 0 && (
            <div className="rounded-xl border border-line bg-card px-3 py-4 text-center text-[12px] text-muted">
              {t("no_expenses")}
            </div>
          )}
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-xl border border-line bg-card px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger-lt">
                  <Wallet size={14} className="text-danger" />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-ink">
                    {e.category}
                    {e.description ? ` — ${e.description}` : ""}
                  </div>
                  <div className="text-[10px] text-muted">{timeAgo(e.expense_date, lang)}</div>
                </div>
              </div>
              <span className="text-[12.5px] font-bold tabnum text-danger">-{rwf(e.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("new_expense")}
        footer={
          <Button full variant="green" disabled={saving} onClick={handleSave}>
            {saving ? "…" : t("save")}
          </Button>
        }
      >
        <Field label={t("category")}>
          <TextInput value={form.category} onChange={set("category")} placeholder="Rent, Transport…" />
        </Field>
        <Field label={t("amount")}>
          <TextInput inputMode="numeric" value={form.amount} onChange={set("amount")} placeholder="0" />
        </Field>
        <Field label={t("description")}>
          <TextInput value={form.description} onChange={set("description")} placeholder="—" />
        </Field>
        <Field label={t("date")}>
          <TextInput type="date" value={form.expense_date} onChange={set("expense_date")} />
        </Field>
      </Sheet>
    </div>
  );
}
