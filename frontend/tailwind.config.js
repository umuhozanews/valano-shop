/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background:          "#FAFAFA",
        surface:             "#FFFFFF",
        border:              "#E5E7EB",
        primary:             "#F97316",
        "primary-dark":      "#C2410C",
        "text-primary":      "#111827",
        "text-secondary":    "#6B7280",
        success:             "#16A34A",
        warning:             "#D97706",
        danger:              "#DC2626",
        neutral:             "#6B7280",
        "sidebar-bg":        "#18181B",
        "sidebar-border":    "#3F3F46",
        "sidebar-text":      "#F4F4F5",
        "sidebar-muted":     "#A1A1AA",
        "sidebar-hover":     "#27272A",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
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
