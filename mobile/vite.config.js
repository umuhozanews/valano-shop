import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// DataBridge mobile app runs on its own port (3100) so it can run side-by-side
// with the main Inzira Insights frontend (3000). In dev, /api is proxied to the
// backend — same database, different client. Set VITE_DEV_API_PROXY in a local
// .env.local to point at a local backend (http://localhost:5000) or the deployed
// one (https://backend-chi-olive-97.vercel.app). Proxying keeps requests
// same-origin, so the backend's CORS rules never block localhost dev.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_DEV_API_PROXY || "http://localhost:5000";
  return {
  plugins: [react()],
  server: {
    port: 3100,
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "icons": ["lucide-react"],
        },
      },
    },
  },
  };
});
