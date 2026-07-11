import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, TrendingUp, TrendingDown, RefreshCw, ExternalLink } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import toast from "react-hot-toast";

// ─── Half-circle gauge ────────────────────────────────────────────────────────
function Gauge({ score, band }) {
  const color = band === "green" ? "#10B981" : band === "amber" ? "#F59E0B" : "#EF4444";
  const label = band === "green" ? "Healthy" : band === "amber" ? "Watch" : "At Risk";
  const pct   = Math.min(100, Math.max(0, score ?? 0));
  const angle = (pct / 100) * 180;
  const rad   = (angle - 90) * (Math.PI / 180);
  const cx = 100; const cy = 100; const r = 80;
  const ex = cx + r * Math.cos(rad);
  const ey = cy + r * Math.sin(rad);

  return (
    <div className="flex flex-col items-center py-4">
      <svg width="200" height="120" viewBox="0 0 200 120">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#E5E7EB" strokeWidth="16" strokeLinecap="round" />
        {score !== null && score !== undefined && (
          <path
            d={`M 20 100 A 80 80 0 ${angle > 90 ? 1 : 0} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`}
            fill="none" stroke={color} strokeWidth="16" strokeLinecap="round"
          />
        )}
        {/* Band markers */}
        <text x="18" y="114" fontSize="9" fill="#EF4444" fontWeight="600">0</text>
        <text x="88" y="26" fontSize="9" fill="#F59E0B" fontWeight="600">50</text>
        <text x="178" y="114" fontSize="9" fill="#10B981" fontWeight="600">100</text>
        {/* Score */}
        <text x="100" y="95" textAnchor="middle" fontSize="36" fontWeight="800" fill={color}>
          {score ?? "–"}
        </text>
        <text x="100" y="114" textAnchor="middle" fontSize="13" fill="#6B7280">{label}</text>
      </svg>
      <div className="flex gap-6 mt-2">
        {[["Red", "#EF4444", "0–39"], ["Amber", "#F59E0B", "40–64"], ["Green", "#10B981", "65–100"]].map(([b, c, range]) => (
          <div key={b} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c }} />
            <span className="text-[13px] text-text-secondary">{range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Factor pill ─────────────────────────────────────────────────────────────
function Factor({ label, direction, value }) {
  const positive = direction === "positive";
  return (
    <div className={`flex items-center gap-3 p-3 rounded-[8px] border ${positive ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"}`}>
      {positive ? <TrendingUp size={16} className="text-success shrink-0" /> : <TrendingDown size={16} className="text-danger shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-medium text-text-primary">{label}</p>
        {value !== undefined && (
          <p className="text-[13px] text-text-secondary mt-0.5">{value}</p>
        )}
      </div>
    </div>
  );
}

export default function HealthScore() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [score,    setScore]    = useState(null);
  const [history,  setHistory]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [scoring,  setScoring]  = useState(false);

  const userId = user?.id;

  async function loadScore() {
    if (!userId) return;
    setLoading(true);
    try {
      const [latestRes, histRes] = await Promise.all([
        api.get(`/v2/score/${userId}/latest`).catch(() => null),
        api.get(`/v2/score/${userId}/history?limit=12`).catch(() => null),
      ]);
      if (latestRes?.data) setScore(latestRes.data);
      if (histRes?.data?.history) setHistory(Array.isArray(histRes.data.history) ? histRes.data.history : []);
    } catch {
      // fail silently — show empty state
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadScore(); }, [userId]);

  async function runScore() {
    setScoring(true);
    try {
      const { data } = await api.post("/v2/score/calculate");
      setScore(data);
      toast.success("Health score updated");
      loadScore();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to calculate score");
    } finally {
      setScoring(false);
    }
  }

  const chartData = history.map(h => ({
    date: new Date(h.created_at).toLocaleDateString("en-RW", { month: "short", day: "numeric" }),
    score: h.score,
    band: h.band,
  })).reverse();

  const factors    = score?.factors     || {};
  const positive   = factors.positive   || [];
  const negative   = factors.negative   || [];
  const recs       = score?.recommendations || [];

  return (
    <PageWrapper
      title="Business Health Score"
      subtitle="AI-powered analysis of your business vitals"
      breadcrumbs={[{ label: "Intelligence", path: "/app/health-score" }, { label: "Health Score", path: "/app/health-score" }]}
      action={
        <button onClick={runScore} disabled={scoring}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[6px] text-[14px] font-medium hover:bg-primary/90 disabled:opacity-60">
          <RefreshCw size={14} className={scoring ? "animate-spin" : ""} />
          {scoring ? "Calculating…" : "Recalculate Score"}
        </button>
      }
    >
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-48 bg-surface border border-border rounded-[8px] animate-pulse" />)}
        </div>
      ) : !score ? (
        <Card className="text-center py-16">
          <Activity size={48} className="mx-auto text-text-secondary/30 mb-4" />
          <h3 className="text-[17px] font-bold text-text-primary mb-2">No Score Yet</h3>
          <p className="text-[14px] text-text-secondary max-w-md mx-auto mb-6">
            Your health score is calculated from your sales, expenses, and inventory data.
            Add some data and click "Recalculate Score" to get started.
          </p>
          <button onClick={runScore} disabled={scoring}
            className="px-6 py-2.5 bg-primary text-white rounded-[6px] text-[14px] font-medium hover:bg-primary/90 disabled:opacity-60">
            {scoring ? "Calculating…" : "Calculate My Score"}
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column — gauge + meta */}
          <div className="lg:col-span-1 space-y-4">
            <Card title="Current Score">
              <Gauge score={score.score} band={score.band} />
              <div className="border-t border-border pt-3 mt-2 space-y-1.5">
                <div className="flex justify-between text-[13px]">
                  <span className="text-text-secondary">Model Version</span>
                  <span className="font-mono text-text-primary">{score.model_version || "1.0.0-rules"}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-text-secondary">Calculated</span>
                  <span className="text-text-primary">
                    {score.created_at ? new Date(score.created_at).toLocaleDateString("en-RW") : "Just now"}
                  </span>
                </div>
                {score.advisory_token && (
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/advisory/${score.advisory_token}`;
                      navigator.clipboard.writeText(url);
                      toast.success("Advisory link copied");
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 mt-2 text-[13px] text-primary border border-primary/30 rounded-[6px] hover:bg-primary/5">
                    <ExternalLink size={12} /> Copy Advisory Link
                  </button>
                )}
              </div>
            </Card>

            {/* Recommendations */}
            {recs.length > 0 && (
              <Card title="Recommendations">
                <div className="space-y-3">
                  {recs.map((rec, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-primary/5 border border-primary/20 rounded-[8px]">
                      <span className="w-5 h-5 rounded-full bg-primary text-white text-[12px] font-bold flex items-center justify-center shrink-0">{i+1}</span>
                      <p className="text-[12.5px] text-text-primary">{rec[lang] || rec.en || rec.text_en || (typeof rec === 'string' ? rec : '')}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right column — history + factors */}
          <div className="lg:col-span-2 space-y-4">
            {/* Score history chart */}
            <Card title="12-Month Score Trend">
              {chartData.length < 2 ? (
                <div className="h-48 flex items-center justify-center text-[14px] text-text-secondary">
                  Score history will appear after multiple calculations
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={v => [v, "Score"]} />
                    {/* Band zones */}
                    <Line type="monotone" dataKey="score" stroke="#10B981" strokeWidth={2.5}
                      dot={({ cx, cy, payload }) => {
                        const c = payload.band === "green" ? "#10B981" : payload.band === "amber" ? "#F59E0B" : "#EF4444";
                        return <circle key={cx} cx={cx} cy={cy} r={4} fill={c} stroke="white" strokeWidth={1.5} />;
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* Factor breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card title="Positive Factors">
                {positive.length ? (
                  <div className="space-y-2">
                    {positive.map((f, i) => (
                      <Factor key={i} label={f[`label_${lang}`] || f.label_en || f.key} direction="positive" value={f.value !== undefined ? `Score: +${f.value}` : undefined} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[14px] text-text-secondary py-4 text-center">No positive factors identified yet</p>
                )}
              </Card>
 
              <Card title="Negative Factors">
                {negative.length ? (
                  <div className="space-y-2">
                    {negative.map((f, i) => (
                      <Factor key={i} label={f[`label_${lang}`] || f.label_en || f.key} direction="negative" value={f.value !== undefined ? `Impact: ${f.value}` : undefined} />
                    ))}
                  </div>
                ) : (
                  <p className="text-[14px] text-text-secondary py-4 text-center">No negative factors found</p>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
