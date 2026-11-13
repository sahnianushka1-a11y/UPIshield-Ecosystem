import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_CUSTOMER_API_URL || "http://localhost:8001",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Expired session: clear it and return to the login page.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || "";
    if (err.response?.status === 401 && !url.includes("/api/auth/login")) {
      sessionStorage.removeItem("token");
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export function errorText(err, fallback = "Something went wrong. Please try again.") {
  const d = err.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return "Please check the details you entered.";
  if (!err.response) return "Unable to reach the server.";
  return fallback;
}

export default api;