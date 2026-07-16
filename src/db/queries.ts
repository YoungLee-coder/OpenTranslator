import type { ProviderRecord, ProviderType } from "@opentranslator/shared-types";

interface ProviderRow {
  id: string;
  type: string;
  display_name: string;
  encrypted_api_key: string;
  base_url: string | null;
  default_model: string | null;
  models: string | null;
  config_json: string | null;
  enabled: number;
  is_public_default: number;
  created_at: number | null;
  updated_at: number | null;
}

interface AdminUserRow {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: number | null;
  avatar_updated_at: number | null;
}

function toProviderRecord(row: ProviderRow): ProviderRecord {
  let models: string[] | undefined;
  if (row.models) {
    try {
      const parsed = JSON.parse(row.models) as unknown;
      if (Array.isArray(parsed)) {
        models = parsed.filter((m): m is string => typeof m === "string");
      }
    } catch {
      // 损坏的 JSON 忽略，回落到 defaultModel
    }
  }
  return {
    id: row.id,
    type: row.type as ProviderType,
    displayName: row.display_name,
    baseUrl: row.base_url ?? undefined,
    defaultModel: row.default_model ?? undefined,
    models,
    configJson: row.config_json ? (JSON.parse(row.config_json) as Record<string, unknown>) : undefined,
    enabled: row.enabled === 1,
    isPublicDefault: row.is_public_default === 1,
    createdAt: row.created_at ?? 0,
    updatedAt: row.updated_at ?? 0,
  };
}

export type { ProviderRow, AdminUserRow };

/* ----------------------------- site settings ----------------------------- */

export async function getSiteSettingsMap(
  db: D1Database,
): Promise<Record<string, string>> {
  const result = await db
    .prepare("SELECT key, value FROM site_settings")
    .all<{ key: string; value: string }>();
  const map: Record<string, string> = {};
  for (const row of result.results ?? []) map[row.key] = row.value;
  return map;
}

export async function setSiteSetting(
  db: D1Database,
  key: string,
  value: string,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      "INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    )
    .bind(key, value, now)
    .run();
}

export async function deleteSiteSetting(db: D1Database, key: string): Promise<void> {
  await db.prepare("DELETE FROM site_settings WHERE key = ?").bind(key).run();
}

/* ------------------------------- providers -------------------------------- */

export async function getProviderRow(db: D1Database, id: string): Promise<ProviderRow | null> {
  return db
    .prepare("SELECT * FROM providers WHERE id = ?")
    .bind(id)
    .first<ProviderRow>();
}

export async function listProviderRows(db: D1Database): Promise<ProviderRow[]> {
  const result = await db
    .prepare("SELECT * FROM providers ORDER BY created_at ASC")
    .all<ProviderRow>();
  return result.results ?? [];
}

export async function listProviderRecords(db: D1Database): Promise<ProviderRecord[]> {
  const rows = await listProviderRows(db);
  return rows.map(toProviderRecord);
}

export function providerRowToRecord(row: ProviderRow): ProviderRecord {
  return toProviderRecord(row);
}

/** Pick the public-default provider; fall back to the first enabled provider. */
export async function getPublicDefaultProviderRow(
  db: D1Database,
): Promise<ProviderRow | null> {
  const flagged = await db
    .prepare(
      "SELECT * FROM providers WHERE enabled = 1 AND is_public_default = 1 ORDER BY created_at ASC LIMIT 1",
    )
    .first<ProviderRow>();
  if (flagged) return flagged;
  return db
    .prepare("SELECT * FROM providers WHERE enabled = 1 ORDER BY created_at ASC LIMIT 1")
    .first<ProviderRow>();
}

export interface ProviderInsert {
  id: string;
  type: string;
  display_name: string;
  encrypted_api_key: string;
  base_url?: string | null;
  default_model?: string | null;
  models?: string | null;
  config_json?: string | null;
  enabled?: number;
  is_public_default?: number;
}

export async function insertProvider(db: D1Database, p: ProviderInsert): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO providers
        (id, type, display_name, encrypted_api_key, base_url, default_model, models, config_json, enabled, is_public_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      p.id,
      p.type,
      p.display_name,
      p.encrypted_api_key,
      p.base_url ?? null,
      p.default_model ?? null,
      p.models ?? null,
      p.config_json ?? null,
      p.enabled ?? 1,
      p.is_public_default ?? 0,
      now,
      now,
    )
    .run();
}

export interface ProviderPatch {
  type?: string;
  display_name?: string;
  encrypted_api_key?: string;
  base_url?: string | null;
  default_model?: string | null;
  models?: string | null;
  config_json?: string | null;
  enabled?: number;
  is_public_default?: number;
}

