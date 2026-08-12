import { useState, useEffect } from "react";
import { BookOpen, ArrowUpRight, ArrowDownLeft, DollarSign, Wallet } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import Loading from "../components/Loading";
import { StorageEngine } from "../lib/storage";
import { rwf } from "../lib/format";

export default function FinancialBooks() {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [stock, setStock] = useState([]);

  useEffect(() => {
    setSales(StorageEngine.getSales());
    setExpenses(StorageEngine.getExpenses());
    setStock(StorageEngine.getStock());
    setLoading(false);
  }, []);

  if (loading) return <Loading label="Loading Financial Books & General Ledger..." />;

  const totalInflow = sales.filter(s => !s.is_voided).reduce((s, r) => s + Number(r.amount_paid || r.total_amount || 0), 0);
  const totalOutflow = expenses.reduce((s, r) => s + Number(r.amount || 0), 0);
  const netCashflow = totalInflow - totalOutflow;

  const stockRetailVal = stock.reduce((s, i) => s + (Number(i.quantity) * Number(i.sell_price_rwf || 0)), 0);
  const stockCostVal = stock.reduce((s, i) => s + (Number(i.quantity) * Number(i.cost_price_rwf || 0)), 0);

  return (
    <div className="flex h-full flex-col bg-bg">
      <ScreenHeader title="Financial Books & Ledger" back />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Net Cashflow Summary Card */}
        <div className="rounded-2xl bg-gradient-to-r from-primary to-[#2563EB] p-4 text-white shadow-sm">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider opacity-90">
            <span>NET CASHFLOW BALANCE</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9.5px]">GENERAL LEDGER</span>
          </div>
          <div className="mt-2 text-[26px] font-extrabold tabnum">{rwf(netCashflow)} RWF</div>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-white/20 pt-2 text-[11px]">
            <div>Total Inflow: <span className="font-extrabold text-emerald-300">+{rwf(totalInflow)}</span></div>
            <div>Total Outflow: <span className="font-extrabold text-red-200">-{rwf(totalOutflow)}</span></div>
          </div>
        </div>

        {/* Inventory Assets Valuation */}
        <div className="rounded-xl border border-line bg-card p-3 shadow-xs space-y-2">
          <div className="text-[12px] font-bold text-ink flex items-center gap-1.5">
            <BookOpen size={16} className="text-primary" /> Inventory Asset Valuation
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-line/60 text-[12px]">
            <div>
              <div className="text-[10.5px] text-muted">Retail Valuation</div>
              <div className="font-extrabold text-emerald-600 tabnum">{rwf(stockRetailVal)} RWF</div>
            </div>
            <div>
              <div className="text-[10.5px] text-muted">Cost Valuation Base</div>
              <div className="font-extrabold text-ink tabnum">{rwf(stockCostVal)} RWF</div>
            </div>
          </div>
        </div>

        {/* Recent Ledger Entries */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-muted uppercase tracking-wider">Recent Ledger Transactions</div>
          
          {sales.slice(0, 5).map(s => (
            <div key={`sale-${s.id}`} className="flex items-center justify-between rounded-xl border border-line bg-card p-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <ArrowUpRight size={16} />
                </div>
                <div>
                  <div className="text-[12.5px] font-bold text-ink">{s.customer_name}</div>
                  <div className="text-[10px] text-muted">{s.invoice_number} • Sale Inflow</div>
                </div>
              </div>
              <div className="text-right font-extrabold text-[13px] text-emerald-600 tabnum">
                +{rwf(s.amount_paid || s.total_amount)} RWF
              </div>
            </div>
          ))}

          {expenses.slice(0, 5).map(e => (
            <div key={`exp-${e.id}`} className="flex items-center justify-between rounded-xl border border-line bg-card p-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
                  <ArrowDownLeft size={16} />
                </div>
                <div>
                  <div className="text-[12.5px] font-bold text-ink">{e.category}</div>
                  <div className="text-[10px] text-muted">{e.expense_date} • Expense Outflow</div>
                </div>
              </div>
              <div className="text-right font-extrabold text-[13px] text-red-600 tabnum">
                -{rwf(e.amount)} RWF
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
