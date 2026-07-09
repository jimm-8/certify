import { Navigate, useLocation } from "react-router-dom";
import { clearAuth, getStoredToken, getTokenPayload, isTokenExpired } from "../../utils/auth";

export default function RequireRole({ role, roles, children }) {
  const location = useLocation();
  const token = getStoredToken();

  if (!token || isTokenExpired(token)) {
    clearAuth();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const payload = getTokenPayload();
  const allowedRoles = roles?.length ? roles : role ? [role] : [];
  if (allowedRoles.length && (!payload || !allowedRoles.includes(payload.role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
