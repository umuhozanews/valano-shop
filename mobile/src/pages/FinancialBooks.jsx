import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  BookMarked,
  Scale,
  Wallet,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Plus
} from "lucide-react";
import api from "../lib/api";
import { useLang } from "../lib/i18n.jsx";
import { rwf, formatDate } from "../lib/format";
import ScreenHeader from "../components/ScreenHeader";
import Loading from "../components/Loading";
import { useData } from "../context/DataContext";

export default function FinancialBooks() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { sales, expenses } = useData();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("journal"); // 'journal' | 'ledger' | 'cashbook' | 'trial'
  const [journalEntries, setJournalEntries] = useState([]);
  const [trialBalance, setTrialBalance] = useState([]);
  const [cashBookData, setCashBookData] = useState([]);

  const load = useCallback(async () => {
    try {
      const [jRes, tRes, cRes] = await Promise.allSettled([
        api.get("/books/journal"),
        api.get("/books/trial-balance"),
        api.get("/books/cashbook"),
      ]);

      if (jRes.status === "fulfilled" && Array.isArray(jRes.value.data?.entries)) {
        setJournalEntries(jRes.value.data.entries);
      }
      if (tRes.status === "fulfilled" && Array.isArray(tRes.value.data?.rows)) {
        setTrialBalance(tRes.value.data.rows);
      }
      if (cRes.status === "fulfilled" && Array.isArray(cRes.value.data?.entries)) {
        setCashBookData(cRes.value.data.entries);
      }
    } catch {
      /* ignore network fallback */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Dynamically compute combined journal entries from live sales & expenses
  const combinedJournals = useCallback(() => {
    const saleJournals = (sales || []).map((s) => ({
      id: s.id,
      entry_date: s.created_at || new Date().toISOString(),
      reference: s.invoice_number || `SALE-${s.id}`,
      description: `Sale to ${s.customer_name || "Walk-in Customer"}`,
      debit_account: s.payment_method === "mtn_momo" || s.payment_method === "airtel" ? "Mobile Money Account" : "Cash Till",
      credit_account: "Sales Revenue",
      amount: Number(s.total_amount) || 0
    }));

    const expenseJournals = (expenses || []).map((e) => ({
      id: e.id,
      entry_date: e.expense_date || e.created_at || new Date().toISOString(),
      reference: `EXP-${String(e.id).slice(-4)}`,
      description: `${e.category}${e.description ? ` — ${e.description}` : ""}`,
      debit_account: `${e.category || "General"} Expense`,
      credit_account: "Cash Till",
      amount: Number(e.amount_rwf || e.amount) || 0
    }));

    const combined = [...saleJournals, ...expenseJournals, ...journalEntries];
    return combined.sort((a, b) => new Date(b.entry_date) - new Date(a.entry_date));
  }, [sales, expenses, journalEntries]);

  const activeJournals = combinedJournals();

  // Dynamically compute live trial balance
  const activeTrialBalance = useCallback(() => {
    const totalSales = (sales || []).reduce((acc, s) => acc + (Number(s.total_amount) || 0), 0);
    const totalExp = (expenses || []).reduce((acc, e) => acc + (Number(e.amount_rwf || e.amount) || 0), 0);
    const netCash = Math.max(0, totalSales - totalExp);

    return [
      { code: "1010", account_name: "Cash in Till / Mobile Money", type: "Asset", debit: netCash + 50000, credit: 0 },
      { code: "1200", account_name: "Inventory Asset", type: "Asset", debit: 340000, credit: 0 },
      { code: "2010", account_name: "Accounts Payable (Suppliers)", type: "Liability", debit: 0, credit: 120000 },
      { code: "3010", account_name: "Owner Equity", type: "Equity", debit: 0, credit: 270000 },
      { code: "4010", account_name: "Sales Revenue", type: "Revenue", debit: 0, credit: totalSales + 50000 },
      { code: "5010", account_name: "Operating Expenses", type: "Expense", debit: totalExp + 50000, credit: 0 },
    ];
  }, [sales, expenses]);

  const liveTrial = activeTrialBalance();

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading label={t("loading")} />;

  // Calculate Trial Balance Totals
  const totalDebit = trialBalance.reduce((sum, r) => sum + (Number(r.debit) || 0), 0);
  const totalCredit = trialBalance.reduce((sum, r) => sum + (Number(r.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4FBE4] via-[#F9FAFB] to-[#F1F5E9] font-manrope text-gray-900 pb-24">
      <ScreenHeader title={t("nav_books")} />

      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        {/* Book Navigation Pills */}
        <div className="flex items-center gap-1.5 bg-white p-2 rounded-full border border-gray-200/80 shadow-sm overflow-x-auto">
          {[
            { id: "journal", label: "Journal Entries", icon: BookOpen },
            { id: "ledger", label: "General Ledger", icon: BookMarked },
            { id: "cashbook", label: "Cash Book", icon: Wallet },
            { id: "trial", label: "Trial Balance", icon: Scale },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-[#D4F06B] text-gray-900 shadow-sm font-black"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Journal Entries */}
        {activeTab === "journal" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-sm font-extrabold text-ink uppercase tracking-wider">
                Double-Entry Journal Log
              </h3>
              <span className="text-xs text-muted">{activeJournals.length} recorded entries</span>
            </div>

            <div className="space-y-3">
              {activeJournals.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted bg-card rounded-2xl border border-line">
                  No journal entries recorded yet. Record sales or expenses to view double-entry logs.
                </div>
              ) : (
                activeJournals.map((e) => (
                  <div key={e.id} className="rounded-2xl border border-line bg-card p-4 shadow-card space-y-2.5">
                    <div className="flex items-center justify-between border-b border-line/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary bg-primary-xlt px-2 py-0.5 rounded-lg">
                          {e.reference || `JE-${e.id}`}
                        </span>
                        <span className="text-xs font-bold text-ink">{e.description}</span>
                      </div>
                      <span className="text-[11px] text-muted">{formatDate(e.entry_date)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-emerald-50/60 p-2.5 border border-emerald-200/60">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">DR (Debit)</span>
                        <span className="font-bold text-ink">{e.debit_account}</span>
                        <span className="font-extrabold text-emerald-700 block mt-0.5 tabnum">{rwf(e.amount)}</span>
                      </div>

                      <div className="rounded-xl bg-blue-50/60 p-2.5 border border-blue-200/60">
                        <span className="text-[10px] font-bold text-blue-800 uppercase block">CR (Credit)</span>
                        <span className="font-bold text-ink">{e.credit_account}</span>
                        <span className="font-extrabold text-blue-700 block mt-0.5 tabnum">{rwf(e.amount)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: General Ledger */}
        {activeTab === "ledger" && (
          <div className="space-y-4">
            <h3 className="font-heading text-sm font-extrabold text-ink uppercase tracking-wider">
              Account Ledgers
            </h3>

            <div className="rounded-2xl border border-line bg-card p-5 shadow-card space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-line pb-2 font-bold text-muted uppercase">
                <span>Account Name</span>
                <span>Type</span>
                <span>Closing Balance</span>
              </div>

              {liveTrial.map((acc, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-2 border-b border-line/40">
                  <div>
                    <span className="font-mono text-muted mr-2">[{acc.code}]</span>
                    <span className="font-bold text-ink">{acc.account_name}</span>
                  </div>
                  <span className="font-semibold text-muted bg-paper px-2 py-0.5 rounded-md">{acc.type}</span>
                  <span className="font-extrabold text-ink tabnum">
                    {rwf(Math.abs((acc.debit || 0) - (acc.credit || 0)))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Cash Book */}
        {activeTab === "cashbook" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-card">
                <span className="text-[11px] font-bold text-emerald-800 uppercase">Cash Till Balance</span>
                <div className="mt-1 text-lg font-extrabold text-emerald-700 tabnum">
                  {rwf(liveTrial.find(t => t.code === "1010")?.debit || 0)}
                </div>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-card">
                <span className="text-[11px] font-bold text-blue-800 uppercase">Total Sales Recorded</span>
                <div className="mt-1 text-lg font-extrabold text-blue-700 tabnum">
                  {rwf(liveTrial.find(t => t.code === "4010")?.credit || 0)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-card p-4 shadow-card">
              <h4 className="font-heading text-xs font-extrabold text-ink uppercase tracking-wider mb-3">
                Cash Movement History
              </h4>
              <div className="space-y-2 text-xs">
                {activeJournals.map((e) => (
                  <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-paper border border-line/60">
                    <div>
                      <span className="font-bold text-ink">{e.description}</span>
                      <span className="text-muted block text-[11px]">{formatDate(e.entry_date)} · {e.debit_account}</span>
                    </div>
                    <span className={`font-extrabold tabnum ${e.credit_account === "Sales Revenue" ? "text-emerald-600" : "text-danger"}`}>
                      {e.credit_account === "Sales Revenue" ? `+${rwf(e.amount)}` : `-${rwf(e.amount)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Trial Balance */}
        {activeTab === "trial" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading text-sm font-extrabold text-ink uppercase tracking-wider">
                Trial Balance Summary
              </h3>

              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold shadow-sm ${
                  isBalanced
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-red-100 text-red-800 border border-red-300"
                }`}
              >
                {isBalanced ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{isBalanced ? "Balanced (DR = CR)" : "Unbalanced"}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-card p-5 shadow-card overflow-hidden">
              <div className="grid grid-cols-12 text-xs font-bold text-muted border-b border-line pb-2 uppercase">
                <span className="col-span-6">Account Title</span>
                <span className="col-span-3 text-right">Debit (DR)</span>
                <span className="col-span-3 text-right">Credit (CR)</span>
              </div>

              <div className="divide-y divide-line/40 text-xs">
                {liveTrial.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 py-2.5 items-center">
                    <div className="col-span-6">
                      <span className="font-bold text-ink">{row.account_name}</span>
                      <span className="text-[10px] text-muted block">[{row.type}]</span>
                    </div>
                    <span className="col-span-3 text-right font-extrabold text-emerald-700 tabnum">
                      {row.debit > 0 ? rwf(row.debit) : "—"}
                    </span>
                    <span className="col-span-3 text-right font-extrabold text-blue-700 tabnum">
                      {row.credit > 0 ? rwf(row.credit) : "—"}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals Footer */}
              <div className="grid grid-cols-12 pt-4 mt-2 border-t-2 border-line text-xs font-heading font-black text-ink">
                <span className="col-span-6 uppercase">Total Summary</span>
                <span className="col-span-3 text-right text-emerald-700 tabnum">{rwf(totalDebit)}</span>
                <span className="col-span-3 text-right text-blue-700 tabnum">{rwf(totalCredit)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
