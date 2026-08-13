import { Hono } from "hono";
import {
  BACKUP_KIND,
  BACKUP_MAX_FEATURE_MODULES,
  BACKUP_MAX_PROVIDERS,
  BACKUP_MAX_SETTINGS,
  BACKUP_VERSION,
  parseSiteBackup,
  type BackupProvider,
  type ProviderType,
  type SiteBackup,
  type SiteBackupImportResult,
} from "@opentranslator/shared-types";
import type { AppBindings, AppVariables } from "../types";
import { providerSchemas } from "../providers/schema";
import { normalizeStoredProviderBaseUrl } from "../providers/base-url";
import {
  getFeatureModules,
  getSiteSettingsMap,
  listProviderRows,
} from "../db/queries";
import { decryptSecret, encryptSecret } from "../lib/crypto";
import { invalidateSiteSettings, prunePublicModelRefs } from "../settings/cache";
import { invalidateAiExpertsConfig } from "../features/ai-experts/store";
import { featureManifests } from "../features/manifests";

const KNOWN_FEATURE_KEYS = new Set(featureManifests.map((m) => m.key));

/** D1 `batch()` 单次事务上限；超限拒绝导入，避免跨批留下半写入。 */
const D1_BATCH_MAX = 100;

const adminBackupRoute = new Hono<{
  Bindings: AppBindings;
  Variables: AppVariables;
}>();

function isKnownProviderType(type: string): type is ProviderType {
  return Object.prototype.hasOwnProperty.call(providerSchemas, type);
}

function modelsJson(p: BackupProvider): string | null {
  if (p.models?.length) return JSON.stringify(p.models);
  return null;
}

function defaultModelOf(p: BackupProvider): string | null {
  return p.models?.[0] ?? p.defaultModel ?? null;
}

/** GET /api/admin/backup — 导出配置（供应商 API Key 为明文）。 */
adminBackupRoute.get("/", async (c) => {
  const [settingsMap, providerRows, moduleMap] = await Promise.all([
    getSiteSettingsMap(c.env.DB),
    listProviderRows(c.env.DB),
    getFeatureModules(c.env.DB),
  ]);

  const providers: BackupProvider[] = [];
  for (const row of providerRows) {
    let apiKey = "";
    try {
      apiKey = await decryptSecret(row.encrypted_api_key, c.env.ENCRYPTION_KEY);
    } catch {
      return c.json(
        {
          error: `failed to decrypt API key for provider "${row.display_name}"`,
        },
        500,
      );
    }
    const rec: BackupProvider = {
      id: row.id,
      type: row.type,
      displayName: row.display_name,
      apiKey,
      enabled: row.enabled === 1,
      isPublicDefault: row.is_public_default === 1,
    };
    if (row.base_url) rec.baseUrl = row.base_url;
    if (row.default_model) rec.defaultModel = row.default_model;
    if (row.models) {
      try {
        const parsed = JSON.parse(row.models) as unknown;
        if (Array.isArray(parsed)) {
          rec.models = parsed.filter((m): m is string => typeof m === "string");
        }
      } catch {
        // 损坏的 models JSON 忽略，回落到 defaultModel
      }
    }
    if (row.config_json) {
      try {
        const parsed = JSON.parse(row.config_json) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          rec.configJson = parsed as Record<string, unknown>;
        }
      } catch {
        // 损坏的 config_json 忽略
      }
    }
    providers.push(rec);
  }

  const featureModules = [...moduleMap.values()].map((row) => ({
    key: row.key,
    enabled: row.enabled === 1,
  }));

  if (
    providers.length > BACKUP_MAX_PROVIDERS ||
    Object.keys(settingsMap).length > BACKUP_MAX_SETTINGS ||
    featureModules.length > BACKUP_MAX_FEATURE_MODULES
  ) {
    return c.json({ error: "too much data to export as a backup" }, 400);
  }

  const backup: SiteBackup = {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    siteSettings: settingsMap,
    providers,
    featureModules,
  };
  c.header("Cache-Control", "no-store");
  return c.json(backup);
});

/** POST /api/admin/backup — 导入配置；替换全部供应商并 upsert 设置 / 模块。 */
adminBackupRoute.post("/", async (c) => {
  const body = (await c.req.json().catch(() => null)) as unknown;
  const backup = parseSiteBackup(body);
  if (!backup) {
    return c.json({ error: "invalid backup file" }, 400);
  }

  const now = Math.floor(Date.now() / 1000);
  const statements: D1PreparedStatement[] = [];
  statements.push(c.env.DB.prepare("DELETE FROM providers"));

  let skippedProviders = 0;
  let publicDefaultSeen = false;
  const importedIds = new Set<string>();
  for (const p of backup.providers) {
    if (!isKnownProviderType(p.type)) {
      skippedProviders += 1;
      continue;
    }
    const encrypted = await encryptSecret(p.apiKey, c.env.ENCRYPTION_KEY);
    const isPublicDefault = p.isPublicDefault && !publicDefaultSeen;
    if (isPublicDefault) publicDefaultSeen = true;
    importedIds.add(p.id);
    statements.push(
      c.env.DB
        .prepare(
          `INSERT INTO providers
            (id, type, display_name, encrypted_api_key, base_url, default_model, models, config_json, enabled, is_public_default, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          p.id,
          p.type,
          p.displayName,
          encrypted,
          normalizeStoredProviderBaseUrl(p.type, p.baseUrl) ?? null,
          defaultModelOf(p),
          modelsJson(p),
          p.configJson ? JSON.stringify(p.configJson) : null,
          p.enabled ? 1 : 0,
          isPublicDefault ? 1 : 0,
          now,
          now,
        ),
    );
  }

  for (const [key, value] of Object.entries(backup.siteSettings)) {
    statements.push(
      c.env.DB
        .prepare(
          "INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?) " +
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
        )
        .bind(key, value, now),
    );
  }

  let skippedModules = 0;
  let importedModules = 0;
  for (const m of backup.featureModules) {
    if (!KNOWN_FEATURE_KEYS.has(m.key)) {
      skippedModules += 1;
      continue;
    }
    importedModules += 1;
    statements.push(
      c.env.DB
        .prepare(
          "INSERT INTO feature_modules (key, name, enabled, created_at) VALUES (?, ?, ?, ?) " +
            "ON CONFLICT(key) DO UPDATE SET enabled = excluded.enabled",
        )
        .bind(m.key, m.key, m.enabled ? 1 : 0, now),
    );
  }

  if (statements.length > D1_BATCH_MAX) {
    return c.json({ error: "backup too large to apply atomically" }, 400);
  }

  await c.env.DB.batch(statements);
  await prunePublicModelRefs(
    c.env.SETTINGS_KV,
    c.env.DB,
    (r) => !importedIds.has(r.providerId),
    (pid) => !importedIds.has(pid),
  );
  await invalidateSiteSettings(c.env.SETTINGS_KV);
  await invalidateAiExpertsConfig(c.env.SETTINGS_KV);

  const result: SiteBackupImportResult = {
    ok: true,
    providers: importedIds.size,
    settings: Object.keys(backup.siteSettings).length,
    featureModules: importedModules,
    skippedProviders,
    skippedModules,
  };
  return c.json(result);
});

export default adminBackupRoute;
