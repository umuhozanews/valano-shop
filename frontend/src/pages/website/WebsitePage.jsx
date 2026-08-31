import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check, Copy, ExternalLink, Globe, Inbox, Loader2, MapPin, Palette, Plus, Receipt,
  RefreshCw, ShoppingBag, Trash2, Truck,
} from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import api from "../../utils/api";
import { formatRWF, formatRelative } from "../../utils/formatters";

const TEXTAREA_CLASS =
  "w-full p-2.5 border border-border rounded-card text-[12px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary";

const SOCIAL_FIELDS = [
  { key: "facebook", label: "Facebook page URL", placeholder: "https://facebook.com/yourshop" },
  { key: "instagram", label: "Instagram URL", placeholder: "https://instagram.com/yourshop" },
  { key: "tiktok", label: "TikTok URL", placeholder: "https://tiktok.com/@yourshop" },
  { key: "twitter", label: "X / Twitter URL", placeholder: "https://x.com/yourshop" },
];

// Fallback for the named schemes the API returns, so the picker still works if
// the settings response predates them.
const FALLBACK_PRESETS = [
  { id: "teal_lime", label: "Teal & Lime", brand: "#006C49", accent: "#C6F24E" },
  { id: "orange", label: "Sunset Orange", brand: "#E2560F", accent: "#FFE1CC" },
  { id: "sapphire", label: "Sapphire Blue", brand: "#1D4ED8", accent: "#DBEAFE" },
  { id: "plum", label: "Deep Plum", brand: "#6D28D9", accent: "#EDE9FE" },
  { id: "charcoal", label: "Charcoal", brand: "#1F2937", accent: "#E5E7EB" },
];

const ORDER_TABS = [
  { key: "", label: "All" },
  { key: "pending", label: "New" },
  { key: "confirmed", label: "Confirmed" },
  { key: "shipped", label: "Out for delivery" },
  { key: "fulfilled", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES = {
  pending: "bg-warning/10 text-warning",
  confirmed: "bg-primary/10 text-primary",
  shipped: "bg-primary-dark/10 text-primary-dark",
  fulfilled: "bg-success/10 text-success",
  cancelled: "bg-neutral/10 text-text-secondary",
};

// Statuses only track where the order is. Money and stock move once, when the
// order is converted into a sale, which is why that is a separate action.
const NEXT_ACTIONS = {
  pending: [
    { status: "confirmed", label: "Confirm" },
    { status: "cancelled", label: "Cancel" },
  ],
  confirmed: [
    { status: "shipped", label: "Out for delivery" },
    { status: "cancelled", label: "Cancel" },
  ],
  shipped: [{ status: "cancelled", label: "Cancel" }],
  fulfilled: [],
  cancelled: [{ status: "pending", label: "Reopen" }],
};

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "mtn_momo", label: "MTN MoMo" },
  { value: "airtel", label: "Airtel Money" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "card", label: "Card" },
  { value: "credit", label: "On credit" },
];

function emptyForm() {
  return {
    store_slug: "",
    store_published: true,
    store_headline: "",
    store_tagline: "",
    store_about: "",
    store_announcement: "",
    store_delivery_note: "",
    store_hours: "",
    store_whatsapp: "",
    store_brand_color: "#006C49",
    store_accent_color: "",
    store_socials: { facebook: "", instagram: "", tiktok: "", twitter: "" },
    store_delivery_fee: 1500,
    store_min_free_delivery: 50000,
    store_pickup_enabled: true,
    store_delivery_zones: [],
  };
}

function formFromApi(storefront) {
  const base = emptyForm();
  if (!storefront) return base;
  return {
    ...base,
    ...Object.fromEntries(
      Object.keys(base)
        .filter((key) => !["store_socials", "store_delivery_zones"].includes(key))
        .map((key) => [key, storefront[key] ?? base[key]])
    ),
    store_published: storefront.store_published !== false,
    store_pickup_enabled: storefront.store_pickup_enabled !== false,
    store_brand_color: storefront.store_brand_color || base.store_brand_color,
    store_socials: { ...base.store_socials, ...(storefront.store_socials || {}) },
    store_delivery_zones: Array.isArray(storefront.store_delivery_zones) ? storefront.store_delivery_zones : [],
  };
}

