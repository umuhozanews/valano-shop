import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import api from "../../utils/api";
import toast from "react-hot-toast";
import {
  ArrowLeft, Activity, Calendar, CheckCircle2, TrendingUp,
  AlertTriangle, ExternalLink, Plus, RefreshCw, FileText
} from "lucide-react";
import { formatRWF } from "../../utils/formatters";

const BAND_COLORS = {
  green: "bg-green-50 text-green-700 border-green-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red:   "bg-red-50 text-red-700 border-red-200",
};

export default function AdvisorSmeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sme, setSme] = useState(null);
  const [loading, setLoading] = useState(true);

  // New session modal inline
  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    scheduled_at: new Date().toISOString().slice(0, 16),
    status: "completed",
    notes: "",
    action_plan: "",
    follow_up_date: "",
  });
  const [submittingSession, setSubmittingSession] = useState(false);

  const fetchSmeDetails = async () => {
    try {
      const { data } = await api.get(`/v2/advisor/clients/${id}`);
      setSme(data);
    } catch (e) {
      toast.error("Failed to load SME details for advisor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSmeDetails();
  }, [id]);

  async function handleAddSession(e) {
    e.preventDefault();
    setSubmittingSession(true);
    try {
      await api.post("/v2/advisor/sessions", {
        sme_user_id: id,
        ...sessionForm,
      });
      toast.success("Advisory session logged");
      setShowAddSession(false);
      setSessionForm({
        scheduled_at: new Date().toISOString().slice(0, 16),
        status: "completed",
        notes: "",
        action_plan: "",
        follow_up_date: "",
      });
      await fetchSmeDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to log session");
    } finally {
      setSubmittingSession(false);
    }
  }

  if (loading) {
    return (
      <PageWrapper title="Advisor Review" subtitle="Loading SME details…">
        <div className="flex h-64 items-center justify-center text-text-secondary">Loading business profile…</div>
      </PageWrapper>
    );
  }

  if (!sme) {
    return (
      <PageWrapper title="SME Not Found" subtitle="Could not locate business in advisor portfolio">
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <AlertTriangle size={32} className="text-red-500" />
          <p className="text-[15px] font-semibold text-text-primary">Business not linked to your advisor account</p>
          <button onClick={() => navigate("/app/advisor")} className="text-[14px] text-primary hover:underline">
            ← Back to Advisor Portfolio
          </button>
        </div>
      </PageWrapper>
    );
  }

  const stats = sme.stats || {};
  const scoreHistory = sme.scoreHistory || [];
  const sessions = sme.sessions || [];
  const factors = sme.factors || {};
  const positiveFactors = factors.positive || [];
  const negativeFactors = factors.negative || [];

  return (
    <PageWrapper
      title={sme.name}
      subtitle={`${sme.sector || "General"} · ${sme.district || "Rwanda"} · Advisor Intervention Portal`}
      breadcrumbs={[
        { label: "Advisor", path: "/app/advisor" },
        { label: sme.name, path: `/app/advisor/sme/${id}` },
      ]}
      action={
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/app/advisor")}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-[6px] text-[14px] text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <button
            onClick={() => setShowAddSession(s => !s)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-[6px] text-[14px] font-medium hover:bg-primary/90"
          >
            <Plus size={14} /> Log Advisory Session
          </button>
        </div>
      }
    >
      {/* Log Session Form Modal */}
      {showAddSession && (
        <div className="mb-5 bg-white border border-border rounded-[10px] shadow-sm p-5 space-y-3">
          <p className="text-[15px] font-semibold text-text-primary">Log Advisory Session for {sme.name}</p>
          <form onSubmit={handleAddSession} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[13px] font-medium text-text-secondary block mb-1">Session Date & Time</label>
                <input
                  type="datetime-local"
                  value={sessionForm.scheduled_at}
                  onChange={e => setSessionForm(f => ({ ...f, scheduled_at: e.target.value }))}
                  className="w-full h-9 px-3 border border-border rounded-[6px] text-[14px]"
                />
              </div>
              <div>
                <label className="text-[13px] font-medium text-text-secondary block mb-1">Status</label>
                <select
                  value={sessionForm.status}
                  onChange={e => setSessionForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full h-9 px-3 border border-border rounded-[6px] text-[14px] bg-white"
                >
                  <option value="completed">Completed</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="requested">Requested</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="text-[13px] font-medium text-text-secondary block mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={sessionForm.follow_up_date}
                  onChange={e => setSessionForm(f => ({ ...f, follow_up_date: e.target.value }))}
                  className="w-full h-9 px-3 border border-border rounded-[6px] text-[14px]"
                />
              </div>
            </div>

            <div>
              <label className="text-[13px] font-medium text-text-secondary block mb-1">Session Notes & Key Findings</label>
              <textarea
                required
                rows={2}
                value={sessionForm.notes}
                onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="What was discussed or diagnosed during consultation?"
                className="w-full p-2.5 border border-border rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="text-[13px] font-medium text-text-secondary block mb-1">Recommended Action Plan</label>
              <input
                type="text"
                value={sessionForm.action_plan}
                onChange={e => setSessionForm(f => ({ ...f, action_plan: e.target.value }))}
                placeholder="Steps the SME owner should take before follow-up"
                className="w-full h-9 px-3 border border-border rounded-[6px] text-[14px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddSession(false)}
                className="h-9 px-4 border border-border rounded-[6px] text-[14px] text-text-secondary hover:bg-background"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingSession}
                className="h-9 px-4 bg-primary text-white rounded-[6px] text-[14px] font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {submittingSession ? "Saving…" : "Save Session"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Score Card */}
        <Card title="Business Health Score" className="lg:col-span-1">
          {sme.score != null ? (
            <div className="text-center py-4">
              <p className="text-[56px] font-bold leading-none text-text-primary">{sme.score}</p>
              <p className="text-[13px] text-text-secondary mt-1">out of 100</p>
              <div className="mt-2 inline-block">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-bold border ${BAND_COLORS[sme.band] || "bg-gray-100"}`}>
                  {sme.band?.toUpperCase()} BAND
                </span>
              </div>
              <p className="text-[12.5px] text-text-secondary mt-3">
                Calculated: {sme.calculated_at ? new Date(sme.calculated_at).toLocaleDateString("en-RW") : "Recent"}
              </p>
              {sme.advisory_token && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/advisory/${sme.advisory_token}`);
                    toast.success("Advisory link copied");
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-primary font-semibold hover:underline"
                >
                  <ExternalLink size={13} /> Copy Shareable Report Link
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-[14px] text-text-secondary">Not yet scored</div>
          )}
        </Card>

        {/* 30-Day Financial Vitals */}
        <Card title="30-Day Financial Vitals" className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
            <div className="p-3 bg-background rounded-[8px] border border-border">
              <p className="text-[12.5px] text-text-secondary font-medium">30D Revenue</p>
              <p className="text-[20px] font-bold text-text-primary mt-0.5">{formatRWF(stats.revenue_30d || 0)}</p>
              <p className="text-[12px] text-text-secondary mt-0.5">{stats.sales_count || 0} sales recorded</p>
            </div>
            <div className="p-3 bg-background rounded-[8px] border border-border">
              <p className="text-[12.5px] text-text-secondary font-medium">30D Expenses</p>
              <p className="text-[20px] font-bold text-text-primary mt-0.5">{formatRWF(stats.expenses_30d || 0)}</p>
            </div>
            <div className="p-3 bg-background rounded-[8px] border border-border">
              <p className="text-[12.5px] text-text-secondary font-medium">30D Net Cash</p>
              <p className={`text-[20px] font-bold mt-0.5 ${(stats.net_cash_30d || 0) >= 0 ? "text-green-600" : "text-red-500"}`}>
                {formatRWF(stats.net_cash_30d || 0)}
              </p>
            </div>
            <div className="p-3 bg-background rounded-[8px] border border-border">
              <p className="text-[12.5px] text-text-secondary font-medium">Inventory Vitals</p>
              <p className="text-[20px] font-bold text-text-primary mt-0.5">{stats.active_items || 0} items</p>
              <p className={`text-[12px] mt-0.5 font-medium ${stats.low_stock_items > 0 ? "text-amber-600" : "text-green-600"}`}>
                {stats.low_stock_items > 0 ? `⚠️ ${stats.low_stock_items} low stock` : "Stock OK"}
              </p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-2 text-[13px]">
            <div><span className="text-text-secondary">Owner Email:</span> <p className="font-medium truncate">{sme.email}</p></div>
            <div><span className="text-text-secondary">Phone:</span> <p className="font-medium">{sme.phone || "—"}</p></div>
            <div><span className="text-text-secondary">Member Since:</span> <p className="font-medium">{sme.member_since ? new Date(sme.member_since).toLocaleDateString() : "—"}</p></div>
            <div><span className="text-text-secondary">Advisor Notes:</span> <p className="font-medium truncate">{sme.client_notes || "Linked"}</p></div>
          </div>
        </Card>
      </div>

      {/* Factors Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card title="Positive Health Factors">
          {positiveFactors.length ? (
            <div className="space-y-2">
              {positiveFactors.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2.5 bg-green-50/80 border border-green-200/60 rounded-[8px] text-[13px] text-green-900">
                  <CheckCircle2 size={15} className="text-green-600 shrink-0" />
                  <span className="font-medium">{f.label_en || f.key}</span>
                  {f.value != null && <span className="ml-auto font-semibold text-green-700">+{f.value}</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13.5px] text-text-secondary py-4 text-center">No positive factors identified yet</p>
          )}
        </Card>

        <Card title="Areas to Improve (Risk Drivers)">
          {negativeFactors.length ? (
            <div className="space-y-2">
              {negativeFactors.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2.5 bg-red-50/80 border border-red-200/60 rounded-[8px] text-[13px] text-red-900">
                  <AlertTriangle size={15} className="text-red-500 shrink-0" />
                  <span className="font-medium">{f.label_en || f.key}</span>
                  {f.value != null && <span className="ml-auto font-semibold text-red-700">{f.value}</span>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13.5px] text-text-secondary py-4 text-center">No risk factors identified</p>
          )}
        </Card>
      </div>

      {/* Score History Chart */}
      {scoreHistory.length > 0 && (
        <Card title="Health Score Evolution" className="mb-4">
          <div className="flex items-end gap-3 h-32 px-2 pt-4">
            {scoreHistory.map((s, i) => {
              const val = Math.round(s.score || 0);
              const barColor = s.band === "green" ? "bg-green-500" : s.band === "amber" ? "bg-amber-400" : "bg-red-500";
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[13px] text-text-primary font-bold">{val}</span>
                  <div className="w-full bg-border rounded-t-[4px] relative" style={{ height: "80px" }}>
                    <div className={`absolute bottom-0 w-full ${barColor} rounded-t-[4px] transition-all`} style={{ height: `${val}%` }} />
                  </div>
                  <span className="text-[12px] text-text-secondary">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString("en-RW", { month: "short", day: "numeric" }) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Advisory Session History */}
      <Card title="Advisory Session Log & Action History">
        {sessions.length ? (
          <div className="divide-y divide-border">
            {sessions.map(s => (
              <div key={s.id} className="py-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[14px] text-text-primary">
                      {s.scheduled_at ? new Date(s.scheduled_at).toLocaleDateString("en-RW", { dateStyle: "medium" }) : "Unscheduled"}
                    </span>
                    <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 capitalize">
                      {s.status}
                    </span>
                  </div>
                  <span className="text-[12px] text-text-secondary">Logged {new Date(s.created_at).toLocaleDateString()}</span>
                </div>
                {s.notes && (
                  <p className="text-[13.5px] text-text-primary bg-background p-2.5 rounded-[6px]">
                    <span className="font-medium text-text-secondary block text-[12px]">Consultation Notes:</span>
                    {s.notes}
                  </p>
                )}
                {s.action_plan && (
                  <p className="text-[13px] text-green-800 bg-green-50 p-2 rounded-[6px] border border-green-200">
                    <span className="font-semibold">Action Plan:</span> {s.action_plan}
                    {s.follow_up_date && ` (Follow-up: ${new Date(s.follow_up_date).toLocaleDateString()})`}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-[14px] text-text-secondary">
            No advisory sessions recorded yet for this SME. Click "Log Advisory Session" above to start.
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
