import type { AuthUser } from "@opentranslator/shared-types";
import { getAdminById } from "../db/queries";
import { adminToAuthUser } from "../lib/avatar";
import { listSessionIdentities, sessionVersionOf } from "./session";

/** JWT 有效、代次匹配、账号仍存在且未被停用时返回完整用户；否则 null。 */
export async function resolveLiveUser(
  cookieHeader: string | undefined,
  jwtSecret: string,
  authorizationHeader: string | undefined,
  db: D1Database | undefined,
): Promise<AuthUser | null> {
  if (!db) return null;
  const identities = await listSessionIdentities(
    cookieHeader,
    jwtSecret,
    authorizationHeader,
  );
  for (const session of identities) {
    const row = await getAdminById(db, session.id);
    if (!row) continue;
    if (sessionVersionOf(row) !== session.sv) continue;
    const user = adminToAuthUser(row);
    if (!user.enabled) continue;
    return user;
  }
  return null;
}
