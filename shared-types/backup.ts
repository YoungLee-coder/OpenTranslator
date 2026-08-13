/** 备份文件标识；导入时据此拒绝无关 JSON。 */
export const BACKUP_KIND = "opentranslator.backup" as const;
export const BACKUP_VERSION = 1 as const;

/** 须满足 1（DELETE）+ providers + settings + modules ≤ D1 batch 上限 100，以便导入单次事务。 */
export const BACKUP_MAX_PROVIDERS = 50;
export const BACKUP_MAX_SETTINGS = 40;
export const BACKUP_MAX_FEATURE_MODULES = 8;
export const BACKUP_MAX_ID_LEN = 128;
export const BACKUP_MAX_NAME_LEN = 200;
export const BACKUP_MAX_API_KEY_LEN = 8192;
export const BACKUP_MAX_SETTING_KEY_LEN = 64;
export const BACKUP_MAX_SETTING_VALUE_LEN = 32_768;
export const BACKUP_MAX_TYPE_LEN = 64;

/** 导出的供应商：含明文 API Key，便于换 ENCRYPTION_KEY 或迁实例后恢复。 */
export interface BackupProvider {
  id: string;
  /** 供应商 type；导入时本实例 registry 没有的项会跳过。 */
  type: string;
  displayName: string;
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  models?: string[];
  configJson?: Record<string, unknown>;
  enabled: boolean;
  isPublicDefault: boolean;
}

export interface BackupFeatureModule {
  key: string;
  enabled: boolean;
}

/**
 * 站点配置备份。不含管理员账号、头像、用量日志与翻译缓存。
 * `siteSettings` 为 D1 `site_settings` 原始键值（含 ai_experts_config 等）。
 */
export interface SiteBackup {
  kind: typeof BACKUP_KIND;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  siteSettings: Record<string, string>;
  providers: BackupProvider[];
  featureModules: BackupFeatureModule[];
}

export interface SiteBackupImportResult {
  ok: true;
  providers: number;
  settings: number;
  featureModules: number;
  skippedProviders: number;
  skippedModules: number;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseBackupProvider(raw: unknown): BackupProvider | null {
  if (!isPlainObject(raw)) return null;
  const id = raw.id;
  const type = raw.type;
  const displayName = raw.displayName;
  const apiKey = raw.apiKey;
  if (typeof id !== "string" || !id.trim() || id.length > BACKUP_MAX_ID_LEN) {
    return null;
  }
  if (typeof type !== "string" || !type.trim() || type.length > BACKUP_MAX_TYPE_LEN) {
    return null;
  }
  if (
    typeof displayName !== "string" ||
    !displayName.trim() ||
    displayName.length > BACKUP_MAX_NAME_LEN
  ) {
    return null;
  }
  if (typeof apiKey !== "string" || apiKey.length > BACKUP_MAX_API_KEY_LEN) {
    return null;
  }

  let models: string[] | undefined;
  if (raw.models !== undefined) {
    if (!Array.isArray(raw.models)) return null;
    models = raw.models.filter((m): m is string => typeof m === "string");
  }

  let configJson: Record<string, unknown> | undefined;
  if (raw.configJson !== undefined) {
    if (!isPlainObject(raw.configJson)) return null;
    configJson = raw.configJson;
  }

  const baseUrl = raw.baseUrl;
  const defaultModel = raw.defaultModel;
  if (baseUrl !== undefined && typeof baseUrl !== "string") return null;
  if (defaultModel !== undefined && typeof defaultModel !== "string") return null;
  if (typeof raw.enabled !== "boolean") return null;
  if (typeof raw.isPublicDefault !== "boolean") return null;

  const out: BackupProvider = {
    id: id.trim(),
    type: type.trim(),
    displayName: displayName.trim(),
    apiKey,
    enabled: raw.enabled,
    isPublicDefault: raw.isPublicDefault,
  };
  if (typeof baseUrl === "string") out.baseUrl = baseUrl;
  if (typeof defaultModel === "string") out.defaultModel = defaultModel;
  if (models) out.models = models;
  if (configJson) out.configJson = configJson;
  return out;
}

function parseFeatureModule(raw: unknown): BackupFeatureModule | null {
  if (!isPlainObject(raw)) return null;
  const key = raw.key;
  if (typeof key !== "string" || !key.trim() || key.length > BACKUP_MAX_ID_LEN) {
    return null;
  }
  if (typeof raw.enabled !== "boolean") return null;
  return { key: key.trim(), enabled: raw.enabled };
}

/** 校验并窄化备份 JSON。结构不合法返回 null；未知供应商 type 仍解析，由导入侧按 registry 跳过。 */
export function parseSiteBackup(raw: unknown): SiteBackup | null {
  if (!isPlainObject(raw)) return null;
  if (raw.kind !== BACKUP_KIND) return null;
  if (raw.version !== BACKUP_VERSION) return null;
  if (typeof raw.exportedAt !== "string") return null;
  if (!isPlainObject(raw.siteSettings)) return null;
  if (!Array.isArray(raw.providers) || !Array.isArray(raw.featureModules)) {
    return null;
  }
  if (raw.providers.length > BACKUP_MAX_PROVIDERS) return null;
  if (Object.keys(raw.siteSettings).length > BACKUP_MAX_SETTINGS) return null;
  if (raw.featureModules.length > BACKUP_MAX_FEATURE_MODULES) return null;

  const siteSettings: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw.siteSettings)) {
    if (
      !key ||
      key.length > BACKUP_MAX_SETTING_KEY_LEN ||
      typeof value !== "string" ||
      value.length > BACKUP_MAX_SETTING_VALUE_LEN
    ) {
      return null;
    }
    siteSettings[key] = value;
  }

  const providers: BackupProvider[] = [];
  const seenIds = new Set<string>();
  for (const item of raw.providers) {
    const p = parseBackupProvider(item);
    if (!p) return null;
    if (seenIds.has(p.id)) return null;
    seenIds.add(p.id);
    providers.push(p);
  }

  const featureModules: BackupFeatureModule[] = [];
  const seenKeys = new Set<string>();
  for (const item of raw.featureModules) {
    const m = parseFeatureModule(item);
    if (!m) return null;
    if (seenKeys.has(m.key)) return null;
    seenKeys.add(m.key);
    featureModules.push(m);
  }

  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: raw.exportedAt,
    siteSettings,
    providers,
    featureModules,
  };
}
