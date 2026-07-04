import type { AuthUser } from "@opentranslator/shared-types";
import type { AdminUserRow } from "../db/queries";

const KV_PREFIX = "av:";
const MAX_BYTES = 512 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

interface AvatarMetadata {
  contentType: string;
}

export function avatarKvKey(userId: string): string {
  return `${KV_PREFIX}${userId}`;
}

export function avatarUrl(updatedAt: number | null | undefined): string | undefined {
  if (!updatedAt) return undefined;
  return `/api/admin/profile/avatar?v=${updatedAt}`;
}

export function adminToAuthUser(admin: AdminUserRow): AuthUser {
  return {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    avatarUrl: avatarUrl(admin.avatar_updated_at),
  };
}

export async function getAvatar(
  kv: KVNamespace,
  userId: string,
): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  const res = await kv.getWithMetadata<AvatarMetadata>(
    avatarKvKey(userId),
    "arrayBuffer",
  );
  if (!res.value || !res.metadata?.contentType) return null;
  return { data: res.value, contentType: res.metadata.contentType };
}

export async function putAvatar(
  kv: KVNamespace,
  userId: string,
  data: ArrayBuffer,
  contentType: string,
): Promise<void> {
  await kv.put(avatarKvKey(userId), data, {
    metadata: { contentType },
  });
}

export async function deleteAvatar(kv: KVNamespace, userId: string): Promise<void> {
  await kv.delete(avatarKvKey(userId));
}

export async function validateAvatarFile(
  file: File,
): Promise<
  { ok: true; buffer: ArrayBuffer; contentType: string } | { ok: false; error: string }
> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "only JPEG, PNG, WebP and GIF are allowed" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "image must be at most 512 KB" };
  }
  const buffer = await file.arrayBuffer();
  return { ok: true, buffer, contentType: file.type };
}
