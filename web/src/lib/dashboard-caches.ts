import { clearOverviewSnapshot } from "./dashboard-overview-cache";
import { clearProvidersSnapshot } from "./dashboard-providers-cache";
import { clearSettingsSnapshot } from "./dashboard-settings-cache";

/** 登出 / 会话失效时清掉全部控制台会话快照。 */
export function clearDashboardCaches(): void {
  clearOverviewSnapshot();
  clearProvidersSnapshot();
  clearSettingsSnapshot();
}
