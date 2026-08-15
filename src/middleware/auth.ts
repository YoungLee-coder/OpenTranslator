import type { Context, MiddlewareHandler } from "hono";
import type { UserPermission } from "@opentranslator/shared-types";
import { hasPermission, isAdminRole } from "@opentranslator/shared-types";
import type { AppBindings, AppVariables } from "../types";
import { resolveLiveUser } from "../auth/live-user";

type C = Context<{ Bindings: AppBindings; Variables: AppVariables }>;

/** Rejects unauthenticated / disabled / deleted accounts on /api/admin/*. */
export const authMiddleware: MiddlewareHandler<{
  Bindings: AppBindings;
  Variables: AppVariables;
}> = async (c, next) => {
  const user = await resolveLiveUser(
    c.req.header("cookie"),
    c.env.JWT_SECRET,
    c.req.header("authorization"),
    c.env.DB,
  );
  if (!user) {
    return c.json({ error: "unauthorized" }, 401);
  }
  c.set("user", user);
  await next();
};

const PERMISSION_BY_PREFIX: [string, UserPermission | "admin"][] = [
  ["/api/admin/users", "admin"],
  ["/api/admin/backup", "admin"],
  ["/api/admin/db", "admin"],
  ["/api/admin/providers", "providers"],
  ["/api/admin/settings", "settings"],
  ["/api/admin/features", "settings"],
  ["/api/admin/experts", "settings"],
  ["/api/admin/usage", "usage"],
];

function allows(user: NonNullable<AppVariables["user"]>, need: UserPermission | "admin"): boolean {
  if (need === "admin") return isAdminRole(user.role);
  return hasPermission(user, need);
}

/** 挂在 authMiddleware 之后：按路径检查管理员或具体权限。profile 仅需登录。未登记前缀一律 403。 */
export const adminPermissionMiddleware: MiddlewareHandler<{
  Bindings: AppBindings;
  Variables: AppVariables;
}> = async (c, next) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const path = c.req.path;
  if (path.startsWith("/api/admin/profile")) {
    await next();
    return;
  }
  for (const [prefix, need] of PERMISSION_BY_PREFIX) {
    if (!path.startsWith(prefix)) continue;
    if (!allows(user, need)) {
      return c.json({ error: "forbidden" }, 403);
    }
    await next();
    return;
  }
  return c.json({ error: "forbidden" }, 403);
};

/** Populate c.var.user without rejecting — used on public endpoints. */
export const populateUser: MiddlewareHandler<{
  Bindings: AppBindings;
  Variables: AppVariables;
}> = async (c, next) => {
  const user = await resolveLiveUser(
    c.req.header("cookie"),
    c.env.JWT_SECRET,
    c.req.header("authorization"),
    c.env.DB,
  );
  c.set("user", user);
  await next();
};

export function currentUser(c: C) {
  return c.get("user");
}
