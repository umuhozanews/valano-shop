import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[13px] text-text-secondary">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/app/login" replace />;

  if (roles && !roles.includes(user.role)) {
    // Workers land on sales; everyone else goes to dashboard
    const fallback = user.role === "worker" ? "/app/sales" : "/app/dashboard";
    return <Navigate to={fallback} replace />;
  }

  return children;
}
