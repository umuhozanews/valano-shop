// Shared helpers for turning a raw score/band into UI-friendly colour + label.
export function bandColor(band, score) {
  if (band === "green" || score >= 65) return "#2F8F6E";
  if (band === "amber" || score >= 40) return "#E8A33D";
  if (band === "red" || (typeof score === "number" && score < 40)) return "#C24B3D";
  return "#8A8272";
}

export function bandKey(band, score) {
  const b = band || (score >= 65 ? "green" : score >= 40 ? "amber" : "red");
  if (b === "green") return "band_green";
  if (b === "amber") return "band_amber";
  return "band_red";
}

// health_score_log JSON columns can come back as objects (jsonb) or strings (text).
export function parseMaybeJSON(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
