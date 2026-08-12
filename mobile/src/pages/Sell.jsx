import { useEffect, useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Search, Plus, Minus, ChevronRight, Banknote, Smartphone, Clock } from "lucide-react";
import api, { errorMessage } from "../lib/api";
import { useLang } from "../lib/i18n.jsx";
import { rwf } from "../lib/format";
import ScreenHeader from "../components/ScreenHeader";
import Loading from "../components/Loading";
import Sheet from "../components/Sheet";
import { Button, TextInput } from "../components/ui";

const SWATCHES = ["#D9CBA3", "#E9D9A8", "#E8B24A", "#7FA98E", "#C9A876", "#A9C4B8", "#B7A99A", "#9CB7A8"];
const swatch = (name = "") => SWATCHES[(name.charCodeAt(0) + name.length) % SWATCHES.length];

export default function Sell() {
  const { t } = useLang();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [activeCat, setActiveCat] = useState("__all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState({}); // id -> { item, qty }
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState("cash");
  const [customer, setCustomer] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [prodRes, catRes] = await Promise.allSettled([
        api.get("/stock", { params: { limit: 200, status: "in_stock" } }),
        api.get("/stock/categories"),
      ]);
      if (prodRes.status === "fulfilled") setProducts(prodRes.value.data?.data || []);
      if (catRes.status === "fulfilled") setCats(catRes.value.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    return products.filter((p) => {
      if (activeCat !== "__all" && p.category !== activeCat) return false;
      if (query && !p.name?.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [products, activeCat, query]);

  const lines = Object.values(cart);
  const totalItems = lines.reduce((s, l) => s + l.qty, 0);
  const totalAmount = lines.reduce((s, l) => s + l.qty * (l.item.sell_price_rwf || 0), 0);

  const addToCart = (item) => {
    setCart((c) => {
      const cur = c[item.id];
      const max = Number(item.quantity) || 0;
      const nextQty = Math.min((cur?.qty || 0) + 1, max);
      if (nextQty === 0) {
        toast.error(t("out_of_stock"));
        return c;
      }
      return { ...c, [item.id]: { item, qty: nextQty } };
    });
  };

  const decFromCart = (item) => {
    setCart((c) => {
      const cur = c[item.id];
      if (!cur) return c;
      const nextQty = cur.qty - 1;
      const next = { ...c };
      if (nextQty <= 0) delete next[item.id];
      else next[item.id] = { item, qty: nextQty };
      return next;
    });
  };

  async function handleComplete() {
    if (!lines.length) return;
    setSaving(true);
    try {
      const items = lines.map((l) => ({
        stock_item_id: l.item.id,
        quantity: l.qty,
        unit_price: Number(l.item.sell_price_rwf) || 0,
      }));
      await api.post("/sales", {
        items,
        payment_method: method,
        customer_name: customer.trim() || undefined,
      });
      toast.success(t("sale_recorded"));
      setCart({});
      setCustomer("");
      setPayOpen(false);
      setMethod("cash");
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not record the sale."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading label={t("loading")} />;

  const payOptions = [
    { value: "cash", label: t("pay_cash"), icon: Banknote },
    { value: "mtn_momo", label: t("pay_momo"), icon: Smartphone },
    { value: "airtel", label: t("pay_airtel"), icon: Smartphone },
    { value: "credit", label: t("pay_credit"), icon: Clock },
  ];

  return (
    <div className="relative flex h-full flex-col">
      <ScreenHeader title={t("record_a_sale")} />

      {/* Search */}
      <div className="px-4">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2.5">
          <Search size={15} className="text-muted" />
          <input
            className="flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
            placeholder={t("search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
        {[{ value: "__all", label: t("all") }, ...cats.map((c) => ({ value: c, label: c }))].map((c) => (
          <button
            key={c.value}
            onClick={() => setActiveCat(c.value)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${
              activeCat === c.value
                ? "border-primary bg-primary text-white"
                : "border-line bg-card text-ink"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="mt-3 flex-1 overflow-y-auto px-4 pb-40">
        {visible.length === 0 ? (
          <div className="mt-10 text-center text-[13px] text-muted">{t("no_products")}</div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {visible.map((p) => {
              const inCart = cart[p.id]?.qty || 0;
              return (
                <div key={p.id} className="overflow-hidden rounded-xl border border-line bg-card">
                  <button onClick={() => addToCart(p)} className="block w-full text-left">
                    <div className="h-14 w-full" style={{ background: swatch(p.name) }} />
                    <div className="px-2.5 py-2">
                      <div className="line-clamp-1 text-[11.5px] font-bold text-ink">{p.name}</div>
                      <div className="text-[11px] font-semibold tabnum text-primary">
                        {rwf(p.sell_price_rwf)} RWF
                      </div>
                    </div>
                  </button>
                  {inCart > 0 && (
                    <div className="flex items-center justify-between border-t border-line px-2 py-1.5">
                      <button
                        onClick={() => decFromCart(p)}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-paper"
                      >
                        <Minus size={13} className="text-ink" />
                      </button>
                      <span className="text-[13px] font-bold tabnum text-ink">{inCart}</span>
                      <button
                        onClick={() => addToCart(p)}
                        className="flex h-6 w-6 items-center justify-center rounded-md bg-primary"
                      >
                        <Plus size={13} className="text-white" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky cart bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-3">
        <div
          className={`pointer-events-auto flex items-center justify-between rounded-2xl bg-ink px-4 py-3 shadow-pop transition ${
            lines.length ? "opacity-100" : "opacity-70"
          }`}
        >
          <div>
            <div className="text-[10.5px] font-semibold text-white/65">
              {lines.length ? `${totalItems} ${t("items")}` : t("cart_empty")}
            </div>
            <div className="font-heading text-[16px] font-extrabold tabnum text-white">
              {rwf(totalAmount)} RWF
            </div>
          </div>
          <Button
            variant="primary"
            className="py-2.5"
            disabled={!lines.length}
            onClick={() => setPayOpen(true)}
          >
            {t("charge")} <ChevronRight size={15} />
          </Button>
        </div>
      </div>

      {/* Payment sheet */}
      <Sheet
        open={payOpen}
        onClose={() => setPayOpen(false)}
        title={t("payment_method")}
        footer={
          <Button full variant="green" disabled={saving} onClick={handleComplete}>
            {saving ? "…" : `${t("complete_sale")} · ${rwf(totalAmount)} RWF`}
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-2.5 pb-2 pt-1">
          {payOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setMethod(value)}
              className={`flex items-center gap-2 rounded-xl border p-3 text-left ${
                method === value ? "border-primary bg-primary-xlt" : "border-line bg-card"
              }`}
            >
              <Icon size={18} className={method === value ? "text-primary" : "text-muted"} />
              <span className={`text-[13px] font-semibold ${method === value ? "text-primary" : "text-ink"}`}>
                {label}
              </span>
            </button>
          ))}
        </div>
        <TextInput
          className="mt-2"
          placeholder={t("customer_name")}
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
        />
      </Sheet>
    </div>
  );
}
