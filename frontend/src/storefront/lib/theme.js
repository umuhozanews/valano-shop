// Turns an SME's saved brand colour into the full set of CSS variables that
// .storefront-root declares, so one hex value re-skins the whole website.

const FALLBACK_BRAND = "#006C49";
const FALLBACK_ACCENT = "#E8F5EF";

function parseHex(value, fallback) {
  const hex = String(value || "").trim().replace(/^#/, "");
  const expanded =
    hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex.length === 6 ? hex : null;

  if (!expanded || !/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return fallback ? parseHex(fallback, null) : { r: 0, g: 108, b: 73 };
  }
  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  };
}

const channels = ({ r, g, b }) => `${r} ${g} ${b}`;

// Blends a colour toward white. `amount` is how much white to mix in.
function tint({ r, g, b }, amount) {
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return { r: mix(r), g: mix(g), b: mix(b) };
}

function shade({ r, g, b }, amount) {
  const mix = (c) => Math.round(c * (1 - amount));
  return { r: mix(r), g: mix(g), b: mix(b) };
}

// Relative luminance, used to pick readable text on top of the brand colour.
function luminance({ r, g, b }) {
  const channel = (value) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function buildStoreThemeVars(theme = {}) {
  const brand = parseHex(theme.brand, FALLBACK_BRAND);
  const accentSource = theme.accent ? parseHex(theme.accent, FALLBACK_ACCENT) : tint(brand, 0.9);
  const onBrandIsDark = luminance(brand) > 0.55;

  return {
    "--store-bg": "255 255 255",
    "--store-fg": channels(shade(brand, 0.78)),
    "--store-muted": channels(tint(shade(brand, 0.55), 0.45)),
    "--store-card": "255 255 255",
    "--store-soft": channels(tint(brand, 0.955)),
    "--store-line": channels(tint(brand, 0.87)),
    "--store-brand": channels(brand),
    "--store-brand-fg": onBrandIsDark ? channels(shade(brand, 0.82)) : "255 255 255",
    "--store-accent": channels(accentSource),
  };
}

export const DEFAULT_STORE_THEME = { brand: FALLBACK_BRAND, accent: FALLBACK_ACCENT };
