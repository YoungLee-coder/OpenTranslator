/** 指向某个供应商下某个模型的引用。 */
export interface PublicModelRef {
  providerId: string;
  model: string;
}

export interface SiteSettings {
  sitePublic: boolean;
  publicDefaultProviderId?: string;
  /** 对匿名访客开放的模型集合；为空时回落到旧的 is_public_default 机制。 */
  publicModels?: PublicModelRef[];
  /** 匿名访客未主动选择时的默认模型；需属于 publicModels。 */
  publicDefaultModel?: PublicModelRef | null;
  /**
   * 登录用户未主动选择时的站点默认模型；需指向可用供应商下的已声明模型。
   * 与公开访问的 publicDefaultModel 相互独立。
   */
  defaultModel?: PublicModelRef | null;
  publicRateLimitPerMinute: number;
  authedRateLimitPerMinute: number;
  translationCacheEnabled: boolean;
  /** 翻译结果在 KV 中的保留时长（小时）。受下方范围常量约束。 */
  translationCacheTtlHours: number;
  /**
   * 翻译时对杂乱原文推断结构并输出整洁译文（仅默认/通用提示词；专家与 DeepL 仍忽略）。
   * 默认关闭。
   */
  organizeFormatEnabled: boolean;
  [key: string]: unknown;
}

/** Partial update for PUT /api/admin/settings. */
export type SiteSettingsUpdate = Partial<SiteSettings>;

/** 翻译结果缓存 TTL（小时）的合法区间与默认值。关闭缓存时此值不生效。 */
export const TRANSLATION_CACHE_TTL_HOURS_MIN = 1;
export const TRANSLATION_CACHE_TTL_HOURS_MAX = 720;
export const TRANSLATION_CACHE_TTL_HOURS_DEFAULT = 720;

/** 每 IP 每分钟限流配额的合法区间与默认值。 */
export const RATE_LIMIT_PER_MINUTE_MIN = 1;
export const RATE_LIMIT_PER_MINUTE_MAX = 1000;
export const PUBLIC_RATE_LIMIT_PER_MINUTE_DEFAULT = 20;
export const AUTHED_RATE_LIMIT_PER_MINUTE_DEFAULT = 60;
