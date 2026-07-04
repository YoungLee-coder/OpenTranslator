import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { AuthMeResponse, AuthUser } from "@opentranslator/shared-types";
import { apiGet, apiPost } from "./api-client";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  setupCompleted: boolean;
  sitePublic: boolean;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupCompleted, setSetupCompleted] = useState(true);
  const [sitePublic, setSitePublic] = useState(true);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await apiGet<AuthMeResponse>("/api/auth/me");
      setUser(res.user ?? null);
      setSetupCompleted(res.setupCompleted);
      setSitePublic(res.sitePublic);
    } catch {
      setUser(null);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await apiPost("/api/auth/logout", {});
    } catch {
      // ignore
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, setupCompleted, sitePublic, refresh, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
