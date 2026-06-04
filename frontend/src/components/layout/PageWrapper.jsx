import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import api from "../../utils/api";

export default function PageWrapper({ title, subtitle, breadcrumbs, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api.get("/notifications")
       .then(d => setUnreadCount((d.data || []).filter(n => !n.is_read).length))
       .catch(() => {});
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
          {children}
        </main>
      </div>
    </div>
  );
}
