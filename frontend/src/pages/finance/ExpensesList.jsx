import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Filter, Receipt, Trash2 } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import StatCard from "../../components/ui/StatCard";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useLanguage } from "../../context/LanguageContext";
import { EXPENSE_CATEGORIES } from "../../utils/constants";

export default function ExpensesList() {
  const { t } = useLanguage();
  const [expenses, setExpenses] = useState([]);
  const [totals, setTotals] = useState({ total:0, count:0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ start_date:"", end_date:"", category:"" });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category:"Rent", amount:"", description:"", expense_date:new Date().toISOString().slice(0,10) });
  const [saving, setSaving] = useState(false);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/expenses", { params: filters });
      const list = data.data || data || [];
      const totalCount = data.total !== undefined ? data.total : list.length;
      let totalSum = 0;
      if (data.total_sum !== undefined) {
        totalSum = data.total_sum;
      } else {
        totalSum = list.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
      }
      setExpenses(list);
      setTotals({ total: totalSum, count: totalCount });
    } catch { toast.error(t("error")); }
    finally { setLoading(false); }
  }, [filters, t]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  async function handleAdd() {
    setSaving(true);
    try {
      await api.post("/expenses", form);
      toast.success(t("success"));
      setShowModal(false);
      setForm({ category:"Rent", amount:"", description:"", expense_date:new Date().toISOString().slice(0,10) });
      fetchExpenses();
    } catch { toast.error(t("error")); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm(t("confirm_delete"))) return;
    try { await api.delete(`/expenses/${id}`); toast.success(t("success")); fetchExpenses(); }
    catch { toast.error(t("error")); }
  }

  const columns = [
    { key:"expense_date", label: t("date"), render:v => formatDate(v, "dd MMM yyyy") },
    { key:"category", label: t("category") },
    { key:"description", label: t("description"), render:v => <p className="truncate max-w-xs">{v}</p> },
    { key:"amount", label: t("amount"), render:v => <span className="font-semibold text-danger">{formatRWF(v)}</span> },
    { key:"id", label:"", render:v => (
      <button onClick={() => handleDelete(v)} className="p-1 text-text-secondary hover:text-danger rounded"><Trash2 size={14} /></button>
    )},
  ];

  return (
    <PageWrapper title={t("expenses")} subtitle={t("finance")}
      breadcrumbs={[{label: t("finance"), path:"/app/invoices"}, {label: t("expenses"), path:"/app/expenses"}]}>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <StatCard title={t("total")} value={formatRWF(totals.total)} icon={Receipt} color="danger" />
        <StatCard title={t("all")} value={totals.count} />
        <Button variant="primary" size="lg" icon={Plus} onClick={() => setShowModal(true)} className="!h-auto flex-col gap-1 py-4">
          <span className="text-[15px]">{t("add")}</span>
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap gap-3 mb-4">
          <input type="date" value={filters.start_date} onChange={e=>setFilters(f=>({...f,start_date:e.target.value}))} className="h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="date" value={filters.end_date} onChange={e=>setFilters(f=>({...f,end_date:e.target.value}))} className="h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
          <select value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))} className="h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">{t("category")} ({t("all")})</option>
            {EXPENSE_CATEGORIES.map(c=><option key={c}>{c}</option>)}
          </select>
        </div>

        <Table columns={columns} data={expenses} loading={loading} />
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={t("add")}
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>{t("cancel")}</Button><Button loading={saving} onClick={handleAdd}>{t("save")}</Button></>}>
        <div className="space-y-3">
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1">{t("category")}</label>
            <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary">
              {EXPENSE_CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <Input label={t("amount")} type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} />
          <Input label={t("date")} type="date" value={form.expense_date} onChange={e=>setForm(f=>({...f,expense_date:e.target.value}))} />
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1">{t("description")}</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={3}
              className="w-full p-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
