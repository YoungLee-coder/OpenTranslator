import type { AuthUser } from "@opentranslator/shared-types";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_BYTES = 512 * 1024;

export async function validateAvatarFile(
  file: File,
): Promise<{ ok: true; buffer: ArrayBuffer; contentType: string } | { ok: false; error: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "only JPEG, PNG, WebP and GIF are allowed" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "image must be at most 512 KB" };
  }
  const buffer = await file.arrayBuffer();
  return { ok: true, buffer, contentType: file.type };
}

export function resolveAvatarUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (
    url.startsWith("blob:") ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  ) {
    return url;
  }
  const base = import.meta.env.VITE_API_BASE_URL ?? "";
  return `${base}${url}`;
}

export function initialsOf(name: string): string {
  const head = name.includes("@") ? (name.split("@")[0] ?? name) : name;
  return head.slice(0, 2).toUpperCase();
}

export function avatarAlt(user: AuthUser): string {
  return user.username || user.email;
}
