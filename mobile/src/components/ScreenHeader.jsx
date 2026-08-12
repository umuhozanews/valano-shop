import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import OfflineBadge from "./OfflineBadge";

// Compact per-screen header with an optional back button and right-side slot.
export default function ScreenHeader({ title, back, right }) {
  const navigate = useNavigate();
  return (
    <div
      className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-paper/95 px-4 pb-3 pt-3 backdrop-blur"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
    >
      <div className="flex items-center gap-2">
        {back && (
          <button onClick={() => navigate(-1)} aria-label="Back" className="-ml-1 p-1">
            <ArrowLeft size={20} className="text-ink" />
          </button>
        )}
        <span className="font-heading text-[18px] font-bold text-ink">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {right}
        <OfflineBadge />
      </div>
    </div>
  );
}
