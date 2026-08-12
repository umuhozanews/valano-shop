// Money + date helpers. Kept deliberately tiny — numbers, not jargon.

export function rwf(value, { withCurrency = false } = {}) {
  const n = Math.round(Number(value) || 0);
  const formatted = n.toLocaleString("en-US");
  return withCurrency ? `${formatted} RWF` : formatted;
}

// Compact money for tight stat cards: 42,500 stays, 1,250,000 -> 1.25M
export function rwfCompact(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  return Math.round(n).toLocaleString("en-US");
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function timeAgo(dateInput, lang = "en") {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return lang === "rw" ? "nonaha" : "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function clockTime(dateInput) {
  if (!dateInput) return "";
  return new Date(dateInput).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
