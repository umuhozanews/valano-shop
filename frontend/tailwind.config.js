/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background:          "#FAFAFA",
        surface:             "#FFFFFF",
        border:              "#E5E7EB",
        primary:             "#006C49",
        "primary-dark":      "#004D35",
        "text-primary":      "#111827",
        "text-secondary":    "#6B7280",
        success:             "#16A34A",
        warning:             "#D97706",
        danger:              "#DC2626",
        neutral:             "#6B7280",
        "sidebar-bg":        "#FFFFFF",
        "sidebar-border":    "#E5E7EB",
        "sidebar-text":      "#111827",
        "sidebar-muted":     "#9CA3AF",
        "sidebar-hover":     "#F0FDF4",

        // Public storefront palette. Backed by CSS variables so each SME's site
        // is re-themed at runtime from its own brand colour, while opacity
        // modifiers (bg-store-brand/10) keep working.
        store: {
          bg:         "rgb(var(--store-bg) / <alpha-value>)",
          fg:         "rgb(var(--store-fg) / <alpha-value>)",
          muted:      "rgb(var(--store-muted) / <alpha-value>)",
          card:       "rgb(var(--store-card) / <alpha-value>)",
          soft:       "rgb(var(--store-soft) / <alpha-value>)",
          line:       "rgb(var(--store-line) / <alpha-value>)",
          brand:      "rgb(var(--store-brand) / <alpha-value>)",
          "brand-fg": "rgb(var(--store-brand-fg) / <alpha-value>)",
          accent:     "rgb(var(--store-accent) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Public Sans", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["24px", { fontWeight: "700", letterSpacing: "-0.02em" }],
        headline: ["18px", { fontWeight: "600" }],
        body: ["14px", { fontWeight: "400", lineHeight: "20px" }],
        label: ["13px", { fontWeight: "500" }],
        micro: ["11px", { fontWeight: "600", letterSpacing: "0.05em" }],
      },
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        6: "24px",
        8: "32px",
      },
      borderRadius: {
        btn: "4px",
        card: "8px",
        badge: "6px",
      },
      boxShadow: {
        modal: "0 10px 40px rgba(0,0,0,0.15)",
      },
      width: {
        sidebar: "260px",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
