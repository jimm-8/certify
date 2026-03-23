import api from "./api";

const authService = {
  login: async (username, password) => {
    // OAuth2 password grant expects form data
    const params = new URLSearchParams();
    params.append("username", username);
    params.append("password", password);

    const response = await api.post("/auth/token", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const token = response.data.access_token;
    if (token) {
      localStorage.setItem("access_token", token);
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("access_token");
  },
};

export default authService;
