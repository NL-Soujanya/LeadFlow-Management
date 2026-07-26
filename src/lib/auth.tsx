import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Role } from "./types";
import { API_URL } from "./config";

interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  role: Role | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: string | null }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getToken(): string | null {
  return localStorage.getItem("leadflow_token");
}

function setToken(token: string) {
  localStorage.setItem("leadflow_token", token);
}

function clearToken() {
  localStorage.removeItem("leadflow_token");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const body = await res.json();
          setUser(body.user);
        } else {
          clearToken();
        }
      } catch {
        clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) return { error: body.error ?? "Sign in failed" };
      setToken(body.token);
      setUser(body.user);
      return { error: null };
    } catch {
      return { error: "Network error" };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      const body = await res.json();
      if (!res.ok) return { error: body.error ?? "Sign up failed" };
      setToken(body.token);
      setUser(body.user);
      return { error: null };
    } catch {
      return { error: "Network error" };
    }
  };

  const signOut = () => {
    clearToken();
    setUser(null);
  };

  const value: AuthContextValue = {
    user,
    role: user?.role ?? null,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { getToken };
