import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import PageWrapper from "../../components/layout/PageWrapper";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import StatCard from "../../components/ui/StatCard";
import Modal from "../../components/ui/Modal";
import Input from "../../components/ui/Input";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";

const CATS = ["Rent","Staff Salaries","China Travel","Customs & Taxes","Packaging","Transport","Utilities","Marketing","Other"];

export default function ExpensesList() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [byCategory, setByCategory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category:"Rent", amount:"", description:"", branch_id:"", expense_date:new Date().toISOString().slice(0,10) });
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ category:"", start_date:"", end_date:"" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit:20, ...Object.fromEntries(Object.entries(filters).filter(([,v])=>v)) };
      const { data } = await api.get("/expenses", { params });
      setExpenses(data.data); setTotal(data.total); setByCategory(data.byCategory||[]);
    } finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchData(); api.get("/settings").then(d => setBranches(d.data.branches||[])); }, [fetchData]);

  async function handleAdd() {
    setSaving(true);
    try {
      await api.post("/expenses", form);
      toast.success("Expense recorded"); setShowModal(false); fetchData();
    } catch(e){ toast.error(e.response?.data?.error||"Failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this expense?")) return;
    try { await api.delete(`/expenses/${id}`); toast.success("Deleted"); fetchData(); }
    catch { toast.error("Failed"); }
  }

  const monthTotal = byCategory.reduce((s,c) => s+parseInt(c.total||0), 0);

  const columns = [
    { key:"expense_date", label:"Date", render:v => formatDate(v) },
    { key:"category", label:"Category" },
    { key:"description", label:"Description", render:v => v||"—" },
    { key:"amount", label:"Amount", render:v => <span className="font-semibold text-danger">{formatRWF(v)}</span> },
    { key:"branch_name", label:"Branch" },
    { key:"recorder_name", label:"Recorded By" },
    { key:"id", label:"", render:v => (
      <button onClick={() => handleDelete(v)} className="p-1 text-text-secondary hover:text-danger rounded"><Trash2 size={14}/></button>
    )},
  ];

  return (
    <PageWrapper title="Expenses" breadcrumbs={[{label:"Expenses",path:"/app/expenses"}]}>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <StatCard title="This Month Total" value={formatRWF(monthTotal)} />
        {byCategory.slice(0,3).map(c => <StatCard key={c.category} title={c.category} value={formatRWF(c.total||0)} />)}
      </div>

      {byCategory.length > 0 && (
        <Card title="Expenses by Category" className="mb-4">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byCategory}>
              <XAxis dataKey="category" tick={{fontSize:10}} />
              <YAxis tick={{fontSize:10}} tickFormatter={v=>(v/1000).toFixed(0)+"k"} />
              <Tooltip formatter={v=>formatRWF(v)} />
              <Bar dataKey="total" fill="#EF4444" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card action={<Button icon={Plus} size="sm" onClick={() => setShowModal(true)}>Add Expense</Button>}>
        <div className="flex flex-wrap gap-3 mb-4">
          <select value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">All Categories</option>
            {CATS.map(c=><option key={c}>{c}</option>)}
          </select>
          <input type="date" value={filters.start_date} onChange={e=>setFilters(f=>({...f,start_date:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="date" value={filters.end_date} onChange={e=>setFilters(f=>({...f,end_date:e.target.value}))}
            className="h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <Table columns={columns} data={expenses} loading={loading} emptyMessage="No expenses found" />
        {total>20 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
            <p className="text-[13px] text-text-secondary">{(page-1)*20+1}–{Math.min(page*20,total)} of {total}</p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page===1} onClick={() => setPage(p=>p-1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page*20>=total} onClick={() => setPage(p=>p+1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Expense"
        footer={<><Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button><Button loading={saving} onClick={handleAdd}>Save</Button></>}>
        <div className="space-y-3">
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1">Category</label>
            <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="w-full h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary">
              {CATS.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <Input label="Amount (RWF)" type="number" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} />
          <Input label="Description" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
          <div>
            <label className="block text-[13px] font-medium text-text-primary mb-1">Branch</label>
            <select value={form.branch_id} onChange={e=>setForm(f=>({...f,branch_id:e.target.value}))} className="w-full h-9 px-3 border border-border rounded-card text-[13px] bg-surface focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Select…</option>
              {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <Input label="Date" type="date" value={form.expense_date} onChange={e=>setForm(f=>({...f,expense_date:e.target.value}))} />
        </div>
      </Modal>
    </PageWrapper>
  );
}
