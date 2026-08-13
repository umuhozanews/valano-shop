// Shared UI components styled for Luminous Modern — Luminous Lime accents, rounded-full pills, Manrope font.

export function Button({ children, variant = "primary", full, className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-manrope font-extrabold text-xs sm:text-sm py-3.5 px-6 transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 shadow-sm cursor-pointer";
  
  const variants = {
    primary: "bg-[#D4F06B] text-gray-900 hover:bg-[#C5E456]",
    green: "bg-[#D4F06B] text-gray-900 hover:bg-[#C5E456]",
    dark: "bg-gray-900 text-white hover:bg-gray-800",
    purple: "bg-purple-600 text-white hover:bg-purple-700",
    ghost: "bg-gray-100 text-gray-800 border border-gray-200/80 hover:bg-gray-200/80",
    danger: "bg-red-500 text-white hover:bg-red-600",
  };

  return (
    <button className={`${base} ${variants[variant] || variants.primary} ${full ? "w-full" : ""} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Field({ label, children }) {
  return (
    <label className="mt-3 block font-manrope">
      {label && <span className="font-semibold text-[11px] text-gray-500">{label}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function TextInput({ className = "", ...props }) {
  return (
    <input
      className={`w-full rounded-full border border-gray-200 bg-white px-4 py-3 font-manrope text-xs font-medium text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#D4F06B] focus:ring-2 focus:ring-[#D4F06B]/30 transition ${className}`}
      {...props}
    />
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="flex rounded-full bg-gray-100 p-1.5 border border-gray-200/50 font-manrope">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-full py-2.5 text-xs font-bold transition-all duration-200 ${
            value === o.value
              ? "bg-[#D4F06B] text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
