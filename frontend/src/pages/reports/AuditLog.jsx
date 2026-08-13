import { useState, useEffect } from "react";
import { Shield, ShoppingCart, Package, Users, TrendingUp, LogIn, AlertTriangle, Search } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import api from "../../utils/api";
import { formatDate } from "../../utils/formatters";

const ACTION_CONFIG = {
  SALE_CREATED:       { icon:ShoppingCart, color:"text-success",  bg:"bg-success/10",  label:"Sale Created" },
  SALE_VOIDED:        { icon:AlertTriangle,color:"text-danger",   bg:"bg-danger/10",   label:"Sale Voided" },
  STOCK_CREATED:      { icon:Package,      color:"text-primary",  bg:"bg-primary/10",  label:"Stock Added" },
  STOCK_UPDATED:      { icon:Package,      color:"text-primary",  bg:"bg-primary/10",  label:"Stock Updated" },
  STOCK_TRANSFER:     { icon:Package,      color:"text-warning",  bg:"bg-warning/10",  label:"Stock Transfer" },
  WORKER_CREATED:     { icon:Users,        color:"text-primary",  bg:"bg-primary/10",  label:"Worker Added" },
  PROCUREMENT_CREATED:{ icon:TrendingUp,   color:"text-primary",  bg:"bg-primary/10",  label:"Order Created" },
  EXPENSE_CREATED:    { icon:TrendingUp,   color:"text-danger",   bg:"bg-danger/10",   label:"Expense Recorded" },
  SUPPLIER_UPDATED:   { icon:Users,        color:"text-neutral",  bg:"bg-border",      label:"Supplier Updated" },
  LOGIN:              { icon:LogIn,        color:"text-neutral",  bg:"bg-border",      label:"Login" },
};

const DEFAULT_CFG = { icon:Shield, color:"text-text-secondary", bg:"bg-border", label:"System" };

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");

  useEffect(() => {
    api.get("/audit", { params: { limit: 200 } })
       .then(d => setLogs(d.data.data || []))
       .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l => {
    const matchSearch = !search || l.user_name.toLowerCase().includes(search.toLowerCase()) || l.details?.toLowerCase().includes(search.toLowerCase());
    const matchAction = !filterAction || l.action === filterAction;
    return matchSearch && matchAction;
  });

  const actionTypes = [...new Set(logs.map(l => l.action))];

  return (
    <PageWrapper title="Audit Log" subtitle="Complete record of all system actions"
      breadcrumbs={[{label:"Reports",path:"/app/reports/sales"},{label:"Audit Log",path:"/app/reports/audit"}]}>

      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by user or action…"
              className="w-full h-9 pl-8 pr-3 border border-border rounded-card text-[11px] focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
            className="h-9 px-3 border border-border rounded-card text-[11px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">All Actions</option>
            {actionTypes.map(a => <option key={a} value={a}>{ACTION_CONFIG[a]?.label || a}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array(8).fill(0).map((_,i) => (
              <div key={i} className="flex gap-3 animate-pulse py-2">
                <div className="w-9 h-9 bg-border rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-border rounded w-1/2" />
                  <div className="h-3 bg-border rounded w-3/4" />
                </div>
                <div className="h-3 bg-border rounded w-24 shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(log => {
              const cfg = ACTION_CONFIG[log.action] || DEFAULT_CFG;
              const Icon = cfg.icon;
              return (
                <div key={log.id} className="flex items-start gap-3 py-3.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon size={15} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-text-primary">{log.user_name}</span>
                      <Badge status="neutral" label={cfg.label} />
                    </div>
                    <p className="text-[12px] text-text-secondary mt-0.5">{log.details}</p>
                  </div>
                  <p className="text-[11px] text-text-secondary shrink-0 mt-0.5">{formatDate(log.created_at, "dd MMM HH:mm")}</p>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-text-secondary text-[11px] py-8">No matching audit entries</p>
            )}
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
