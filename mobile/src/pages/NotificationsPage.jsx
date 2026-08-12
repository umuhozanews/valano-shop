import { Bell, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import ScreenHeader from "../components/ScreenHeader";

export default function NotificationsPage() {
  const alerts = [
    { id: 1, title: "DataBridge System Online", text: "All core modules (Sales, Stock, Invoices, Expenses, Suppliers) operating cleanly.", time: "Just now", type: "success" },
    { id: 2, title: "Low Stock Alert", text: "Slim Fit Chinos (Khaki, Size 32) quantity dropped to 3 items.", time: "1 hour ago", type: "warning" },
    { id: 3, title: "Backup Sync Complete", text: "Local storage state synchronized with Cloudflare Pages infrastructure.", time: "Today, 08:30", type: "info" }
  ];

  return (
    <div className="flex h-full flex-col bg-bg">
      <ScreenHeader title="Notifications & System Alerts" back />

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {alerts.map(a => (
          <div key={a.id} className="rounded-xl border border-line bg-card p-3.5 shadow-xs flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${a.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
              {a.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            </div>
            <div>
              <div className="text-[13px] font-bold text-ink">{a.title}</div>
              <div className="text-[11.5px] text-muted mt-0.5">{a.text}</div>
              <div className="text-[10px] font-semibold text-primary mt-1.5">{a.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
