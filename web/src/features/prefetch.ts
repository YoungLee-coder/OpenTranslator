import { loadProvidersSnapshot } from "@/lib/dashboard-providers-cache";
import { loadSettingsSnapshot } from "@/lib/dashboard-settings-cache";
import {
  clearAiExpertsSnapshot,
  loadAiExpertsSnapshot,
} from "./ai-experts-cache";
import { isFeatureKey, type FeatureKey } from "./keys";
import {
  clearMultiUserSnapshot,
  loadMultiUserSnapshot,
} from "./multi-user-cache";

interface FeaturePrefetch {
  prefetch: () => Promise<unknown>;
  /** 模块开关变化时的额外动作（enable / disable 都会走）。 */
  onToggle?: (enabled: boolean) => void;
  clear?: () => void;
}

/**
 * 按功能模块 key 预拉管理页数据。新增模块在这里与 `registry.ts` 一起
 * 用 `FeatureKey` 穷尽登记，不要写进核心路由。失败由调用方 / 内部吞掉。
 */
const MODULES: Record<FeatureKey, FeaturePrefetch> = {
  "public-access": {
    prefetch: () =>
      Promise.all([
        loadProvidersSnapshot().catch(() => null),
        loadSettingsSnapshot().catch(() => null),
      ]),
    onToggle: () => {
      void loadSettingsSnapshot({ force: true }).catch(() => {});
    },
  },
  "ai-experts": {
    prefetch: () => loadAiExpertsSnapshot(),
    clear: clearAiExpertsSnapshot,
  },
  "multi-user": {
    prefetch: () => loadMultiUserSnapshot(),
    clear: clearMultiUserSnapshot,
  },
};

function entry(key: string): FeaturePrefetch | undefined {
  return isFeatureKey(key) ? MODULES[key] : undefined;
}

export function prefetchFeature(key: string): void {
  const run = entry(key)?.prefetch;
  if (!run) return;
  void run().catch(() => {});
}

/** 开关成功后：启用则预拉模块数据；无论启停都跑该模块的 onToggle。 */
export function onFeatureToggled(key: string, enabled: boolean): void {
  if (enabled) prefetchFeature(key);
  entry(key)?.onToggle?.(enabled);
}

export function clearFeatureDataCaches(): void {
  for (const mod of Object.values(MODULES)) {
    mod.clear?.();
  }
}
