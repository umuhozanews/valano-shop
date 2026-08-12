import { ShieldCheck, UserCheck, Key, RefreshCw } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";
import { useAuth } from "../context/AuthContext";

export default function AuditLog() {
  const { user } = useAuth();
  const logs = [
    { id: 1, action: "USER_AUTHENTICATION", text: `User ${user?.email || 'rukundojosephtuyishime@gmail.com'} logged in successfully.`, time: "Just now", ip: "197.243.0.1" },
    { id: 2, action: "POS_SALE_RECORDED", text: "Sale POS transaction recorded — Invoice VL-2026-004.", time: "Today, 02:45", ip: "197.243.0.1" },
    { id: 3, action: "STOCK_UPDATE", text: "Inventory stock updated for Winter Puffer Jacket.", time: "Yesterday", ip: "197.243.0.1" }
  ];

  return (
    <div className="flex h-full flex-col bg-bg">
      <ScreenHeader title="Security Audit Log" back />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-[11px] font-bold text-muted uppercase tracking-wider">System Security Trail</div>
        {logs.map(l => (
          <div key={l.id} className="rounded-xl border border-line bg-card p-3 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-mono font-bold text-primary">[{l.action}]</span>
              <span className="text-muted">{l.time}</span>
            </div>
            <div className="text-[12.5px] font-bold text-ink">{l.text}</div>
            <div className="text-[10px] text-muted">IP Address: {l.ip}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
