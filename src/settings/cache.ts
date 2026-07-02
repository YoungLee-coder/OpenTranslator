import type { PublicModelRef, SiteSettings } from "@opentranslator/shared-types";
import {
  TRANSLATION_CACHE_TTL_HOURS_DEFAULT,
  TRANSLATION_CACHE_TTL_HOURS_MAX,
  TRANSLATION_CACHE_TTL_HOURS_MIN,
} from "@opentranslator/shared-types";
import { getSiteSettingsMap, setSiteSetting } from "../db/queries";

/**
 * KV-cached site settings. The site switch is latency-insensitive so KV's
 * eventual consistency is fine — we avoid hitting D1 on every request.
 */

const CACHE_KEY = "site_settings:v1";
const TTL_SECONDS = 60;

/** 把字符串/数字形式的缓存 TTL（小时）夹到合法区间，非法值回落默认。 */
export function clampCacheTtlHours(raw: string | number | undefined): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return TRANSLATION_CACHE_TTL_HOURS_DEFAULT;
  const clamped = Math.round(n);
  if (clamped < TRANSLATION_CACHE_TTL_HOURS_MIN) return TRANSLATION_CACHE_TTL_HOURS_MIN;
  if (clamped > TRANSLATION_CACHE_TTL_HOURS_MAX) return TRANSLATION_CACHE_TTL_HOURS_MAX;
  return clamped;
}

function isPublicModelRef(m: unknown): m is PublicModelRef {
  if (typeof m !== "object" || m === null) return false;
  const r = m as Record<string, unknown>;
  return typeof r.providerId === "string" && typeof r.model === "string";
}

/** 解析公开模型白名单（JSON 数组）；空或损坏返回 undefined。 */
function parsePublicModels(raw: string | undefined): PublicModelRef[] | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const arr = parsed.filter(isPublicModelRef);
      return arr.length ? arr : undefined;
    }
  } catch {
    // ignore corrupted JSON
  }
  return undefined;
}

/** 解析公开默认模型（JSON 对象）；空或损坏返回 null。 */
function parsePublicModelRef(raw: string | undefined): PublicModelRef | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isPublicModelRef(parsed)) return parsed;
  } catch {
    // ignore corrupted JSON
  }
  return null;
}

export async function getSiteSettings(
  kv: KVNamespace,
  db: D1Database,
): Promise<SiteSettings> {
  const cached = await kv.get(CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as SiteSettings;
    } catch {
      // fall through to D1
    }
  }
  const map = await getSiteSettingsMap(db);
  const settings: SiteSettings = {
    sitePublic: map.site_public === "true",
    publicDefaultProviderId: map.public_default_provider_id || undefined,
    publicModels: parsePublicModels(map.public_models),
    publicDefaultModel: parsePublicModelRef(map.public_default_model),
    publicRateLimitPerMinute: Number(map.public_rate_limit_per_minute ?? 20),
    authedRateLimitPerMinute: Number(map.authed_rate_limit_per_minute ?? 60),
    translationCacheEnabled: map.translation_cache_enabled !== "false",
    translationCacheTtlHours: clampCacheTtlHours(map.translation_cache_ttl_hours),
  };
  // Fire-and-forget; don't block the request on cache write.
  void kv.put(CACHE_KEY, JSON.stringify(settings), { expirationTtl: TTL_SECONDS });
  return settings;
}

export async function invalidateSiteSettings(kv: KVNamespace): Promise<void> {
  await kv.delete(CACHE_KEY);
}

/**
 * Update a single setting key and bust the cache. Value is coerced to string
 * (booleans -> "true"/"false", numbers -> their string form).
 */
export async function updateSetting(
  kv: KVNamespace,
  db: D1Database,
  key: string,
  value: unknown,
): Promise<void> {
  const stored = typeof value === "string" ? value : String(value);
  await setSiteSetting(db, key, stored);
  await invalidateSiteSettings(kv);
}

/**
 * 级联清理公开模型白名单与公开默认项中的失效引用。
 *
 * public_models / public_default_model 是独立存储的引用快照：删除 provider
 * 或从其 models 集合移除某个模型时，必须调用本函数剔除指向已失效 provider/模型
 * 的引用，否则匿名访客的模型列表会出现「幽灵」选项（handleListModels 另有读取兜底）。
 *
 * @param isStaleRef 判定某个 {providerId, model} 引用是否已失效（应移除）
 * @param isStaleProviderId 可选，判定公开默认 provider id 是否已失效；
 *   仅在删除整个 provider 时需要传入
 */
export async function prunePublicModelRefs(
  kv: KVNamespace,
  db: D1Database,
  isStaleRef: (ref: PublicModelRef) => boolean,
  isStaleProviderId?: (providerId: string) => boolean,
): Promise<void> {
  const map = await getSiteSettingsMap(db);
  let changed = false;

  // public_models：JSON 数组，剔除失效引用；全空则写空串清空。
  const models = parsePublicModels(map.public_models);
  if (models) {
    const kept = models.filter((m) => !isStaleRef(m));
    const next = kept.length ? JSON.stringify(kept) : "";
    if (next !== (map.public_models ?? "")) {
      await setSiteSetting(db, "public_models", next);
      changed = true;
    }
  }

  // public_default_model：单个 ref，失效则清空。
  const def = parsePublicModelRef(map.public_default_model);
  if (def && isStaleRef(def)) {
    await setSiteSetting(db, "public_default_model", "");
    changed = true;
  }

  // public_default_provider_id：仅在删除 provider 时清理。
  const pid = map.public_default_provider_id;
  if (pid && isStaleProviderId?.(pid)) {
    await setSiteSetting(db, "public_default_provider_id", "");
    changed = true;
  }

  if (changed) await invalidateSiteSettings(kv);
}
