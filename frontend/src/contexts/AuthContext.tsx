import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {api} from "../api/api";
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

 
 
  /* -------------------- LOAD USER -------------------- */
  const fetchUser = async () => {
    try {
      const res = await api.get("/auth/me");
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
      api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token && !user) {
      fetchUser();
    }
  }, [token]);

  /* -------------------- LOGIN -------------------- */
  const login = async (data: LoginPayload) => {
    try {
      const res = await api.post("/auth/login", data);
 
      const { access_token } = res.data;
 
      // Store the token
      localStorage.setItem("token", access_token);
      setToken(access_token);
      //api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
 
      // Fetch user data using the token
      const userResponse = await api.get("/auth/me");

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
      await api.post("/auth/register", {
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
    const res = await api.get("/auth/me");

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