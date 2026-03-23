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
  // Optional navigation callback for smooth logout
  onLogoutNavigate?: () => void;
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
      const res = await axios.get("/api/auth/me", {
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
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  /* -------------------- LOGIN -------------------- */
  const login = async (data: LoginPayload) => {
    try {
      const res = await axios.post(
        "/api/auth/login",
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
      const userResponse = await axios.get("/api/auth/me", {
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
      await axios.post("/api/auth/register", {
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
      value={{ user, token, login, register, logout, loading, onLogoutNavigate }}
    >
      {children}
    </AuthContext.Provider>
  );
};
