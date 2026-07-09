import api from "./api";
import { setStoredToken, clearAuth } from "../utils/auth";

const authService = {
  login: async (username, password, rememberMe = false) => {
    // OAuth2 password grant expects form data
    const params = new URLSearchParams();
    params.append("username", username);
    params.append("password", password);

    const response = await api.post("/auth/token", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const token = response.data.access_token;
    if (token) {
      setStoredToken(token, rememberMe);
    }
    return response.data;
  },
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  logout: () => {
    clearAuth();
  },
};

export default authService;
