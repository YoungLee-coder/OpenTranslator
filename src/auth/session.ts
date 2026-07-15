import type { AuthUser } from "@opentranslator/shared-types";
import { readBearerToken, readSessionCookie, verifyJwt } from "../lib/jwt";

/**
 * Resolve the current user from the session cookie or Bearer token, if any.
 * Cookie is checked first (web SPA); Bearer supports the browser extension.
 * Returns null for anonymous requests (public mode).
 */
export async function getSessionUser(
  cookieHeader: string | undefined,
  jwtSecret: string,
  authorizationHeader?: string | undefined,
): Promise<AuthUser | null> {
  const token =
    readSessionCookie(cookieHeader) ?? readBearerToken(authorizationHeader);
  if (!token) return null;
  const payload = await verifyJwt(token, jwtSecret);
  if (!payload) return null;
  return { id: payload.sub, email: payload.email, role: payload.role };
}
