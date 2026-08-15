/** 登录名：2–64 字符，不可含空白。可以是邮箱或普通用户名。 */
export function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const username = raw.trim();
  if (username.length < 2 || username.length > 64) return null;
  if (/\s/.test(username)) return null;
  return username;
}
