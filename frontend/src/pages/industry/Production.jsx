import { useState } from "react";
import { Plus, Factory, Search, Edit, Trash2, Box, ArrowRight } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import { formatRWF } from "../../utils/formatters";
import { useLanguage } from "../../context/LanguageContext";

const MOCK_PRODUCTION = [
  { id: 1, name: "Production Run #44", item: "Summer T-Shirt", quantity: 500, status: "in_progress", progress: 65 },
  { id: 2, name: "Production Run #43", item: "Denim Jeans", quantity: 200, status: "completed", progress: 100 },
  { id: 3, name: "Production Run #45", item: "Woolen Jackets", quantity: 150, status: "planned", progress: 0 },
];

export default function Production() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");

  const columns = [
    { key: "name", label: t("production"), render: (v, r) => (
      <div>
        <p className="font-medium text-text-primary">{v}</p>
        <p className="text-[11px] text-text-secondary">{r.item}</p>
      </div>
    )},
    { key: "quantity", label: t("quantity"), render: v => <span className="font-semibold">{v}</span> },
    { key: "progress", label: "Progress", render: v => (
      <div className="w-32">
        <div className="flex justify-between mb-1">
          <span className="text-[10px] text-text-secondary">{v}%</span>
        </div>
        <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${v}%` }} />
        </div>
      </div>
    )},
    { key: "status", label: t("status"), render: v => (
      <Badge status={v === 'completed' ? 'success' : v === 'in_progress' ? 'warning' : 'neutral'} label={v.replace('_',' ')} />
    )},
    { key: "id", label: "", render: () => (
      <div className="flex gap-1">
        <button className="p-1 text-text-secondary hover:text-primary"><Edit size={14} /></button>
        <button className="p-1 text-text-secondary hover:text-danger"><Trash2 size={14} /></button>
      </div>
    )}
  ];

  return (
    <PageWrapper title={t("production")} subtitle="Track manufacturing and production lines"
      breadcrumbs={[{ label: t("production"), path: "/app/production" }, { label: t("production"), path: "/app/production" }]}>
      
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
        <Table columns={columns} data={MOCK_PRODUCTION} />
      </Card>
    </PageWrapper>
  );
}
