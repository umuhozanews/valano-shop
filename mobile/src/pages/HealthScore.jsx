import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import {
  TrendingUp,
  TrendingDown,
  Info,
  CheckCircle2,
  Globe,
  LogOut,
  Sparkles,
} from "lucide-react";
import api, { errorMessage } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../lib/i18n.jsx";
import { bandKey, parseMaybeJSON } from "../lib/score";
import ScreenHeader from "../components/ScreenHeader";
import HealthGauge from "../components/HealthGauge";
import Loading from "../components/Loading";
import { Button } from "../components/ui";

function FactorRow({ label, positive }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-card px-3.5 py-3">
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            positive ? "bg-success-lt" : "bg-danger-lt"
          }`}
        >
          {positive ? (
            <TrendingUp size={14} className="text-success" />
          ) : (
            <TrendingDown size={14} className="text-danger" />
          )}
        </div>
        <span className="text-[12.5px] font-semibold text-ink">{label}</span>
      </div>
      <span className={`text-[11px] font-bold ${positive ? "text-success" : "text-danger"}`}>
        {positive ? "▲" : "▼"}
      </span>
    </div>
  );
}

export default function HealthScore() {
  const { user, logout } = useAuth();
  const { t, lang, toggle } = useLang();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null); // { score, band, factors, recommendations }
  const [trend, setTrend] = useState(0);
  const [calculating, setCalculating] = useState(false);

  const businessId = user?.id;

  const normalise = useCallback((raw) => {
    if (!raw) return null;
    return {
      score: raw.score,
      band: raw.band,
      factors: parseMaybeJSON(raw.factors),
      recommendations: parseMaybeJSON(raw.recommendations),
    };
  }, []);

  const load = useCallback(async () => {
    if (!businessId) return;
    try {
      const [latestRes, histRes] = await Promise.allSettled([
        api.get(`/v2/score/${businessId}/latest`),
        api.get(`/v2/score/${businessId}/history`, { params: { limit: 12 } }),
      ]);
      if (latestRes.status === "fulfilled") setData(normalise(latestRes.value.data));
      else setData(null); // 404 → no score yet
      if (histRes.status === "fulfilled") setTrend(histRes.value.data?.trend || 0);
    } finally {
      setLoading(false);
    }
  }, [businessId, normalise]);

  useEffect(() => {
    load();
  }, [load]);

  async function calculate() {
    setCalculating(true);
    try {
      const { data: res } = await api.post("/v2/score/calculate", {});
      if (res.score == null) {
        toast.error(res.message || "Scoring is disabled.");
      } else {
        setData({
          score: res.score,
          band: res.band,
          factors: res.factors,
          recommendations: res.recommendations,
        });
        toast.success(`${t("health_score")}: ${res.score}`);
      }
    } catch (err) {
      toast.error(errorMessage(err, "Could not calculate the score."));
    } finally {
      setCalculating(false);
    }
  }

  if (loading) return <Loading label={t("loading")} />;

  const score = data?.score ?? null;
  const band = data?.band ?? null;
  const positives = data?.factors?.positive || [];
  const negatives = data?.factors?.negative || [];
  const recs = data?.recommendations || [];
  const labelFor = (f) => (lang === "rw" ? f.label_rw || f.label_en : f.label_en);

  return (
    <div className="flex h-full flex-col">
      <ScreenHeader
        title={t("health_title")}
        back
        right={
          <button
            onClick={toggle}
            className="flex items-center gap-1 rounded-full border border-line bg-card px-2 py-1 text-[10px] font-bold text-ink"
          >
            <Globe size={11} /> {lang.toUpperCase()}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {/* Gauge */}
        <div className="mt-2 flex flex-col items-center">
          <HealthGauge score={score} size={144} label={score != null ? t(bandKey(band, score)) : undefined} />
          <span className="mt-2 px-8 text-center font-body text-[11.5px] text-muted">
            {score != null ? t("better_than") : t("no_score")}
          </span>
          {score != null && trend !== 0 && (
            <span
              className={`mt-1 text-[11px] font-semibold ${trend > 0 ? "text-success" : "text-danger"}`}
            >
              {trend > 0 ? "+" : ""}
              {trend} pts {t("vs_last_month")}
            </span>
          )}
        </div>

        {score == null ? (
          <div className="mt-6">
            <Button full variant="green" disabled={calculating} onClick={calculate}>
              <Sparkles size={16} /> {calculating ? "…" : t("calculate")}
            </Button>
          </div>
        ) : (
          <>
            {/* Factors */}
            {(positives.length > 0 || negatives.length > 0) && (
              <div className="mt-5">
                <span className="font-body text-[11.5px] font-bold text-ink">{t("top_factors")}</span>
                <div className="mt-2 flex flex-col gap-2">
                  {positives.slice(0, 3).map((f, i) => (
                    <FactorRow key={`p${i}`} label={labelFor(f)} positive />
                  ))}
                  {negatives.slice(0, 2).map((f, i) => (
                    <FactorRow key={`n${i}`} label={labelFor(f)} positive={false} />
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recs.length > 0 && (
              <div className="mt-5">
                <span className="font-body text-[11.5px] font-bold text-ink">{t("recommendations")}</span>
                <div className="mt-2 flex flex-col gap-2">
                  {recs.map((r, i) => (
                    <div key={i} className="flex gap-2.5 rounded-xl border border-line bg-card px-3.5 py-3">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                      <span className="text-[12px] leading-snug text-ink">
                        {lang === "rw" ? r.rw || r.en : r.en}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lender note */}
            <div className="mt-4 flex gap-2.5 rounded-xl bg-primary-xlt px-3.5 py-3">
              <Info size={16} className="mt-0.5 shrink-0 text-primary" />
              <span className="text-[11.5px] font-medium leading-snug text-[#1A3A32]">
                {t("lender_note")}
              </span>
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-col gap-2.5">
              <Button
                full
                variant="green"
                onClick={() =>
                  toast.success(lang === "rw" ? "Ubu buryo buraza vuba" : "Sharing coming soon")
                }
              >
                <CheckCircle2 size={16} /> {t("share_sacco")}
              </Button>
              <Button full variant="ghost" disabled={calculating} onClick={calculate}>
                <Sparkles size={15} /> {calculating ? "…" : t("recalculate")}
              </Button>
            </div>
          </>
        )}

        {/* Account */}
        <button
          onClick={logout}
          className="mx-auto mt-8 flex items-center gap-1.5 text-[12px] font-semibold text-muted"
        >
          <LogOut size={14} /> {t("logout")}
        </button>
      </div>
    </div>
  );
}
