/**
 * 会话内 stale-while-revalidate：内存 + sessionStorage。
 * - clear / force 推进 writeEpoch，作废在途写回
 * - load 用「请求开始」时间作 updatedAt，本地 patch（更晚）不会被旧 revalidate 盖掉
 * - set(expectedGen) 与 clear 代际不一致时拒绝写入
 */
export function createSessionSnapshotCache<T extends { updatedAt: number }>(options: {
  storageKey: string;
  isSnapshot: (value: unknown) => value is T;
  fetchFresh: () => Promise<T>;
}) {
  const { storageKey, isSnapshot, fetchFresh } = options;

  let memory: T | null = null;
  let inflight: Promise<T> | null = null;
  let generation = 0;
  let writeEpoch = 0;

  function readSession(): T | null {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return isSnapshot(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function writeSession(snapshot: T): void {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch {
      // quota / private mode — memory cache still works
    }
  }

  function get(): T | null {
    if (memory) return memory;
    const stored = readSession();
    if (stored) memory = stored;
    return memory;
  }

  /**
   * 写入快照。expectedGen 与当前 generation 不一致时拒绝（登出后）。
   * 若内存中已有更新的 updatedAt，保留本地（挡住过期 revalidate）。
   */
  function set(snapshot: T, expectedGen?: number): T | null {
    if (expectedGen !== undefined && expectedGen !== generation) return null;
    if (memory && memory.updatedAt > snapshot.updatedAt) return memory;
    memory = snapshot;
    writeSession(snapshot);
    return memory;
  }

  function currentGeneration(): number {
    return generation;
  }

  async function load(opts?: { force?: boolean }): Promise<T> {
    const force = opts?.force === true;
    if (!force && inflight) return inflight;

    const gen = generation;
    if (force) writeEpoch += 1;
    const epoch = writeEpoch;
    const startedAt = Date.now();

    const req = (async () => {
      const fresh = await fetchFresh();
      const snap = { ...fresh, updatedAt: startedAt };
      if (gen !== generation || epoch !== writeEpoch) {
        return get() ?? snap;
      }
      const written = set(snap, gen);
      return written ?? get() ?? snap;
    })().finally(() => {
      if (inflight === req) inflight = null;
    });

    inflight = req;
    return req;
  }

  function clear(): void {
    generation += 1;
    writeEpoch += 1;
    memory = null;
    inflight = null;
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }

  return { get, set, load, clear, currentGeneration };
}
