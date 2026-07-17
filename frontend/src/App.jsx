import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./context/AuthContext";

const Loading = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const L = (imp) => lazy(() =>
  imp().catch(async (err) => {
    await new Promise(r => setTimeout(r, 400));
    return imp().catch(() => { throw err; });
  })
);

// ── Pages ─────────────────────────────────────────────────────────────────────
const Login             = L(() => import("./pages/auth/Login"));
const Register          = L(() => import("./pages/auth/Register"));
const Dashboard         = L(() => import("./pages/dashboard/Dashboard"));

// Inventory
const StockList         = L(() => import("./pages/stock/StockList"));
const StockDetail       = L(() => import("./pages/stock/StockDetail"));
const LabelPrint        = L(() => import("./pages/stock/LabelPrint"));
const PurchaseOrders    = L(() => import("./pages/purchase-orders/PurchaseOrders"));

// Sales / POS
const SalesList         = L(() => import("./pages/sales/SalesList"));
const NewSale           = L(() => import("./pages/sales/NewSale"));
const SaleDetail        = L(() => import("./pages/sales/SaleDetail"));

// CRM
const CustomersList     = L(() => import("./pages/customers/CustomersList"));
const CustomerProfile   = L(() => import("./pages/customers/CustomerProfile"));
const SuppliersList     = L(() => import("./pages/suppliers/SuppliersList"));
const Receivables       = L(() => import("./pages/finance/Receivables"));
const Payables          = L(() => import("./pages/finance/Payables"));

// Finance
const InvoicesList      = L(() => import("./pages/finance/InvoicesList"));
const ExpensesList      = L(() => import("./pages/finance/ExpensesList"));
const ProfitLoss        = L(() => import("./pages/finance/ProfitLoss"));
const FinancialBooks    = L(() => import("./pages/finance/FinancialBooks"));

// Reports
const SalesReport       = L(() => import("./pages/reports/SalesReport"));
const StockReport       = L(() => import("./pages/reports/StockReport"));
const FinancialReport   = L(() => import("./pages/reports/FinancialReport"));
const AuditLog          = L(() => import("./pages/reports/AuditLog"));
const TaxReport         = L(() => import("./pages/reports/TaxReport"));

// Intelligence
const HealthScore       = L(() => import("./pages/intelligence/HealthScore"));
const NotificationsPage = L(() => import("./pages/notifications/NotificationsPage"));

// Admin + Lender
const AdminDashboard    = L(() => import("./pages/admin/AdminDashboard"));
const LenderDashboard   = L(() => import("./pages/lender/LenderDashboard"));
const LenderSmeDetail   = L(() => import("./pages/lender/LenderSmeDetail"));
const AdvisoryPublic    = L(() => import("./pages/intelligence/AdvisoryPublic"));

// Settings
const SettingsPage      = L(() => import("./pages/settings/SettingsPage"));

// ── Role groups ───────────────────────────────────────────────────────────────
const ALL    = ["pulse_admin","sme_owner","admin","manager","cashier","accountant","viewer","databridge_advisor"];
const OWNER  = ["pulse_admin","sme_owner","admin"];
const STAFF  = ["pulse_admin","sme_owner","admin","manager","accountant","databridge_advisor"];
const POS    = ["pulse_admin","sme_owner","admin","manager","cashier"];
const FIN    = ["pulse_admin","sme_owner","admin","accountant"];

// Returns the home path for a given role — used for post-login redirect and fallback.
export function roleHomePath(role) {
  if (role === "pulse_admin")                           return "/app/admin";
  if (role === "lender")                                return "/app/lender";
  if (role === "cashier" || role === "manager" || role === "viewer") return "/app/sales/new";
  return "/app/dashboard";
}

const P = ({ children, roles }) => <ProtectedRoute roles={roles}>{children}</ProtectedRoute>;

function AppRoot() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/app/login" replace />;
  return <Navigate to={roleHomePath(user.role)} replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/"              element={<Navigate to="/app/login" replace />} />
          <Route path="/app/login"   element={<Login />} />
          <Route path="/app/register" element={<Register />} />

          {/* Dashboard */}
          <Route path="/app/dashboard" element={<P roles={STAFF}><Dashboard /></P>} />

          {/* Inventory */}
          <Route path="/app/stock"            element={<P roles={STAFF}><StockList /></P>} />
          <Route path="/app/stock/labels"     element={<P roles={STAFF}><LabelPrint /></P>} />
          <Route path="/app/stock/:id"        element={<P roles={STAFF}><StockDetail /></P>} />
          <Route path="/app/purchase-orders"  element={<P roles={STAFF}><PurchaseOrders /></P>} />
          <Route path="/app/suppliers"        element={<P roles={FIN}><SuppliersList /></P>} />

          {/* POS / Sales */}
          <Route path="/app/sales"            element={<P roles={ALL}><SalesList /></P>} />
          <Route path="/app/sales/new"        element={<P roles={POS}><NewSale /></P>} />
          <Route path="/app/sales/:id"        element={<P roles={ALL}><SaleDetail /></P>} />

          {/* CRM */}
          <Route path="/app/customers"        element={<P roles={STAFF}><CustomersList /></P>} />
          <Route path="/app/customers/:id"    element={<P roles={STAFF}><CustomerProfile /></P>} />
          <Route path="/app/receivables"      element={<P roles={STAFF}><Receivables /></P>} />
          <Route path="/app/payables"         element={<P roles={STAFF}><Payables /></P>} />

          {/* Finance */}
          <Route path="/app/expenses"         element={<P roles={STAFF}><ExpensesList /></P>} />
          <Route path="/app/invoices"         element={<P roles={STAFF}><InvoicesList /></P>} />
          <Route path="/app/finance/pnl"      element={<P roles={FIN}><ProfitLoss /></P>} />
          <Route path="/app/books"            element={<P roles={FIN}><FinancialBooks /></P>} />

          {/* Reports */}
          <Route path="/app/reports/sales"    element={<P roles={STAFF}><SalesReport /></P>} />
          <Route path="/app/reports/stock"    element={<P roles={STAFF}><StockReport /></P>} />
          <Route path="/app/reports/tax"      element={<P roles={FIN}><TaxReport /></P>} />
          <Route path="/app/reports/financial"element={<P roles={FIN}><FinancialReport /></P>} />
          <Route path="/app/reports/audit"    element={<P roles={OWNER}><AuditLog /></P>} />

          {/* Intelligence */}
          <Route path="/app/health-score"     element={<P roles={OWNER}><HealthScore /></P>} />
          <Route path="/app/notifications"    element={<P roles={ALL}><NotificationsPage /></P>} />

          {/* Admin (pulse_admin only) */}
          <Route path="/app/admin"            element={<P roles={["pulse_admin"]}><AdminDashboard /></P>} />

          {/* Lender */}
          <Route path="/app/lender"           element={<P roles={["lender","pulse_admin"]}><LenderDashboard /></P>} />
          <Route path="/app/lender/sme/:id"   element={<P roles={["lender","pulse_admin"]}><LenderSmeDetail /></P>} />

          {/* Settings */}
          <Route path="/app/settings"         element={<P roles={OWNER}><SettingsPage /></P>} />

          <Route path="/app" element={<AppRoot />} />
          {/* Public advisory share link — no auth required */}
          <Route path="/advisory/:token"      element={<AdvisoryPublic />} />
          <Route path="*"    element={<Navigate to="/app/login" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
