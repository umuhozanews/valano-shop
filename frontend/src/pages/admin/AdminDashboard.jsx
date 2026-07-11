import { useState, useEffect } from "react";
import { Users, TrendingUp, Activity, Shield, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import toast from "react-hot-toast";

function KPI({ label, value, sub, color = "text-primary" }) {
  return (
    <div className="bg-surface border border-border rounded-[8px] p-4">
      <p className="text-[13px] text-text-secondary">{label}</p>
      <p className={`text-[24px] font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-[13px] text-text-secondary mt-0.5">{sub}</p>}
    </div>
  );
}

const BAND_BADGE = { green:"success", amber:"warning", red:"danger" };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab,      setTab]      = useState("overview");
  const [overview, setOverview] = useState(null);
  const [smes,     setSmes]     = useState([]);
  const [lenders,  setLenders]  = useState([]);
  const [model,    setModel]    = useState(null);
  const [dq,       setDq]       = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [smeSearch, setSmeSearch] = useState("");
  const [smePage,   setSmePage]   = useState(1);
  const [smeTotal,  setSmeTotal]  = useState(0);

  async function loadOverview() {
    try {
      const { data } = await api.get("/v2/admin/dashboard");
      setOverview(data);
    } catch (err) { toast.error("Failed to load dashboard"); }
  }

  async function loadSmes() {
    try {
      const { data } = await api.get("/v2/admin/smes", { params: { page: smePage, limit: 20, search: smeSearch || undefined } });
      setSmes(data.smes || data.data || []); setSmeTotal(data.total || 0);
    } catch { toast.error("Failed to load SMEs"); }
  }

  async function loadLenders() {
    try {
      const { data } = await api.get("/v2/admin/lenders");
      setLenders(data || []);
    } catch { toast.error("Failed to load lenders"); }
  }

  async function loadModel() {
    try {
      const [mRes, dqRes] = await Promise.all([
        api.get("/v2/admin/model/performance"),
        api.get("/v2/admin/data-quality"),
      ]);
      setModel(mRes.data); setDq(dqRes.data);
    } catch { toast.error("Failed to load model data"); }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadOverview(), loadSmes(), loadLenders(), loadModel()])
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (tab === "smes") loadSmes(); }, [tab, smePage, smeSearch]);

  async function changeRole(userId, role) {
    try {
      await api.put(`/v2/admin/users/${userId}/role`, { role });
      toast.success("Role updated");
      loadSmes();
    } catch (err) { toast.error(err.response?.data?.error || "Failed to update role"); }
  }

  async function toggleActive(userId, isActive) {
    try {
      await api.put(`/v2/admin/users/${userId}/activate`, { is_active: !isActive });
      toast.success(isActive ? "User deactivated" : "User activated");
      loadSmes();
    } catch (err) { toast.error(err.response?.data?.error || "Failed"); }
  }

  const smes_kv    = overview?.smes    || {};
  const scores_kv  = overview?.scores  || {};
  const lenders_kv = overview?.lenders || {};

  return (
    <PageWrapper
      title="Pulse Admin Dashboard"
      subtitle="Platform-wide operational overview"
      breadcrumbs={[{ label:"Admin", path:"/app/admin" }]}
    >
      {/* Tab nav */}
      <div className="flex gap-1 border-b border-border mb-5">
        {[
          { key:"overview", label:"Platform Overview" },
          { key:"smes",     label:"SME Management" },
          { key:"lenders",  label:"Lender Management" },
          { key:"model",    label:"Model Performance" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-[14px] font-medium border-b-2 transition-colors ${tab===t.key?"border-primary text-primary":"border-transparent text-text-secondary hover:text-text-primary"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ─────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPI label="Total SMEs"       value={smes_kv.total_smes   || 0} />
            <KPI label="Scored SMEs"      value={scores_kv.total_scored || 0} />
            <KPI label="Avg Score"        value={scores_kv.avg_score != null ? Math.round(scores_kv.avg_score) : "—"} />
            <KPI label="At Risk (Red)"    value={scores_kv.red        || 0} color="text-danger" />
            <KPI label="Amber Band"       value={scores_kv.amber      || 0} color="text-warning" />
            <KPI label="Green Band"       value={scores_kv.green      || 0} color="text-success" />
            <KPI label="Lenders"          value={lenders_kv.total_lenders || 0} />
            <KPI label="Consent Granted"  value={smes_kv.consented    || 0} />
          </div>

          {/* Score trend */}
          {overview?.scoreTrend?.length > 0 && (
            <Card title="Score Trend (Last 30 days)">
              <div className="space-y-1.5">
                {overview.scoreTrend.slice(-7).map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-20 text-[13px] text-text-secondary">{r.day?.slice(5)}</span>
                    <div className="flex-1 bg-border rounded-full h-2.5">
                      <div className="h-2.5 rounded-full bg-primary" style={{ width: `${Math.min(100, r.avg_score || 0)}%` }} />
                    </div>
                    <span className="w-10 text-[13px] text-text-primary font-medium">{Math.round(r.avg_score || 0)}</span>
                    <span className="w-8 text-[13px] text-text-secondary">{r.scored}×</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Sector breakdown */}
          {overview?.sectorBreakdown?.length > 0 && (
            <Card title="SMEs by Sector">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {overview.sectorBreakdown.slice(0,6).map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-background rounded-[6px]">
                    <span className="text-[14px] text-text-primary">{s.sector || "Unset"}</span>
                    <span className="text-[13px] font-bold text-primary">{s.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── SME Management ───────────────────────────────────────── */}
      {tab === "smes" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input value={smeSearch} onChange={e => { setSmeSearch(e.target.value); setSmePage(1); }}
                placeholder="Search by name or email…"
                className="w-full h-9 pl-9 pr-3 border border-border rounded-[6px] text-[14px] bg-surface focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <Card>
            {loading ? (
              <div className="py-12 text-center text-[14px] text-text-secondary">Loading…</div>
            ) : !smes.length ? (
              <div className="py-12 text-center text-[14px] text-text-secondary">No SMEs found</div>
            ) : (
              <>
                <div className="divide-y divide-border">
                  {smes.map(s => (
                    <div key={s.id} className="py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-text-primary">{s.name}</p>
                        <p className="text-[13px] text-text-secondary">{s.email} · {s.sector || "No sector"} · {s.district || "No district"}</p>
                      </div>
                      {s.score != null && (
                        <Badge status={BAND_BADGE[s.band]||"neutral"} label={`${s.score} ${s.band}`} />
                      )}
                      <Badge status={s.consent_status==="consented"?"success":"neutral"} label={s.consent_status || "pending"} />
                      <button onClick={() => toggleActive(s.id, s.is_active)}
                        className={`px-2 py-1 text-[13px] rounded-[4px] font-medium ${s.is_active?"bg-success/10 text-success hover:bg-danger/10 hover:text-danger":"bg-danger/10 text-danger hover:bg-success/10 hover:text-success"}`}>
                        {s.is_active ? "Active" : "Inactive"}
                      </button>
                    </div>
                  ))}
                </div>
                {smeTotal > 20 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <button disabled={smePage===1} onClick={() => setSmePage(p=>p-1)}
                      className="px-3 py-1.5 border border-border rounded text-[13px] disabled:opacity-40">Prev</button>
                    <span className="px-3 py-1.5 text-[13px] text-text-secondary">Page {smePage} of {Math.ceil(smeTotal/20)}</span>
                    <button disabled={smePage>=Math.ceil(smeTotal/20)} onClick={() => setSmePage(p=>p+1)}
                      className="px-3 py-1.5 border border-border rounded text-[13px] disabled:opacity-40">Next</button>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      {/* ── Lender Management ────────────────────────────────────── */}
      {tab === "lenders" && (
        <Card title="Institutional Clients">
          {!lenders.length ? (
            <div className="py-12 text-center text-[14px] text-text-secondary">No lenders registered yet</div>
          ) : (
            <div className="divide-y divide-border">
              {lenders.map(l => (
                <div key={l.id} className="py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-text-primary">{l.name}</p>
                    <p className="text-[13px] text-text-secondary">{l.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-bold text-primary">{l.portfolio_size || 0}</p>
                    <p className="text-[13px] text-text-secondary">referred SMEs</p>
                  </div>
                  <Badge status={l.is_active?"success":"neutral"} label={l.is_active?"Active":"Inactive"} />
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Model Performance ────────────────────────────────────── */}
      {tab === "model" && (
        <div className="space-y-4">
          {model && (() => {
            const dist = model.distribution || {};
            const totalScores = Object.values(dist).reduce((a, v) => a + Number(v||0), 0);
            const modelVersion = model.byModel?.[0]?.model_version || "1.0.0-rules";
            const uniqueSmes = model.byModel?.reduce((a, m) => a + Number(m.runs||0), 0) || 0;
            const byBand = {
              red:   Number(dist["0-19"]||0) + Number(dist["20-39"]||0),
              amber: Number(dist["40-54"]||0) + Number(dist["55-64"]||0),
              green: Number(dist["65-79"]||0) + Number(dist["80-100"]||0),
            };
            return (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <KPI label="Total Scores Run"   value={totalScores} />
                  <KPI label="Unique SMEs Scored"  value={uniqueSmes} />
                  <KPI label="Current Model"        value={modelVersion} />
                </div>

                <Card title="Score Band Distribution">
                  <div className="grid grid-cols-3 gap-3">
                    {[["green","Green (65–100)","success"],["amber","Amber (40–64)","warning"],["red","Red (0–39)","danger"]].map(([band, label, status]) => (
                      <div key={band} className="text-center p-4 bg-background rounded-[8px]">
                        <Badge status={status} label={label} />
                        <p className="text-[26px] font-bold text-text-primary mt-2">{byBand[band]}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                {model.overTime?.length > 0 && (
                  <Card title="Scoring Activity (last 90 days)">
                    <div className="space-y-1.5">
                      {model.overTime.slice(-8).map((r, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="w-24 text-[13px] text-text-secondary">{String(r.week).slice(0,10)}</span>
                          <div className="flex-1 bg-border rounded-full h-2">
                            <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, Number(r.avg)||0)}%` }} />
                          </div>
                          <span className="w-10 text-[13px] font-medium">{Math.round(Number(r.avg)||0)}</span>
                          <span className="w-8 text-[13px] text-text-secondary">{r.scored}×</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            );
          })()}

          {dq && (
            <Card title="Data Quality Metrics">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label:"Active Sellers (30d)",  value: dq.active_sellers   || 0 },
                  { label:"Have Expenses (30d)",   value: dq.have_expenses     || 0 },
                  { label:"Scored Businesses",     value: dq.scored_businesses || 0 },
                  { label:"Scored This Week",      value: dq.scored_this_week  || 0 },
                  { label:"Total SMEs",            value: dq.total_smes        || 0 },
                  { label:"Consented",             value: dq.consented         || 0 },
                  { label:"Stock Items",           value: dq.stock_items       || 0 },
                  { label:"Consent Rate",          value: dq.total_smes ? `${Math.round((Number(dq.consented||0)/Number(dq.total_smes))*100)}%` : "0%" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-surface border border-border rounded-[8px] p-3 text-center">
                    <p className="text-[13px] text-text-secondary">{label}</p>
                    <p className="text-[22px] font-bold text-primary mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
