import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Loading from "./components/Loading";

const SignIn = lazy(() => import("./pages/SignIn"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Sell = lazy(() => import("./pages/Sell"));
const Stock = lazy(() => import("./pages/Stock"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const HealthScore = lazy(() => import("./pages/HealthScore"));

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<SignIn />} />

        {/* Health Score is a full-screen page (has its own back button) */}
        <Route
          path="/health-score"
          element={
            <ProtectedRoute>
              <HealthScore />
            </ProtectedRoute>
          }
        />

        {/* Tabbed app shell */}
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
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
