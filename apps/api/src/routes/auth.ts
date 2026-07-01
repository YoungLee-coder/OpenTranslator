import { Hono } from "hono";
import type {
  AuthUser,
  LoginRequest,
} from "@opentranslator/shared-types";
import type { AppBindings, AppVariables } from "../types";
import { populateUser } from "../middleware/auth";
import { getAdminByEmail, getAdminCount, createAdmin } from "../db/queries";
import { hashPassword, verifyPassword } from "../lib/password";
import {
  clearSessionCookie,
  sessionCookie,
  signJwt,
} from "../lib/jwt";

const authRoute = new Hono<{
  Bindings: AppBindings;
  Variables: AppVariables;
}>();

authRoute.use("/me", populateUser);
authRoute.get("/me", (c) => {
  const user = c.get("user");
  return c.json({ authenticated: !!user, user: user ?? undefined });
});

/** POST /api/auth/setup — create the first admin. 409 once one exists. */
authRoute.post("/setup", async (c) => {
  if ((await getAdminCount(c.env.DB)) > 0) {
    return c.json({ error: "setup already completed" }, 409);
  }
  const body = (await c.req.json().catch(() => null)) as LoginRequest | null;
  if (!body?.email || !body?.password) {
    return c.json({ error: "email and password are required" }, 400);
  }
  if (body.password.length < 8) {
    return c.json({ error: "password must be at least 8 characters" }, 400);
  }
  if (await getAdminByEmail(c.env.DB, body.email)) {
    return c.json({ error: "email already registered" }, 409);
  }
  const id = crypto.randomUUID();
  const hash = await hashPassword(body.password);
  await createAdmin(c.env.DB, id, body.email, hash);
  const token = await signJwt({ sub: id, email: body.email, role: "admin" }, c.env.JWT_SECRET);
  c.header("Set-Cookie", sessionCookie(token));
  const user: AuthUser = { id, email: body.email, role: "admin" };
  return c.json({ authenticated: true, user }, 201);
});

/** POST /api/auth/login — exchange credentials for a session cookie. */
authRoute.post("/login", async (c) => {
  const body = (await c.req.json().catch(() => null)) as LoginRequest | null;
  if (!body?.email || !body?.password) {
    return c.json({ error: "email and password are required" }, 400);
  }
  const admin = await getAdminByEmail(c.env.DB, body.email);
  if (!admin || !(await verifyPassword(body.password, admin.password_hash))) {
    return c.json({ error: "invalid credentials" }, 401);
  }
  const token = await signJwt(
    { sub: admin.id, email: admin.email, role: admin.role },
    c.env.JWT_SECRET,
  );
  c.header("Set-Cookie", sessionCookie(token));
  return c.json({
    authenticated: true,
    user: { id: admin.id, email: admin.email, role: admin.role },
  });
});

/** POST /api/auth/logout — clear the session cookie. */
authRoute.post("/logout", (c) => {
  c.header("Set-Cookie", clearSessionCookie());
  return c.json({ ok: true });
});

export default authRoute;
