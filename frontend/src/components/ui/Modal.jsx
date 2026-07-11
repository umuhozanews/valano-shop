import { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.20)" }}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        className="bg-surface rounded-card w-full max-w-lg shadow-modal flex flex-col max-h-[90vh]"
        style={{ backdropFilter: "blur(10px)" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="text-[20px] font-semibold text-text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors p-1 rounded"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

        {footer && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
