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
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-[32px] font-bold text-border mb-2">403</p>
          <p className="text-[15px] font-semibold text-text-primary mb-1">Access Denied</p>
          <p className="text-[13px] text-text-secondary">
            You don't have permission to view this page.
          </p>
        </div>
      </div>
    );
  }

  return children;
}
