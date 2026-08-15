import { Hono } from "hono";
import type {
  CreateManagedUserRequest,
  CreateManagedUserResponse,
  ManagedUser,
  ManagedUserListResponse,
  UpdateManagedUserRequest,
} from "@opentranslator/shared-types";
import {
  DEFAULT_USER_PERMISSIONS,
  isAdminRole,
  parseUserPermissions,
  USER_PERMISSIONS,
} from "@opentranslator/shared-types";
import type { AppBindings, AppVariables } from "../types";
import type { AdminUserRow } from "../db/queries";
import {
  createUser,
  deleteNonAdminUser,
  getAdminByEmail,
  getAdminById,
  getAdminCount,
  listAdmins,
  updateAdmin,
} from "../db/queries";
import { deleteAvatar } from "../lib/avatar";
import { hashPassword } from "../lib/password";
import { normalizeUsername } from "../lib/username";
import { isMultiUserFeatureEnabled, MAX_USERS } from "../features/multi-user/store";

const adminUsersRoute = new Hono<{
  Bindings: AppBindings;
  Variables: AppVariables;
}>();

function managedUserFromRow(row: AdminUserRow): ManagedUser {
  const role = isAdminRole(row.role) ? "admin" : "user";
  let permissions = [...USER_PERMISSIONS];
  if (role !== "admin") {
    let raw: unknown = [];
    if (row.permissions_json) {
      try {
        raw = JSON.parse(row.permissions_json) as unknown;
      } catch {
        raw = [];
      }
    }
    permissions = parseUserPermissions(raw);
  }
  return {
    id: row.id,
    username: row.email,
    role,
    permissions,
    enabled: row.enabled !== 0,
    createdAt: row.created_at,
  };
}

function isUniqueConstraintError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("UNIQUE");
}

adminUsersRoute.use(async (c, next) => {
  const user = c.get("user");
  if (!user || !isAdminRole(user.role)) {
    return c.json({ error: "forbidden" }, 403);
  }
  if (!(await isMultiUserFeatureEnabled(c.env.DB))) {
    return c.json({ error: "multi-user feature is disabled" }, 403);
  }
  await next();
});

/** GET /api/admin/users — 不含当前登录账号。 */
adminUsersRoute.get("/", async (c) => {
  const me = c.get("user");
  const rows = await listAdmins(c.env.DB);
  const res: ManagedUserListResponse = {
    users: rows.filter((row) => row.id !== me?.id).map(managedUserFromRow),
  };
  return c.json(res);
});

/** POST /api/admin/users — create a regular user. */
adminUsersRoute.post("/", async (c) => {
  const body = (await c.req.json().catch(() => null)) as CreateManagedUserRequest | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!body?.username || !password) {
    return c.json({ error: "username and password are required" }, 400);
  }
  const username = normalizeUsername(body.username);
  if (!username) {
    return c.json({ error: "invalid username" }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: "password must be at least 8 characters" }, 400);
  }

  const count = await getAdminCount(c.env.DB);
  if (count >= MAX_USERS) {
    return c.json({ error: "user limit reached" }, 409);
  }
  if (await getAdminByEmail(c.env.DB, username)) {
    return c.json({ error: "username already registered" }, 409);
  }

  const permissions = parseUserPermissions(body.permissions ?? DEFAULT_USER_PERMISSIONS);
  const id = crypto.randomUUID();
  try {
    await createUser(
      c.env.DB,
      id,
      username,
      await hashPassword(password),
      JSON.stringify(permissions),
    );
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      return c.json({ error: "username already registered" }, 409);
    }
    throw e;
  }

  const created = await getAdminById(c.env.DB, id);
  if (!created) return c.json({ error: "user not found" }, 500);
  const res: CreateManagedUserResponse = { user: managedUserFromRow(created) };
  return c.json(res, 201);
});

/** PUT /api/admin/users/:id — update a regular user (not the admin). */
adminUsersRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const actor = c.get("user");
  if (actor && id === actor.id) {
    return c.json({ error: "use profile to change your own account" }, 400);
  }

  const target = await getAdminById(c.env.DB, id);
  if (!target) return c.json({ error: "user not found" }, 404);
  if (isAdminRole(target.role)) {
    return c.json({ error: "cannot modify the admin account" }, 400);
  }

  const body = (await c.req.json().catch(() => null)) as UpdateManagedUserRequest | null;
  if (!body || typeof body !== "object") {
    return c.json({ error: "invalid body" }, 400);
  }

  const patch: {
    email?: string;
    password_hash?: string;
    enabled?: boolean;
    permissions_json?: string;
  } = {};

  if (body.username !== undefined) {
    const username = normalizeUsername(body.username);
    if (!username) return c.json({ error: "invalid username" }, 400);
    if (username !== target.email) {
      const existing = await getAdminByEmail(c.env.DB, username);
      if (existing && existing.id !== target.id) {
        return c.json({ error: "username already registered" }, 409);
      }
      patch.email = username;
    }
  }

  if (body.password !== undefined && body.password !== "") {
    if (body.password.length < 8) {
      return c.json({ error: "password must be at least 8 characters" }, 400);
    }
    patch.password_hash = await hashPassword(body.password);
  }

  if (body.permissions !== undefined) {
    patch.permissions_json = JSON.stringify(parseUserPermissions(body.permissions));
  }

  if (body.enabled !== undefined) {
    if (typeof body.enabled !== "boolean") {
      return c.json({ error: "enabled (boolean) is required" }, 400);
    }
    patch.enabled = body.enabled;
  }

  if (Object.keys(patch).length === 0) {
    return c.json({ user: managedUserFromRow(target) });
  }

  await updateAdmin(c.env.DB, id, patch);
  const updated = await getAdminById(c.env.DB, id);
  if (!updated) return c.json({ error: "user not found" }, 404);
  return c.json({ user: managedUserFromRow(updated) });
});

/** DELETE /api/admin/users/:id — delete a regular user. */
adminUsersRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const actor = c.get("user");
  if (actor && id === actor.id) {
    return c.json({ error: "cannot delete yourself" }, 400);
  }

  const outcome = await deleteNonAdminUser(c.env.DB, id);
  if (outcome === "not_found") return c.json({ error: "user not found" }, 404);
  if (outcome === "is_admin") {
    return c.json({ error: "cannot delete the admin account" }, 400);
  }
  await deleteAvatar(c.env.KV, id);
  return c.json({ ok: true });
});

export default adminUsersRoute;
