import { useState, useEffect, useCallback, Fragment } from "react";
import { BookOpen, List, Wallet, Scale, Download, FileText, ChevronDown, TrendingUp, TrendingDown, Minus, Plus, Trash2 } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Modal from "../../components/ui/Modal";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

const TABS = [
  { id: "journal",       label: "Journal",       icon: List },
  { id: "ledger",        label: "Ledger",        icon: BookOpen },
  { id: "cashbook",      label: "Cash Book",     icon: Wallet },
  { id: "trial-balance", label: "Trial Balance", icon: Scale },
];

const TYPE_COLOR = {
  Asset:     "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Liability: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Equity:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Revenue:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Expense:   "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const REF_COLOR = {
  sale:       "bg-emerald-100 text-emerald-700",
  expense:    "bg-orange-100 text-orange-700",
  sale_void:  "bg-red-100 text-red-700",
};

function TypeBadge({ type }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${TYPE_COLOR[type] || "bg-surface text-text-secondary"}`}>
      {type}
    </span>
  );
}

function RefBadge({ type }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${REF_COLOR[type] || "bg-surface text-text-secondary"}`}>
      {type?.replace(/_/g, " ") || "manual"}
    </span>
  );
}

function ExportBtn({ onExport }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-[13px] text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
      >
        <Download size={14} /> Export <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg z-20 min-w-[110px]">
            <button onClick={() => { onExport("pdf"); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-[13px] hover:bg-background rounded-t-lg">
              <FileText size={13} /> PDF
            </button>
            <button onClick={() => { onExport("excel"); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-[13px] hover:bg-background rounded-b-lg">
              <Download size={13} /> Excel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
      <Icon size={44} className="mb-4 opacity-20" />
      <p className="text-[14px] text-center max-w-xs">{text}</p>
    </div>
  );
}

function Skeleton({ rows = 6 }) {
  return (
    <div className="space-y-2">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-10 bg-surface rounded-lg animate-pulse" style={{ opacity: 1 - i * 0.12 }} />
      ))}
    </div>
  );
}

