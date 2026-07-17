import type { AuthUser } from "@opentranslator/shared-types";
import { readBearerToken, readSessionCookie, verifyJwt } from "../lib/jwt";

/**
 * Resolve the current user from the session cookie or Bearer token, if any.
 * Cookie is preferred (web SPA); if missing/invalid, fall back to Bearer
 * (browser extension). Returns null for anonymous requests (public mode).
 */
export async function getSessionUser(
  cookieHeader: string | undefined,
  jwtSecret: string,
  authorizationHeader?: string | undefined,
): Promise<AuthUser | null> {
  const cookieToken = readSessionCookie(cookieHeader);
  if (cookieToken) {
    const payload = await verifyJwt(cookieToken, jwtSecret);
    if (payload) {
      return { id: payload.sub, email: payload.email, role: payload.role };
    }
  }

  const bearerToken = readBearerToken(authorizationHeader);
  if (bearerToken) {
    const payload = await verifyJwt(bearerToken, jwtSecret);
    if (payload) {
      return { id: payload.sub, email: payload.email, role: payload.role };
    }
  }

  return null;
}
