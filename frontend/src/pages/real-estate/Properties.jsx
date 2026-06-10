import { useState } from "react";
import { Plus, Home, MapPin, Search, Edit, Trash2 } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Input from "../../components/ui/Input";
import { formatRWF } from "../../utils/formatters";
import { useLanguage } from "../../context/LanguageContext";

const MOCK_PROPERTIES = [
  { id: 1, name: "Knotty Heights A1", address: "Gacuriro, Kigali", units: 4, type: "Apartment", status: "occupied" },
  { id: 2, name: "Knotty Heights A2", address: "Gacuriro, Kigali", units: 4, type: "Apartment", status: "occupied" },
  { id: 3, name: "Commercial Plaza", address: "Kiyovu, Kigali", units: 10, type: "Commercial", status: "partial" },
  { id: 4, name: "Warehouse X", address: "Freezone, Kigali", units: 1, type: "Industrial", status: "vacant" },
];

export default function Properties() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");

  const columns = [
    { key: "name", label: t("name"), render: (v, r) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center text-primary">
          <Home size={14} />
        </div>
        <div>
          <p className="font-medium text-text-primary">{v}</p>
          <p className="text-[11px] text-text-secondary">{r.type}</p>
        </div>
      </div>
    )},
    { key: "address", label: t("address"), render: v => (
      <div className="flex items-center gap-1 text-text-secondary">
        <MapPin size={12} />
        <span className="text-[12px]">{v}</span>
      </div>
    )},
    { key: "units", label: "Units", render: v => <span className="font-medium">{v}</span> },
    { key: "status", label: t("status"), render: v => (
      <Badge status={v === 'occupied' ? 'success' : v === 'vacant' ? 'danger' : 'warning'} label={v} />
    )},
    { key: "id", label: "", render: () => (
      <div className="flex gap-1">
        <button className="p-1 text-text-secondary hover:text-primary"><Edit size={14} /></button>
        <button className="p-1 text-text-secondary hover:text-danger"><Trash2 size={14} /></button>
      </div>
    )}
  ];

  return (
    <PageWrapper title={t("properties")} subtitle="Manage your real estate portfolio"
      breadcrumbs={[{ label: t("real_estate"), path: "/app/properties" }, { label: t("properties"), path: "/app/properties" }]}>
      
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
        <Table columns={columns} data={MOCK_PROPERTIES} />
      </Card>
    </PageWrapper>
  );
}
