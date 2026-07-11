import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import api from "../../utils/api";
import { formatRWF, formatDate } from "../../utils/formatters";
import toast from "react-hot-toast";

const PIE_COLORS = ["#10B981","#3B82F6","#F59E0B","#EF4444","#8B5CF6"];

export default function WorkerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [perf, setPerf] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get(`/workers/${id}`), api.get(`/workers/${id}/performance`)])
      .then(([w, p]) => { setWorker(w.data); setPerf(p.data); })
      .catch(() => toast.error("Failed to load worker"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!worker) return null;

  const targetPct = perf?.targetProgress || 0;

  return (
    <PageWrapper title={worker.name} subtitle={`${worker.role} · ${worker.branch_name}`}
      breadcrumbs={[{label:"Workers",path:"/app/workers"},{label:worker.name,path:`/app/workers/${id}`}]}>
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate("/app/workers")} className="mb-4">Back</Button>

      {/* Profile header */}
      <Card className="mb-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
            <span className="text-[26px] font-bold text-primary">{worker.name?.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-[22px] font-bold text-text-primary">{worker.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge status={worker.role==="manager"?"warning":"neutral"} label={worker.role} />
              <Badge status={worker.is_active?"success":"danger"} label={worker.is_active?"Active":"Inactive"} />
              <span className="text-[14px] text-text-secondary">{worker.branch_name}</span>
            </div>
            <p className="text-[14px] text-text-secondary mt-1">{worker.email} · {worker.phone}</p>
          </div>
        </div>
      </Card>

      {/* Performance cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <Card><p className="text-[13px] text-text-secondary uppercase tracking-wide mb-1">Total Sales</p><p className="text-[26px] font-bold text-text-primary">{perf?.totalSales||0}</p></Card>
        <Card><p className="text-[13px] text-text-secondary uppercase tracking-wide mb-1">Total Revenue</p><p className="text-[20px] font-bold text-primary">{formatRWF(perf?.totalRevenue||0)}</p></Card>
        <Card><p className="text-[13px] text-text-secondary uppercase tracking-wide mb-1">Avg Sale Value</p><p className="text-[20px] font-bold text-text-primary">{formatRWF(Math.round(perf?.avgSaleValue||0))}</p></Card>
        <Card><p className="text-[13px] text-text-secondary uppercase tracking-wide mb-1">Commission Earned</p><p className="text-[20px] font-bold text-success">{formatRWF(perf?.commissionEarned||0)}</p></Card>
      </div>

      {/* Monthly target progress */}
      <Card title="Monthly Target Progress" className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[14px] text-text-secondary">{formatRWF(perf?.monthlyRevenue||0)} of {formatRWF(perf?.monthlyTarget||0)}</span>
          <span className="text-[16px] font-bold text-primary">{targetPct}%</span>
        </div>
        <div className="w-full h-3 bg-background rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100,targetPct)}%` }} />
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card title="Daily Revenue (Last 30 Days)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={perf?.dailyTrend||[]}>
              <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={v=>v?.slice(5)} />
              <YAxis tick={{fontSize:10}} tickFormatter={v=>(v/1000).toFixed(0)+"k"} />
              <Tooltip formatter={v=>formatRWF(v)} />
              <Bar dataKey="revenue" fill="#10B981" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Sales by Category">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={perf?.byCategory||[]} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={80}>
                {(perf?.byCategory||[]).map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={v=>formatRWF(v)} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top Items */}
      {perf?.topItems?.length > 0 && (
        <Card title="Top Items Sold">
          <div className="space-y-2">
            {perf.topItems.map((item,i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-text-secondary w-4">{i+1}</span>
                  <div><p className="text-[14px] font-medium text-text-primary">{item.name}</p><p className="text-[13px] text-text-secondary">{item.units} units</p></div>
                </div>
                <span className="text-[14px] font-semibold text-primary">{formatRWF(item.revenue)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </PageWrapper>
  );
}
