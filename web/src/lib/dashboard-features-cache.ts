import type { FeatureManifest } from "@opentranslator/shared-types";
import { apiGet } from "./api-client";
import { createSessionSnapshotCache } from "./session-snapshot-cache";

export interface FeaturesSnapshot {
  features: FeatureManifest[];
  updatedAt: number;
}

function isFeaturesSnapshot(value: unknown): value is FeaturesSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.updatedAt === "number" && Array.isArray(v.features);
}

const cache = createSessionSnapshotCache<FeaturesSnapshot>({
  storageKey: "ot.dashboard.features.v1",
  isSnapshot: isFeaturesSnapshot,
  async fetchFresh() {
    const res = await apiGet<{ features: FeatureManifest[] }>(
      "/api/admin/features",
    );
    return {
      features: res.features,
      updatedAt: Date.now(),
    };
  },
});

export function getFeaturesSnapshot(): FeaturesSnapshot | null {
  return cache.get();
}

export function loadFeaturesSnapshot(opts?: {
  force?: boolean;
}): Promise<FeaturesSnapshot> {
  return cache.load(opts);
}

export function setFeaturesSnapshot(
  features: FeatureManifest[],
  expectedGen?: number,
): void {
  cache.set({ features, updatedAt: Date.now() }, expectedGen);
}

export function beginFeaturesWrite(): number {
  return cache.currentGeneration();
}

export function clearFeaturesSnapshot(): void {
  cache.clear();
}
