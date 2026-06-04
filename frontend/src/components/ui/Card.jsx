export default function Card({ title, subtitle, children, action, className = "" }) {
  return (
    <div
      className={`bg-surface border border-border rounded-card p-6 ${className}`}
    >
      {(title || action) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-[18px] font-semibold text-text-primary leading-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-[13px] text-text-secondary mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="ml-4 shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
