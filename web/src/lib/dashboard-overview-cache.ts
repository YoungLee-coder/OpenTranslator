import type { ProviderRecord, UsageSummary } from "@opentranslator/shared-types";
import { apiGet } from "./api-client";

/**
 * Dashboard 概览：内存 + sessionStorage 快照，会话内 stale-while-revalidate。
 * 刷新同标签页可立刻出旧数；后台再拉最新。
 */
export interface OverviewSnapshot {
  usage: UsageSummary;
  providers: ProviderRecord[];
  updatedAt: number;
}

const STORAGE_KEY = "ot.dashboard.overview.v1";

let memory: OverviewSnapshot | null = null;
let inflight: Promise<OverviewSnapshot> | null = null;
/** clear 时自增；写回前比对，挡住登出后仍在飞的请求。 */
let generation = 0;

function isSnapshot(value: unknown): value is OverviewSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.updatedAt === "number" &&
    v.usage !== null &&
    typeof v.usage === "object" &&
    Array.isArray(v.providers)
  );
}

function readSession(): OverviewSnapshot | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeSession(snapshot: OverviewSnapshot): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // quota / private mode — memory cache still works
  }
}

/** 同步读：先内存，再 sessionStorage。无快照返回 null。 */
export function getOverviewSnapshot(): OverviewSnapshot | null {
  if (memory) return memory;
  const stored = readSession();
  if (stored) memory = stored;
  return memory;
}

function setSnapshot(snapshot: OverviewSnapshot): OverviewSnapshot {
  memory = snapshot;
  writeSession(snapshot);
  return snapshot;
}

async function fetchFresh(gen: number): Promise<OverviewSnapshot> {
  const [usageRes, providersRes] = await Promise.all([
    apiGet<{ usage: UsageSummary }>("/api/admin/usage"),
    apiGet<{ providers: ProviderRecord[] }>("/api/admin/providers"),
  ]);
  const snap: OverviewSnapshot = {
    usage: usageRes.usage,
    providers: providersRes.providers,
    updatedAt: Date.now(),
  };
  if (gen !== generation) {
    // 会话已清：不写回，仍把结果交给本轮 await（调用方通常已 unmount）
    return snap;
  }
  return setSnapshot(snap);
}

/**
 * 拉取概览。有进行中的请求时复用同一 Promise。
 * 调用方应先用 getOverviewSnapshot() 做即时渲染，再 await 本函数做 revalidate。
 */
export function loadOverviewSnapshot(): Promise<OverviewSnapshot> {
  if (!inflight) {
    const gen = generation;
    const req = fetchFresh(gen).finally(() => {
      if (inflight === req) inflight = null;
    });
    inflight = req;
  }
  return inflight;
}

/** 登出或会话失效时清掉快照，避免下一账号看到旧用量。 */
export function clearOverviewSnapshot(): void {
  generation += 1;
  memory = null;
  inflight = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