// ── Website design ──────────────────────────────────────────────────────────
function DesignTab({ form, setForm, storeUrl, presets, saving, onSave }) {
  const [copied, setCopied] = useState(false);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const setZones = (next) => setForm((current) => ({ ...current, store_delivery_zones: next }));
  const addZone = () => setZones([...form.store_delivery_zones, { name: "", fee: form.store_delivery_fee || 0 }]);
  const removeZone = (index) => setZones(form.store_delivery_zones.filter((_, i) => i !== index));
  const updateZone = (index, key, value) =>
    setZones(form.store_delivery_zones.map((zone, i) => (i === index ? { ...zone, [key]: value } : zone)));

  async function copyUrl() {
    if (!storeUrl) return;
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      toast.success("Website link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select and copy the link manually");
    }
  }

  return (
    <div className="space-y-5">
      <Card title="Your website address" subtitle="Share this link with customers on WhatsApp, Instagram or a business card">
        <div className="flex flex-wrap items-center gap-2 rounded-card border border-border bg-background p-3">
          <Globe size={15} className="shrink-0 text-primary" />
          <code className="min-w-0 flex-1 truncate text-[12px] font-medium text-text-primary">
            {storeUrl || "Saving your settings will create your link"}
          </code>
          <Button size="sm" variant="secondary" icon={copied ? Check : Copy} onClick={copyUrl} disabled={!storeUrl}>
            {copied ? "Copied" : "Copy"}
          </Button>
          {storeUrl && (
            <a href={storeUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" icon={ExternalLink}>Preview</Button>
            </a>
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input
            label="Web address (slug)"
            value={form.store_slug}
            onChange={set("store_slug")}
            placeholder="my-shop-name"
            hint="Letters, numbers and dashes only. Changing this changes your link."
          />
          <div>
            <label className="text-[11px] font-medium text-text-primary">Visibility</label>
            <label className="mt-1 flex h-9 cursor-pointer items-center gap-2.5 rounded-card border border-border bg-surface px-3">
              <input
                type="checkbox"
                checked={form.store_published}
                onChange={(event) => setForm((current) => ({ ...current, store_published: event.target.checked }))}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-[12px] text-text-primary">
                {form.store_published ? "Live — customers can visit" : "Hidden — shows a “coming soon” page"}
              </span>
            </label>
          </div>
        </div>
      </Card>

      <Card title="What customers read" subtitle="Leave anything blank and Inzira writes it for you from your shop details">
        <div className="grid gap-4">
          <Input label="Headline" value={form.store_headline} onChange={set("store_headline")}
            placeholder="Quality electronics at honest prices" />
          <Input label="Tagline" value={form.store_tagline} onChange={set("store_tagline")}
            placeholder="Genuine products, fast delivery across Rwanda" />
          <div>
            <label className="mb-1 block text-[11px] font-medium text-text-primary">Announcement bar</label>
            <Input value={form.store_announcement} onChange={set("store_announcement")}
              placeholder="Free delivery in Kigali this week!" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-text-primary">About your business</label>
            <textarea rows={4} value={form.store_about} onChange={set("store_about")} className={TEXTAREA_CLASS}
              placeholder="Tell customers who you are, what you sell and why they should trust you." />
          </div>
        </div>
      </Card>

      <Card title="Contact & delivery" subtitle="Shown in the header, footer and on every product page">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="WhatsApp number" value={form.store_whatsapp} onChange={set("store_whatsapp")}
            placeholder="0788 123 456" hint="Adds a WhatsApp order button to your site" />
          <Input label="Opening hours" value={form.store_hours} onChange={set("store_hours")}
            placeholder="Mon–Sat, 8am–6pm" />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[11px] font-medium text-text-primary">Delivery note</label>
            <Input value={form.store_delivery_note} onChange={set("store_delivery_note")}
              placeholder="Same-day delivery in Kigali, 1–2 days upcountry" />
          </div>
          {SOCIAL_FIELDS.map((field) => (
            <Input
              key={field.key}
              label={field.label}
              value={form.store_socials[field.key] || ""}
              placeholder={field.placeholder}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  store_socials: { ...current.store_socials, [field.key]: event.target.value },
                }))
              }
            />
          ))}
        </div>
      </Card>

      <Card
        title="Delivery & collection"
        subtitle="What shoppers are charged at checkout — the website never lets a customer change these"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Standard delivery fee (RWF)"
            type="number"
            min="0"
            value={form.store_delivery_fee}
            onChange={set("store_delivery_fee")}
            hint="Used when an area has no price of its own"
          />
          <Input
            label="Free delivery over (RWF)"
            type="number"
            min="0"
            value={form.store_min_free_delivery}
            onChange={set("store_min_free_delivery")}
            hint="Set to 0 to always charge for delivery"
          />
        </div>

        <label className="mt-4 flex h-9 cursor-pointer items-center gap-2.5 rounded-card border border-border bg-surface px-3">
          <input
            type="checkbox"
            checked={form.store_pickup_enabled}
            onChange={(event) => setForm((current) => ({ ...current, store_pickup_enabled: event.target.checked }))}
            className="h-4 w-4 accent-primary"
          />
          <span className="text-[12px] text-text-primary">
            Let customers choose to collect from the shop (no delivery fee)
          </span>
        </label>

        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-text-primary">Delivery areas</p>
              <p className="text-[11px] text-text-secondary">
                Shoppers pick their area at checkout. Remove them all to charge one flat fee everywhere.
              </p>
            </div>
            <Button size="sm" variant="secondary" icon={Plus} onClick={addZone}>Add area</Button>
          </div>

          {form.store_delivery_zones.length === 0 ? (
            <p className="mt-3 rounded-card border border-dashed border-border px-3 py-4 text-center text-[11px] text-text-secondary">
              No areas yet — every delivery is charged the standard fee above.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {form.store_delivery_zones.map((zone, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={zone.name}
                    onChange={(event) => updateZone(index, "name", event.target.value)}
                    placeholder="Area name, e.g. Kicukiro"
                    className="min-w-0 flex-1 rounded-card border border-border bg-surface p-2 text-[12px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="number"
                    min="0"
                    value={zone.fee}
                    onChange={(event) => updateZone(index, "fee", event.target.value)}
                    placeholder="Fee"
                    className="w-28 rounded-card border border-border bg-surface p-2 text-[12px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => removeZone(index)}
                    aria-label={`Remove ${zone.name || "area"}`}
                    className="rounded-card p-2 text-text-secondary transition hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card title="Brand colour" subtitle="Your whole website is styled from this one colour">
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => {
            const active = form.store_brand_color?.toLowerCase() === preset.brand.toLowerCase();
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    store_brand_color: preset.brand,
                    store_accent_color: preset.accent,
                  }))
                }
                className={`flex items-center gap-2 rounded-card border px-3 py-2 text-[11px] font-semibold transition ${
                  active ? "border-primary bg-primary/5 text-primary" : "border-border text-text-secondary hover:text-text-primary"
                }`}
              >
                <span className="flex">
                  <span className="h-4 w-4 rounded-l-full" style={{ backgroundColor: preset.brand }} />
                  <span className="h-4 w-4 rounded-r-full" style={{ backgroundColor: preset.accent }} />
                </span>
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            type="color"
            value={form.store_brand_color}
            onChange={set("store_brand_color")}
            aria-label="Brand colour"
            className="h-10 w-16 cursor-pointer rounded-card border border-border bg-surface p-1"
          />
          <Input value={form.store_brand_color} onChange={set("store_brand_color")} className="w-32" />
          <span className="text-[11px] text-text-secondary">Or set your exact brand colour</span>
        </div>

        <div className="mt-5 overflow-hidden rounded-card border border-border">
          <div className="flex items-center justify-between px-4 py-2.5 text-[11px] font-semibold"
            style={{ backgroundColor: form.store_brand_color, color: "#fff" }}>
            <span>{form.store_announcement || "Your announcement appears here"}</span>
            <span className="opacity-80">{form.store_hours || "Mon–Sat"}</span>
          </div>
          <div className="p-5">
            <span className="inline-block rounded-full px-3 py-1 text-[10px] font-extrabold tracking-widest text-white"
              style={{ backgroundColor: form.store_brand_color }}>
              HOT DEALS
            </span>
            <p className="mt-2 text-[18px] font-extrabold tracking-tight" style={{ color: form.store_brand_color }}>
              {form.store_headline || "Your headline appears here"}
            </p>
            <p className="mt-1 text-[12px] text-text-secondary">
              {form.store_tagline || "Your tagline appears here"}
            </p>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button loading={saving} onClick={onSave}>Save website settings</Button>
        <span className="text-[11px] text-text-secondary">
          Products come straight from your stock — publish an item in SITOKE and it appears here.
        </span>
      </div>
    </div>
  );
}

