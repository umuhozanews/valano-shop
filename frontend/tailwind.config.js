/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#F8F9FA",
        surface: "#FFFFFF",
        border: "#E5E7EB",
        primary: "#10B981",
        "primary-dark": "#006C49",
        "text-primary": "#191C1D",
        "text-secondary": "#6C7A71",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        neutral: "#64748B",
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
