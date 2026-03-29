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

export const getTokenPayload = () => {
  const token = sessionStorage.getItem("access_token");
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
};