// ── Website orders ──────────────────────────────────────────────────────────
function OrdersTab() {
  const [status, setStatus] = useState("");
  const [state, setState] = useState({ loading: true, data: [], summary: {} });
  const [updating, setUpdating] = useState(null);
  const [converting, setConverting] = useState(null);
  const [payMethods, setPayMethods] = useState({});

  const load = useCallback(() => {
    setState((current) => ({ ...current, loading: true }));
    api
      .get("/store-orders", { params: status ? { status } : {} })
      .then(({ data }) =>
        setState({ loading: false, data: Array.isArray(data?.data) ? data.data : [], summary: data?.summary || {} })
      )
      .catch(() => {
        toast.error("Could not load website orders");
        setState({ loading: false, data: [], summary: {} });
      });
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(order, nextStatus) {
    setUpdating(order.id);
    try {
      await api.put(`/store-orders/${order.id}/status`, { status: nextStatus });
      toast.success(`Order ${order.reference} marked ${nextStatus}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not update the order");
    } finally {
      setUpdating(null);
    }
  }

  // Turning the order into a sale is what actually deducts stock and raises the
  // EBM receipt, so it is deliberately a distinct, explicit step.
  async function convertToSale(order) {
    setConverting(order.id);
    try {
      const { data } = await api.post(`/store-orders/${order.id}/convert`, {
        payment_method: payMethods[order.id] || "cash",
      });
      if (data?.already_converted) {
        toast.success(`Order ${order.reference} was already recorded as a sale`);
      } else {
        toast.success(`Sale recorded — invoice ${data?.sale?.invoice_number || ""}`.trim());
        if (data?.delivery_fee_to_collect) {
          toast(`Remember to collect ${formatRWF(data.delivery_fee_to_collect)} delivery separately`, { icon: "🛵" });
        }
      }
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not record this order as a sale");
    } finally {
      setConverting(null);
    }
  }

  const stats = [
    { label: "New orders", value: state.summary.pending ?? 0 },
    { label: "Confirmed", value: state.summary.confirmed ?? 0 },
    { label: "Completed", value: state.summary.fulfilled ?? 0 },
    { label: "Order value", value: formatRWF(state.summary.revenue ?? 0) },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-card border border-border bg-surface p-4">
            <p className="text-[11px] font-medium text-text-secondary">{stat.label}</p>
            <p className="mt-1 text-[20px] font-bold tracking-tight text-text-primary">{stat.value}</p>
          </div>
        ))}
      </div>

      <Card
        title="Website orders"
        subtitle="Orders placed by customers on your public website"
        action={<Button size="sm" variant="secondary" icon={RefreshCw} onClick={load}>Refresh</Button>}
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {ORDER_TABS.map((tab) => (
            <button
              key={tab.key || "all"}
              type="button"
              onClick={() => setStatus(tab.key)}
              className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition ${
                status === tab.key
                  ? "bg-primary text-white"
                  : "border border-border bg-surface text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
              {tab.key && state.summary[tab.key] ? ` (${state.summary[tab.key]})` : ""}
            </button>
          ))}
        </div>

        {state.loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[12px] text-text-secondary">
            <Loader2 size={15} className="animate-spin" /> Loading orders…
          </div>
        ) : state.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border py-14 text-center">
            <Inbox size={28} className="text-text-secondary" />
            <p className="mt-3 text-[12px] font-semibold text-text-primary">No website orders yet</p>
            <p className="mt-1 max-w-sm text-[11px] text-text-secondary">
              Share your website link with customers. Orders they place will land here and you will also get a
              notification.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {state.data.map((order) => {
              const lines = Array.isArray(order.items) ? order.items : [];
              return (
                <div key={order.id} className="rounded-card border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[12px] font-bold text-text-primary">{order.reference}</span>
                        <span className={`rounded-badge px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[order.status] || STATUS_STYLES.pending}`}>
                          {order.status}
                        </span>
                        <span className="text-[11px] text-text-secondary">{formatRelative(order.created_at)}</span>
                      </div>
                      <p className="mt-1 text-[12px] text-text-primary">
                        {order.customer_name} · <a href={`tel:${order.customer_phone}`} className="text-primary hover:underline">{order.customer_phone}</a>
                        {order.customer_email && <span className="text-text-secondary"> · {order.customer_email}</span>}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-text-secondary">
                        {order.fulfillment === "pickup" ? (
                          <>
                            <ShoppingBag size={12} /> Collecting from the shop
                          </>
                        ) : (
                          <>
                            <Truck size={12} />
                            {order.delivery_zone || "Delivery"}
                            {order.delivery_fee ? ` · ${formatRWF(order.delivery_fee)} delivery` : " · free delivery"}
                          </>
                        )}
                      </p>
                      {order.delivery_address && (
                        <p className="mt-1 flex items-start gap-1.5 text-[11px] text-text-primary">
                          <MapPin size={12} className="mt-0.5 shrink-0 text-primary" />
                          {order.delivery_address}
                        </p>
                      )}
                      {order.delivery_note && (
                        <p className="mt-1 text-[11px] italic text-text-secondary">“{order.delivery_note}”</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[16px] font-bold text-primary">{formatRWF(order.total_amount)}</p>
                      <p className="text-[11px] text-text-secondary">{lines.length} item(s)</p>
                      {order.sale_id && (
                        <Link
                          to={`/app/sales/${order.sale_id}`}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                        >
                          <Receipt size={11} /> View receipt
                        </Link>
                      )}
                    </div>
                  </div>

                  {lines.length > 0 && (
                    <ul className="mt-3 divide-y divide-border border-t border-border pt-2">
                      {lines.map((line) => (
                        <li key={line.itemId} className="flex items-center justify-between py-1.5 text-[11px]">
                          <span className="min-w-0 truncate text-text-primary">
                            {line.name} <span className="text-text-secondary">× {line.quantity} {line.unit}</span>
                          </span>
                          <span className="shrink-0 font-semibold text-text-primary">{formatRWF(line.lineTotal)}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {!order.sale_id && order.status !== "cancelled" && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-card bg-background p-2.5">
                      <span className="text-[11px] font-semibold text-text-primary">Paid by</span>
                      <select
                        value={payMethods[order.id] || "cash"}
                        onChange={(event) =>
                          setPayMethods((current) => ({ ...current, [order.id]: event.target.value }))
                        }
                        className="rounded-card border border-border bg-surface p-1.5 text-[11px] focus:border-primary focus:outline-none"
                      >
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method.value} value={method.value}>{method.label}</option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        icon={Receipt}
                        loading={converting === order.id}
                        onClick={() => convertToSale(order)}
                      >
                        Fulfil & record sale
                      </Button>
                      <span className="text-[11px] text-text-secondary">
                        Deducts stock and issues the receipt
                      </span>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(NEXT_ACTIONS[order.status] || []).map((action) => (
                      <Button
                        key={action.status}
                        size="sm"
                        variant={action.status === "cancelled" ? "secondary" : "primary"}
                        loading={updating === order.id}
                        onClick={() => changeStatus(order, action.status)}
                      >
                        {action.label}
                      </Button>
                    ))}
                    <a
                      href={`https://wa.me/${String(order.customer_phone).replace(/[^\d]/g, "")}?text=${encodeURIComponent(
                        `Hello ${order.customer_name}, about your order ${order.reference}…`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="ghost">Message customer</Button>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function WebsitePage() {
  const [tab, setTab] = useState("design");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [storeUrl, setStoreUrl] = useState("");
  const [presets, setPresets] = useState(FALLBACK_PRESETS);

  useEffect(() => {
    setLoading(true);
    api
      .get("/settings")
      .then(({ data }) => {
        setForm(formFromApi(data?.storefront));
        setStoreUrl(data?.storefront?.store_url || "");
        if (Array.isArray(data?.storefront?.theme_presets) && data.storefront.theme_presets.length) {
          setPresets(data.storefront.theme_presets);
        }
      })
      .catch(() => toast.error("Could not load your website settings"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        // The number inputs hand back strings, and the API rejects anything that
        // is not a whole number of francs.
        store_delivery_fee: Math.max(0, Math.round(Number(form.store_delivery_fee) || 0)),
        store_min_free_delivery: Math.max(0, Math.round(Number(form.store_min_free_delivery) || 0)),
        store_delivery_zones: form.store_delivery_zones
          .map((zone) => ({ name: String(zone.name || "").trim(), fee: Math.max(0, Math.round(Number(zone.fee) || 0)) }))
          .filter((zone) => zone.name),
      };
      // An empty slug would be rejected as invalid rather than understood as
      // "leave it alone", so it is only sent when the owner actually typed one.
      if (!payload.store_slug?.trim()) delete payload.store_slug;

      const { data } = await api.put("/settings/storefront", payload);
      // Only adopt the server's version when it really answered with a storefront
      // view, so a degraded response never wipes what the owner just typed.
      if (data && "store_slug" in data) {
        setForm(formFromApi(data));
        setStoreUrl(data.store_url || storeUrl);
      }
      toast.success("Website updated");
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not save your website settings");
    } finally {
      setSaving(false);
    }
  }

  const tabs = useMemo(
    () => [
      { key: "design", label: "Website", icon: Palette },
      { key: "orders", label: "Orders", icon: ShoppingBag },
    ],
    []
  );

  return (
    <PageWrapper
      title="My Website"
      subtitle="Your online shop — powered by the stock you already manage"
      breadcrumbs={[{ label: "My Website", path: "/app/website" }]}
      action={
        storeUrl ? (
          <a href={storeUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" icon={ExternalLink}>Visit website</Button>
          </a>
        ) : null
      }
    >
      <div className="mb-5 flex gap-2">
        {tabs.map((entry) => {
          const Icon = entry.icon;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              className={`flex items-center gap-2 rounded-card px-4 py-2 text-[12px] font-semibold transition ${
                tab === entry.key
                  ? "bg-primary/10 text-primary"
                  : "border border-border bg-surface text-text-secondary hover:text-text-primary"
              }`}
            >
              <Icon size={14} />
              {entry.label}
            </button>
          );
        })}
      </div>

      {tab === "design" ? (
        loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-40 rounded-card bg-surface" />
            <div className="h-64 rounded-card bg-surface" />
          </div>
        ) : (
          <DesignTab
            form={form}
            setForm={setForm}
            storeUrl={storeUrl}
            presets={presets}
            saving={saving}
            onSave={save}
          />
        )
      ) : (
        <OrdersTab />
      )}
    </PageWrapper>
  );
}
