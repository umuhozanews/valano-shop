import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useLang } from "../lib/i18n.jsx";

// Offline-aware: an amber OFFLINE badge appears whenever there's no signal.
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

export default function OfflineBadge() {
  const online = useOnline();
  const { t } = useLang();
  if (online) return <Wifi size={15} strokeWidth={2.4} className="text-muted" />;
  return (
    <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-[#3A2A0A]">
      <WifiOff size={11} strokeWidth={2.6} /> {t("offline")}
    </span>
  );
}
