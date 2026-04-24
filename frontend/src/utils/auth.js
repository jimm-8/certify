import { clearNotificationStorage } from "./notificationCenter";

export const decodeJwt = (token) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = atob(padded);
    return JSON.parse(json);
  } catch (err) {
    return null;
  }
};

export const getStoredToken = () =>
  localStorage.getItem("access_token") ||
  sessionStorage.getItem("access_token");

export const setStoredToken = (token, rememberMe) => {
  if (!token) return;
  if (rememberMe) {
    localStorage.setItem("access_token", token);
    sessionStorage.removeItem("access_token");
  } else {
    sessionStorage.setItem("access_token", token);
    localStorage.removeItem("access_token");
  }
};

export const getTokenPayload = () => {
  const token = getStoredToken();
  if (!token) return null;
  return decodeJwt(token);
};

export const isTokenExpired = (token) => {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now;
};

export const clearAuth = () => {
  sessionStorage.removeItem("access_token");
  localStorage.removeItem("access_token");
  clearNotificationStorage();
};
