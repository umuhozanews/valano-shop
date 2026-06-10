import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Scale, ArrowUpRight, ArrowDownLeft, Trash2, CheckCircle2 } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import StatCard from "../../components/ui/StatCard";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import { useBusiness } from "../../context/BusinessContext";

export default function DebtManagement() {
  const { t } = useLanguage();
  const { activeBusiness } = useBusiness();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ person_name: "", amount: "", type: "receivable", due_date: "", notes: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/debts");
      setDebts(data);
    } catch { toast.error(t("error")); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const receivables = debts.filter(d => d.type === "receivable" && d.status !== "paid");
  const payables = debts.filter(d => d.type === "payable" && d.status !== "paid");

  const totalReceivable = receivables.reduce((s, d) => s + d.amount, 0);
  const totalPayable = payables.reduce((s, d) => s + d.amount, 0);

  async function handleAdd() {
    if (!form.person_name || !form.amount) return toast.error(t("error"));
    try {
      await api.post("/debts", form);
      toast.success(t("success"));
      setShowModal(false);
      fetchData();
      setForm({ person_name: "", amount: "", type: "receivable", due_date: "", notes: "" });
    } catch { toast.error(t("error")); }
  }

  async function markPaid(id) {
    if (!confirm(t("confirm_delete"))) return;
    try {
      await api.put(`/debts/${id}/pay`);
      toast.success(t("success"));
      fetchData();
    } catch { toast.error(t("error")); }
  }

  const columns = [
    { key: "person_name", label: t("name"), render: (v, r) => (
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${r.type === 'receivable' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
          {r.type === 'receivable' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
        </div>
        <div>
          <p className="font-medium text-text-primary">{v}</p>
          <p className="text-[11px] text-text-secondary">{r.type === 'receivable' ? t("receivables") : t("payables")}</p>
        </div>
      </div>
    )},
    { key: "amount", label: t("amount"), render: v => <span className="font-bold">{formatRWF(v)}</span> },
    { key: "due_date", label: t("due_date"), render: v => {
      const isOverdue = new Date(v) < new Date() && v;
      return <span className={isOverdue ? "text-danger font-medium" : ""}>{v ? formatDate(v) : "—"} {isOverdue && `(${t("overdue")})`}</span>
    }},
    { key: "status", label: t("status"), render: v => <Badge status={v === 'paid' ? 'success' : v === 'pending' ? 'warning' : 'neutral'} label={t(v)} /> },
    { key: "id", label: "", render: (v, r) => (
      <div className="flex gap-1">
        {r.status !== 'paid' && (
          <button onClick={() => markPaid(v)} className="p-1 text-text-secondary hover:text-success" title={t("pay_debt")}>
            <CheckCircle2 size={16} />
          </button>
        )}
        <button className="p-1 text-text-secondary hover:text-danger"><Trash2 size={14} /></button>
      </div>
    )}
  ];

  const filtered = debts.filter(d => d.person_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <PageWrapper title={t("debt_management")} subtitle={activeBusiness.name}
      breadcrumbs={[{ label: t("debt_management"), path: "/app/debts" }]}>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title={t("receivables")} value={formatRWF(totalReceivable)} color="success" />
        <StatCard title={t("payables")} value={formatRWF(totalPayable)} color="danger" />
        <Button variant="primary" size="lg" icon={Plus} onClick={() => setShowModal(true)} className="!h-auto flex-col gap-1 py-4">
          <span className="text-[15px]">{t("add_debt")}</span>
        </Button>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`${t("search")}…`}
              className="w-full h-9 pl-9 pr-3 border border-border rounded-card text-[13px] focus:outline-none focus:ring-1 focus:ring-primary bg-surface" />
          </div>
        </div>
        <Table columns={columns} data={filtered} loading={loading} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={t("add_debt")}
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>{t("cancel")}</Button><Button onClick={handleAdd}>{t("save")}</Button></>}>
        <div className="space-y-3">
          <Input label={t("name")} value={form.person_name} onChange={e => setForm({ ...form, person_name: e.target.value })} placeholder="Customer or Supplier Name" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t("amount")} type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            <div>
              <label className="block text-[13px] font-medium text-text-primary mb-1">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full h-9 px-3 border border-border rounded-card text-[13px] bg-surface">
                <option value="receivable">{t("receivables")}</option>
                <option value="payable">{t("payables")}</option>
              </select>
            </div>
          </div>
          <Input label={t("due_date")} type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1">{t("description")}</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full p-2 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
