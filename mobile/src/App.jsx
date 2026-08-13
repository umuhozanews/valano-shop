import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Loading from "./components/Loading";

// Helper function to auto-retry dynamic import on chunk load failure (e.g., after new deployment)
function lazyWithRetry(componentImport) {
  return lazy(async () => {
    const pageHasBeenRefreshed = JSON.parse(
      window.sessionStorage.getItem("app_chunk_refreshed") || "false"
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem("app_chunk_refreshed", "false");
      return component;
    } catch (error) {
      const isChunkError =
        error?.message?.includes("Failed to fetch dynamically imported module") ||
        error?.message?.includes("Importing a module script failed") ||
        error?.name === "ChunkLoadError";

      if (isChunkError && !pageHasBeenRefreshed) {
        window.sessionStorage.setItem("app_chunk_refreshed", "true");
        window.location.reload();
        return new Promise(() => {}); // pause execution while browser reloads
      }

      throw error;
    }
  });
}

const SignIn = lazyWithRetry(() => import("./pages/SignIn"));
const SignUp = lazyWithRetry(() => import("./pages/SignUp"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const Sell = lazyWithRetry(() => import("./pages/Sell"));
const Stock = lazyWithRetry(() => import("./pages/Stock"));
const Expenses = lazyWithRetry(() => import("./pages/Expenses"));
const Suppliers = lazyWithRetry(() => import("./pages/Suppliers"));
const HealthScore = lazyWithRetry(() => import("./pages/HealthScore"));
const Invoices = lazyWithRetry(() => import("./pages/Invoices"));
const ProfitLoss = lazyWithRetry(() => import("./pages/ProfitLoss"));
const FinancialBooks = lazyWithRetry(() => import("./pages/FinancialBooks"));
const Reports = lazyWithRetry(() => import("./pages/Reports"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Admin = lazyWithRetry(() => import("./pages/Admin"));

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* All application pages wrapped inside AppLayout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/stock" element={<Stock />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/customers" element={<Suppliers />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/pnl" element={<ProfitLoss />} />
          <Route path="/books" element={<FinancialBooks />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/health-score" element={<HealthScore />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

