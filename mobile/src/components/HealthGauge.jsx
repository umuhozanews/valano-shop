// Circular gauge for the Business Health Score. Colour follows the score band.
export default function HealthGauge({ score = 0, size = 132, label }) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const has = typeof score === "number" && !Number.isNaN(score);
  const pct = has ? Math.max(0, Math.min(100, score)) / 100 : 0;
  const bandColor = !has ? "#8A8272" : score >= 65 ? "#2F8F6E" : score >= 40 ? "#E8A33D" : "#C24B3D";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E3DDC9" strokeWidth="10" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={bandColor}
          strokeWidth="10"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="font-heading text-[28px] font-extrabold leading-none tabnum text-ink"
          style={{ fontSize: size * 0.22 }}
        >
          {has ? score : "—"}
        </span>
        {label && (
          <span className="mt-0.5 text-[10px] font-semibold" style={{ color: bandColor }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
