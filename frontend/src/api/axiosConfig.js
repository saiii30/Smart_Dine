import axios from "axios";




const base = import.meta.env.VITE_BACKEND_URL 

const API = axios.create({
  // Use Vite environment variable (import.meta.env) or fallback to localhost
  baseURL: base + "/api"
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token"); // or sessionStorage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
