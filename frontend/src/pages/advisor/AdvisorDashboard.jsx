import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import api from "../../utils/api";
import toast from "react-hot-toast";
import {
  Users, Activity, AlertTriangle, CheckCircle2, Calendar, Plus,
  Search, ExternalLink, RefreshCw, ArrowUpRight, FileText, Clock, X
} from "lucide-react";
import { formatRWF } from "../../utils/formatters";

const BAND_COLORS = {
  green: "bg-green-50 text-green-700 border-green-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red:   "bg-red-50 text-red-700 border-red-200",
};

const STATUS_BADGES = {
  requested: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

function ScoreBadge({ score, band }) {
  if (score == null) return <span className="text-[13px] text-gray-400 italic">Unscored</span>;
  const dotColor = band === "green" ? "bg-green-500" : band === "amber" ? "bg-amber-500" : "bg-red-500";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-0.5 rounded-full border ${BAND_COLORS[band] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {score} · {band?.toUpperCase()}
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="bg-white border border-border rounded-[10px] p-4 flex items-start gap-3">
      {Icon && (
        <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 ${accent || "bg-green-50"}`}>
          <Icon size={17} className="text-primary" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[13px] text-text-secondary font-medium uppercase tracking-wide">{label}</p>
        <p className="text-[26px] font-bold text-text-primary leading-tight mt-0.5">{value ?? "—"}</p>
        {sub && <p className="text-[13px] text-text-secondary mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdvisorDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("clients");
  const [data, setData] = useState(null);
  const [clients, setClients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [totalClients, setTotalClients] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [bandFilter, setBandFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectForm, setConnectForm] = useState({ sme_email: "", advisory_token: "", notes: "" });
  const [submittingConnect, setSubmittingConnect] = useState(false);

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionForm, setSessionForm] = useState({
    sme_user_id: "", scheduled_at: new Date().toISOString().slice(0, 16),
    status: "scheduled", notes: "", action_plan: "", follow_up_date: ""
  });
  const [submittingSession, setSubmittingSession] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const { data: res } = await api.get("/v2/advisor/dashboard");
      setData(res);
    } catch (e) {
      toast.error("Failed to load advisor dashboard");
    }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const { data: res } = await api.get("/v2/advisor/clients", {
        params: { page, limit: 15, band: bandFilter || undefined, search: search || undefined }
      });
      setClients(res.data || []);
      setTotalClients(res.total || 0);
    } catch (e) {
      toast.error("Failed to load client SMEs");
    }
  }, [page, bandFilter, search]);

  const loadSessions = useCallback(async () => {
    try {
      const { data: res } = await api.get("/v2/advisor/sessions", { params: { page: 1, limit: 30 } });
      setSessions(res.data || []);
    } catch (e) {
      toast.error("Failed to load advisory sessions");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadDashboard(), loadClients(), loadSessions()]).finally(() => setLoading(false));
  }, [loadDashboard, loadClients, loadSessions]);

  useEffect(() => {
    loadClients();
  }, [loadClients, page, bandFilter, search]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadDashboard(), loadClients(), loadSessions()]);
    setRefreshing(false);
    toast.success("Dashboard updated");
  }

  async function handleConnectSme(e) {
    e.preventDefault();
    setSubmittingConnect(true);
    try {
      await api.post("/v2/advisor/clients", connectForm);
      toast.success("SME business connected to your portfolio");
      setShowConnectModal(false);
      setConnectForm({ sme_email: "", advisory_token: "", notes: "" });
      await Promise.all([loadDashboard(), loadClients()]);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to connect SME");
    } finally {
      setSubmittingConnect(false);
    }
  }

  async function handleCreateSession(e) {
    e.preventDefault();
    if (!sessionForm.sme_user_id) return toast.error("Please select an SME client");
    setSubmittingSession(true);
    try {
      await api.post("/v2/advisor/sessions", sessionForm);
      toast.success("Advisory session logged successfully");
      setShowSessionModal(false);
      setSessionForm({
        sme_user_id: "", scheduled_at: new Date().toISOString().slice(0, 16),
        status: "scheduled", notes: "", action_plan: "", follow_up_date: ""
      });
      await Promise.all([loadDashboard(), loadClients(), loadSessions()]);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to log session");
    } finally {
      setSubmittingSession(false);
    }
  }

  async function handleUpdateSessionStatus(sessionId, newStatus) {
    try {
      await api.put(`/v2/advisor/sessions/${sessionId}`, { status: newStatus });
      toast.success(`Session status updated to ${newStatus}`);
      await Promise.all([loadDashboard(), loadSessions()]);
    } catch (err) {
      toast.error("Failed to update session");
    }
  }

  const ov = data?.overview || {};
  const atRiskList = data?.atRisk || [];
  const upcomingList = data?.upcomingSessions || [];

  return (
    <PageWrapper
      title="DataBridge Advisor Dashboard"
      subtitle="Provide strategic guidance, review health scores, and track SME interventions"
      breadcrumbs={[{ label: "Advisor", path: "/app/advisor" }]}
      action={
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 border border-border rounded-[6px] text-text-secondary hover:text-text-primary hover:bg-background disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowConnectModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-[6px] text-[14px] text-text-primary hover:bg-background transition-colors"
          >
            <Plus size={14} /> Connect SME
          </button>
          <button
            onClick={() => setShowSessionModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-[6px] text-[14px] font-medium hover:bg-primary/90 transition-colors"
          >
            <Calendar size={14} /> Log Advisory Session
          </button>
        </div>
      }
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Client Portfolio" value={ov.total_clients || 0} icon={Users} sub="Active SME Clients" accent="bg-blue-50" />
        <StatCard label="Average Health Score" value={ov.avg_score != null ? Math.round(ov.avg_score) : "—"} icon={Activity} sub="Across client portfolio" accent="bg-green-50" />
        <StatCard label="At Risk (Urgent)" value={ov.red_count || 0} icon={AlertTriangle} sub="Score under 40" accent="bg-red-50" />
        <StatCard label="Advisory Sessions" value={ov.upcoming_sessions || 0} icon={Calendar} sub={`${ov.completed_sessions || 0} completed`} accent="bg-purple-50" />
      </div>

      {/* Connect SME Modal */}
      {showConnectModal && (
        <div className="mb-5 bg-white border border-border rounded-[10px] shadow-sm p-5 relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[15px] font-semibold text-text-primary">Connect SME Business to Portfolio</p>
              <p className="text-[13px] text-text-secondary mt-0.5">Enter the SME's registered email address or advisory link token.</p>
            </div>
            <button onClick={() => setShowConnectModal(false)} className="p-1 rounded hover:bg-background">
              <X size={16} className="text-text-secondary" />
            </button>
          </div>
          <form onSubmit={handleConnectSme} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="text-[13px] font-medium text-text-secondary block mb-1">SME Email Address</label>
              <input
                type="email"
                value={connectForm.sme_email}
                onChange={e => setConnectForm(f => ({ ...f, sme_email: e.target.value }))}
                placeholder="owner@business.rw"
                className="w-full h-9 px-3 border border-border rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex-1 min-w-[220px]">
              <label className="text-[13px] font-medium text-text-secondary block mb-1">OR Advisory Link Token</label>
              <input
                type="text"
                value={connectForm.advisory_token}
                onChange={e => setConnectForm(f => ({ ...f, advisory_token: e.target.value }))}
                placeholder="e.g. 8f9a2b..."
                className="w-full h-9 px-3 border border-border rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="h-9 px-4 border border-border rounded-[6px] text-[14px] text-text-secondary hover:bg-background"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingConnect}
                className="h-9 px-4 bg-primary text-white rounded-[6px] text-[14px] font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {submittingConnect ? "Connecting…" : "Connect SME"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Log Session Modal */}
      {showSessionModal && (
        <div className="mb-5 bg-white border border-border rounded-[10px] shadow-sm p-5 relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[15px] font-semibold text-text-primary">Log / Schedule Advisory Session</p>
              <p className="text-[13px] text-text-secondary mt-0.5">Record consultation notes, diagnosis, and action plans for an SME.</p>
            </div>
            <button onClick={() => setShowSessionModal(false)} className="p-1 rounded hover:bg-background">
              <X size={16} className="text-text-secondary" />
            </button>
          </div>
          <form onSubmit={handleCreateSession} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[13px] font-medium text-text-secondary block mb-1">Select SME Client *</label>
                <select
                  required
                  value={sessionForm.sme_user_id}
                  onChange={e => setSessionForm(f => ({ ...f, sme_user_id: e.target.value }))}
                  className="w-full h-9 px-3 border border-border rounded-[6px] text-[14px] bg-white"
                >
                  <option value="">Select client…</option>
                  {clients.map(c => (
                    <option key={c.sme_user_id} value={c.sme_user_id}>
                      {c.name} ({c.sector || "General"})
                    </option>
                  ))}
                </select>
              </div>
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
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="requested">Requested</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[13px] font-medium text-text-secondary block mb-1">Advisory Notes & Diagnosis</label>
              <textarea
                rows={2}
                value={sessionForm.notes}
                onChange={e => setSessionForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Key issues identified (e.g., cash flow bottleneck, low profit margin on top items...)"
                className="w-full p-2.5 border border-border rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[13px] font-medium text-text-secondary block mb-1">Recommended Action Plan</label>
                <input
                  type="text"
                  value={sessionForm.action_plan}
                  onChange={e => setSessionForm(f => ({ ...f, action_plan: e.target.value }))}
                  placeholder="e.g. Reduce credit sales by 20%, renegotiate supplier payment terms"
                  className="w-full h-9 px-3 border border-border rounded-[6px] text-[14px]"
                />
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

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSessionModal(false)}
                className="h-9 px-4 border border-border rounded-[6px] text-[14px] text-text-secondary hover:bg-background"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingSession}
                className="h-9 px-4 bg-primary text-white rounded-[6px] text-[14px] font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {submittingSession ? "Saving…" : "Save Advisory Session"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border mb-4">
        {[
          { key: "clients", label: "Client SMEs", count: totalClients },
          { key: "sessions", label: "Advisory Sessions", count: sessions.length },
          { key: "risk", label: "At-Risk Interventions", count: atRiskList.length, alert: atRiskList.length > 0 },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[14px] font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {t.label}
            <span className={`text-[13px] px-1.5 py-0.5 rounded-full font-semibold ${
              tab === t.key
                ? "bg-primary/10 text-primary"
                : t.alert ? "bg-red-50 text-red-600" : "bg-background text-text-secondary"
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content: Clients */}
      {tab === "clients" && (
        <div className="bg-white border border-border rounded-[10px] overflow-hidden">
          <div className="p-4 border-b border-border flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search business by name or email…"
                className="w-full h-9 pl-9 pr-3 border border-border rounded-[6px] text-[14px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <select
              value={bandFilter}
              onChange={e => { setBandFilter(e.target.value); setPage(1); }}
              className="h-9 px-3 border border-border rounded-[6px] text-[14px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Health Score Bands</option>
              <option value="green">🟢 Healthy (65–100)</option>
              <option value="amber">🟡 Needs Attention (40–64)</option>
              <option value="red">🔴 At Risk (0–39)</option>
            </select>
          </div>

          {loading ? (
            <div className="py-16 text-center text-[14px] text-text-secondary">Loading client SMEs…</div>
          ) : clients.length ? (
            <>
              <div className="hidden md:grid grid-cols-[1fr_130px_120px_140px_120px_90px] gap-3 px-4 py-2 bg-background border-b border-border text-[13px] font-semibold uppercase text-text-secondary">
                <span>Business</span>
                <span>Sector & Location</span>
                <span>Health Score</span>
                <span>Last Advisory</span>
                <span>Sessions</span>
                <span className="text-right">Action</span>
              </div>
              <div className="divide-y divide-border">
                {clients.map(c => (
                  <div
                    key={c.id}
                    onClick={() => navigate(`/app/advisor/sme/${c.sme_user_id}`)}
                    className="grid grid-cols-1 md:grid-cols-[1fr_130px_120px_140px_120px_90px] gap-2 md:gap-3 px-4 py-3 hover:bg-green-50/30 transition-colors items-center cursor-pointer"
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-text-primary truncate">{c.name}</p>
                      <p className="text-[13px] text-text-secondary truncate">{c.email}</p>
                    </div>
                    <div className="hidden md:block">
                      <p className="text-[13px] text-text-primary font-medium truncate">{c.sector || "General"}</p>
                      <p className="text-[12px] text-text-secondary truncate">{c.district || "Rwanda"}</p>
                    </div>
                    <div className="hidden md:block">
                      <ScoreBadge score={c.score} band={c.band} />
                    </div>
                    <div className="hidden md:block text-[13px] text-text-secondary">
                      {c.last_session_at ? new Date(c.last_session_at).toLocaleDateString("en-RW") : "No sessions yet"}
                    </div>
                    <div className="hidden md:block text-[13px] text-text-secondary">
                      <span className="font-semibold text-text-primary">{c.total_sessions || 0}</span> sessions
                    </div>
                    <div className="flex justify-end" onClick={e => { e.stopPropagation(); navigate(`/app/advisor/sme/${c.sme_user_id}`); }}>
                      <span className="inline-flex items-center gap-1 text-[13px] text-primary font-medium hover:underline">
                        Review <ArrowUpRight size={13} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {totalClients > 15 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background">
                  <p className="text-[13px] text-text-secondary">
                    Showing {(page - 1) * 15 + 1}–{Math.min(page * 15, totalClients)} of {totalClients}
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                      className="px-3 py-1.5 border border-border rounded-[6px] text-[13px] disabled:opacity-40 hover:bg-background"
                    >
                      ← Prev
                    </button>
                    <button
                      disabled={page >= Math.ceil(totalClients / 15)}
                      onClick={() => setPage(p => p + 1)}
                      className="px-3 py-1.5 border border-border rounded-[6px] text-[13px] disabled:opacity-40 hover:bg-background"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center">
              <Users size={40} className="mx-auto text-border mb-3" />
              <p className="text-[15px] font-semibold text-text-primary">No client SMEs in portfolio</p>
              <p className="text-[14px] text-text-secondary mt-1">Use the "Connect SME" button to add businesses to your advisor portfolio.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab content: Sessions */}
      {tab === "sessions" && (
        <div className="bg-white border border-border rounded-[10px] overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-background flex justify-between items-center">
            <div>
              <p className="text-[14px] font-semibold text-text-primary">Advisory Consultation Sessions</p>
              <p className="text-[13px] text-text-secondary">Tracked business interventions and follow-up schedules</p>
            </div>
            <button
              onClick={() => setShowSessionModal(true)}
              className="text-[13px] text-primary font-semibold hover:underline flex items-center gap-1"
            >
              <Plus size={13} /> Log New Session
            </button>
          </div>

          {sessions.length ? (
            <div className="divide-y divide-border">
              {sessions.map(s => (
                <div key={s.id} className="p-4 hover:bg-background/50 transition-colors space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[15px] text-text-primary">{s.business_name}</span>
                      <ScoreBadge score={s.score} band={s.band} />
                      <span className="text-[13px] text-text-secondary">({s.sector || "General"})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={s.status}
                        onChange={e => handleUpdateSessionStatus(s.id, e.target.value)}
                        className={`text-[12px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer ${STATUS_BADGES[s.status] || "bg-gray-100"}`}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="requested">Requested</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <button
                        onClick={() => navigate(`/app/advisor/sme/${s.business_id}`)}
                        className="text-[13px] text-primary font-medium hover:underline flex items-center gap-0.5"
                      >
                        SME Details <ArrowUpRight size={13} />
                      </button>
                    </div>
                  </div>

                  {s.notes && (
                    <p className="text-[13.5px] text-text-primary bg-background p-2.5 rounded-[6px]">
                      <span className="font-medium text-text-secondary block text-[12px] mb-0.5">Session Notes:</span>
                      {s.notes}
                    </p>
                  )}

                  {s.action_plan && (
                    <div className="flex items-start gap-2 text-[13px] text-green-800 bg-green-50/70 border border-green-200/60 p-2.5 rounded-[6px]">
                      <CheckCircle2 size={15} className="text-green-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Action Plan:</span> {s.action_plan}
                        {s.follow_up_date && (
                          <span className="block text-[12px] text-green-700 mt-0.5">
                            Follow-up target: {new Date(s.follow_up_date).toLocaleDateString("en-RW")}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-[12px] text-text-secondary pt-1">
                    <span>Scheduled: {s.scheduled_at ? new Date(s.scheduled_at).toLocaleString("en-RW", { dateStyle: "medium", timeStyle: "short" }) : "Unscheduled"}</span>
                    <span>Created: {new Date(s.created_at).toLocaleDateString("en-RW")}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <Calendar size={40} className="mx-auto text-border mb-3" />
              <p className="text-[15px] font-semibold text-text-primary">No advisory sessions logged yet</p>
              <p className="text-[14px] text-text-secondary mt-1">Click "Log Advisory Session" to record your first consultation.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab content: At-Risk Interventions */}
      {tab === "risk" && (
        <div className="space-y-3">
          {atRiskList.length ? (
            <>
              <div className="bg-red-50 border border-red-200 rounded-[10px] p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[14px] font-semibold text-red-900">
                    {atRiskList.length} SME business{atRiskList.length > 1 ? "es require" : " requires"} urgent advisory intervention
                  </p>
                  <p className="text-[13px] text-red-700 mt-0.5">
                    These businesses have a Health Score below 40 (Red Band). Early intervention can prevent business closure and improve cash flow stability.
                  </p>
                </div>
              </div>

              {atRiskList.map(sme => (
                <div key={sme.sme_user_id} className="bg-white border border-red-200 rounded-[10px] p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <span className="text-[18px] font-bold text-red-600">{sme.score ?? "?"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-text-primary">{sme.name}</p>
                    <p className="text-[13px] text-text-secondary">{sme.sector || "General"} · {sme.district || "Rwanda"} · {sme.email}</p>
                    {sme.factors?.negative?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {sme.factors.negative.slice(0, 3).map((f, i) => (
                          <span key={i} className="text-[11px] bg-red-50 text-red-700 px-2 py-0.5 rounded font-medium">
                            {f.label_en || f.key}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setSessionForm(f => ({ ...f, sme_user_id: sme.sme_user_id }));
                        setShowSessionModal(true);
                      }}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-[6px] text-[13px] font-semibold hover:bg-red-700 transition-colors"
                    >
                      Schedule Advisory
                    </button>
                    <button
                      onClick={() => navigate(`/app/advisor/sme/${sme.sme_user_id}`)}
                      className="text-[13px] text-primary font-medium hover:underline flex items-center gap-0.5"
                    >
                      Deep Dive <ArrowUpRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="bg-white border border-border rounded-[10px] py-16 text-center">
              <CheckCircle2 size={40} className="mx-auto text-green-500 mb-3" />
              <p className="text-[15px] font-semibold text-text-primary">No high-risk SMEs in portfolio</p>
              <p className="text-[14px] text-text-secondary mt-1">All your client SMEs score above 40 points.</p>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
