// Subdomain storefronts: https://<slug>.inzira.rw serves the same site as
// https://app.inzira.rw/store/<slug>.
//
// This is opt-in through VITE_STORE_DOMAIN rather than "any subdomain", because
// guessing from the hostname alone would hijack the dashboard on every preview
// host — inzira-git-abc123.vercel.app also has a first label that looks like a
// slug. With no VITE_STORE_DOMAIN configured, only path routing is used.

const STORE_DOMAIN = String(import.meta.env.VITE_STORE_DOMAIN || "").trim().toLowerCase().replace(/^\.+/, "");

// Subdomains that belong to the platform itself and are never a shop.
const RESERVED_SUBDOMAINS = new Set([
  "app", "www", "api", "admin", "dashboard", "staging", "preview", "dev", "test", "mail", "cdn", "assets",
]);

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])?$/;

export function storeSlugFromHost(hostname) {
  if (!STORE_DOMAIN) return null;

  const host = String(hostname ?? (typeof window === "undefined" ? "" : window.location.hostname))
    .toLowerCase()
    .split(":")[0]
    .replace(/\.$/, "");

  if (!host || !host.endsWith(`.${STORE_DOMAIN}`)) return null;

  const label = host.slice(0, -(STORE_DOMAIN.length + 1));
  // Only a single label counts, so a.b.inzira.rw is not read as store "a".
  if (!label || label.includes(".")) return null;
  if (RESERVED_SUBDOMAINS.has(label)) return null;
  if (!SLUG_PATTERN.test(label)) return null;

  return label;
}
