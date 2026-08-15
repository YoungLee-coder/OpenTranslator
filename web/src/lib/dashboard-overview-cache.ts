import type { ProviderRecord, UsageSummary } from "@opentranslator/shared-types";
import { apiGet } from "./api-client";
import { createSessionSnapshotCache } from "./session-snapshot-cache";

export interface OverviewSnapshot {
  usage: UsageSummary;
  providers: ProviderRecord[];
  updatedAt: number;
}

function isOverviewSnapshot(value: unknown): value is OverviewSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.updatedAt === "number" &&
    v.usage !== null &&
    typeof v.usage === "object" &&
    Array.isArray(v.providers)
  );
}

const cache = createSessionSnapshotCache<OverviewSnapshot>({
  storageKey: "ot.dashboard.overview.v1",
  isSnapshot: isOverviewSnapshot,
  async fetchFresh() {
    const usageRes = await apiGet<{ usage: UsageSummary }>("/api/admin/usage");
    let providers: ProviderRecord[] = [];
    try {
      const providersRes = await apiGet<{ providers: ProviderRecord[] }>(
        "/api/admin/providers",
      );
      providers = providersRes.providers;
    } catch {
      // 仅有用量权限时供应商列表 403，用量仍可展示。
    }
    return {
      usage: usageRes.usage,
      providers,
      updatedAt: Date.now(),
    };
  },
});

export function getOverviewSnapshot(): OverviewSnapshot | null {
  return cache.get();
}

export function loadOverviewSnapshot(): Promise<OverviewSnapshot> {
  return cache.load();
}

export function clearOverviewSnapshot(): void {
  cache.clear();
}
