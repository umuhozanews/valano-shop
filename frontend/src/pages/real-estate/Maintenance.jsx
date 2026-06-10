import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit, Trash2, Wrench, AlertCircle, CheckCircle2 } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import api from "../../utils/api";
import { formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";

const PRIORITY_MAP = { high: "danger", medium: "warning", low: "neutral" };

export default function Maintenance() {
  const { t } = useLanguage();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/maintenance");
      setTasks(data);
    } catch { toast.error(t("error")); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = tasks.filter(task => 
    task.title.toLowerCase().includes(search.toLowerCase()) ||
    task.property.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: "title", label: t("description"), render: (v, r) => (
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded flex items-center justify-center ${r.status === 'completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
          {r.status === 'completed' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
        </div>
        <div>
          <p className="font-medium text-text-primary">{v}</p>
          <p className="text-[11px] text-text-secondary">{r.property} • {r.unit}</p>
        </div>
      </div>
    )},
    { key: "priority", label: "Priority", render: v => <Badge status={PRIORITY_MAP[v]} label={v.toUpperCase()} /> },
    { key: "date", label: t("date"), render: v => formatDate(v) },
    { key: "status", label: t("status"), render: v => <Badge status={v === 'completed' ? 'success' : 'neutral'} label={v} /> },
    { key: "id", label: "", render: () => (
      <div className="flex gap-1">
        <button className="p-1 text-text-secondary hover:text-primary"><Edit size={14} /></button>
        <button className="p-1 text-text-secondary hover:text-danger"><Trash2 size={14} /></button>
      </div>
    )}
  ];

  return (
    <PageWrapper title={t("maintenance")} subtitle="Track repairs across your properties"
      breadcrumbs={[{ label: t("real_estate"), path: "/app/properties" }, { label: t("maintenance"), path: "/app/maintenance" }]}>
      
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input 
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder={`${t("search")}...`}
            className="w-full h-9 pl-9 pr-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-1 focus:ring-primary" 
          />
        </div>
        <Button icon={Plus} size="sm">{t("add")}</Button>
      </div>

      <Card>
        <Table columns={columns} data={filtered} loading={loading} />
      </Card>
    </PageWrapper>
  );
}
