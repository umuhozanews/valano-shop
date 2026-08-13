import { useState, useEffect } from "react";
import { Bell, Package, ShoppingCart, AlertTriangle, Users, Check, CheckCheck } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import api from "../../utils/api";
import { formatRelative } from "../../utils/formatters";
import toast from "react-hot-toast";

const TYPE_CONFIG = {
  low_stock:    { icon: AlertTriangle, color: "text-warning",  bg: "bg-warning/10"  },
  procurement:  { icon: Package,       color: "text-primary",  bg: "bg-primary/10"  },
  sale:         { icon: ShoppingCart,  color: "text-success",  bg: "bg-success/10"  },
  stock:        { icon: Package,       color: "text-primary",  bg: "bg-primary/10"  },
  worker:       { icon: Users,         color: "text-neutral",  bg: "bg-neutral/10"  },
};

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api.get("/notifications").then(d => setItems(d.data?.data || [])).finally(() => setLoading(false));
  }, []);

  function markRead(id) {
    api.put(`/notifications/${id}/read`).catch(() => {});
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }

  function markAllRead() {
    api.put("/notifications/read-all").catch(() => {});
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    toast.success("All notifications marked as read");
  }

  const filtered = filter === "all" ? items : filter === "unread" ? items.filter(n => !n.is_read) : items.filter(n => n.type === filter);
  const unreadCount = items.filter(n => !n.is_read).length;

  const tabs = [
    { key: "all",        label: "All" },
    { key: "unread",     label: `Unread${unreadCount ? ` (${unreadCount})` : ""}` },
    { key: "low_stock",  label: "Stock Alerts" },
    { key: "sale",       label: "Sales" },
    { key: "procurement",label: "Procurement" },
  ];

  return (
    <PageWrapper title="Notifications" subtitle="System alerts and activity updates"
      breadcrumbs={[{ label: "Notifications", path: "/app/notifications" }]}>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setFilter(t.key)}
              className={`shrink-0 px-3 py-1.5 rounded-badge text-[12px] font-medium border transition-colors ${filter === t.key ? "bg-primary text-white border-primary" : "border-border text-text-secondary hover:border-primary/50"}`}>
              {t.label}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" icon={CheckCheck} onClick={markAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      <Card>
        {loading ? (
          <div className="space-y-3">
            {Array(5).fill(0).map((_,i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-10 h-10 bg-border rounded-full shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-border rounded w-3/4" />
                  <div className="h-3 bg-border rounded w-full" />
                  <div className="h-3 bg-border rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Bell size={40} className="text-border mx-auto mb-3" />
            <p className="text-[12px] text-text-secondary">No notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(notif => {
              const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.sale;
              const Icon = cfg.icon;
              return (
                <div key={notif.id}
                  className={`flex items-start gap-3 py-4 px-1 transition-colors ${!notif.is_read ? "bg-primary/2" : ""}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon size={18} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-[11px] font-semibold ${!notif.is_read ? "text-text-primary" : "text-text-secondary"}`}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed">{notif.message}</p>
                    <p className="text-[11px] text-text-secondary mt-1">{formatRelative(notif.created_at)}</p>
                  </div>
                  {!notif.is_read && (
                    <button onClick={() => markRead(notif.id)}
                      className="p-1.5 text-text-secondary hover:text-primary rounded shrink-0" title="Mark as read">
                      <Check size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
