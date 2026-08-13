import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Activity, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import api from "../../utils/api";

function Gauge({ score, band }) {
  const color = band === "green" ? "#10B981" : band === "amber" ? "#F59E0B" : "#EF4444";
  const label = band === "green" ? "Healthy" : band === "amber" ? "Needs Attention" : "At Risk";
  const angle = (Math.min(100, Math.max(0, score ?? 0)) / 100) * 180;
  const rad   = (angle - 90) * (Math.PI / 180);
  const ex    = 100 + 80 * Math.cos(rad);
  const ey    = 100 + 80 * Math.sin(rad);
  return (
    <div className="flex flex-col items-center py-6">
      <svg width="200" height="120" viewBox="0 0 200 120">
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#E5E7EB" strokeWidth="16" strokeLinecap="round" />
        {score != null && (
          <path d={`M 20 100 A 80 80 0 ${angle>90?1:0} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`}
            fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" />
        )}
        <text x="100" y="95" textAnchor="middle" fontSize="36" fontWeight="800" fill={color}>{score ?? "–"}</text>
        <text x="100" y="114" textAnchor="middle" fontSize="12" fill="#6B7280">{label}</text>
      </svg>
      <div className="flex gap-5 mt-1">
        {[["#EF4444","0–39"],["#F59E0B","40–64"],["#10B981","65–100"]].map(([c,r]) => (
          <div key={r} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor:c }} />
            <span className="text-[11px] text-gray-500">{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdvisoryPublic() {
  const { token } = useParams();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    api.get(`/v2/score/advisory/${token}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || "Invalid or expired advisory link"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <AlertTriangle size={40} className="mx-auto text-red-400 mb-4" />
        <h2 className="text-[18px] font-bold text-gray-900 mb-2">Advisory Link Error</h2>
        <p className="text-[12px] text-gray-500">{error}</p>
      </div>
    </div>
  );

  const positive = data?.factors?.positive || [];
  const negative = data?.factors?.negative || [];
  const recs     = data?.recommendations   || [];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <Activity size={20} className="text-green-600" />
            <span className="text-[12px] font-bold text-gray-900">Inzira Insights</span>
          </div>
          <h1 className="text-[24px] font-bold text-gray-900">Business Health Report</h1>
          <p className="text-[11px] text-gray-500 mt-1">
            Shared by this business · Model v{data?.model_version || "1.0.0-rules"}
          </p>
        </div>

        {/* Score */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="text-[12px] font-semibold text-gray-700 mb-2 text-center">Business Health Score</h2>
          <Gauge score={data?.score} band={data?.band} />
        </div>

        {/* Factors */}
        {(positive.length > 0 || negative.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {positive.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-[11px] font-semibold text-gray-700 mb-3">Positive Factors</h3>
                <div className="space-y-2">
                  {positive.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                      <TrendingUp size={14} className="text-green-600 shrink-0" />
                      <span className="text-[12.5px] text-gray-700">{f.label_en || f.key}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {negative.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-[11px] font-semibold text-gray-700 mb-3">Areas to Improve</h3>
                <div className="space-y-2">
                  {negative.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                      <TrendingDown size={14} className="text-red-500 shrink-0" />
                      <span className="text-[12.5px] text-gray-700">{f.label_en || f.key}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {recs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
            <h3 className="text-[11px] font-semibold text-gray-700 mb-3">Recommendations</h3>
            <div className="space-y-2">
              {recs.map((rec, i) => (
                <div key={i} className="flex gap-3 p-3 bg-blue-50 rounded-lg">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">{i+1}</span>
                  <p className="text-[12.5px] text-gray-700">{rec.text_en || rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-gray-400">
          Generated by Inzira Insights · Rwanda SME Intelligence Platform · For informational use only
        </p>
      </div>
    </div>
  );
}
