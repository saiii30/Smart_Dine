import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";
import { User } from "../types";

interface LoginPayload {
  username: string;
  password: string;
  agency_id: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (data: LoginPayload) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    contactNumber: string,
    agencyId: string
  ) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /* -------------------- LOAD USER -------------------- */
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      axios.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/auth/me");
      setUser(res.data);
    }catch (err) {
  console.error("Failed to fetch user", err)
  setUser(null)
}
 finally {
      setLoading(false);
    }
  };

  /* -------------------- LOGIN -------------------- */
 // In AuthContext.tsx
const login = async (data: LoginPayload) => {
  try {
    const res = await axios.post(
      "http://127.0.0.1:8000/api/auth/login",
      {
        username: data.username,
        password: data.password,
        agency_id: data.agency_id,
      },
      { 
        headers: { "Content-Type": "application/json" },
        withCredentials: true
      }
    );

    const { access_token } = res.data;

    // Store the token
    localStorage.setItem("token", access_token);
    axios.defaults.headers.common.Authorization = `Bearer ${access_token}`;

    // Fetch user data using the token
    const userResponse = await axios.get("http://127.0.0.1:8000/api/auth/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    setToken(access_token);
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
      await axios.post("http://127.0.0.1:8000/api/auth/register", {
        name,
        email,
        password,
        contact_number: contactNumber,
        agency_id: agencyId,
        role: "ADMIN", // 🔥 REQUIRED BY DB CONSTRAINT
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
    delete axios.defaults.headers.common.Authorization;
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, register, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
