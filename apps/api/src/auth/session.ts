import type { AuthUser } from "@opentranslator/shared-types";
import { readSessionCookie, verifyJwt } from "../lib/jwt";

/**
 * Resolve the current user from the session cookie, if any.
 * Returns null for anonymous requests (public mode).
 */
export async function getSessionUser(
  cookieHeader: string | undefined,
  jwtSecret: string,
): Promise<AuthUser | null> {
  const token = readSessionCookie(cookieHeader);
  if (!token) return null;
  const payload = await verifyJwt(token, jwtSecret);
  if (!payload) return null;
  return { id: payload.sub, email: payload.email, role: payload.role };
}
