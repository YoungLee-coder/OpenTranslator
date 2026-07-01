import { useCallback, useEffect, useState } from "react";
import type { AuthMeResponse, AuthUser } from "@opentranslator/shared-types";
import { apiGet, apiPost } from "./api-client";

/**
 * Minimal auth state hook: fetches /api/auth/me on mount, exposes the user
 * and a refresh callback. Used by the layout (nav) and the dashboard guard.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<AuthMeResponse>("/api/auth/me");
      setUser(res.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
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

  return { user, loading, refresh, logout };
}
