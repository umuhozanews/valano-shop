import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Phone } from "lucide-react";
import api, { errorMessage } from "../lib/api";
import { useLang } from "../lib/i18n.jsx";
import { rwf, initials } from "../lib/format";
import ScreenHeader from "../components/ScreenHeader";
import Loading from "../components/Loading";
import Sheet from "../components/Sheet";
import { Button, Field, TextInput } from "../components/ui";

const EMPTY = { name: "", phone: "", products_supplied: "" };

export default function Suppliers() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [owedBySupplier, setOwedBySupplier] = useState({});
  const [totalOwed, setTotalOwed] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [supRes, apRes] = await Promise.allSettled([
        api.get("/suppliers", { params: { limit: 200 } }),
        api.get("/accounts-payable", { params: { limit: 500 } }),
      ]);
      if (supRes.status === "fulfilled") setSuppliers(supRes.value.data?.data || []);
      if (apRes.status === "fulfilled") {
        const ap = apRes.value.data;
        const map = {};
        (ap?.data || []).forEach((row) => {
          if (["pending", "partial", "overdue"].includes(row.status)) {
            const outstanding = Number(row.amount || 0) - Number(row.amount_paid || 0);
            if (row.supplier_id) map[row.supplier_id] = (map[row.supplier_id] || 0) + outstanding;
          }
        });
        setOwedBySupplier(map);
        setTotalOwed(Number(ap?.summary?.total_outstanding || 0));
      }
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

  const computedTotal = useMemo(
    () => totalOwed || Object.values(owedBySupplier).reduce((s, v) => s + v, 0),
    [totalOwed, owedBySupplier]
  );

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSave() {
    if (!form.name.trim()) return toast.error(t("supplier_name"));
    setSaving(true);
    try {
      await api.post("/suppliers", {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        products_supplied: form.products_supplied.trim() || null,
      });
      toast.success(t("save"));
      setForm(EMPTY);
      setOpen(false);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not add the supplier."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading label={t("loading")} />;

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title={t("suppliers_title")}
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
        {/* Total owed */}
        <div className="flex items-center justify-between rounded-xl bg-primary-xlt px-3.5 py-2.5">
          <span className="text-[11.5px] font-semibold text-primary">{t("total_you_owe")}</span>
          <span className="font-heading text-[13px] font-extrabold tabnum text-primary">
            {rwf(computedTotal)} RWF
          </span>
        </div>

        {suppliers.length === 0 ? (
          <div className="mt-10 text-center text-[13px] text-muted">{t("no_suppliers")}</div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {suppliers.map((sup) => {
              const owe = owedBySupplier[sup.id] || 0;
              return (
                <div
                  key={sup.id}
                  className="flex items-center gap-3 rounded-xl border border-line bg-card px-3.5 py-3"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-xlt font-heading text-[13px] font-bold text-primary">
                    {initials(sup.name)}
                  </div>
                  <div className="flex-1">
                    <div className="text-[12.5px] font-semibold text-ink">{sup.name}</div>
                    <div
                      className={`mt-0.5 text-[11px] font-semibold ${
                        owe > 0 ? "text-danger" : "text-success"
                      }`}
                    >
                      {owe > 0 ? `${t("owe")}: ${rwf(owe)} RWF` : t("all_paid")}
                    </div>
                    {sup.products_supplied && (
                      <div className="mt-0.5 line-clamp-1 text-[10px] text-muted">
                        {sup.products_supplied}
                      </div>
                    )}
                  </div>
                  {sup.phone && (
                    <a
                      href={`tel:${sup.phone}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-success-lt"
                      aria-label="Call"
                    >
                      <Phone size={13} className="text-success" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("new_supplier")}
        footer={
          <Button full variant="green" disabled={saving} onClick={handleSave}>
            {saving ? "…" : t("save")}
          </Button>
        }
      >
        <Field label={t("supplier_name")}>
          <TextInput value={form.name} onChange={set("name")} placeholder="Kigali Wholesalers Ltd" />
        </Field>
        <Field label={t("phone")}>
          <TextInput inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="0788 123 456" />
        </Field>
        <Field label={t("products_supplied")}>
          <TextInput
            value={form.products_supplied}
            onChange={set("products_supplied")}
            placeholder="Rice, Sugar, Oil"
          />
        </Field>
      </Sheet>
    </div>
  );
}
