import { useCallback, useEffect, useRef, useState } from "react";
import type { PingResponse } from "@opentranslator/shared-types";
import { apiGet } from "@/lib/api-client";

export type ReadinessStatus = "loading" | "ready" | "not-ready";
export type ReadinessError = "network" | null;

export interface WorkerReadiness {
  status: ReadinessStatus;
  error: ReadinessError;
  data: PingResponse | null;
  bindingsOk: boolean;
  dbReady: boolean;
  needsMigration: boolean;
  adminReady: boolean;
  siteReady: boolean;
  checking: boolean;
  recheck: () => Promise<void>;
}

function fromResponse(
  res: PingResponse | null,
  error: ReadinessError,
  loading: boolean,
): Omit<WorkerReadiness, "checking" | "recheck"> {
  const bindingsOk = !!(res?.bindings?.db && res?.bindings?.kv);
  const dbReady = bindingsOk && !!res?.dbReady;
  const needsMigration = bindingsOk && !!res?.needsMigration;
  const adminReady = bindingsOk && !!res?.adminReady;
  // 未完成迁移也算未就绪，强制走初始化页升级。
  const siteReady = bindingsOk && dbReady && !needsMigration;

  let status: ReadinessStatus = "loading";
  if (!loading) {
    status = siteReady ? "ready" : "not-ready";
  }

  return {
    status,
    error,
    data: res,
    bindingsOk,
    dbReady,
    needsMigration,
    adminReady,
    siteReady,
  };
}

export function useWorkerReadiness(opts?: {
  pollIntervalMs?: number;
}): WorkerReadiness {
  const [data, setData] = useState<PingResponse | null>(null);
  const [error, setError] = useState<ReadinessError>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  /** 递增世代号：忽略过期请求，并避免 Strict Mode / 竞态把 checking 卡死。 */
  const reqGen = useRef(0);

  const recheck = useCallback(async () => {
    const gen = ++reqGen.current;
    setChecking(true);
    try {
      const res = await apiGet<PingResponse>("/api/ping");
      if (gen !== reqGen.current) return;
      setData(res);
      setError(null);
    } catch {
      if (gen !== reqGen.current) return;
      setError("network");
      setData(null);
    } finally {
      if (gen === reqGen.current) {
        setLoading(false);
        setChecking(false);
      }
    }
  }, []);

  useEffect(() => {
    void recheck();
    return () => {
      // 作废进行中的请求，避免卸载后写 state；世代推进也会让 finally 跳过清理，
      // 但组件已卸载，下一次挂载会重置 checking。
      reqGen.current += 1;
    };
  }, [recheck]);

  const pollMs = opts?.pollIntervalMs;
  const siteReady =
    !!(data?.bindings?.db && data?.bindings?.kv && data?.dbReady) &&
    !data?.needsMigration;

  useEffect(() => {
    if (!pollMs || siteReady || loading) return;
    const id = window.setInterval(() => void recheck(), pollMs);
    return () => window.clearInterval(id);
  }, [pollMs, siteReady, loading, recheck]);

  const base = fromResponse(data, error, loading);
  return {
    ...base,
    checking: loading || checking,
    recheck,
  };
}
