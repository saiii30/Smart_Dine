import axios from "axios";

// Base URL from Vite env
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

if (!API_BASE_URL) {
  throw new Error("VITE_BACKEND_URL is not defined");
}

export const api = axios.create({
  baseURL: API_BASE_URL + "/api",
  withCredentials: true, // important for auth/cookies
  // Don't set Content-Type here to allow FormData to set multipart/form-data with boundary
});

// 🔥 Request interceptor (optional: attach token)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // adjust if needed
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🔥 Response interceptor (global error handling)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error?.response || error.message);

    if (error.response?.status === 401) {
      // auto logout / redirect
      localStorage.removeItem("token");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);