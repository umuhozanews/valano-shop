import { ImageOff } from "lucide-react";

export function SectionHeading({ title, action, subtitle }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-bold tracking-tight text-store-fg">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-store-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Chip({ active, children, ...props }) {
  return (
    <button
      type="button"
      className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
        active
          ? "bg-store-brand text-store-brand-fg shadow-sm"
          : "border border-store-line bg-store-card text-store-fg/75 hover:border-store-brand/40 hover:text-store-brand"
      }`}
      {...props}
    >
      {children}
    </button>
  );
}

export function EmptyState({ icon = "📦", title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-store-line bg-store-soft px-6 py-20 text-center">
      <span className="text-5xl">{icon}</span>
      <p className="mt-4 text-base font-semibold text-store-fg">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-store-muted">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// Shops often add items before they add photos, so a missing image still needs to
// look deliberate rather than broken.
export function ProductImage({ src, alt, className = "" }) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-store-soft text-store-muted ${className}`}
        aria-hidden="true"
      >
        <ImageOff size={28} strokeWidth={1.5} />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" className={className} />;
}

export function StoreSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 pt-6 md:px-6">
      <div className="h-[380px] rounded-3xl bg-store-soft" />
      <div className="mt-8 flex gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-9 w-24 rounded-full bg-store-soft" />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-72 rounded-2xl bg-store-soft" />
        ))}
      </div>
    </div>
  );
}
