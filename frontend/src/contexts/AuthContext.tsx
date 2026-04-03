import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";
import { User } from "../types";
 
interface LoginPayload {
  username: string;
  password: string;
  agency_id: string;
  it_company_id?: string;
}
 
interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (data: LoginPayload) => Promise<User>;
  register: (
    name: string,
    email: string,
    password: string,
    contactNumber: string,
    agencyId: string
  ) => Promise<void>;
  logout: () => void;
  loading: boolean;
  refreshUser: () => Promise<void>;
}
 
const AuthContext = createContext<AuthContextType | undefined>(undefined);
 
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
 
export const AuthProvider = ({ children, onLogoutNavigate }: { children: ReactNode; onLogoutNavigate?: () => void }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = "http://127.0.0.1:8000";
 
  /* -------------------- LOAD USER -------------------- */
  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setUser(res.data);
    } catch (err) {
      console.error("Failed to fetch user", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };
 
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      axios.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token]);

  /* -------------------- LOGIN -------------------- */
  const login = async (data: LoginPayload) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        data,
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true
        }
      );
 
      const { access_token } = res.data;
 
      // Store the token
      localStorage.setItem("token", access_token);
      setToken(access_token);
      axios.defaults.headers.common.Authorization = `Bearer ${access_token}`;
 
      // Fetch user data using the token
      const userResponse = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
 
      setUser(userResponse.data); // Set user data from the /me endpoint
      return userResponse.data; // Return user data for potential use in components
    } catch (err: any) {
      console.error("Login error:", err);
      throw new Error(err.response?.data?.detail || "Login failed");
    }
  };
 
  /* -------------------- REGISTER -------------------- */
  const register = async (
    name: string,
    email: string,
    password: string,
    contactNumber: string,
    agencyId: string
  ) => {
    try {
      await axios.post(`${API_BASE_URL}/api/auth/register`, {
        name,
        email,
        password,
        contact_number: contactNumber,
        agency_id: agencyId,
        role: "SUPERVISOR", // 🔥 REQUIRED BY DB CONSTRAINT
      });
 
      // 🔁 Auto login after register
      await login({
        username: email,
        password,
        agency_id: agencyId,
      });
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || "Registration failed");
    }
  };

//   const refreshUser = async () => {
//   try {
//     const res = await axios.get("/api/auth/me") // your API
//     alert("User refreshed: " + JSON.stringify(res.data))
//     setUser(res.data)
//   } catch (err) {
//     console.error("Failed to refresh user", err)
//   }
// }

const refreshUser = async () => {
  try {
    const res = await axios.get(`${API_BASE_URL}/api/auth/me`)

    console.log("REFRESH USER:", res.data) // debug

    setUser({ ...res.data }) // force new object

  } catch (err) {
    console.error("Failed to refresh user", err)
  }
}

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    // Use navigation callback if provided, otherwise fallback to window.location
    if (onLogoutNavigate) {
      onLogoutNavigate();
    } else {
      // Fallback to window.location for navigation since AuthProvider is outside Router context
      window.location.href = "/login";
    }
  };
 
  return (
    <AuthContext.Provider
      value={{ user, token, login, register, logout, loading, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};