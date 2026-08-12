// Small form + button primitives shared across screens. Large, thumb-friendly.

export function Button({ children, variant = "primary", full, className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-xl font-heading font-bold text-[14.5px] py-3.5 px-5 transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100";
  const variants = {
    primary: "bg-accent text-[#3A2A0A]",
    green: "bg-primary text-white",
    ghost: "bg-paper text-ink border border-line",
    danger: "bg-danger text-white",
  };
  return (
    <button className={`${base} ${variants[variant]} ${full ? "w-full" : ""} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Field({ label, children }) {
  return (
    <label className="mt-3 block">
      {label && <span className="font-body text-[11.5px] font-semibold text-ink">{label}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function TextInput({ className = "", ...props }) {
  return (
    <input
      className={`w-full rounded-xl border-[1.5px] border-line bg-paper px-3.5 py-3 font-body text-[15px] text-ink outline-none placeholder:text-muted focus:border-primary ${className}`}
      {...props}
    />
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="flex rounded-xl bg-paper p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition ${
            value === o.value ? "bg-card text-ink shadow-card" : "text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
