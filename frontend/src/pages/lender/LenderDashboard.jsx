import { useState, useEffect } from "react";
import { Search, AlertTriangle, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import api from "../../utils/api";
import { formatRWF } from "../../utils/formatters";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const BAND_BADGE = { green:"success", amber:"warning", red:"danger" };

export default function LenderDashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [tab,      setTab]      = useState("portfolio");
  const [dash,     setDash]     = useState(null);
  const [clients,  setClients]  = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState("");
  const [bandFilter, setBandFilter] = useState("");
  const [loading,  setLoading]  = useState(true);
  const [referring, setReferring] = useState(false);
  const [refForm,  setRefForm]  = useState({ sme_email:"", notes:"" });

  const lenderId = user?.id;

  async function loadDash() {
    try {
      const { data } = await api.get("/v2/lender/dashboard");
      setDash(data);
    } catch { toast.error("Failed to load dashboard"); }
  }

  async function loadClients() {
    try {
      const { data } = await api.get("/v2/lender/clients", {
        params: { page, limit: 20, band: bandFilter || undefined, search: search || undefined }
      });
      setClients(data.data || []); setTotal(data.total || 0);
    } catch { toast.error("Failed to load clients"); }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadDash(), loadClients()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadClients(); }, [page, bandFilter, search]);

  async function handleReferral(e) {
    e.preventDefault();
    try {
      await api.post("/v2/lender/referral", refForm);
      toast.success("Referral created successfully");
      setReferring(false); setRefForm({ sme_email:"", notes:"" });
      loadClients();
    } catch (err) { toast.error(err.response?.data?.error || "Failed to create referral"); }
  }

  const kv = dash?.overview || {};

  return (
    <PageWrapper
      title="Lender Dashboard"
      subtitle="Your portfolio of referred SMEs"
      breadcrumbs={[{ label:"Lender", path:"/app/lender" }]}
      action={
        <button onClick={() => setReferring(r => !r)}
          className="px-4 py-2 bg-primary text-white rounded-[6px] text-[13px] font-medium hover:bg-primary/90">
          + Refer SME
        </button>
      }
    >
      {/* Referral form */}
      {referring && (
        <Card title="Refer an SME to Inzira Insights" className="mb-4">
          <form onSubmit={handleReferral} className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="text-[12px] text-text-secondary mb-1 block">SME Email Address</label>
              <input required type="email" value={refForm.sme_email}
                onChange={e => setRefForm(f => ({ ...f, sme_email: e.target.value }))}
                placeholder="owner@business.rw"
                className="w-full h-9 px-3 border border-border rounded-[6px] text-[13px] bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex-1 min-w-48">
              <label className="text-[12px] text-text-secondary mb-1 block">Notes (optional)</label>
              <input type="text" value={refForm.notes}
                onChange={e => setRefForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Loan purpose, relationship…"
                className="w-full h-9 px-3 border border-border rounded-[6px] text-[13px] bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex items-end gap-2">
              <button type="button" onClick={() => setReferring(false)}
                className="px-3 py-2 border border-border rounded-[6px] text-[13px]">Cancel</button>
              <button type="submit"
                className="px-4 py-2 bg-primary text-white rounded-[6px] text-[13px] font-medium">Submit Referral</button>
            </div>
          </form>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          { label:"Total Referred",  value: kv.total_clients || 0 },
          { label:"Avg Score",       value: kv.avg_score != null ? Math.round(kv.avg_score) : "—" },
          { label:"At Risk (Red)",   value: kv.red_count || 0, color:"text-danger" },
          { label:"Scored",          value: (kv.total_clients||0) - (kv.unscored||0) },
        ].map(({ label, value, color="text-text-primary" }) => (
          <div key={label} className="bg-surface border border-border rounded-[8px] p-4">
            <p className="text-[11px] text-text-secondary">{label}</p>
            <p className={`text-[22px] font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-4">
        {[
          { key:"portfolio", label:"All Clients" },
          { key:"risk",      label:"Risk Flags" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-[13px] font-medium border-b-2 transition-colors ${tab===t.key?"border-primary text-primary":"border-transparent text-text-secondary hover:text-text-primary"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Risk flags tab */}
      {tab === "risk" && (
        <Card title="SMEs with Score Below 50">
          {loading ? (
            <div className="py-12 text-center text-[13px] text-text-secondary">Loading…</div>
          ) : !dash?.atRisk?.length ? (
            <div className="py-12 text-center">
              <TrendingUp size={36} className="mx-auto text-success/40 mb-3" />
              <p className="text-[14px] font-medium text-text-primary">No at-risk SMEs</p>
              <p className="text-[13px] text-text-secondary mt-1">All your referred SMEs score above 50</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {dash.atRisk.map(s => (
                <div key={s.id} className="py-3 flex items-center gap-4">
                  <AlertTriangle size={16} className="text-danger shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-text-primary">{s.name}</p>
                    <p className="text-[11px] text-text-secondary">{s.sector || "—"} · {s.district || "—"}</p>
                  </div>
                  <Badge status="danger" label={`Score: ${s.score ?? "unscored"}`} />
                  <button onClick={() => navigate(`/app/lender/sme/${s.id}`)}
                    className="text-[11px] text-primary hover:underline shrink-0">View →</button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Portfolio tab */}
      {tab === "portfolio" && (
        <Card>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search SME name or email…"
                className="w-full h-9 pl-9 pr-3 border border-border rounded-[6px] text-[13px] bg-surface focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <select value={bandFilter} onChange={e => { setBandFilter(e.target.value); setPage(1); }}
              className="h-9 px-3 border border-border rounded-[6px] text-[13px] bg-surface">
              <option value="">All Bands</option>
              <option value="green">Green (65–100)</option>
              <option value="amber">Amber (40–64)</option>
              <option value="red">Red (0–39)</option>
            </select>
          </div>

          {loading ? (
            <div className="py-12 text-center text-[13px] text-text-secondary">Loading…</div>
          ) : !clients.length ? (
            <div className="py-12 text-center">
              <p className="text-[14px] font-medium text-text-primary">No clients yet</p>
              <p className="text-[13px] text-text-secondary mt-1">Refer SMEs using the button above</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {clients.map(c => (
                  <div key={c.id} className="py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-text-primary">{c.name}</p>
                      <p className="text-[11px] text-text-secondary">{c.sector || "—"} · {c.district || "—"}</p>
                    </div>
                    {c.score != null ? (
                      <Badge status={BAND_BADGE[c.band]||"neutral"} label={`${c.score} · ${c.band}`} />
                    ) : (
                      <Badge status="neutral" label="Not scored" />
                    )}
                    <button onClick={() => navigate(`/app/lender/sme/${c.sme_user_id}`)}
                      className="text-[11px] text-primary hover:underline shrink-0">View →</button>
                  </div>
                ))}
              </div>
              {total > 20 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button disabled={page===1} onClick={() => setPage(p=>p-1)}
                    className="px-3 py-1.5 border border-border rounded text-[12px] disabled:opacity-40">Prev</button>
                  <span className="px-3 py-1.5 text-[12px] text-text-secondary">Page {page} of {Math.ceil(total/20)}</span>
                  <button disabled={page>=Math.ceil(total/20)} onClick={() => setPage(p=>p+1)}
                    className="px-3 py-1.5 border border-border rounded text-[12px] disabled:opacity-40">Next</button>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </PageWrapper>
  );
}
