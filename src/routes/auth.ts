import { Hono } from "hono";
import type {
  AuthMeResponse,
  AuthSessionResponse,
  AuthUser,
  LoginRequest,
} from "@opentranslator/shared-types";
import { USER_PERMISSIONS } from "@opentranslator/shared-types";
import type { AppBindings, AppVariables } from "../types";
import { populateUser } from "../middleware/auth";
import {
  getAdminByEmail,
  getAdminCount,
  createFirstAdmin,
} from "../db/queries";
import { adminToAuthUser } from "../lib/avatar";
import { getSiteSettings } from "../settings/cache";
import { hashPassword, verifyPassword } from "../lib/password";
import { normalizeUsername } from "../lib/username";
import { clearSessionCookie, cookieSecureFromUrl, sessionCookie } from "../lib/jwt";
import { issueSessionToken } from "../auth/session";
import { enforceRateLimit } from "../middleware/rate-limit";

/** 登录 / 首启比公开翻译更严，固定配额防凭据喷洒。 */
const AUTH_RATE_LIMIT_PER_MINUTE = 10;

const authRoute = new Hono<{
  Bindings: AppBindings;
  Variables: AppVariables;
}>();

authRoute.use("/me", populateUser);
authRoute.get("/me", async (c) => {
  const uninitialized: AuthMeResponse = {
    authenticated: false,
    setupCompleted: false,
    sitePublic: true,
  };
  if (!c.env.DB || !c.env.KV) {
    return c.json(uninitialized);
  }

  try {
    const setupCompleted = (await getAdminCount(c.env.DB)) > 0;
    const settings = await getSiteSettings(c.env.KV, c.env.DB);
    const authUser = c.get("user") ?? undefined;
    return c.json({
      authenticated: !!authUser,
      user: authUser,
      setupCompleted,
      sitePublic: settings.sitePublic,
    } satisfies AuthMeResponse);
  } catch {
    // 尚未建表或 D1 不可用时，按未初始化返回，避免首次打开 /api/auth/me 500。
    return c.json(uninitialized);
  }
});

/** POST /api/auth/setup — create the first admin. 409 once one exists. */
authRoute.post("/setup", async (c) => {
  const blocked = await enforceRateLimit(c, AUTH_RATE_LIMIT_PER_MINUTE, "auth");
  if (blocked) return blocked;

  if (!c.env.DB) {
    return c.json({ error: "database not initialized" }, 503);
  }

  let existing = 0;
  try {
    existing = await getAdminCount(c.env.DB);
  } catch {
    return c.json({ error: "database not initialized" }, 503);
  }
  if (existing > 0) {
    return c.json({ error: "setup already completed" }, 409);
  }
  const body = (await c.req.json().catch(() => null)) as LoginRequest | null;
  const username = normalizeUsername(body?.username ?? body?.email);
  if (!username || !body?.password) {
    return c.json({ error: "username and password are required" }, 400);
  }
  if (body.password.length < 8) {
    return c.json({ error: "password must be at least 8 characters" }, 400);
  }
  if (await getAdminByEmail(c.env.DB, username)) {
    return c.json({ error: "username already registered" }, 409);
  }
  const id = crypto.randomUUID();
  const hash = await hashPassword(body.password);
  const created = await createFirstAdmin(c.env.DB, id, username, hash);
  if (!created) {
    return c.json({ error: "setup already completed" }, 409);
  }
  const secure = cookieSecureFromUrl(c.req.url);
  const token = await issueSessionToken(
    { id, email: username, role: "admin", session_version: 0 },
    c.env.JWT_SECRET,
  );
  c.header("Set-Cookie", sessionCookie(token, { secure }));
  const user: AuthUser = {
    id,
    username,
    email: username,
    role: "admin",
    permissions: [...USER_PERMISSIONS],
    enabled: true,
  };
  return c.json(
    { authenticated: true, user, token } satisfies AuthSessionResponse,
    201,
  );
});

/** POST /api/auth/login — exchange credentials for a session cookie. */
authRoute.post("/login", async (c) => {
  const blocked = await enforceRateLimit(c, AUTH_RATE_LIMIT_PER_MINUTE, "auth");
  if (blocked) return blocked;

  const body = (await c.req.json().catch(() => null)) as LoginRequest | null;
  const username = normalizeUsername(body?.username ?? body?.email);
  if (!username || !body?.password) {
    return c.json({ error: "username and password are required" }, 400);
  }
  const admin = await getAdminByEmail(c.env.DB, username);
  if (!admin || !(await verifyPassword(body.password, admin.password_hash))) {
    return c.json({ error: "invalid credentials" }, 401);
  }
  if (admin.enabled === 0) {
    return c.json({ error: "account is disabled" }, 403);
  }
  const secure = cookieSecureFromUrl(c.req.url);
  const token = await issueSessionToken(admin, c.env.JWT_SECRET);
  c.header("Set-Cookie", sessionCookie(token, { secure }));
  return c.json({
    authenticated: true,
    user: adminToAuthUser(admin),
    token,
  } satisfies AuthSessionResponse);
});

/** POST /api/auth/logout — clear the session cookie. */
authRoute.post("/logout", (c) => {
  const secure = cookieSecureFromUrl(c.req.url);
  c.header("Set-Cookie", clearSessionCookie({ secure }));
  return c.json({ ok: true });
});

export default authRoute;
