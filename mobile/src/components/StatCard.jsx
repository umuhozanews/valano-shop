import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatCard({ label, value, sub, tone, onClick }) {
  const color = tone === "up" ? "text-emerald-600" : tone === "down" ? "text-red-500" : "text-gray-900";
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={`flex-1 rounded-[28px] border border-gray-200/80 bg-white p-4 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] text-left font-manrope transition-all duration-200 ${
        onClick
          ? "hover:border-[#D4F06B] hover:shadow-md cursor-pointer active:scale-95 group"
          : ""
      }`}
    >
      <span className="font-manrope text-[11px] font-bold text-gray-400 uppercase tracking-wider group-hover:text-purple-600 transition">
        {label}
      </span>
      <div className="mt-1 font-manrope text-base md:text-lg font-black tabnum text-gray-900">
        {value}
      </div>
      {sub && (
        <div className="mt-1 flex items-center gap-1">
          {tone === "up" ? (
            <TrendingUp size={12} className="text-emerald-600" />
          ) : tone === "down" ? (
            <TrendingDown size={12} className="text-red-500" />
          ) : null}
          <span className={`text-[11px] font-extrabold ${color}`}>{sub}</span>
        </div>
      )}
    </Tag>
  );
}
