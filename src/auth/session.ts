import type { JwtPayload } from "../lib/jwt";
import { readBearerToken, readSessionCookie, signJwt, verifyJwt } from "../lib/jwt";

/** JWT 解析结果：只证明「是谁 + 会话代次」，不含权限。 */
export interface SessionIdentity {
  id: string;
  login: string;
  role: string;
  sv: number;
}

/**
 * Cookie 优先；验签失败或不存在时再试 Bearer。
 * 调用方应对每个身份做 live 校验，cookie 过期代次时才能落到新 Bearer。
 */
export async function listSessionIdentities(
  cookieHeader: string | undefined,
  jwtSecret: string,
  authorizationHeader?: string | undefined,
): Promise<SessionIdentity[]> {
  const out: SessionIdentity[] = [];
  const cookieToken = readSessionCookie(cookieHeader);
  if (cookieToken) {
    const payload = await verifyJwt(cookieToken, jwtSecret);
    if (payload) out.push(identityFromPayload(payload));
  }

  const bearerToken = readBearerToken(authorizationHeader);
  if (bearerToken && bearerToken !== cookieToken) {
    const payload = await verifyJwt(bearerToken, jwtSecret);
    if (payload) out.push(identityFromPayload(payload));
  }

  return out;
}

function identityFromPayload(payload: JwtPayload): SessionIdentity {
  return {
    id: payload.sub,
    login: payload.email,
    role: payload.role,
    sv: typeof payload.sv === "number" ? payload.sv : 0,
  };
}

export function sessionVersionOf(row: { session_version?: number | null }): number {
  return typeof row.session_version === "number" ? row.session_version : 0;
}

/** 签发带当前 session_version 的 JWT。 */
export async function issueSessionToken(
  user: { id: string; email: string; role: string; session_version?: number | null },
  secret: string,
): Promise<string> {
  return signJwt(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      sv: sessionVersionOf(user),
    },
    secret,
  );
}
