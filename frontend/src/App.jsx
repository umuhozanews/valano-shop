import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/layout/ProtectedRoute";

const Loading = () => (
  <div className="flex h-screen items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const L = (imp) => lazy(imp);

const Landing = L(() => import("./pages/Landing"));
const ProductDetail = L(() => import("./pages/ProductDetail"));
const Login = L(() => import("./pages/auth/Login"));
const Dashboard = L(() => import("./pages/dashboard/Dashboard"));
const StockList = L(() => import("./pages/stock/StockList"));
const StockDetail = L(() => import("./pages/stock/StockDetail"));
const LabelPrint = L(() => import("./pages/stock/LabelPrint"));
const SalesList = L(() => import("./pages/sales/SalesList"));
const NewSale = L(() => import("./pages/sales/NewSale"));
const SaleDetail = L(() => import("./pages/sales/SaleDetail"));
const ProcurementList = L(() => import("./pages/procurement/ProcurementList"));
const ProcurementDetail = L(() => import("./pages/procurement/ProcurementDetail"));
const WorkersList = L(() => import("./pages/workers/WorkersList"));
const WorkerProfile = L(() => import("./pages/workers/WorkerProfile"));
const CustomersList = L(() => import("./pages/customers/CustomersList"));
const CustomerProfile = L(() => import("./pages/customers/CustomerProfile"));
const SuppliersList = L(() => import("./pages/suppliers/SuppliersList"));
const InvoicesList = L(() => import("./pages/finance/InvoicesList"));
const ExpensesList = L(() => import("./pages/finance/ExpensesList"));
const ProfitLoss = L(() => import("./pages/finance/ProfitLoss"));
const SalesReport = L(() => import("./pages/reports/SalesReport"));
const StockReport = L(() => import("./pages/reports/StockReport"));
const WorkerPerformance = L(() => import("./pages/reports/WorkerPerformance"));
const FinancialReport = L(() => import("./pages/reports/FinancialReport"));
const ProcurementReport = L(() => import("./pages/reports/ProcurementReport"));
const AuditLog = L(() => import("./pages/reports/AuditLog"));
const NotificationsPage = L(() => import("./pages/notifications/NotificationsPage"));
const SettingsPage = L(() => import("./pages/settings/SettingsPage"));

// New Business Specific Pages
const ProductionPage = L(() => import("./pages/industry/Production"));
const PropertiesPage = L(() => import("./pages/real-estate/Properties"));
const TenantsPage = L(() => import("./pages/real-estate/Tenants"));

const AM = ["admin","manager"];
const AO = ["admin"];
const ALL = ["admin","manager","worker"];

const P = ({ children, roles }) => <ProtectedRoute roles={roles}>{children}</ProtectedRoute>;

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/app/login" element={<Login />} />
        <Route path="/app/dashboard" element={<P roles={AM}><Dashboard /></P>} />
        <Route path="/app/stock" element={<P roles={AM}><StockList /></P>} />
        <Route path="/app/stock/labels" element={<P roles={AM}><LabelPrint /></P>} />
        <Route path="/app/stock/:id" element={<P roles={AM}><StockDetail /></P>} />
        <Route path="/app/sales" element={<P roles={ALL}><SalesList /></P>} />
        <Route path="/app/sales/new" element={<P roles={ALL}><NewSale /></P>} />
        <Route path="/app/sales/:id" element={<P roles={ALL}><SaleDetail /></P>} />
        
        {/* Industry Specific */}
        <Route path="/app/production" element={<P roles={AM}><ProductionPage /></P>} />
        
        {/* Real Estate Specific */}
        <Route path="/app/properties" element={<P roles={AM}><PropertiesPage /></P>} />
        <Route path="/app/tenants" element={<P roles={AM}><TenantsPage /></P>} />

        <Route path="/app/procurement" element={<P roles={AM}><ProcurementList /></P>} />
        <Route path="/app/procurement/:id" element={<P roles={AM}><ProcurementDetail /></P>} />
        <Route path="/app/workers" element={<P roles={AM}><WorkersList /></P>} />
        <Route path="/app/workers/:id" element={<P roles={AM}><WorkerProfile /></P>} />
        <Route path="/app/customers" element={<P roles={AM}><CustomersList /></P>} />
        <Route path="/app/customers/:id" element={<P roles={AM}><CustomerProfile /></P>} />
        <Route path="/app/suppliers" element={<P roles={AO}><SuppliersList /></P>} />
        <Route path="/app/invoices" element={<P roles={AM}><InvoicesList /></P>} />
        <Route path="/app/expenses" element={<P roles={AM}><ExpensesList /></P>} />
        <Route path="/app/finance/pnl" element={<P roles={AO}><ProfitLoss /></P>} />
        <Route path="/app/reports/sales" element={<P roles={AM}><SalesReport /></P>} />
        <Route path="/app/reports/stock" element={<P roles={AM}><StockReport /></P>} />
        <Route path="/app/reports/workers" element={<P roles={AM}><WorkerPerformance /></P>} />
        <Route path="/app/reports/financial" element={<P roles={AO}><FinancialReport /></P>} />
        <Route path="/app/reports/procurement" element={<P roles={AO}><ProcurementReport /></P>} />
        <Route path="/app/reports/audit" element={<P roles={AO}><AuditLog /></P>} />
        <Route path="/app/notifications" element={<P roles={ALL}><NotificationsPage /></P>} />
        <Route path="/app/settings" element={<P roles={AO}><SettingsPage /></P>} />
        <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
