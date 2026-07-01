export interface SiteSettings {
  sitePublic: boolean;
  publicDefaultProviderId?: string;
  publicRateLimitPerMinute: number;
  authedRateLimitPerMinute: number;
  translationCacheEnabled: boolean;
  [key: string]: unknown;
}

/** Partial update for PUT /api/admin/settings. */
export type SiteSettingsUpdate = Partial<SiteSettings>;
