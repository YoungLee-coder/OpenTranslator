import type { SiteSettings } from "@opentranslator/shared-types";
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
