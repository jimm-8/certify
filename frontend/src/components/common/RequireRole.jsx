import { Navigate, useLocation } from "react-router-dom";
import { clearAuth, getTokenPayload, isTokenExpired } from "../../utils/auth";

export default function RequireRole({ role, children }) {
  const location = useLocation();
  const token = sessionStorage.getItem("access_token");

  if (!token || isTokenExpired(token)) {
    clearAuth();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const payload = getTokenPayload();
  if (!payload || payload.role !== role) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
