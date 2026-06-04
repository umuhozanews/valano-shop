import { Loader2 } from "lucide-react";

const base =
  "inline-flex items-center justify-center gap-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none rounded-btn";

const variants = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  secondary: "bg-surface text-text-primary border border-border hover:bg-background",
  danger: "bg-danger text-white hover:bg-red-600",
  ghost: "text-text-secondary hover:text-text-primary hover:bg-background",
};

const sizes = {
  sm: "h-7 px-3 text-[13px]",
  md: "h-9 px-4 text-[14px]",
  lg: "h-11 px-6 text-[15px]",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon: Icon,
  children,
  className = "",
  ...props
}) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        Icon && <Icon size={14} />
      )}
      {children}
    </button>
  );
}
