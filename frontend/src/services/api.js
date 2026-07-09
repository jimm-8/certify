import axios from "axios";
import { clearAuth, getStoredToken, isTokenExpired } from "../utils/auth";

const defaultApiBaseUrl = `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor (for adding auth tokens later)
api.interceptors.request.use(
  (config) => {
    // Attach token if available
    const token = getStoredToken();
    if (token && !isTokenExpired(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (token && isTokenExpired(token)) {
      clearAuth();
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (for handling errors globally)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error
      console.error("API Error:", error.response.data);
      if (
        error.response.status === 401 &&
        !String(error.config?.url || "").includes("/auth/token")
      ) {
        clearAuth();
        if (!window.location.pathname.startsWith("/odr")) {
          window.location.assign("/login");
        }
      }
    } else if (error.request) {
      // Request made but no response
      console.error("Network Error:", error.message);
    } else {
      // Something else happened
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
