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
}

/**
 * 登录后在站点空闲时预拉控制台数据 + lazy chunk。
 * 失败静默；进控制台时有快照即可免零态过渡。
 */
export function prefetchDashboard(): void {
  void loadOverviewSnapshot().catch(() => {});
  void loadProvidersSnapshot().catch(() => {});
  void loadSettingsSnapshot().catch(() => {});
  void import("@/routes/dashboard/DashboardPage").catch(() => {});
}
