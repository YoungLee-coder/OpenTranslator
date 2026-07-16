import { base64Url, base64UrlDecode, utf8Decode, utf8Encode } from "./bytes";

/**
 * Minimal HS256 JWT using Web Crypto. No dependencies — Workers-native.
 */

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

const COOKIE_NAME = "ot_session";
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    utf8Encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signJwt(
  payload: Pick<JwtPayload, "sub" | "email" | "role">,
  secret: string,
  ttlSeconds = SEVEN_DAYS_SECONDS,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const full: JwtPayload = { ...payload, iat: now, exp: now + ttlSeconds };
  const header = { alg: "HS256", typ: "JWT" };
  const h = base64Url(utf8Encode(JSON.stringify(header)));
  const p = base64Url(utf8Encode(JSON.stringify(full)));
  const data = `${h}.${p}`;
  const key = await hmacKey(secret);
  const sig = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, utf8Encode(data)),
  );
  return `${data}.${base64Url(sig)}`;
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const h = parts[0]!;
  const p = parts[1]!;
  const s = parts[2]!;
  const data = `${h}.${p}`;
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecode(s),
    utf8Encode(data),
  );
  if (!ok) return null;
  try {
    const payload = JSON.parse(utf8Decode(base64UrlDecode(p))) as JwtPayload;
    if (Math.floor(Date.now() / 1000) >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookie(token: string, opts?: { secure?: boolean }): string {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=" + SEVEN_DAYS_SECONDS,
  ];
  if (opts?.secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(opts?: { secure?: boolean }): string {
  const parts = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (opts?.secure) parts.push("Secure");
  return parts.join("; ");
}

/** HTTPS 请求才加 Secure；本地 http://localhost 开发不加。 */
export function cookieSecureFromUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

export function readSessionCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    if (k === COOKIE_NAME) return part.slice(eq + 1).trim();
  }
  return null;
}

/** Parse `Authorization: Bearer <jwt>` for extension and other non-cookie clients. */
export function readBearerToken(authorizationHeader: string | undefined): string | null {
  if (!authorizationHeader) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader.trim());
  return match?.[1] ?? null;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
