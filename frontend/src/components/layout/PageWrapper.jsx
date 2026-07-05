import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import api from "../../utils/api";
import { AlertTriangle } from "lucide-react";

export default function PageWrapper({ title, subtitle, breadcrumbs, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // Only warn when a real backend was configured but is currently unreachable.
  // In normal local mode (no backend configured) data is persisted locally and
  // there is nothing to warn about.
  const [isMockActive, setIsMockActive] = useState(api.hasBackend && api.isMock);

  useEffect(() => {
    api.get("/notifications")
       .then(d => {
         setUnreadCount((d.data || []).filter(n => !n.is_read).length);
         setIsMockActive(api.hasBackend && api.isMock);
       })
       .catch(() => {
         setIsMockActive(api.hasBackend && api.isMock);
       });
  }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          title={title}
          subtitle={subtitle}
          breadcrumbs={breadcrumbs}
          notificationCount={unreadCount}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {isMockActive && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2.5 text-amber-800 text-[13px] shadow-sm animate-pulse">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <div>
                <span className="font-semibold">Offline Mode:</span> The backend server is unreachable. Showing locally-saved data — recent changes may not have synced.
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