export async function updateProvider(
  db: D1Database,
  id: string,
  patch: ProviderPatch,
): Promise<boolean> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.type !== undefined) {
    sets.push("type = ?");
    params.push(patch.type);
  }
  if (patch.display_name !== undefined) {
    sets.push("display_name = ?");
    params.push(patch.display_name);
  }
  if (patch.encrypted_api_key !== undefined) {
    sets.push("encrypted_api_key = ?");
    params.push(patch.encrypted_api_key);
  }
  if (patch.base_url !== undefined) {
    sets.push("base_url = ?");
    params.push(patch.base_url);
  }
  if (patch.default_model !== undefined) {
    sets.push("default_model = ?");
    params.push(patch.default_model);
  }
  if (patch.models !== undefined) {
    sets.push("models = ?");
    params.push(patch.models);
  }
  if (patch.config_json !== undefined) {
    sets.push("config_json = ?");
    params.push(patch.config_json);
  }
  if (patch.enabled !== undefined) {
    sets.push("enabled = ?");
    params.push(patch.enabled);
  }
  if (patch.is_public_default !== undefined) {
    sets.push("is_public_default = ?");
    params.push(patch.is_public_default);
  }
  if (sets.length === 0) return true;
  sets.push("updated_at = ?");
  params.push(Math.floor(Date.now() / 1000));
  params.push(id);
  const res = await db
    .prepare(`UPDATE providers SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...params)
    .run();
  return res.meta.changes > 0;
}

export async function deleteProvider(db: D1Database, id: string): Promise<boolean> {
  const res = await db.prepare("DELETE FROM providers WHERE id = ?").bind(id).run();
  return res.meta.changes > 0;
}

export async function clearPublicDefaultFlag(db: D1Database): Promise<void> {
  await db
    .prepare("UPDATE providers SET is_public_default = 0 WHERE is_public_default = 1")
    .run();
}

/* ------------------------------- admin users ------------------------------ */

export async function getAdminByEmail(
  db: D1Database,
  email: string,
): Promise<AdminUserRow | null> {
  return db
    .prepare("SELECT * FROM admin_users WHERE email = ?")
    .bind(email)
    .first<AdminUserRow>();
}

export async function getAdminCount(db: D1Database): Promise<number> {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM admin_users").first<{ n: number }>();
  return row?.n ?? 0;
}

/**
 * 仅在尚无管理员时插入首名管理员（原子条件 INSERT），避免 setup 竞态创建多名。
 * @returns true 表示插入成功；false 表示已有管理员（setup 已完成）。
 */
export async function createFirstAdmin(
  db: D1Database,
  id: string,
  email: string,
  passwordHash: string,
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const result = await db
    .prepare(
      `INSERT INTO admin_users (id, email, password_hash, role, created_at)
       SELECT ?, ?, ?, 'admin', ?
       WHERE (SELECT COUNT(*) FROM admin_users) = 0`,
    )
    .bind(id, email, passwordHash, now)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function createAdmin(
  db: D1Database,
  id: string,
  email: string,
  passwordHash: string,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      "INSERT INTO admin_users (id, email, password_hash, role, created_at) VALUES (?, ?, ?, 'admin', ?)",
    )
    .bind(id, email, passwordHash, now)
    .run();
}

export async function getAdminById(
  db: D1Database,
  id: string,
): Promise<AdminUserRow | null> {
  return db
    .prepare("SELECT * FROM admin_users WHERE id = ?")
    .bind(id)
    .first<AdminUserRow>();
}

export interface AdminPatch {
  email?: string;
  password_hash?: string;
  avatar_updated_at?: number | null;
}

export async function updateAdmin(
  db: D1Database,
  id: string,
  patch: AdminPatch,
): Promise<boolean> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.email !== undefined) {
    sets.push("email = ?");
    params.push(patch.email);
  }
  if (patch.password_hash !== undefined) {
    sets.push("password_hash = ?");
    params.push(patch.password_hash);
  }
  if (patch.avatar_updated_at !== undefined) {
    sets.push("avatar_updated_at = ?");
    params.push(patch.avatar_updated_at);
  }
  if (sets.length === 0) return true;
  params.push(id);
  const res = await db
    .prepare(`UPDATE admin_users SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...params)
    .run();
  return res.meta.changes > 0;
}

/* -------------------------------- usage logs ------------------------------- */

export async function logUsage(
  db: D1Database,
  providerId: string | null,
  charCount: number,
  isPublic: boolean,
  clientIp: string | null,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      "INSERT INTO usage_logs (provider_id, char_count, is_public_request, client_ip, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(providerId, charCount, isPublic ? 1 : 0, clientIp, now)
    .run();
}

export interface UsageSummary {
  totalRequests: number;
  totalChars: number;
  byProvider: { providerId: string; requests: number; chars: number }[];
}

export async function getUsageSummary(db: D1Database): Promise<UsageSummary> {
  const totalRow = await db
    .prepare(
      "SELECT COUNT(*) AS n, COALESCE(SUM(char_count), 0) AS chars FROM usage_logs",
    )
    .first<{ n: number; chars: number }>();
  const perProvider = await db
    .prepare(
      "SELECT provider_id, COUNT(*) AS n, COALESCE(SUM(char_count), 0) AS chars FROM usage_logs GROUP BY provider_id ORDER BY n DESC",
    )
    .all<{ provider_id: string; n: number; chars: number }>();
  return {
    totalRequests: totalRow?.n ?? 0,
    totalChars: totalRow?.chars ?? 0,
    byProvider: (perProvider.results ?? []).map((r) => ({
      providerId: r.provider_id,
      requests: r.n,
      chars: r.chars,
    })),
  };
}

/* ----------------------------- feature modules ---------------------------- */

export interface FeatureModuleRow {
  key: string;
  name: string;
  enabled: number;
  config_json: string | null;
  created_at: number | null;
}

export async function getFeatureModules(
  db: D1Database,
): Promise<Map<string, FeatureModuleRow>> {
  const res = await db.prepare("SELECT * FROM feature_modules").all<FeatureModuleRow>();
  const map = new Map<string, FeatureModuleRow>();
  for (const row of res.results ?? []) map.set(row.key, row);
  return map;
}

export async function upsertFeatureModule(
  db: D1Database,
  key: string,
  enabled: boolean,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      "INSERT INTO feature_modules (key, name, enabled, created_at) VALUES (?, ?, ?, ?) " +
        "ON CONFLICT(key) DO UPDATE SET enabled = excluded.enabled",
    )
    .bind(key, key, enabled ? 1 : 0, now)
    .run();
}

export async function deleteFeatureModule(db: D1Database, key: string): Promise<void> {
  await db.prepare("DELETE FROM feature_modules WHERE key = ?").bind(key).run();
}
