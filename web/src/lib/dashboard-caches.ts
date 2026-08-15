import type { AuthUser } from "@opentranslator/shared-types";
import { hasPermission } from "@opentranslator/shared-types";
import { clearFeatureDataCaches, prefetchFeature } from "@/features/prefetch";
import {
  clearFeaturesSnapshot,
  loadFeaturesSnapshot,
} from "./dashboard-features-cache";
import { clearOverviewSnapshot, loadOverviewSnapshot } from "./dashboard-overview-cache";
import {
  clearProvidersSnapshot,
  loadProvidersSnapshot,
} from "./dashboard-providers-cache";
import {
  clearSettingsSnapshot,
  loadSettingsSnapshot,
} from "./dashboard-settings-cache";

/** 登出 / 会话失效时清掉全部控制台会话快照。 */
export function clearDashboardCaches(): void {
  clearOverviewSnapshot();
  clearProvidersSnapshot();
  clearSettingsSnapshot();
  clearFeaturesSnapshot();
  clearFeatureDataCaches();
}

/**
 * 登录后在站点空闲时预拉控制台数据 + lazy chunk。
 * 已启用的功能模块一并预拉，开启新模块时由 ModulesSection 再补拉。
 * 失败静默；进控制台时有快照即可免零态过渡。
 */
export function prefetchDashboard(user?: AuthUser | null): void {
  if (!user || hasPermission(user, "usage")) {
    void loadOverviewSnapshot().catch(() => {});
  }
  if (!user || hasPermission(user, "providers")) {
    void loadProvidersSnapshot().catch(() => {});
  }
  if (!user || hasPermission(user, "settings")) {
    void loadSettingsSnapshot().catch(() => {});
    void loadFeaturesSnapshot()
      .then((snap) => {
        for (const feature of snap.features) {
          if (feature.enabled) prefetchFeature(feature.key);
        }
      })
      .catch(() => {});
  }
  void import("@/routes/dashboard/DashboardPage").catch(() => {});
}
