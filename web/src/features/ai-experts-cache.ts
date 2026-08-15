import type {
  AiExpertMeta,
  AiExpertsAdminResponse,
  AiExpertsConfig,
} from "@opentranslator/shared-types";
import { apiGet } from "@/lib/api-client";
import { createSessionSnapshotCache } from "@/lib/session-snapshot-cache";

export interface AiExpertsSnapshot {
  experts: AiExpertMeta[];
  config: AiExpertsConfig;
  updatedAt: number;
}

function isAiExpertsSnapshot(value: unknown): value is AiExpertsSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.updatedAt !== "number" || !Array.isArray(v.experts)) return false;
  if (!v.config || typeof v.config !== "object") return false;
  const config = v.config as Record<string, unknown>;
  return Array.isArray(config.enabledIds);
}

const cache = createSessionSnapshotCache<AiExpertsSnapshot>({
  storageKey: "ot.dashboard.experts.v1",
  isSnapshot: isAiExpertsSnapshot,
  async fetchFresh() {
    const res = await apiGet<AiExpertsAdminResponse>("/api/admin/experts");
    return {
      experts: res.experts,
      config: res.config,
      updatedAt: Date.now(),
    };
  },
});

export function getAiExpertsSnapshot(): AiExpertsSnapshot | null {
  return cache.get();
}

export function loadAiExpertsSnapshot(opts?: {
  force?: boolean;
}): Promise<AiExpertsSnapshot> {
  return cache.load(opts);
}

export function setAiExpertsSnapshot(
  snap: Omit<AiExpertsSnapshot, "updatedAt">,
  expectedGen: number,
): void {
  cache.set({ ...snap, updatedAt: Date.now() }, expectedGen);
}

export function beginAiExpertsWrite(): number {
  return cache.currentGeneration();
}

export function clearAiExpertsSnapshot(): void {
  cache.clear();
}
