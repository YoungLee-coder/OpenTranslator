import type { SiteSettings } from "@opentranslator/shared-types";
import {
  AUTHED_RATE_LIMIT_PER_MINUTE_DEFAULT,
  PUBLIC_RATE_LIMIT_PER_MINUTE_DEFAULT,
  TRANSLATION_CACHE_TTL_HOURS_DEFAULT,
} from "@opentranslator/shared-types";
import { apiGet } from "./api-client";
import { createSessionSnapshotCache } from "./session-snapshot-cache";

export interface SettingsSnapshot {
  settings: SiteSettings;
  updatedAt: number;
}

/** 冷启动占位：真实表单布局，数值用合理默认；就绪前控件禁用。 */
export const PLACEHOLDER_SETTINGS: SiteSettings = {
  sitePublic: true,
  publicRateLimitPerMinute: PUBLIC_RATE_LIMIT_PER_MINUTE_DEFAULT,
  authedRateLimitPerMinute: AUTHED_RATE_LIMIT_PER_MINUTE_DEFAULT,
  translationCacheEnabled: true,
  translationCacheTtlHours: TRANSLATION_CACHE_TTL_HOURS_DEFAULT,
  organizeFormatEnabled: false,
  disableModelReasoning: false,
};

function isSettingsSnapshot(value: unknown): value is SettingsSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.updatedAt === "number" &&
    v.settings !== null &&
    typeof v.settings === "object"
  );
}

const cache = createSessionSnapshotCache<SettingsSnapshot>({
  storageKey: "ot.dashboard.settings.v1",
  isSnapshot: isSettingsSnapshot,
  async fetchFresh() {
    const res = await apiGet<{ settings: SiteSettings }>("/api/admin/settings");
    return {
      settings: res.settings,
      updatedAt: Date.now(),
    };
  },
});

export function getSettingsSnapshot(): SettingsSnapshot | null {
  return cache.get();
}

export function loadSettingsSnapshot(opts?: {
  force?: boolean;
}): Promise<SettingsSnapshot> {
  return cache.load(opts);
}

export function setSettingsSnapshot(
  settings: SiteSettings,
  expectedGen: number,
): void {
  cache.set({ settings, updatedAt: Date.now() }, expectedGen);
}

/** 发起写操作前捕获代际，避免登出竞态把旧 settings 写回。 */
export function beginSettingsWrite(): number {
  return cache.currentGeneration();
}

export function clearSettingsSnapshot(): void {
  cache.clear();
}
