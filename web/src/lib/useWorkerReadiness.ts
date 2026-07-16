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
  const siteReady = bindingsOk && dbReady;

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
  const mounted = useRef(true);

  const recheck = useCallback(async () => {
    setChecking(true);
    try {
      const res = await apiGet<PingResponse>("/api/ping");
      if (!mounted.current) return;
      setData(res);
      setError(null);
    } catch {
      if (!mounted.current) return;
      setError("network");
      setData(null);
    } finally {
      if (!mounted.current) return;
      setLoading(false);
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void recheck();
    return () => {
      mounted.current = false;
    };
  }, [recheck]);

  const pollMs = opts?.pollIntervalMs;
  const siteReady = !!(data?.bindings?.db && data?.bindings?.kv && data?.dbReady);

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
