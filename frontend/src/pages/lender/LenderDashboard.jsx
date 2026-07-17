import { useState, useEffect, useCallback } from "react";
import {
  Search, AlertTriangle, TrendingUp, TrendingDown, Users,
  CheckCircle, Clock, XCircle, ChevronRight, RefreshCw, Plus, X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../../components/layout/PageWrapper";
import api from "../../utils/api";
import toast from "react-hot-toast";

// ── Helpers ──────────────────────────────────────────────────────────────────
const BAND_COLOR  = { green: "#16A34A", amber: "#D97706", red: "#DC2626" };
const BAND_BG     = { green: "bg-green-50 text-green-700 border-green-200", amber: "bg-amber-50 text-amber-700 border-amber-200", red: "bg-red-50 text-red-700 border-red-200" };
const REF_COLOR   = { pending:"bg-gray-100 text-gray-600", active:"bg-blue-50 text-blue-700", closed:"bg-green-50 text-green-700", rejected:"bg-red-50 text-red-600" };
const REF_ICON    = { pending: Clock, active: CheckCircle, closed: CheckCircle, rejected: XCircle };

function ScoreBadge({ score, band }) {
  if (score == null) return <span className="text-[13px] text-gray-400 italic">Unscored</span>;
  const dot = band === "green" ? "bg-green-500" : band === "amber" ? "bg-amber-500" : "bg-red-500";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold px-2.5 py-0.5 rounded-full border ${BAND_BG[band] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {score} · {band?.toUpperCase()}
    </span>
  );
}

function StatCard({ label, value, sub, icon: Icon, accent, trend }) {
  return (
    <div className="bg-white border border-border rounded-[10px] p-4 flex items-start gap-3">
      {Icon && (
        <div className={`w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 ${accent || "bg-orange-50"}`}>
          <Icon size={17} className="text-primary" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[13px] text-text-secondary font-medium uppercase tracking-wide">{label}</p>
        <p className="text-[26px] font-bold text-text-primary leading-tight mt-0.5">{value ?? "—"}</p>
        {sub && <p className="text-[13px] text-text-secondary mt-0.5">{sub}</p>}
      </div>
      {trend != null && (
        <div className={`ml-auto text-[13px] font-semibold ${trend >= 0 ? "text-green-600" : "text-red-500"}`}>
          {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        </div>
      )}
    </div>
  );
}

// Band health bar
function PortfolioHealthBar({ green, amber, red, total }) {
  if (!total) return null;
  const pct = (n) => Math.round((n / total) * 100);
  const gp = pct(green), ap = pct(amber), rp = pct(red);
  return (
    <div className="bg-white border border-border rounded-[10px] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[14px] font-semibold text-text-primary">Portfolio Health</p>
        <p className="text-[13px] text-text-secondary">{total} SMEs</p>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        {gp > 0 && <div className="bg-green-500 rounded-l-full" style={{ width: `${gp}%` }} title={`Green ${gp}%`} />}
        {ap > 0 && <div className="bg-amber-400" style={{ width: `${ap}%` }} title={`Amber ${ap}%`} />}
        {rp > 0 && <div className="bg-red-500 rounded-r-full" style={{ width: `${rp}%` }} title={`Red ${rp}%`} />}
      </div>
      <div className="flex gap-4 mt-2">
        {[{ label:"Green", n: green, cls: "bg-green-500" }, { label:"Amber", n: amber, cls: "bg-amber-400" }, { label:"Red", n: red, cls: "bg-red-500" }].map(({ label, n, cls }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${cls}`} />
            <span className="text-[13px] text-text-secondary">{label} <span className="font-semibold text-text-primary">{n}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function LenderDashboard() {
  const navigate = useNavigate();
  const [tab,         setTab]         = useState("portfolio");
  const [dash,        setDash]        = useState(null);
  const [clients,     setClients]     = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState("");
  const [bandFilter,  setBandFilter]  = useState("");
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [showRefForm, setShowRefForm] = useState(false);
  const [refForm,     setRefForm]     = useState({ sme_email: "", notes: "" });
  const [submitting,  setSubmitting]  = useState(false);

  const loadDash = useCallback(async () => {
    try {
      const { data } = await api.get("/v2/lender/dashboard");
      setDash(data);
    } catch { toast.error("Failed to load dashboard"); }
  }, []);

  const loadClients = useCallback(async () => {
    try {
      const { data } = await api.get("/v2/lender/clients", {
        params: { page, limit: 15, band: bandFilter || undefined, search: search || undefined }
      });
      setClients(data.data || []);
      setTotal(data.total || 0);
    } catch { toast.error("Failed to load clients"); }
  }, [page, bandFilter, search]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadDash(), loadClients()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadClients(); }, [page, bandFilter, search]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([loadDash(), loadClients()]);
    setRefreshing(false);
    toast.success("Refreshed");
  }

  async function handleReferral(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/v2/lender/referral", refForm);
      toast.success("Referral created — SME added to your portfolio");
      setShowRefForm(false);
      setRefForm({ sme_email: "", notes: "" });
      await Promise.all([loadDash(), loadClients()]);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create referral");
    } finally { setSubmitting(false); }
  }

  const kv = dash?.overview || {};
  const totalN  = Number(kv.total_clients || 0);
  const greenN  = Number(kv.green_count   || 0);
  const amberN  = Number(kv.amber_count   || 0);
  const redN    = Number(kv.red_count     || 0);
  const avgScore = kv.avg_score != null ? Math.round(kv.avg_score) : null;

  return (
    <PageWrapper
      title="Lender Dashboard"
      subtitle="Monitor your SME portfolio and credit risk"
      breadcrumbs={[{ label: "Lender", path: "/app/lender" }]}
      action={
        <div className="flex gap-2">
          <button onClick={handleRefresh} disabled={refreshing}
            className="p-2 border border-border rounded-[6px] text-text-secondary hover:text-text-primary hover:bg-background disabled:opacity-40 transition-colors">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowRefForm(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-[6px] text-[14px] font-medium hover:bg-primary/90 transition-colors">
            <Plus size={14} /> Refer SME
          </button>
        </div>
      }
    >
      {/* ── Refer SME modal-style form ── */}
      {showRefForm && (
        <div className="mb-5 bg-white border border-border rounded-[10px] shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[15px] font-semibold text-text-primary">Refer an SME to Inzira Insights</p>
              <p className="text-[13px] text-text-secondary mt-0.5">Enter the SME's registered email — they'll be added to your portfolio immediately.</p>
            </div>
            <button onClick={() => setShowRefForm(false)} className="p-1 rounded hover:bg-background">
              <X size={16} className="text-text-secondary" />
            </button>
          </div>
          <form onSubmit={handleReferral} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[13px] font-medium text-text-secondary block mb-1">SME Email Address *</label>
              <input required type="email" value={refForm.sme_email}
                onChange={e => setRefForm(f => ({ ...f, sme_email: e.target.value }))}
                placeholder="owner@business.rw"
                className="w-full h-9 px-3 border border-border rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-[13px] font-medium text-text-secondary block mb-1">Notes (optional)</label>
              <input type="text" value={refForm.notes}
                onChange={e => setRefForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Loan purpose, business relationship…"
                className="w-full h-9 px-3 border border-border rounded-[6px] text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowRefForm(false)}
                className="h-9 px-4 border border-border rounded-[6px] text-[14px] text-text-secondary hover:bg-background">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="h-9 px-4 bg-primary text-white rounded-[6px] text-[14px] font-medium hover:bg-primary/90 disabled:opacity-50">
                {submitting ? "Submitting…" : "Create Referral"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Portfolio"  value={totalN}   icon={Users}         sub="referred SMEs"         accent="bg-orange-50" />
        <StatCard label="Average Score"    value={avgScore}  icon={TrendingUp}    sub="across scored SMEs"    accent="bg-blue-50" />
        <StatCard label="Low Risk (Green)" value={greenN}   icon={CheckCircle}   sub={`${totalN ? Math.round(greenN/totalN*100) : 0}% of portfolio`} accent="bg-green-50" />
        <StatCard label="At Risk (Red)"    value={redN}     icon={AlertTriangle} sub="need immediate review"  accent="bg-red-50" />
      </div>

      {/* ── Portfolio Health Bar ── */}
      {totalN > 0 && (
        <div className="mb-4">
          <PortfolioHealthBar green={greenN} amber={amberN} red={redN} total={totalN} />
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-0 border-b border-border mb-4">
        {[
          { key: "portfolio",     label: "All Clients",      count: totalN },
          { key: "risk",         label: "At Risk",           count: redN, alert: redN > 0 },
          { key: "recent",       label: "Recently Scored",   count: dash?.recentlyScored?.length || 0 },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[14px] font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}>
            {t.label}
            <span className={`text-[13px] px-1.5 py-0.5 rounded-full font-semibold ${
              tab === t.key
                ? "bg-primary/10 text-primary"
                : t.alert
                ? "bg-red-50 text-red-600"
                : "bg-background text-text-secondary"
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── Portfolio Tab ── */}
      {tab === "portfolio" && (
        <div className="bg-white border border-border rounded-[10px] overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-border flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name or email…"
                className="w-full h-9 pl-9 pr-3 border border-border rounded-[6px] text-[14px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </div>
            <select value={bandFilter}
              onChange={e => { setBandFilter(e.target.value); setPage(1); }}
              className="h-9 px-3 border border-border rounded-[6px] text-[14px] bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">All Bands</option>
              <option value="green">🟢 Green (65–100)</option>
              <option value="amber">🟡 Amber (40–64)</option>
              <option value="red">🔴 Red (0–39)</option>
            </select>
          </div>

          {loading ? (
            <div className="py-16 text-center text-[14px] text-text-secondary">Loading portfolio…</div>
          ) : !clients.length ? (
            <div className="py-16 text-center">
              <Users size={40} className="mx-auto text-border mb-3" />
              <p className="text-[15px] font-semibold text-text-primary">No clients in your portfolio</p>
              <p className="text-[14px] text-text-secondary mt-1">Use the Refer SME button to add businesses</p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="hidden md:grid grid-cols-[1fr_120px_100px_120px_140px_120px_80px] gap-3 px-4 py-2 bg-background border-b border-border">
                {["Business", "Sector", "Score", "Verdict", "Referral", "Referred On", ""].map(h => (
                  <p key={h} className="text-[13px] font-semibold uppercase tracking-wide text-text-secondary">{h}</p>
                ))}
              </div>

              <div className="divide-y divide-border">
                {clients.map(c => {
                  const RefIcon = REF_ICON[c.referral_status] || Clock;
                  const verdict = !c.score
                    ? { label: "Pending", cls: "bg-gray-100 text-gray-500" }
                    : c.band === "green"
                    ? { label: "Recommended", cls: "bg-green-100 text-green-700" }
                    : c.band === "amber"
                    ? { label: "Review", cls: "bg-amber-100 text-amber-700" }
                    : { label: "Declined", cls: "bg-red-100 text-red-700" };
                  return (
                    <div key={c.id}
                      className="grid grid-cols-1 md:grid-cols-[1fr_120px_100px_120px_140px_120px_80px] gap-2 md:gap-3 px-4 py-3 hover:bg-orange-50/30 transition-colors items-center cursor-pointer"
                      onClick={() => navigate(`/app/lender/sme/${c.sme_user_id}`)}>
                      {/* Name */}
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-text-primary truncate">{c.name}</p>
                        <p className="text-[13px] text-text-secondary truncate">{c.email}</p>
                      </div>
                      {/* Sector */}
                      <p className="text-[13px] text-text-secondary hidden md:block truncate">{c.sector || "—"}</p>
                      {/* Score */}
                      <div className="hidden md:block">
                        <ScoreBadge score={c.score} band={c.band} />
                      </div>
                      {/* Loan Verdict */}
                      <div className="hidden md:block">
                        <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${verdict.cls}`}>
                          {verdict.label}
                        </span>
                      </div>
                      {/* Referral */}
                      <div className="hidden md:flex items-center gap-1.5">
                        {c.referral_code ? (
                          <>
                            <span className={`inline-flex items-center gap-1 text-[13px] font-medium px-2 py-0.5 rounded-full ${REF_COLOR[c.referral_status] || "bg-gray-100 text-gray-600"}`}>
                              <RefIcon size={10} />
                              {c.referral_status || "pending"}
                            </span>
                            <span className="text-[13px] text-text-secondary font-mono">{c.referral_code}</span>
                          </>
                        ) : (
                          <span className="text-[13px] text-text-secondary">—</span>
                        )}
                      </div>
                      {/* Date */}
                      <p className="text-[13px] text-text-secondary hidden md:block">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                      </p>
                      {/* Action */}
                      <div className="flex justify-end" onClick={e => { e.stopPropagation(); navigate(`/app/lender/sme/${c.sme_user_id}`); }}>
                        <span className="flex items-center gap-1 text-[13px] text-primary font-medium hover:underline">
                          View <ChevronRight size={13} />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {total > 15 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background">
                  <p className="text-[13px] text-text-secondary">Showing {(page-1)*15+1}–{Math.min(page*15, total)} of {total}</p>
                  <div className="flex gap-2">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                      className="px-3 py-1.5 border border-border rounded-[6px] text-[13px] disabled:opacity-40 hover:bg-background">← Prev</button>
                    <button disabled={page >= Math.ceil(total/15)} onClick={() => setPage(p => p + 1)}
                      className="px-3 py-1.5 border border-border rounded-[6px] text-[13px] disabled:opacity-40 hover:bg-background">Next →</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── At Risk Tab ── */}
      {tab === "risk" && (
        <div className="space-y-3">
          {loading ? (
            <div className="py-16 text-center text-[14px] text-text-secondary">Loading…</div>
          ) : !dash?.atRisk?.length ? (
            <div className="bg-white border border-border rounded-[10px] py-16 text-center">
              <CheckCircle size={40} className="mx-auto text-green-500 mb-3" />
              <p className="text-[15px] font-semibold text-text-primary">No at-risk SMEs</p>
              <p className="text-[14px] text-text-secondary mt-1">All your clients score above 40</p>
            </div>
          ) : (
            <>
              <div className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-3 flex items-start gap-3">
                <AlertTriangle size={16} className="text-red-600 mt-0.5 shrink-0" />
                <p className="text-[14px] text-red-800">
                  <span className="font-semibold">{dash.atRisk.length} SME{dash.atRisk.length > 1 ? "s are" : " is"} in the red band.</span>
                  {" "}These businesses have critical issues — low sales frequency, high expense ratio, or less than 3 months trading history. Consider advisory sessions before extending credit.
                </p>
              </div>

              {dash.atRisk.map((s, i) => (
                <div key={i} className="bg-white border border-red-200 rounded-[10px] p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <span className="text-[16px] font-bold text-red-600">{s.score ?? "?"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-text-primary">{s.name}</p>
                    <p className="text-[13px] text-text-secondary">{s.sector || "—"} · Score: {s.score ?? "unscored"}/100</p>
                  </div>
                  <div className="hidden sm:flex flex-col items-end gap-1">
                    <span className="text-[13px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">HIGH RISK</span>
                    <p className="text-[13px] text-text-secondary">Recommend advisory session</p>
                  </div>
                  <button
                    onClick={() => navigate(`/app/lender/sme/${s.sme_user_id || s.id}`)}
                    className="shrink-0 flex items-center gap-1 text-[13px] text-primary font-medium hover:underline">
                    Review <ChevronRight size={13} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── Recently Scored Tab ── */}
      {tab === "recent" && (
        <div className="bg-white border border-border rounded-[10px] overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-background">
            <p className="text-[14px] font-semibold text-text-primary">Latest Score Updates</p>
            <p className="text-[13px] text-text-secondary">SMEs in your portfolio with the most recent scoring runs</p>
          </div>
          {loading ? (
            <div className="py-16 text-center text-[14px] text-text-secondary">Loading…</div>
          ) : !dash?.recentlyScored?.length ? (
            <div className="py-12 text-center text-[14px] text-text-secondary">No scored SMEs yet</div>
          ) : (
            <div className="divide-y divide-border">
              {dash.recentlyScored.map((s, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-4">
                  {/* Score donut visual */}
                  <div className="relative w-10 h-10 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                      <circle cx="18" cy="18" r="15" fill="none"
                        stroke={BAND_COLOR[s.band] || "#9CA3AF"} strokeWidth="4"
                        strokeDasharray={`${(s.score / 100) * 94.2} 94.2`}
                        strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold text-text-primary">
                      {s.score}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-text-primary">{s.name}</p>
                    <p className="text-[13px] text-text-secondary">{s.sector || "—"}</p>
                  </div>
                  <ScoreBadge score={s.score} band={s.band} />
                  <p className="text-[13px] text-text-secondary hidden sm:block shrink-0">
                    {s.calculated_at ? new Date(s.calculated_at).toLocaleDateString() : "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── No portfolio empty state ── */}
      {!loading && totalN === 0 && (
        <div className="mt-6 bg-orange-50 border border-orange-200 rounded-[10px] p-8 text-center">
          <TrendingUp size={40} className="mx-auto text-primary mb-3" />
          <p className="text-[17px] font-semibold text-text-primary">Start building your portfolio</p>
          <p className="text-[14px] text-text-secondary mt-1 max-w-sm mx-auto">
            Refer SMEs by entering their Inzira Insights email address. You'll see their credit scores, business health trends, and risk flags.
          </p>
          <button onClick={() => setShowRefForm(true)}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-[8px] text-[14px] font-medium hover:bg-primary/90">
            <Plus size={14} /> Refer your first SME
          </button>
        </div>
      )}
    </PageWrapper>
  );
}
