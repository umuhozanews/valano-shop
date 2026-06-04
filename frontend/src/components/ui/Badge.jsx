const config = {
  success: { dot: "bg-success", text: "text-success", bg: "bg-success/10" },
  warning: { dot: "bg-warning", text: "text-warning", bg: "bg-warning/10" },
  danger: { dot: "bg-danger", text: "text-danger", bg: "bg-danger/10" },
  neutral: { dot: "bg-neutral", text: "text-neutral", bg: "bg-neutral/10" },
};

export default function Badge({ status = "neutral", label }) {
  const c = config[status] || config.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-badge text-[11px] font-semibold uppercase tracking-wide ${c.bg} ${c.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {label}
    </span>
  );
}
