import { format, formatDistanceToNow } from "date-fns";

export function formatRWF(amount) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n) {
  return new Intl.NumberFormat("en-RW").format(n ?? 0);
}

export function formatDate(dateStr, pattern = "dd MMM yyyy") {
  if (!dateStr) return "—";
  return format(new Date(dateStr), pattern);
}

export function formatRelative(dateStr) {
  if (!dateStr) return "—";
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

export function formatPercent(value, total) {
  if (!total) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
