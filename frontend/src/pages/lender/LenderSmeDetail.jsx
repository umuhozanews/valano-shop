import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import PageWrapper from "../../components/layout/PageWrapper";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import api from "../../utils/api";
import toast from "react-hot-toast";

const BAND_BADGE = { green:"success", amber:"warning", red:"danger" };

export default function LenderSmeDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [client,  setClient]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/v2/lender/clients/${id}`)
      .then(({ data }) => setClient(data))
      .catch(() => toast.error("Failed to load SME details"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex h-64 items-center justify-center text-text-secondary text-[14px]">Loading…</div>
  );
  if (!client) return (
    <div className="flex h-64 flex-col items-center justify-center gap-3">
      <AlertTriangle size={32} className="text-danger" />
      <p className="text-[15px] text-text-primary">SME not found in your portfolio</p>
      <button onClick={() => navigate("/app/lender")} className="text-[14px] text-primary hover:underline">← Back to portfolio</button>
    </div>
  );

  const scoreHistory = client.scoreHistory || [];

  return (
    <PageWrapper
      title={client.name}
      subtitle={`${client.sector || "—"} · ${client.district || "—"}`}
      breadcrumbs={[
        { label: "Portfolio", path: "/app/lender" },
        { label: client.name, path: `/app/lender/sme/${id}` },
      ]}
      action={
        <button onClick={() => navigate("/app/lender")}
          className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-[6px] text-[14px] text-text-secondary hover:text-text-primary">
          <ArrowLeft size={14} /> Back
        </button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Score card */}
        <Card title="Credit Score" className="lg:col-span-1">
          {client.score != null ? (
            <div className="text-center py-4">
              <p className="text-[56px] font-bold leading-none text-text-primary">{client.score}</p>
              <div className="mt-2">
                <Badge status={BAND_BADGE[client.band]||"neutral"} label={client.band?.toUpperCase() || "—"} />
              </div>
              <p className="text-[13px] text-text-secondary mt-3">
                Last scored: {client.calculated_at ? new Date(client.calculated_at).toLocaleDateString() : "—"}
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-[15px] text-text-secondary">Not yet scored</p>
            </div>
          )}
        </Card>

        {/* Profile */}
        <Card title="Business Profile" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label:"Email",       value: client.email },
              { label:"Phone",       value: client.phone || "—" },
              { label:"Sector",      value: client.sector || "—" },
              { label:"District",    value: client.district || "—" },
              { label:"Member Since",value: client.member_since ? new Date(client.member_since).toLocaleDateString() : "—" },
              { label:"Referral Status", value: client.referral_status || "—" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[13px] text-text-secondary">{label}</p>
                <p className="text-[14px] text-text-primary font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {client.notes && (
            <div className="mt-4 p-3 bg-background rounded-[6px]">
              <p className="text-[13px] text-text-secondary mb-1">Notes</p>
              <p className="text-[14px] text-text-primary">{client.notes}</p>
            </div>
          )}

          {client.advisory_token && (
            <div className="mt-4">
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/advisory/${client.advisory_token}`); toast.success("Advisory link copied"); }}
                className="text-[13px] text-primary hover:underline">
                Copy advisory share link →
              </button>
            </div>
          )}
        </Card>

        {/* Score history */}
        {scoreHistory.length > 0 && (
          <Card title="Score History (Last 6)" className="lg:col-span-3">
            <div className="flex items-end gap-3 h-32 px-2">
              {scoreHistory.map((h, i) => {
                const pct = Math.round(h.score || 0);
                const color = h.band === "green" ? "bg-success" : h.band === "amber" ? "bg-warning" : "bg-danger";
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[13px] text-text-primary font-medium">{pct}</span>
                    <div className="w-full bg-border rounded-t-[4px] relative" style={{ height: "80px" }}>
                      <div className={`absolute bottom-0 w-full ${color} rounded-t-[4px] transition-all`}
                        style={{ height: `${pct}%` }} />
                    </div>
                    <span className="text-[12px] text-text-secondary">{h.created_at ? new Date(h.created_at).toLocaleDateString("en-RW", { month:"short", day:"numeric" }) : "—"}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}
