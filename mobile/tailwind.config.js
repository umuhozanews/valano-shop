/** @type {import('tailwindcss').Config} */
// DataBridge design tokens — warm, low-density, legible in bright outdoor light.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1A2421",
        paper: "#F1EEE3",
        canvas: "#EAE5D6",
        primary: "#1F5C4E",
        "primary-lt": "#2F7A67",
        "primary-xlt": "#E6EEE9",
        accent: "#E8A33D",
        "accent-dk": "#B97D24",
        danger: "#C24B3D",
        "danger-lt": "#FBEAE6",
        success: "#2F8F6E",
        "success-lt": "#E7F2ED",
        card: "#FFFFFF",
        line: "#E3DDC9",
        muted: "#8A8272",
      },
      fontFamily: {
        heading: ["'Plus Jakarta Sans'", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(26,36,33,0.04)",
        pop: "0 18px 40px -12px rgba(26,36,33,0.35)",
        nav: "0 -2px 12px rgba(26,36,33,0.06)",
      },
    },
  },
  plugins: [],
};
