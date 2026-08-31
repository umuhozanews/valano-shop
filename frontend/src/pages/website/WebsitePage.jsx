import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check, Copy, ExternalLink, Globe, Inbox, Loader2, Palette, RefreshCw, ShoppingBag,
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

const PRESET_COLOURS = ["#006C49", "#0F172A", "#1D4ED8", "#B91C1C", "#B45309", "#6D28D9", "#0E7490", "#BE185D"];

const ORDER_TABS = [
  { key: "", label: "All" },
  { key: "pending", label: "New" },
  { key: "confirmed", label: "Confirmed" },
  { key: "fulfilled", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES = {
  pending: "bg-warning/10 text-warning",
  confirmed: "bg-primary/10 text-primary",
  fulfilled: "bg-success/10 text-success",
  cancelled: "bg-neutral/10 text-text-secondary",
};

const NEXT_ACTIONS = {
  pending: [
    { status: "confirmed", label: "Confirm" },
    { status: "cancelled", label: "Cancel" },
  ],
  confirmed: [
    { status: "fulfilled", label: "Mark delivered" },
    { status: "cancelled", label: "Cancel" },
  ],
  fulfilled: [],
  cancelled: [{ status: "pending", label: "Reopen" }],
};

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
  };
}

function formFromApi(storefront) {
  const base = emptyForm();
  if (!storefront) return base;
  return {
    ...base,
    ...Object.fromEntries(
      Object.keys(base)
        .filter((key) => key !== "store_socials")
        .map((key) => [key, storefront[key] ?? base[key]])
    ),
    store_published: storefront.store_published !== false,
    store_brand_color: storefront.store_brand_color || base.store_brand_color,
    store_socials: { ...base.store_socials, ...(storefront.store_socials || {}) },
  };
}

// ── Website design ──────────────────────────────────────────────────────────
function DesignTab({ form, setForm, storeUrl, saving, onSave }) {
  const [copied, setCopied] = useState(false);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

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

      <Card title="Brand colour" subtitle="Your whole website is styled from this one colour">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="color"
            value={form.store_brand_color}
            onChange={set("store_brand_color")}
            aria-label="Brand colour"
            className="h-10 w-16 cursor-pointer rounded-card border border-border bg-surface p-1"
          />
          <Input value={form.store_brand_color} onChange={set("store_brand_color")} className="w-32" />
          <div className="flex flex-wrap gap-2">
            {PRESET_COLOURS.map((colour) => (
              <button
                key={colour}
                type="button"
                onClick={() => setForm((current) => ({ ...current, store_brand_color: colour }))}
                aria-label={`Use ${colour}`}
                style={{ backgroundColor: colour }}
                className={`h-7 w-7 rounded-full ring-2 ring-offset-2 transition ${
                  form.store_brand_color?.toLowerCase() === colour.toLowerCase() ? "ring-primary" : "ring-transparent"
                }`}
              />
            ))}
          </div>
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

  const stats = [
    { label: "New orders", value: state.summary.pending ?? 0 },
    { label: "Confirmed", value: state.summary.confirmed ?? 0 },
    { label: "Delivered", value: state.summary.fulfilled ?? 0 },
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
                      {order.delivery_note && (
                        <p className="mt-1 text-[11px] italic text-text-secondary">“{order.delivery_note}”</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[16px] font-bold text-primary">{formatRWF(order.total_amount)}</p>
                      <p className="text-[11px] text-text-secondary">{lines.length} item(s)</p>
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

                  {(NEXT_ACTIONS[order.status] || []).length > 0 && (
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
                  )}
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

  useEffect(() => {
    setLoading(true);
    api
      .get("/settings")
      .then(({ data }) => {
        setForm(formFromApi(data?.storefront));
        setStoreUrl(data?.storefront?.store_url || "");
      })
      .catch(() => toast.error("Could not load your website settings"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const payload = { ...form };
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
          <DesignTab form={form} setForm={setForm} storeUrl={storeUrl} saving={saving} onSave={save} />
        )
      ) : (
        <OrdersTab />
      )}
    </PageWrapper>
  );
}
