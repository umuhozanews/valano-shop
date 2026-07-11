import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({ title, value, trend, trendLabel, icon: Icon, color = "primary" }) {
  const isPositive = trend >= 0;

  return (
    <div className="bg-surface border border-border rounded-card p-6 relative overflow-hidden">
      {Icon && (
        <div
          className={`absolute top-4 right-4 p-2 rounded-card bg-${color}/10`}
        >
          <Icon size={20} className={`text-${color}`} />
        </div>
      )}
      <p className="text-[14px] font-medium text-text-secondary mb-2">{title}</p>
      <p className="text-[26px] font-bold text-text-primary leading-none mb-3">{value}</p>
      {trend != null && (
        <div className="flex items-center gap-1.5">
          {isPositive ? (
            <TrendingUp size={13} className="text-success" />
          ) : (
            <TrendingDown size={13} className="text-danger" />
          )}
          <span
            className={`text-[13px] font-semibold ${isPositive ? "text-success" : "text-danger"}`}
          >
            {isPositive ? "+" : ""}
            {trend}%
          </span>
          {trendLabel && (
            <span className="text-[13px] text-text-secondary">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
