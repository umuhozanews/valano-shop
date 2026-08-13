import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";
import OfflineBadge from "./OfflineBadge";
import NotificationDrawer from "./NotificationDrawer";

import Logomark from "./Logomark";

export default function ScreenHeader({ title, back, right }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);

  const showBack = back !== undefined ? back : location.pathname !== "/";

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <>
      <div
        className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-[#F4FBE4]/90 px-4 pb-3 pt-3 backdrop-blur-md border-b border-gray-200/60 select-none font-manrope"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}
      >
        <div className="flex items-center gap-2.5">
          {showBack ? (
            <button
              onClick={handleBack}
              aria-label="Back"
              className="-ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-800 hover:bg-gray-100 transition active:scale-95 cursor-pointer shadow-sm"
            >
              <ArrowLeft size={18} />
            </button>
          ) : (
            <Logomark size={32} className="shadow-sm border border-gray-200/80" />
          )}
          <span className="font-manrope text-[18px] font-extrabold text-gray-900">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {right}
          <button
            onClick={() => setNotifOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm hover:bg-gray-100 active:scale-95 transition cursor-pointer"
            aria-label="Alerts & Notifications"
          >
            <Bell size={17} className="text-gray-800" />
          </button>
          <OfflineBadge />
        </div>
      </div>

      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}
