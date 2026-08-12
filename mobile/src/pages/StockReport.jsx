import { useState, useEffect } from "react";
import { Package, AlertCircle, CheckCircle2 } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import Loading from "../components/Loading";
import { StorageEngine } from "../lib/storage";
import { rwf } from "../lib/format";

export default function StockReport() {
  const [loading, setLoading] = useState(true);
  const [stock, setStock] = useState([]);

  useEffect(() => {
    setStock(StorageEngine.getStock());
    setLoading(false);
  }, []);

  if (loading) return <Loading label="Loading Stock Valuation Report..." />;

  const totalItems = stock.length;
  const outOfStock = stock.filter(i => Number(i.quantity) <= 0).length;
  const lowStock = stock.filter(i => Number(i.quantity) > 0 && Number(i.quantity) <= Number(i.low_stock_threshold || 5)).length;

  const totalRetailVal = stock.reduce((s, i) => s + (Number(i.quantity) * Number(i.sell_price_rwf || 0)), 0);
  const totalCostVal = stock.reduce((s, i) => s + (Number(i.quantity) * Number(i.cost_price_rwf || 0)), 0);

  return (
    <div className="flex h-full flex-col bg-bg">
      <ScreenHeader title="Stock Valuation Report" back />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Stock Valuation Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-600 to-orange-700 p-4 text-white shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider opacity-90">TOTAL INVENTORY RETAIL VALUATION</div>
          <div className="mt-2 text-[26px] font-extrabold tabnum">{rwf(totalRetailVal)} RWF</div>
          <div className="mt-2 text-[11px] border-t border-white/20 pt-2">
            Cost Base: <strong className="tabnum">{rwf(totalCostVal)} RWF</strong>
          </div>
        </div>

        {/* Stock Status Counters */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-line bg-card p-3 text-center shadow-xs">
            <div className="text-[18px] font-extrabold text-ink tabnum">{totalItems}</div>
            <div className="text-[10px] font-bold text-muted uppercase mt-0.5">Total Items</div>
          </div>
          <div className="rounded-xl border border-line bg-card p-3 text-center shadow-xs">
            <div className="text-[18px] font-extrabold text-amber-600 tabnum">{lowStock}</div>
            <div className="text-[10px] font-bold text-amber-700 uppercase mt-0.5">Low Stock</div>
          </div>
          <div className="rounded-xl border border-line bg-card p-3 text-center shadow-xs">
            <div className="text-[18px] font-extrabold text-red-600 tabnum">{outOfStock}</div>
            <div className="text-[10px] font-bold text-red-700 uppercase mt-0.5">Out of Stock</div>
          </div>
        </div>

        {/* Detailed Item List */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-muted uppercase tracking-wider">Inventory Breakdown</div>
          {stock.map(p => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-line bg-card p-3 shadow-xs">
              <div>
                <div className="text-[13px] font-bold text-ink">{p.name}</div>
                <div className="text-[10.5px] text-muted">{p.category || 'General'} • Cost: {rwf(p.cost_price_rwf)} RWF</div>
              </div>
              <div className="text-right">
                <div className="text-[13px] font-bold text-emerald-600 tabnum">{rwf(p.sell_price_rwf)} RWF</div>
                <div className="text-[10px] font-bold text-muted">Stock: <span className="text-ink">{p.quantity}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
