import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../state/AuthContext";

export function Protected({
  children,
  needHouse = false,
  needPaid = false,
}: {
  children: ReactNode;
  needHouse?: boolean;
  needPaid?: boolean;
}) {
  const { account, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink text-mist">
        Lighting the floor…
      </div>
    );
  }
  if (!account) {
    return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  }
  if (needHouse && !account.restaurant) {
    return <Navigate to="/onboarding" replace />;
  }
  if (needPaid && !account.subscription?.active) {
    return <Navigate to="/checkout" replace />;
  }
  return children;
}
