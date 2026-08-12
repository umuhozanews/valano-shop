import { useEffect } from "react";
import { X } from "lucide-react";

// Bottom sheet — the primary way to add/confirm on mobile. Big tap targets,
// dismiss by tapping the backdrop or the close button.
export default function Sheet({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="relative mx-auto w-full max-w-[480px] rounded-t-[24px] bg-card db-rise">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <span className="font-heading text-[17px] font-bold text-ink">{title}</span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-paper text-muted"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 pb-2">{children}</div>
        {footer && (
          <div
            className="border-t border-line px-5 pt-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
