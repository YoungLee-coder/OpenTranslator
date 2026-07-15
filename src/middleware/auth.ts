import type { Context, MiddlewareHandler } from "hono";
import type { AppBindings, AppVariables } from "../types";
import { getSessionUser } from "../auth/session";

type C = Context<{ Bindings: AppBindings; Variables: AppVariables }>;

/** Rejects unauthenticated requests to /api/admin/*. */
export const authMiddleware: MiddlewareHandler<{
  Bindings: AppBindings;
  Variables: AppVariables;
}> = async (c, next) => {
  const user = await getSessionUser(
    c.req.header("cookie"),
    c.env.JWT_SECRET,
    c.req.header("authorization"),
  );
  if (!user) {
    return c.json({ error: "unauthorized" }, 401);
  }
  c.set("user", user);
  await next();
};

/** Populate c.var.user without rejecting — used on public endpoints. */
export const populateUser: MiddlewareHandler<{
  Bindings: AppBindings;
  Variables: AppVariables;
}> = async (c, next) => {
  const user = await getSessionUser(
    c.req.header("cookie"),
    c.env.JWT_SECRET,
    c.req.header("authorization"),
  );
  c.set("user", user);
  await next();
};

export function currentUser(c: C) {
  return c.get("user");
}
