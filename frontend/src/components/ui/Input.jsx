export default function Input({
  label,
  placeholder,
  icon: Icon,
  error,
  hint,
  className = "",
  ...props
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[13px] font-medium text-text-primary">{label}</label>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
            <Icon size={15} />
          </span>
        )}
        <input
          placeholder={placeholder}
          className={`
            w-full h-9 border border-border rounded-card bg-surface
            text-[14px] text-text-primary placeholder:text-text-secondary
            px-3 ${Icon ? "pl-9" : ""}
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
            disabled:opacity-50 disabled:bg-background
            ${error ? "border-danger focus:ring-danger" : ""}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <p className="text-[12px] text-danger">{error}</p>}
      {hint && !error && <p className="text-[12px] text-text-secondary">{hint}</p>}
    </div>
  );
}