// ── Journal Tab ───────────────────────────────────────────────────────────────
function JournalTab({ dateRange }) {
  const [data, setData]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [accounts, setAccounts]   = useState([]);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState({
    entry_date: new Date().toISOString().slice(0, 10),
    description: "",
    lines: [
      { account_id: "", debit: 0, credit: 0 },
      { account_id: "", debit: 0, credit: 0 },
    ],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/books/journal", { params: { ...dateRange, page, limit: 25 } });
      setData(r.data.data);
      setTotal(r.data.total);
    } catch { toast.error("Failed to load journal"); }
    finally { setLoading(false); }
  }, [dateRange, page]);

  useEffect(() => { setPage(1); }, [dateRange]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get("/books/accounts").then(r => setAccounts(r.data || [])).catch(() => {});
  }, []);

  async function handleCreateEntry(e) {
    e.preventDefault();
    if (!form.description) return toast.error("Please enter a description");
    const dr = form.lines.reduce((s, l) => s + parseFloat(l.debit || 0), 0);
    const cr = form.lines.reduce((s, l) => s + parseFloat(l.credit || 0), 0);
    if (Math.abs(dr - cr) > 0.01) {
      return toast.error(`Unbalanced Entry! Total Debit (${formatRWF(dr)}) must equal Total Credit (${formatRWF(cr)})`);
    }
    setSaving(true);
    try {
      await api.post("/books/journal", form);
      toast.success("Journal Entry posted successfully!");
      setShowModal(false);
      setForm({
        entry_date: new Date().toISOString().slice(0, 10),
        description: "",
        lines: [
          { account_id: "", debit: 0, credit: 0 },
          { account_id: "", debit: 0, credit: 0 },
        ],
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to post entry");
    } finally {
      setSaving(false);
    }
  }

  const addLine = () => {
    setForm(f => ({ ...f, lines: [...f.lines, { account_id: "", debit: 0, credit: 0 }] }));
  };

  const removeLine = (idx) => {
    if (form.lines.length <= 2) return toast.error("Journal entries must have at least 2 accounts");
    setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  };

  const updateLine = (idx, field, val) => {
    setForm(f => ({
      ...f,
      lines: f.lines.map((l, i) => i === idx ? { ...l, [field]: val } : l),
    }));
  };

  async function exportFile(format) {
    try {
      const r = await api.get(`/books/journal?export=${format}&${new URLSearchParams(dateRange)}`, { responseType: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(r.data);
      a.download = `journal.${format === "excel" ? "xlsx" : "pdf"}`;
      a.click();
    } catch { toast.error("Export failed"); }
  }

  const totalPages = Math.ceil(total / 25);

  const totalDebit  = data.reduce((s, e) => s + e.lines.reduce((ls, l) => ls + parseFloat(l.debit  || 0), 0), 0);
  const totalCredit = data.reduce((s, e) => s + e.lines.reduce((ls, l) => ls + parseFloat(l.credit || 0), 0), 0);

  const modalDr = form.lines.reduce((s, l) => s + parseFloat(l.debit || 0), 0);
  const modalCr = form.lines.reduce((s, l) => s + parseFloat(l.credit || 0), 0);
  const isBalanced = Math.abs(modalDr - modalCr) < 0.01;

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-[11px] text-text-secondary uppercase tracking-wide">Entries</p>
            <p className="text-[18px] font-bold text-text-primary">{total.toLocaleString()}</p>
          </div>
          {!loading && data.length > 0 && (
            <>
              <div className="w-px bg-border" />
              <div className="text-center">
                <p className="text-[11px] text-text-secondary uppercase tracking-wide">Total DR</p>
                <p className="text-[15px] font-semibold text-emerald-600">{formatRWF(totalDebit)}</p>
              </div>
              <div className="w-px bg-border" />
              <div className="text-center">
                <p className="text-[11px] text-text-secondary uppercase tracking-wide">Total CR</p>
                <p className="text-[15px] font-semibold text-red-500">{formatRWF(totalCredit)}</p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-[13px] font-medium transition-colors shadow-sm"
          >
            <Plus size={14} /> New Journal Entry
          </button>
          <ExportBtn onExport={exportFile} />
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Journal Entry"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-[12px]">
              <span className={`font-bold ${isBalanced ? "text-emerald-600" : "text-red-500"}`}>
                {isBalanced ? "✓ BALANCED" : `✕ UNBALANCED (Diff: ${formatRWF(Math.abs(modalDr - modalCr))})`}
              </span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowModal(false)} className="px-3 py-1.5 border border-border rounded-lg text-[13px]">Cancel</button>
              <button type="button" onClick={handleCreateEntry} disabled={saving || !isBalanced} className="px-4 py-1.5 bg-primary text-white rounded-lg text-[13px] font-medium disabled:opacity-50">
                {saving ? "Posting..." : "Post Entry"}
              </button>
            </div>
          </div>
        }>
        <form onSubmit={handleCreateEntry} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[12px] text-text-secondary mb-1 block font-medium">Entry Date</label>
              <input type="date" value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))}
                className="w-full h-9 px-3 border border-border rounded-lg text-[13px] bg-background" required />
            </div>
            <div>
              <label className="text-[12px] text-text-secondary mb-1 block font-medium">Description / Memo</label>
              <input type="text" placeholder="e.g. Owner Capital Injection, Bank Transfer..." value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full h-9 px-3 border border-border rounded-lg text-[13px] bg-background" required />
            </div>
          </div>

          <div className="border border-border rounded-xl p-3 bg-surface space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold text-text-primary">Journal Lines (Debits & Credits)</p>
              <button type="button" onClick={addLine} className="flex items-center gap-1 text-[12px] text-primary font-semibold hover:underline">
                <Plus size={12} /> Add Account Line
              </button>
            </div>

            <div className="space-y-2">
              {form.lines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-background p-2 rounded-lg border border-border/60">
                  <select value={line.account_id} onChange={e => updateLine(idx, "account_id", e.target.value)}
                    className="flex-1 h-8 px-2 border border-border rounded text-[12px] bg-surface font-medium" required>
                    <option value="">Select Account...</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name} ({a.type})</option>)}
                  </select>
                  <div className="w-28">
                    <input type="number" placeholder="Debit RWF" min="0" value={line.debit || ""}
                      onChange={e => updateLine(idx, "debit", e.target.value)}
                      className="w-full h-8 px-2 border border-border rounded text-[12px] font-mono text-emerald-600 bg-surface" />
                  </div>
                  <div className="w-28">
                    <input type="number" placeholder="Credit RWF" min="0" value={line.credit || ""}
                      onChange={e => updateLine(idx, "credit", e.target.value)}
                      className="w-full h-8 px-2 border border-border rounded text-[12px] font-mono text-red-500 bg-surface" />
                  </div>
                  <button type="button" onClick={() => removeLine(idx)} className="p-1 text-text-secondary hover:text-danger rounded">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[12px]">
              <span className="font-medium text-text-secondary">Totals</span>
              <div className="space-x-4 font-mono font-bold">
                <span className="text-emerald-600">DR: {formatRWF(modalDr)}</span>
                <span className="text-red-500">CR: {formatRWF(modalCr)}</span>
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {loading ? <Skeleton rows={5} /> : data.length === 0 ? (
        <EmptyState icon={BookOpen} text="No journal entries yet. They appear automatically as you record sales and expenses." />
      ) : (
        <div className="space-y-3">
          {data.map(entry => (
            <div key={entry.id} className="border border-border rounded-xl overflow-hidden">
              {/* Entry header */}
              <div className="flex items-start justify-between px-4 py-3 bg-background/60 border-b border-border/50">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-[13px] font-semibold text-text-primary truncate">{entry.description}</p>
                  <p className="text-[12px] text-text-secondary mt-0.5">
                    {formatDate(entry.entry_date, "dd MMM yyyy")}
                    {entry.created_by_name && <> · {entry.created_by_name}</>}
                  </p>
                </div>
                <RefBadge type={entry.reference_type} />
              </div>

              {/* Lines table */}
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-[11px] text-text-secondary uppercase tracking-wide border-b border-border/30">
                    <th className="text-left px-4 py-2 font-medium">Account</th>
                    <th className="text-right px-4 py-2 font-medium w-36">Debit (RWF)</th>
                    <th className="text-right px-4 py-2 font-medium w-36">Credit (RWF)</th>
                  </tr>
                </thead>
                <tbody>
                  {(entry.lines || []).map((line, i) => (
                    <tr key={i} className={`border-b border-border/20 last:border-0 ${i % 2 === 0 ? "bg-surface" : "bg-background/20"}`}>
                      <td className="px-4 py-2 text-text-primary">
                        <span className="font-mono text-[11px] text-text-secondary mr-2 shrink-0">{line.code}</span>
                        {line.account_name}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-emerald-600 font-medium">
                        {parseFloat(line.debit) > 0 ? formatRWF(line.debit) : <span className="text-text-secondary/40">—</span>}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-red-500 font-medium">
                        {parseFloat(line.credit) > 0 ? formatRWF(line.credit) : <span className="text-text-secondary/40">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 text-[13px] border border-border rounded-lg disabled:opacity-40 hover:border-primary hover:text-primary transition-colors">
            ← Previous
          </button>
          <span className="text-[13px] text-text-secondary">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-[13px] border border-border rounded-lg disabled:opacity-40 hover:border-primary hover:text-primary transition-colors">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Ledger Tab ────────────────────────────────────────────────────────────────
function LedgerTab({ dateRange }) {
  const [accounts, setAccounts]   = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [ledger, setLedger]       = useState([]);
  const [account, setAccount]     = useState(null);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    api.get("/books/ledger")
      .then(r => setAccounts(r.data.accounts || []))
      .catch(() => {});
  }, []);

  async function loadLedger(id) {
    if (!id) { setSelectedId(""); setLedger([]); setAccount(null); return; }
    setSelectedId(id);
    setLoading(true);
    try {
      const r = await api.get("/books/ledger", { params: { account_id: id, ...dateRange } });
      setLedger(r.data.ledger || []);
      setAccount(r.data.account || null);
    } catch { toast.error("Failed to load ledger"); }
    finally { setLoading(false); }
  }

  // Reload when date range changes
  useEffect(() => {
    if (selectedId) loadLedger(selectedId);
  }, [dateRange]); // eslint-disable-line

  async function exportFile(format) {
    if (!selectedId) return toast.error("Select an account first");
    try {
      const r = await api.get(
        `/books/ledger?account_id=${selectedId}&export=${format}&${new URLSearchParams(dateRange)}`,
        { responseType: "blob" }
      );
      const a = document.createElement("a");
      a.href = URL.createObjectURL(r.data);
      a.download = `ledger-${account?.code || selectedId}.${format === "excel" ? "xlsx" : "pdf"}`;
      a.click();
    } catch { toast.error("Export failed"); }
  }

  const TYPE_GROUPS = ["Asset", "Liability", "Equity", "Revenue", "Expense"];
  const closingBalance = ledger.length ? parseFloat(ledger[ledger.length - 1].running_balance) : 0;
  const totalDebit  = ledger.reduce((s, r) => s + parseFloat(r.debit  || 0), 0);
  const totalCredit = ledger.reduce((s, r) => s + parseFloat(r.credit || 0), 0);

  return (
    <div className="space-y-5">
      {/* Account selector + export */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] max-w-sm">
          <select
            value={selectedId}
            onChange={e => loadLedger(e.target.value)}
            className="w-full h-9 px-3 border border-border rounded-lg text-[14px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">— Select Account —</option>
            {TYPE_GROUPS.map(type => {
              const accs = accounts.filter(a => a.type === type);
              if (!accs.length) return null;
              return (
                <optgroup key={type} label={type}>
                  {accs.map(a => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
        <ExportBtn onExport={exportFile} />
      </div>

      {/* Summary strip when account is selected */}
      {account && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-background border border-border rounded-xl p-3">
            <p className="text-[11px] text-text-secondary uppercase tracking-wide mb-1">Account</p>
            <p className="text-[13px] font-semibold text-text-primary truncate">{account.name}</p>
            <p className="text-[11px] font-mono text-text-secondary mt-0.5">{account.code}</p>
          </div>
          <div className="bg-background border border-border rounded-xl p-3">
            <p className="text-[11px] text-text-secondary uppercase tracking-wide mb-1">Type</p>
            <TypeBadge type={account.type} />
            {account.sub_type && <p className="text-[11px] text-text-secondary mt-1">{account.sub_type}</p>}
          </div>
          <div className="bg-background border border-border rounded-xl p-3">
            <p className="text-[11px] text-text-secondary uppercase tracking-wide mb-1">Total DR / CR</p>
            <p className="text-[13px] font-semibold">
              <span className="text-emerald-600">{formatRWF(totalDebit)}</span>
              <span className="text-text-secondary mx-1">/</span>
              <span className="text-red-500">{formatRWF(totalCredit)}</span>
            </p>
          </div>
          <div className="bg-background border border-border rounded-xl p-3">
            <p className="text-[11px] text-text-secondary uppercase tracking-wide mb-1">Closing Balance</p>
            <p className={`text-[14px] font-bold ${closingBalance >= 0 ? "text-text-primary" : "text-red-600"}`}>
              {formatRWF(closingBalance)}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      {!selectedId ? (
        <EmptyState icon={BookOpen} text="Select an account above to view its ledger entries." />
      ) : loading ? (
        <Skeleton rows={8} />
      ) : ledger.length === 0 ? (
        <EmptyState icon={BookOpen} text="No transactions for this account in the selected period." />
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-background/60 border-b-2 border-border text-[11px] text-text-secondary uppercase tracking-wide">
                  <th className="text-left py-2.5 px-4 font-medium w-28">Date</th>
                  <th className="text-left py-2.5 px-4 font-medium">Description</th>
                  <th className="text-left py-2.5 px-4 font-medium w-24">Type</th>
                  <th className="text-right py-2.5 px-4 font-medium w-36 text-emerald-600">Debit (RWF)</th>
                  <th className="text-right py-2.5 px-4 font-medium w-36 text-red-500">Credit (RWF)</th>
                  <th className="text-right py-2.5 px-4 font-medium w-36">Balance (RWF)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-background/40 border-b border-border/30 text-[12px] italic text-text-secondary">
                  <td colSpan={5} className="py-2 px-4">Opening Balance</td>
                  <td className="py-2 px-4 text-right font-mono">0</td>
                </tr>
                {ledger.map((row, i) => (
                  <tr key={i} className={`border-b border-border/20 last:border-0 hover:bg-background/40 transition-colors ${i % 2 === 0 ? "" : "bg-background/20"}`}>
                    <td className="py-2.5 px-4 text-text-secondary whitespace-nowrap">{formatDate(row.entry_date, "dd MMM yy")}</td>
                    <td className="py-2.5 px-4 text-text-primary max-w-[280px] truncate">{row.description}</td>
                    <td className="py-2.5 px-4"><RefBadge type={row.reference_type} /></td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-600 font-medium">
                      {parseFloat(row.debit) > 0 ? formatRWF(row.debit) : <span className="text-text-secondary/40">—</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-red-500 font-medium">
                      {parseFloat(row.credit) > 0 ? formatRWF(row.credit) : <span className="text-text-secondary/40">—</span>}
                    </td>
                    <td className={`py-2.5 px-4 text-right font-mono font-semibold ${parseFloat(row.running_balance) >= 0 ? "text-text-primary" : "text-red-600"}`}>
                      {formatRWF(row.running_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-primary/5">
                  <td colSpan={3} className="py-3 px-4 font-bold text-[13px] text-text-primary">TOTALS</td>
                  <td className="py-3 px-4 text-right font-bold font-mono text-emerald-600">{formatRWF(totalDebit)}</td>
                  <td className="py-3 px-4 text-right font-bold font-mono text-red-500">{formatRWF(totalCredit)}</td>
                  <td className={`py-3 px-4 text-right font-bold font-mono ${closingBalance >= 0 ? "text-text-primary" : "text-red-600"}`}>
                    {formatRWF(closingBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cash Book Tab ─────────────────────────────────────────────────────────────
function CashBookTab({ dateRange }) {
  const [cashbook, setCashbook] = useState([]);
  const [totals, setTotals]   = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/books/cashbook", { params: dateRange });
      setCashbook(r.data.cashbook || []);
      setTotals(r.data.totals || []);
    } catch { toast.error("Failed to load cash book"); }
    finally { setLoading(false); }
  }, [dateRange]);

  useEffect(() => { load(); }, [load]);

  async function exportFile(format) {
    try {
      const r = await api.get(`/books/cashbook?export=${format}&${new URLSearchParams(dateRange)}`, { responseType: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(r.data);
      a.download = `cashbook.${format === "excel" ? "xlsx" : "pdf"}`;
      a.click();
    } catch { toast.error("Export failed"); }
  }

  const groupedByAccount = cashbook.reduce((acc, row) => {
    const key = row.account_code;
    if (!acc[key]) acc[key] = { name: row.account_name, code: row.account_code, rows: [] };
    acc[key].rows.push(row);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          {totals.length === 0 && !loading ? (
            <p className="text-[13px] text-text-secondary italic">No transactions in this period.</p>
          ) : (
            totals.map(t => (
              <div key={t.code} className="bg-background border border-border rounded-xl px-5 py-3 min-w-[200px]">
                <p className="text-[12px] font-medium text-text-secondary mb-2">{t.code} — {t.name}</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-emerald-600 mb-0.5">
                      <TrendingUp size={12} />
                      <span className="text-[10px] font-medium uppercase tracking-wide">In</span>
                    </div>
                    <p className="text-[13px] font-bold text-emerald-600">{formatRWF(t.total_in)}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-red-500 mb-0.5">
                      <TrendingDown size={12} />
                      <span className="text-[10px] font-medium uppercase tracking-wide">Out</span>
                    </div>
                    <p className="text-[13px] font-bold text-red-500">{formatRWF(t.total_out)}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-text-secondary mb-0.5">
                      <Minus size={12} />
                      <span className="text-[10px] font-medium uppercase tracking-wide">Net</span>
                    </div>
                    <p className={`text-[13px] font-bold ${parseFloat(t.net) >= 0 ? "text-text-primary" : "text-red-500"}`}>
                      {formatRWF(t.net)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <ExportBtn onExport={exportFile} />
      </div>

      {loading ? <Skeleton rows={8} /> : cashbook.length === 0 ? (
        <EmptyState icon={Wallet} text="No cash transactions yet. Record sales or expenses to populate the cash book." />
      ) : (
        <div className="space-y-6">
          {Object.values(groupedByAccount).map(group => (
            <div key={group.code}>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-[12px] text-text-secondary bg-surface border border-border px-2 py-0.5 rounded">
                  {group.code}
                </span>
                <span className="text-[14px] font-semibold text-text-primary">{group.name}</span>
              </div>
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="bg-background/60 border-b border-border text-[11px] text-text-secondary uppercase tracking-wide">
                        <th className="text-left py-2.5 px-4 font-medium">Date</th>
                        <th className="text-left py-2.5 px-4 font-medium">Description</th>
                        <th className="text-left py-2.5 px-4 font-medium">Type</th>
                        <th className="text-right py-2.5 px-4 font-medium text-emerald-600">Money In</th>
                        <th className="text-right py-2.5 px-4 font-medium text-red-500">Money Out</th>
                        <th className="text-right py-2.5 px-4 font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row, i) => (
                        <tr key={i} className={`border-b border-border/30 last:border-0 ${i % 2 === 0 ? "" : "bg-background/30"}`}>
                          <td className="py-2.5 px-4 text-text-secondary whitespace-nowrap">{formatDate(row.entry_date, "dd MMM yy")}</td>
                          <td className="py-2.5 px-4 text-text-primary max-w-[260px] truncate">{row.description}</td>
                          <td className="py-2.5 px-4"><RefBadge type={row.reference_type} /></td>
                          <td className="py-2.5 px-4 text-right font-mono text-emerald-600 font-medium">
                            {parseFloat(row.money_in) > 0 ? formatRWF(row.money_in) : <span className="text-text-secondary/40">—</span>}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-red-500 font-medium">
                            {parseFloat(row.money_out) > 0 ? formatRWF(row.money_out) : <span className="text-text-secondary/40">—</span>}
                          </td>
                          <td className={`py-2.5 px-4 text-right font-mono font-semibold ${parseFloat(row.running_balance) >= 0 ? "text-text-primary" : "text-red-600"}`}>
                            {formatRWF(row.running_balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Trial Balance Tab ──────────────────────────────────────────────────────────
function TrialBalanceTab({ dateRange }) {
  const [rows, setRows]               = useState([]);
  const [grandDebit, setGrandDebit]   = useState(0);
  const [grandCredit, setGrandCredit] = useState(0);
  const [balanced, setBalanced]       = useState(true);
  const [loading, setLoading]         = useState(false);
  const [asOf, setAsOf]               = useState(dateRange.end_date || "");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/books/trial-balance", { params: asOf ? { as_of_date: asOf } : {} });
      setRows(r.data.rows || []);
      setGrandDebit(r.data.grandDebit || 0);
      setGrandCredit(r.data.grandCredit || 0);
      setBalanced(r.data.balanced ?? true);
    } catch { toast.error("Failed to load trial balance"); }
    finally { setLoading(false); }
  }, [asOf]);

  useEffect(() => { load(); }, [load]);

  async function exportFile(format) {
    try {
      const r = await api.get(`/books/trial-balance?export=${format}${asOf ? `&as_of_date=${asOf}` : ""}`, { responseType: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(r.data);
      a.download = `trial-balance.${format === "excel" ? "xlsx" : "pdf"}`;
      a.click();
    } catch { toast.error("Export failed"); }
  }

  const grouped = rows.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  const typeOrder = ["Asset", "Liability", "Equity", "Revenue", "Expense"];

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[13px] text-text-secondary font-medium">As of date:</label>
          <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)}
            className="h-9 px-3 border border-border rounded-lg text-[14px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="flex items-center gap-3">
          {!loading && rows.length > 0 && (
            <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full ${
              balanced
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}>
              {balanced ? "✓ Balanced" : "⚠ Out of Balance"}
            </span>
          )}
          <ExportBtn onExport={exportFile} />
        </div>
      </div>

      {!balanced && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-700">
          <strong>Books are not balanced.</strong> Debit total ({formatRWF(grandDebit)}) ≠ Credit total ({formatRWF(grandCredit)}).
          Difference: {formatRWF(Math.abs(grandDebit - grandCredit))}. Check for missing journal entries.
        </div>
      )}

      {loading ? <Skeleton rows={10} /> : rows.length === 0 ? (
        <EmptyState icon={Scale} text="No transactions recorded yet. Record sales and expenses to populate the trial balance." />
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-background/60 border-b-2 border-border text-[11px] text-text-secondary uppercase tracking-wide">
                  <th className="text-left py-3 px-4 font-medium w-24">Code</th>
                  <th className="text-left py-3 px-4 font-medium">Account Name</th>
                  <th className="text-left py-3 px-4 font-medium w-28">Type</th>
                  <th className="text-right py-3 px-4 font-medium w-40 text-emerald-600">Debit (RWF)</th>
                  <th className="text-right py-3 px-4 font-medium w-40 text-red-500">Credit (RWF)</th>
                </tr>
              </thead>
              <tbody>
                {typeOrder.filter(t => grouped[t]).map(type => (
                  <Fragment key={type}>
                    <tr className="bg-background border-y border-border/50">
                      <td colSpan={5} className="py-2 px-4">
                        <TypeBadge type={type} />
                        <span className="ml-2 text-[11px] font-semibold text-text-secondary uppercase tracking-wide">
                          {type}s
                        </span>
                      </td>
                    </tr>
                    {grouped[type].map((r, i) => (
                      <tr key={`${type}-${i}`} className={`border-b border-border/20 hover:bg-background/50 transition-colors ${i % 2 === 0 ? "" : "bg-background/20"}`}>
                        <td className="py-2.5 px-4 font-mono text-[12px] text-text-secondary">{r.code}</td>
                        <td className="py-2.5 px-4 text-text-primary">{r.name}</td>
                        <td className="py-2.5 px-4"><TypeBadge type={r.type} /></td>
                        <td className="py-2.5 px-4 text-right font-mono text-emerald-600 font-medium">
                          {parseFloat(r.total_debit) > 0 ? formatRWF(r.total_debit) : <span className="text-text-secondary/40">—</span>}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-red-500 font-medium">
                          {parseFloat(r.total_credit) > 0 ? formatRWF(r.total_credit) : <span className="text-text-secondary/40">—</span>}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-primary/5">
                  <td colSpan={3} className="py-3.5 px-4 font-bold text-[14px] text-text-primary">GRAND TOTAL</td>
                  <td className="py-3.5 px-4 text-right font-bold font-mono text-emerald-600 text-[15px]">{formatRWF(grandDebit)}</td>
                  <td className="py-3.5 px-4 text-right font-bold font-mono text-red-500 text-[15px]">{formatRWF(grandCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FinancialBooks() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("journal");
  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate]     = useState(today);

  const dateRange = { start_date: startDate, end_date: endDate };

  const QUICK = [
    { label: "This Month", start: monthStart, end: today },
    { label: "This Year",  start: `${new Date().getFullYear()}-01-01`, end: today },
    { label: "All Time",   start: "2020-01-01", end: today },
  ];

  return (
    <PageWrapper
      title={t("financial_books") || "Financial Books"}
      subtitle={t("financial_books_sub") || "Auto-generated journal, cash book & trial balance"}
      breadcrumbs={[
        { label: t("finance") || "Finance", path: "/app/finance/pnl" },
        { label: t("financial_books") || "Books", path: "/app/books" },
      ]}
    >
      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-surface border border-border rounded-xl">
        <label className="text-[13px] text-text-secondary font-medium">Period:</label>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
          className="h-8 px-2.5 border border-border rounded-lg text-[13px] bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
        <span className="text-text-secondary text-[13px]">—</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
          className="h-8 px-2.5 border border-border rounded-lg text-[13px] bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
        <div className="flex gap-1.5 ml-1">
          {QUICK.map(q => (
            <button key={q.label}
              onClick={() => { setStartDate(q.start); setEndDate(q.end); }}
              className={`px-2.5 py-1 text-[12px] rounded-md border transition-colors ${
                startDate === q.start && endDate === q.end
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border text-text-secondary hover:border-primary hover:text-primary"
              }`}>
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-border mb-6">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-[14px] font-medium border-b-2 transition-all ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary hover:border-border"
            }`}>
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <Card className="p-5">
        {activeTab === "journal"       && <JournalTab      dateRange={dateRange} />}
        {activeTab === "ledger"        && <LedgerTab       dateRange={dateRange} />}
        {activeTab === "cashbook"      && <CashBookTab     dateRange={dateRange} />}
        {activeTab === "trial-balance" && <TrialBalanceTab dateRange={dateRange} />}
      </Card>
    </PageWrapper>
  );
}
