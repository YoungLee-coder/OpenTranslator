import { Hono } from "hono";
import type {
  AuthUser,
  UpdateAvatarResponse,
  UpdateProfileRequest,
} from "@opentranslator/shared-types";
import type { AppBindings, AppVariables } from "../types";
import {
  getAdminByEmail,
  getAdminById,
  updateAdmin,
} from "../db/queries";
import {
  adminToAuthUser,
  deleteAvatar,
  getAvatar,
  putAvatar,
  validateAvatarFile,
} from "../lib/avatar";
import { hashPassword, verifyPassword } from "../lib/password";
import { sessionCookie, signJwt } from "../lib/jwt";

const adminProfileRoute = new Hono<{
  Bindings: AppBindings;
  Variables: AppVariables;
}>();

/** GET /api/admin/profile/avatar — serve the signed-in admin's avatar bytes. */
adminProfileRoute.get("/avatar", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const admin = await getAdminById(c.env.DB, user.id);
  if (!admin?.avatar_updated_at) return c.text("not found", 404);

  const avatar = await getAvatar(c.env.SETTINGS_KV, user.id);
  if (!avatar) return c.text("not found", 404);

  return new Response(avatar.data, {
    headers: {
      "Content-Type": avatar.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
});

/** PUT /api/admin/profile/avatar — upload a custom avatar (multipart field `avatar`). */
adminProfileRoute.put("/avatar", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "unauthorized" }, 401);

  const form = await c.req.formData().catch(() => null);
  const raw = form?.get("avatar");
  if (typeof raw !== "object" || raw === null || !("arrayBuffer" in raw)) {
    return c.json({ error: "avatar file is required" }, 400);
  }
  const file = raw as File;

  const validated = await validateAvatarFile(file);
  if (!validated.ok) return c.json({ error: validated.error }, 400);

  const updatedAt = Math.floor(Date.now() / 1000);
  await putAvatar(
    c.env.SETTINGS_KV,
    user.id,
    validated.buffer,
    validated.contentType,
  );
  await updateAdmin(c.env.DB, user.id, { avatar_updated_at: updatedAt });

  const admin = await getAdminById(c.env.DB, user.id);
  if (!admin) return c.json({ error: "user not found" }, 404);
  const res: UpdateAvatarResponse = { user: adminToAuthUser(admin) };
  return c.json(res);
});

/** DELETE /api/admin/profile/avatar — remove the custom avatar. */
adminProfileRoute.delete("/avatar", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "unauthorized" }, 401);

  await deleteAvatar(c.env.SETTINGS_KV, user.id);
  await updateAdmin(c.env.DB, user.id, { avatar_updated_at: null });

  const admin = await getAdminById(c.env.DB, user.id);
  if (!admin) return c.json({ error: "user not found" }, 404);
  const res: UpdateAvatarResponse = { user: adminToAuthUser(admin) };
  return c.json(res);
});

/** PUT /api/admin/profile — update the signed-in admin's email and/or password. */
adminProfileRoute.put("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const body = (await c.req.json().catch(() => null)) as UpdateProfileRequest | null;
  if (!body?.currentPassword) {
    return c.json({ error: "current password is required" }, 400);
  }

  const admin = await getAdminById(c.env.DB, user.id);
  if (!admin) return c.json({ error: "user not found" }, 404);
  if (!(await verifyPassword(body.currentPassword, admin.password_hash))) {
    return c.json({ error: "invalid current password" }, 401);
  }

  const patch: { email?: string; password_hash?: string } = {};
  let nextEmail = admin.email;

  if (body.email !== undefined) {
    if (typeof body.email !== "string") {
      return c.json({ error: "invalid email" }, 400);
    }
    const email = body.email.trim();
    if (!email) return c.json({ error: "email is required" }, 400);
    if (email !== admin.email) {
      const existing = await getAdminByEmail(c.env.DB, email);
      if (existing && existing.id !== admin.id) {
        return c.json({ error: "email already registered" }, 409);
      }
      patch.email = email;
      nextEmail = email;
    }
  }

  if (body.newPassword !== undefined && body.newPassword !== "") {
    if (body.newPassword.length < 8) {
      return c.json({ error: "password must be at least 8 characters" }, 400);
    }
    patch.password_hash = await hashPassword(body.newPassword);
  }

  if (Object.keys(patch).length === 0) {
    return c.json({ user: adminToAuthUser(admin), changed: false });
  }

  await updateAdmin(c.env.DB, user.id, patch);

  const updatedAdmin = await getAdminById(c.env.DB, user.id);
  if (!updatedAdmin) return c.json({ error: "user not found" }, 404);

  if (patch.email) {
    const token = await signJwt(
      { sub: user.id, email: nextEmail, role: user.role },
      c.env.JWT_SECRET,
    );
    c.header("Set-Cookie", sessionCookie(token));
  }
  return c.json({ user: adminToAuthUser(updatedAdmin), changed: true });
});

export default adminProfileRoute;
