import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Search, Plus, AlertTriangle } from "lucide-react";
import api, { errorMessage } from "../lib/api";
import { useLang } from "../lib/i18n.jsx";
import { rwf } from "../lib/format";
import ScreenHeader from "../components/ScreenHeader";
import Loading from "../components/Loading";
import Sheet from "../components/Sheet";
import { Button, Field, TextInput } from "../components/ui";

function statusOf(item) {
  const q = Number(item.quantity) || 0;
  const th = Number(item.low_stock_threshold) || 5;
  if (q === 0) return "out";
  if (q <= th) return "low";
  return "ok";
}

function StockRow({ item, t }) {
  const st = statusOf(item);
  const color = st === "out" ? "#C24B3D" : st === "low" ? "#E8A33D" : "#2F8F6E";
  const th = Number(item.low_stock_threshold) || 5;
  const pct = Math.max(6, Math.min(100, (Number(item.quantity) / (th * 3)) * 100));
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <div className="flex-1">
        <div className="flex items-baseline justify-between">
          <div className="text-[12.5px] font-semibold text-ink">{item.name}</div>
          <div className="ml-2 text-[10.5px] tabnum text-muted">{rwf(item.sell_price_rwf)} RWF</div>
        </div>
        <div className="mt-1.5 h-1.5 w-full rounded-full bg-line">
          <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
      <span className="shrink-0 text-[12px] font-bold tabnum text-ink">
        {Number(item.quantity)}
        {item.unit ? ` ${item.unit}` : ""}
      </span>
    </div>
  );
}

const EMPTY = {
  name: "",
  category: "",
  quantity: "",
  unit: "",
  cost_price_rwf: "",
  sell_price_rwf: "",
  low_stock_threshold: "5",
};

export default function Stock() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/stock", { params: { limit: 300 } });
      setItems(data?.data || []);
    } catch {
      /* keep prior list */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Deep-link: /stock?new=1 opens the add sheet (from the dashboard quick action)
  useEffect(() => {
    if (params.get("new") === "1") {
      setOpen(true);
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const visible = useMemo(
    () => items.filter((i) => !query || i.name?.toLowerCase().includes(query.toLowerCase())),
    [items, query]
  );
  const lowCount = items.filter((i) => statusOf(i) !== "ok").length;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSave() {
    if (!form.name.trim()) return toast.error(t("item_name"));
    setSaving(true);
    try {
      await api.post("/stock", {
        name: form.name.trim(),
        category: form.category.trim() || null,
        unit: form.unit.trim() || null,
        quantity: Number(form.quantity) || 0,
        cost_price_rwf: Number(form.cost_price_rwf) || 0,
        sell_price_rwf: Number(form.sell_price_rwf) || 0,
        low_stock_threshold: Number(form.low_stock_threshold) || 5,
      });
      toast.success(t("save"));
      setForm(EMPTY);
      setOpen(false);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not add the product."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title={t("my_stock")}
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

      <div className="px-4">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2.5">
          <Search size={15} className="text-muted" />
          <input
            className="flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-muted"
            placeholder={t("search_stock")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {lowCount > 0 && (
        <div className="mx-4 mt-2.5 flex items-center gap-2 rounded-xl bg-danger-lt px-3 py-2">
          <AlertTriangle size={14} className="text-danger" />
          <span className="text-[11px] font-semibold text-[#7A2E22]">
            {lowCount} {t("running_low")}
          </span>
        </div>
      )}

      <div className="mt-3 flex-1 overflow-y-auto px-4 pb-6">
        {loading ? (
          <Loading label={t("loading")} />
        ) : visible.length === 0 ? (
          <div className="mt-10 text-center text-[13px] text-muted">{t("no_stock")}</div>
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((item) => (
              <StockRow key={item.id} item={item} t={t} />
            ))}
          </div>
        )}
      </div>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("new_item")}
        footer={
          <Button full variant="green" disabled={saving} onClick={handleSave}>
            {saving ? "…" : t("save")}
          </Button>
        }
      >
        <Field label={t("item_name")}>
          <TextInput value={form.name} onChange={set("name")} placeholder="Sugar 1kg" />
        </Field>
        <div className="flex gap-3">
          <div className="flex-1">
            <Field label={t("category")}>
              <TextInput value={form.category} onChange={set("category")} placeholder="Food" />
            </Field>
          </div>
          <div className="flex-1">
            <Field label={t("unit")}>
              <TextInput value={form.unit} onChange={set("unit")} placeholder="kg" />
            </Field>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <Field label={t("quantity")}>
              <TextInput inputMode="numeric" value={form.quantity} onChange={set("quantity")} placeholder="0" />
            </Field>
          </div>
          <div className="flex-1">
            <Field label={t("low_threshold")}>
              <TextInput
                inputMode="numeric"
                value={form.low_stock_threshold}
                onChange={set("low_stock_threshold")}
                placeholder="5"
              />
            </Field>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <Field label={t("cost_price")}>
              <TextInput inputMode="numeric" value={form.cost_price_rwf} onChange={set("cost_price_rwf")} placeholder="0" />
            </Field>
          </div>
          <div className="flex-1">
            <Field label={t("sell_price")}>
              <TextInput inputMode="numeric" value={form.sell_price_rwf} onChange={set("sell_price_rwf")} placeholder="0" />
            </Field>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
