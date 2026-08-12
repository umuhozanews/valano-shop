import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Search, FileText, CheckCircle2, Clock, Share2, Trash2 } from "lucide-react";
import api from "../lib/api";
import { StorageEngine } from "../lib/storage";
import { useLang } from "../lib/i18n.jsx";
import { rwf, timeAgo, todayISO } from "../lib/format";
import ScreenHeader from "../components/ScreenHeader";
import Loading from "../components/Loading";
import Sheet from "../components/Sheet";
import { Button, Field, TextInput } from "../components/ui";

const EMPTY = { customer_name: "", total_amount: "", due_date: todayISO(), notes: "" };

export default function Invoices() {
  const { t } = useLang();
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/invoices").catch(() => ({ data: null }));
      if (data && Array.isArray(data.data || data)) {
        setInvoices(data.data || data);
      } else {
        setInvoices(StorageEngine.getInvoices());
      }
    } catch {
      setInvoices(StorageEngine.getInvoices());
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

  const visible = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (query && !inv.customer_name?.toLowerCase().includes(query.toLowerCase()) && !inv.invoice_number?.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [invoices, query, statusFilter]);

  const { totalInvoiced, paidAmount, unpaidAmount } = useMemo(() => {
    let tot = 0, pd = 0, unpd = 0;
    invoices.forEach((inv) => {
      const amt = Number(inv.total_amount) || 0;
      tot += amt;
      if (inv.status === "paid") pd += amt;
      else unpd += amt;
    });
    return { totalInvoiced: tot, paidAmount: pd, unpaidAmount: unpd };
  }, [invoices]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSave() {
    if (!form.customer_name.trim()) return toast.error("Customer name is required");
    if (!Number(form.total_amount)) return toast.error("Enter a valid invoice amount");
    setSaving(true);
    try {
      await api.post("/invoices", form).catch(() => null);
      StorageEngine.saveInvoice({
        customer_name: form.customer_name.trim(),
        total_amount: Number(form.total_amount),
        due_date: form.due_date || todayISO(),
        notes: form.notes.trim() || "",
        status: "unpaid"
      });
      toast.success("Invoice created successfully");
      setForm(EMPTY);
      setOpen(false);
      load();
    } catch {
      toast.error("Could not create invoice");
    } finally {
      setSaving(false);
    }
  }

  function handleMarkPaid(id) {
    StorageEngine.markInvoicePaid(id);
    toast.success("Invoice marked as PAID");
    load();
  }

  function handleDelete(id) {
    StorageEngine.deleteInvoice(id);
    toast.success("Invoice deleted");
    load();
  }

  function shareWhatsApp(inv) {
    const text = `*INVOICE: ${inv.invoice_number}*\nCustomer: ${inv.customer_name}\nTotal: ${rwf(inv.total_amount)} RWF\nStatus: ${inv.status.toUpperCase()}\nDue Date: ${inv.due_date || 'N/A'}\n\nThank you for choosing Inzira DataBridge!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  if (loading) return <Loading label="Loading invoices..." />;

  return (
    <div className="flex h-full flex-col bg-bg">
      <ScreenHeader
        title="Invoices & Receivables"
        right={
          <button
            onClick={() => setOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-sm"
          >
            <Plus size={18} strokeWidth={2.4} />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-line bg-card p-2.5">
            <div className="text-[10px] font-semibold text-muted">Total Invoiced</div>
            <div className="mt-1 text-[12px] font-bold tabnum text-ink">{rwf(totalInvoiced)}</div>
          </div>
          <div className="rounded-xl border border-line bg-card p-2.5">
            <div className="text-[10px] font-semibold text-emerald-600">Collected</div>
            <div className="mt-1 text-[12px] font-bold tabnum text-emerald-600">{rwf(paidAmount)}</div>
          </div>
          <div className="rounded-xl border border-line bg-card p-2.5">
            <div className="text-[10px] font-semibold text-amber-600">Pending</div>
            <div className="mt-1 text-[12px] font-bold tabnum text-amber-600">{rwf(unpaidAmount)}</div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search invoice or customer..."
              className="w-full rounded-xl border border-line bg-card py-2 pl-8 pr-3 text-[12px] text-ink focus:border-primary focus:outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-line bg-card px-2 py-2 text-[11px] font-semibold text-ink focus:outline-none"
          >
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>

        {/* Invoices List */}
        <div className="space-y-2.5">
          {visible.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-muted">
              No invoices found. Tap <strong>+</strong> to create one.
            </div>
          ) : (
            visible.map((inv) => {
              const isPaid = inv.status === "paid";
              return (
                <div key={inv.id} className="rounded-xl border border-line bg-card p-3 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px] font-bold text-primary">{inv.invoice_number}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {isPaid ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                          {inv.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-1 text-[13px] font-bold text-ink">{inv.customer_name}</div>
                      {inv.notes && <div className="mt-0.5 text-[11px] text-muted italic">{inv.notes}</div>}
                    </div>
                    <div className="text-right">
                      <div className="text-[14px] font-bold tabnum text-ink">{rwf(inv.total_amount)} RWF</div>
                      <div className="mt-0.5 text-[10px] text-muted">Due: {inv.due_date || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-line/60 pt-2">
                    {!isPaid && (
                      <button
                        onClick={() => handleMarkPaid(inv.id)}
                        className="flex items-center gap-1 rounded-lg bg-emerald-600/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-600/20"
                      >
                        <CheckCircle2 size={12} /> Mark Paid
                      </button>
                    )}
                    <button
                      onClick={() => shareWhatsApp(inv)}
                      className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/20"
                    >
                      <Share2 size={12} /> WhatsApp
                    </button>
                    <button
                      onClick={() => handleDelete(inv.id)}
                      className="p-1 text-muted hover:text-red-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* New Invoice Sheet */}
      <Sheet open={open} onClose={() => setOpen(false)} title="Create New Invoice">
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-3 p-4">
          <Field label="Customer Name">
            <TextInput value={form.customer_name} onChange={set("customer_name")} placeholder="e.g. Amani Boutique" required />
          </Field>
          <Field label="Total Amount (RWF)">
            <TextInput type="number" value={form.total_amount} onChange={set("total_amount")} placeholder="e.g. 150000" required />
          </Field>
          <Field label="Payment Due Date">
            <TextInput type="date" value={form.due_date} onChange={set("due_date")} required />
          </Field>
          <Field label="Invoice Notes / Description">
            <TextInput value={form.notes} onChange={set("notes")} placeholder="e.g. Bulk order for 50 T-Shirts" />
          </Field>
          <div className="pt-2">
            <Button type="submit" loading={saving} className="w-full">
              Create & Save Invoice
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
