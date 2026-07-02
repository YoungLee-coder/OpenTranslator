export interface SiteSettings {
  sitePublic: boolean;
  publicDefaultProviderId?: string;
  publicRateLimitPerMinute: number;
  authedRateLimitPerMinute: number;
  translationCacheEnabled: boolean;
  /** 翻译结果在 KV 中的保留时长（小时）。受下方范围常量约束。 */
  translationCacheTtlHours: number;
  [key: string]: unknown;
}

/** Partial update for PUT /api/admin/settings. */
export type SiteSettingsUpdate = Partial<SiteSettings>;

/** 翻译结果缓存 TTL（小时）的合法区间与默认值。关闭缓存时此值不生效。 */
export const TRANSLATION_CACHE_TTL_HOURS_MIN = 1;
export const TRANSLATION_CACHE_TTL_HOURS_MAX = 720;
export const TRANSLATION_CACHE_TTL_HOURS_DEFAULT = 720;
