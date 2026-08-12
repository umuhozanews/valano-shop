import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({ label, value, sub, tone }) {
  const color = tone === "up" ? "text-success" : tone === "down" ? "text-danger" : "text-ink";
  return (
    <div className="flex-1 rounded-xl border border-line bg-card p-3 shadow-card">
      <span className="font-body text-[10.5px] font-semibold text-muted">{label}</span>
      <div className="mt-1 font-heading text-[15px] font-extrabold tabnum text-ink">{value}</div>
      {sub && (
        <div className="mt-0.5 flex items-center gap-0.5">
          {tone === "up" ? (
            <TrendingUp size={11} className="text-success" />
          ) : tone === "down" ? (
            <TrendingDown size={11} className="text-danger" />
          ) : null}
          <span className={`text-[10px] font-semibold ${color}`}>{sub}</span>
        </div>
      )}
    </div>
  );
}
