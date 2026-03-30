import { Navigate, useLocation } from "react-router-dom";
import { clearAuth, getStoredToken, isTokenExpired } from "../../utils/auth";

export default function RequireAuth({ children }) {
  const location = useLocation();
  const token = getStoredToken();

  if (!token || isTokenExpired(token)) {
    clearAuth();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
