import type { ManagedUser, ManagedUserListResponse } from "@opentranslator/shared-types";
import { apiGet } from "@/lib/api-client";
import { createSessionSnapshotCache } from "@/lib/session-snapshot-cache";

export interface MultiUserSnapshot {
  users: ManagedUser[];
  updatedAt: number;
}

function isMultiUserSnapshot(value: unknown): value is MultiUserSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.updatedAt === "number" && Array.isArray(v.users);
}

const cache = createSessionSnapshotCache<MultiUserSnapshot>({
  storageKey: "ot.dashboard.users.v3",
  isSnapshot: isMultiUserSnapshot,
  async fetchFresh() {
    const res = await apiGet<ManagedUserListResponse>("/api/admin/users");
    return {
      users: res.users,
      updatedAt: Date.now(),
    };
  },
});

export function getMultiUserSnapshot(): MultiUserSnapshot | null {
  return cache.get();
}

export function loadMultiUserSnapshot(opts?: {
  force?: boolean;
}): Promise<MultiUserSnapshot> {
  return cache.load(opts);
}

export function setMultiUserSnapshot(
  users: ManagedUser[],
  expectedGen: number,
): void {
  cache.set({ users, updatedAt: Date.now() }, expectedGen);
}

export function beginMultiUserWrite(): number {
  return cache.currentGeneration();
}

export function clearMultiUserSnapshot(): void {
  cache.clear();
}
