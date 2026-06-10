import { useState } from "react";
import { Plus, Users, Search, Edit, Trash2, Phone, Mail } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import { useLanguage } from "../../context/LanguageContext";

const MOCK_TENANTS = [
  { id: 1, name: "Iradukunda Eric", property: "Knotty Heights A1", unit: "Unit 101", phone: "0788111222", status: "active", paid: true },
  { id: 2, name: "Mutesi Solange", property: "Knotty Heights A1", unit: "Unit 102", phone: "0788333444", status: "active", paid: false },
  { id: 3, name: "Gasana Jean", property: "Commercial Plaza", unit: "Suite 4", phone: "0788555666", status: "active", paid: true },
];

export default function Tenants() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");

  const columns = [
    { key: "name", label: t("name"), render: (v, r) => (
      <div>
        <p className="font-medium text-text-primary">{v}</p>
        <p className="text-[11px] text-text-secondary">{r.phone}</p>
      </div>
    )},
    { key: "property", label: t("properties"), render: (v, r) => (
      <div>
        <p className="text-[13px] text-text-primary">{v}</p>
        <p className="text-[11px] text-text-secondary">{r.unit}</p>
      </div>
    )},
    { key: "paid", label: "Rent Status", render: v => (
      <Badge status={v ? 'success' : 'danger'} label={v ? 'Paid' : 'Pending'} />
    )},
    { key: "status", label: t("status"), render: v => <Badge status="neutral" label={v} /> },
    { key: "id", label: "", render: () => (
      <div className="flex gap-1">
        <button className="p-1 text-text-secondary hover:text-primary"><Edit size={14} /></button>
        <button className="p-1 text-text-secondary hover:text-danger"><Trash2 size={14} /></button>
      </div>
    )}
  ];

  return (
    <PageWrapper title={t("tenants")} subtitle="Manage relationships with your tenants"
      breadcrumbs={[{ label: t("real_estate"), path: "/app/properties" }, { label: t("tenants"), path: "/app/tenants" }]}>
      
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
        <Table columns={columns} data={MOCK_TENANTS} />
      </Card>
    </PageWrapper>
  );
}
