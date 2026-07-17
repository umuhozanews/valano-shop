import { useState, useEffect, useCallback } from "react";
import { BookOpen, List, Wallet, Scale, Download, FileText, ChevronDown } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

const TABS = [
  { id: "journal",       label: "Journal",        icon: List },
  { id: "ledger",        label: "Ledger",          icon: BookOpen },
  { id: "cashbook",      label: "Cash Book",       icon: Wallet },
  { id: "trial-balance", label: "Trial Balance",   icon: Scale },
];

const TYPE_COLOR = {
  Asset: "bg-blue-100 text-blue-700",
  Liability: "bg-red-100 text-red-700",
  Equity: "bg-purple-100 text-purple-700",
  Revenue: "bg-green-100 text-green-700",
  Expense: "bg-orange-100 text-orange-700",
};

function Badge({ type }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${TYPE_COLOR[type] || "bg-surface text-text-secondary"}`}>
      {type}
    </span>
  );
}

function ExportBtn({ onExport }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-card text-[13px] text-text-secondary hover:text-text-primary hover:border-primary transition-colors">
        <Download size={14} /> Export <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-card shadow-lg z-10 min-w-[110px]">
          <button onClick={() => { onExport("pdf"); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-[13px] hover:bg-background">
            <FileText size={13} /> PDF
          </button>
          <button onClick={() => { onExport("excel"); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-[13px] hover:bg-background">
            <Download size={13} /> Excel
          </button>
        </div>
      )}
    </div>
  );
}

// ── Journal Tab ───────────────────────────────────────────────────────────────
function JournalTab({ dateRange }) {
  const [data, setData]   = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage]   = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/books/journal", { params: { ...dateRange, page, limit: 30 } });
      setData(r.data.data);
      setTotal(r.data.total);
    } catch { toast.error("Failed to load journal"); }
    finally { setLoading(false); }
  }, [dateRange, page]);

  useEffect(() => { load(); }, [load]);

  async function exportFile(format) {
    try {
      const url = `/books/journal?export=${format}&${new URLSearchParams(dateRange)}`;
      const r = await api.get(url, { responseType: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(r.data);
      a.download = `journal.${format === "excel" ? "xlsx" : "pdf"}`;
      a.click();
    } catch { toast.error("Export failed"); }
  }

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[14px] text-text-secondary">{total} entries</p>
        <ExportBtn onExport={exportFile} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-surface rounded-card animate-pulse" />)}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p>No journal entries yet. They appear automatically as you record sales and expenses.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(entry => (
            <div key={entry.id} className="bg-surface border border-border rounded-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-background/50">
                <div>
                  <p className="text-[13px] font-semibold text-text-primary">{entry.description}</p>
                  <p className="text-[12px] text-text-secondary">{formatDate(entry.entry_date, "dd MMM yyyy")} · by {entry.created_by_name || "System"}</p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                  entry.reference_type === "sale" ? "bg-green-100 text-green-700" :
                  entry.reference_type === "expense" ? "bg-orange-100 text-orange-700" :
                  entry.reference_type === "sale_void" ? "bg-red-100 text-red-700" :
                  "bg-surface text-text-secondary"}`}>
                  {entry.reference_type?.replace(/_/g, " ") || "manual"}
                </span>
              </div>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-[11px] text-text-secondary uppercase tracking-wide">
                    <th className="text-left px-4 py-1.5 font-medium">Account</th>
                    <th className="text-right px-4 py-1.5 font-medium">Debit (RWF)</th>
                    <th className="text-right px-4 py-1.5 font-medium">Credit (RWF)</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.lines.map((line, i) => (
                    <tr key={i} className={i % 2 === 0 ? "" : "bg-background/30"}>
                      <td className="px-4 py-1.5 text-text-primary font-mono text-[12px]">
                        <span className="text-text-secondary mr-2">{line.code}</span>{line.account_name}
                      </td>
                      <td className="px-4 py-1.5 text-right font-mono text-success font-medium">
                        {line.debit > 0 ? formatRWF(line.debit) : "—"}
                      </td>
                      <td className="px-4 py-1.5 text-right font-mono text-danger font-medium">
                        {line.credit > 0 ? formatRWF(line.credit) : "—"}
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
            className="px-3 py-1.5 text-[13px] border border-border rounded-card disabled:opacity-40 hover:border-primary">
            Previous
          </button>
          <span className="text-[13px] text-text-secondary">Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-[13px] border border-border rounded-card disabled:opacity-40 hover:border-primary">
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// ── Ledger Tab ─────────────────────────────────────────────────────────────────
function LedgerTab({ dateRange }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [ledger, setLedger]   = useState([]);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/books/ledger").then(r => {
      setAccounts(r.data.accounts || []);
    }).catch(() => {});
  }, []);

  async function loadLedger(id) {
    if (!id) return;
    setSelectedId(id);
    setLoading(true);
    try {
      const r = await api.get("/books/ledger", { params: { account_id: id, ...dateRange } });
      setLedger(r.data.ledger || []);
      setAccount(r.data.account || null);
    } catch { toast.error("Failed to load ledger"); }
    finally { setLoading(false); }
  }

  async function exportFile(format) {
    if (!selectedId) return toast.error("Select an account first");
    try {
      const url = `/books/ledger?account_id=${selectedId}&export=${format}&${new URLSearchParams(dateRange)}`;
      const r = await api.get(url, { responseType: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(r.data);
      a.download = `ledger-${account?.code || selectedId}.${format === "excel" ? "xlsx" : "pdf"}`;
      a.click();
    } catch { toast.error("Export failed"); }
  }

  const openingBalance = 0;
  const closingBalance = ledger.length ? parseFloat(ledger[ledger.length - 1].running_balance) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select value={selectedId} onChange={e => loadLedger(e.target.value)}
          className="h-9 px-3 border border-border rounded-card text-[14px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary min-w-[240px]">
          <option value="">— Select Account —</option>
          {["Asset","Liability","Equity","Revenue","Expense"].map(type => (
            <optgroup key={type} label={type}>
              {accounts.filter(a => a.type === type).map(a => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <ExportBtn onExport={exportFile} />
      </div>

      {account && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Account", val: `${account.code} — ${account.name}` },
            { label: "Type",    val: account.type },
            { label: "Closing Balance", val: formatRWF(closingBalance) },
          ].map(({ label, val }) => (
            <div key={label} className="bg-surface border border-border rounded-card p-3">
              <p className="text-[12px] text-text-secondary mb-1">{label}</p>
              <p className="text-[15px] font-semibold text-text-primary">{val}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-surface rounded animate-pulse" />)}</div>
      ) : !selectedId ? (
        <div className="text-center py-16 text-text-secondary">
          <BookOpen size={36} className="mx-auto mb-3 opacity-30" />
          <p>Select an account to see its ledger.</p>
        </div>
      ) : ledger.length === 0 ? (
        <div className="text-center py-12 text-text-secondary">No transactions for this account in the selected period.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-[12px] text-text-secondary uppercase tracking-wide">
                <th className="text-left py-2 px-3 font-medium">Date</th>
                <th className="text-left py-2 px-3 font-medium">Description</th>
                <th className="text-right py-2 px-3 font-medium">Debit (RWF)</th>
                <th className="text-right py-2 px-3 font-medium">Credit (RWF)</th>
                <th className="text-right py-2 px-3 font-medium">Balance (RWF)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-background/50 text-text-secondary text-[12px]">
                <td colSpan={4} className="py-2 px-3 italic">Opening Balance</td>
                <td className="py-2 px-3 text-right font-mono">{formatRWF(openingBalance)}</td>
              </tr>
              {ledger.map((row, i) => (
                <tr key={i} className={`border-b border-border/30 ${i % 2 === 0 ? "" : "bg-background/30"}`}>
                  <td className="py-2 px-3 text-text-secondary whitespace-nowrap">{formatDate(row.entry_date, "dd MMM yy")}</td>
                  <td className="py-2 px-3 text-text-primary max-w-[280px] truncate">{row.description}</td>
                  <td className="py-2 px-3 text-right font-mono text-success">{row.debit > 0 ? formatRWF(row.debit) : "—"}</td>
                  <td className="py-2 px-3 text-right font-mono text-danger">{row.credit > 0 ? formatRWF(row.credit) : "—"}</td>
                  <td className="py-2 px-3 text-right font-mono font-semibold text-text-primary">{formatRWF(row.running_balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
      const url = `/books/cashbook?export=${format}&${new URLSearchParams(dateRange)}`;
      const r = await api.get(url, { responseType: "blob" });
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {totals.map(t => (
            <div key={t.code} className="bg-surface border border-border rounded-card px-4 py-2">
              <p className="text-[11px] text-text-secondary">{t.name}</p>
              <div className="flex gap-4 mt-1">
                <span className="text-[13px] text-success font-semibold">In: {formatRWF(t.total_in)}</span>
                <span className="text-[13px] text-danger font-semibold">Out: {formatRWF(t.total_out)}</span>
                <span className="text-[13px] text-text-primary font-bold">Net: {formatRWF(t.net)}</span>
              </div>
            </div>
          ))}
        </div>
        <ExportBtn onExport={exportFile} />
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-surface rounded animate-pulse" />)}</div>
      ) : cashbook.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <Wallet size={40} className="mx-auto mb-3 opacity-30" />
          <p>No cash transactions yet. Record sales or expenses to populate the cash book.</p>
        </div>
      ) : (
        Object.values(groupedByAccount).map(group => (
          <div key={group.code} className="space-y-1">
            <p className="text-[13px] font-bold text-text-primary px-1">
              {group.code} — {group.name}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border text-[12px] text-text-secondary uppercase tracking-wide">
                    <th className="text-left py-2 px-3 font-medium">Date</th>
                    <th className="text-left py-2 px-3 font-medium">Description</th>
                    <th className="text-left py-2 px-3 font-medium">Type</th>
                    <th className="text-right py-2 px-3 font-medium text-success">Money In</th>
                    <th className="text-right py-2 px-3 font-medium text-danger">Money Out</th>
                    <th className="text-right py-2 px-3 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row, i) => (
                    <tr key={i} className={`border-b border-border/30 ${i % 2 === 0 ? "" : "bg-background/30"}`}>
                      <td className="py-2 px-3 text-text-secondary whitespace-nowrap">{formatDate(row.entry_date, "dd MMM yy")}</td>
                      <td className="py-2 px-3 text-text-primary max-w-[260px] truncate">{row.description}</td>
                      <td className="py-2 px-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${
                          row.reference_type === "sale" ? "bg-green-100 text-green-700" :
                          row.reference_type === "expense" ? "bg-orange-100 text-orange-700" :
                          "bg-surface text-text-secondary"}`}>
                          {row.reference_type?.replace(/_/g, " ") || "—"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-success">{row.money_in > 0 ? formatRWF(row.money_in) : "—"}</td>
                      <td className="py-2 px-3 text-right font-mono text-danger">{row.money_out > 0 ? formatRWF(row.money_out) : "—"}</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">{formatRWF(row.running_balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
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
      const url = `/books/trial-balance?export=${format}${asOf ? `&as_of_date=${asOf}` : ""}`;
      const r = await api.get(url, { responseType: "blob" });
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[13px] text-text-secondary">As of date:</label>
          <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)}
            className="h-9 px-3 border border-border rounded-card text-[14px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <ExportBtn onExport={exportFile} />
      </div>

      {!balanced && (
        <div className="px-4 py-3 bg-danger/10 border border-danger/20 rounded-card text-[13px] text-danger font-medium">
          ⚠ Books are not balanced. Debit total ({formatRWF(grandDebit)}) ≠ Credit total ({formatRWF(grandCredit)}).
          This usually means some transactions are missing journal entries.
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(10)].map((_, i) => <div key={i} className="h-9 bg-surface rounded animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <Scale size={40} className="mx-auto mb-3 opacity-30" />
          <p>No transactions recorded yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b-2 border-border text-[12px] text-text-secondary uppercase tracking-wide">
                <th className="text-left py-2 px-3 font-medium">Code</th>
                <th className="text-left py-2 px-3 font-medium">Account Name</th>
                <th className="text-left py-2 px-3 font-medium">Type</th>
                <th className="text-right py-2 px-3 font-medium">Debit (RWF)</th>
                <th className="text-right py-2 px-3 font-medium">Credit (RWF)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([type, accs]) => (
                <>
                  <tr key={`hdr-${type}`} className="bg-background/80">
                    <td colSpan={5} className="py-2 px-3 font-bold text-[12px] uppercase tracking-wider text-text-secondary">
                      <Badge type={type} /> <span className="ml-2">{type}</span>
                    </td>
                  </tr>
                  {accs.map((r, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-background/40">
                      <td className="py-2 px-3 font-mono text-text-secondary">{r.code}</td>
                      <td className="py-2 px-3 text-text-primary">{r.name}</td>
                      <td className="py-2 px-3"><Badge type={r.type} /></td>
                      <td className="py-2 px-3 text-right font-mono text-success">{r.total_debit > 0 ? formatRWF(r.total_debit) : "—"}</td>
                      <td className="py-2 px-3 text-right font-mono text-danger">{r.total_credit > 0 ? formatRWF(r.total_credit) : "—"}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-primary/5">
                <td colSpan={3} className="py-3 px-3 font-bold text-[14px] text-text-primary">TOTALS</td>
                <td className="py-3 px-3 text-right font-bold font-mono text-success text-[14px]">{formatRWF(grandDebit)}</td>
                <td className="py-3 px-3 text-right font-bold font-mono text-danger text-[14px]">{formatRWF(grandCredit)}</td>
              </tr>
              <tr>
                <td colSpan={5} className="py-2 px-3 text-right text-[12px] text-text-secondary">
                  {balanced
                    ? "✓ Books are balanced"
                    : `⚠ Difference: ${formatRWF(Math.abs(grandDebit - grandCredit))}`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function FinancialBooks() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("journal");
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate]     = useState(today);

  const dateRange = { start_date: startDate, end_date: endDate };

  return (
    <PageWrapper
      title={t("financial_books") || "Financial Books"}
      subtitle={t("financial_books_sub") || "Auto-generated journal, ledger, cash book & trial balance"}
      breadcrumbs={[{ label: t("finance") || "Finance", path: "/app/finance/pnl" }, { label: t("financial_books") || "Books", path: "/app/books" }]}
    >
      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-[13px] text-text-secondary">From:</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="h-9 px-3 border border-border rounded-card text-[14px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[13px] text-text-secondary">To:</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="h-9 px-3 border border-border rounded-card text-[14px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        {[
          { label: "This Month", start: monthStart, end: today },
          { label: "This Year", start: `${new Date().getFullYear()}-01-01`, end: today },
          { label: "All Time", start: "2020-01-01", end: today },
        ].map(q => (
          <button key={q.label} onClick={() => { setStartDate(q.start); setEndDate(q.end); }}
            className="px-3 py-1.5 text-[13px] border border-border rounded-card hover:border-primary hover:text-primary transition-colors">
            {q.label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[14px] font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}>
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <Card>
        {activeTab === "journal"       && <JournalTab      dateRange={dateRange} />}
        {activeTab === "ledger"        && <LedgerTab       dateRange={dateRange} />}
        {activeTab === "cashbook"      && <CashBookTab     dateRange={dateRange} />}
        {activeTab === "trial-balance" && <TrialBalanceTab dateRange={dateRange} />}
      </Card>
    </PageWrapper>
  );
}
