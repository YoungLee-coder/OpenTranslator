import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "@/lib/api-client";
import { useWorkerReadiness } from "@/lib/useWorkerReadiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Database,
  KeyRound,
  Loader2,
  RefreshCw,
  UserPlus,
  WifiOff,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function runDbInit(secret?: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (secret) headers["X-Init-Secret"] = secret;
  const res = await fetch(`${API_BASE}/api/init`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers,
  });
  if (!res.ok) {
    let msg = `init -> ${res.status}`;
    try {
      const text = await res.text();
      if (text) msg = text;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, msg);
  }
}

type StepState = "pending" | "active" | "done";

function StepBadge({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
        <CheckCircle2 className="size-3.5" />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
        <Circle className="size-2 fill-current" />
      </span>
    );
  }
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Circle className="size-2" />
    </span>
  );
}

export function SetupRequiredPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    error,
    data,
    bindingsOk,
    dbReady,
    needsMigration,
    adminReady,
    initialLoading,
    rechecking,
    recheck,
  } = useWorkerReadiness({ pollIntervalMs: 5000 });

  const [initSecret, setInitSecret] = useState("");
  const [initRunning, setInitRunning] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const allReady = bindingsOk && dbReady && adminReady && !needsMigration;
  const fullyOperational = bindingsOk && dbReady && adminReady;

  useEffect(() => {
    if (fullyOperational && !needsMigration) {
      navigate("/", { replace: true });
    }
  }, [fullyOperational, needsMigration, navigate]);

  async function handleInit(e: React.FormEvent) {
    e.preventDefault();
    if (!initSecret.trim()) return;
    setInitRunning(true);
    setInitError(null);
    try {
      await runDbInit(initSecret.trim());
      setInitSecret("");
      await recheck();
    } catch (err) {
      setInitError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setInitRunning(false);
    }
  }

  async function handleMigrate() {
    setInitRunning(true);
    setInitError(null);
    try {
      await runDbInit();
      await recheck();
    } catch (err) {
      setInitError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setInitRunning(false);
    }
  }

  const bindingsState: StepState = bindingsOk
    ? "done"
    : data || error
      ? "active"
      : "pending";
  const dbState: StepState = !bindingsOk
    ? "pending"
    : dbReady && !needsMigration
      ? "done"
      : "active";
  const adminState: StepState = !(dbReady && !needsMigration)
    ? "pending"
    : adminReady
      ? "done"
      : "active";

  const dbBindingOk = data?.bindings?.db;
  const kvBindingOk = data?.bindings?.kv;
  const showBindingStatus = data !== null && !error;
  const showDbForm = dbState === "active";
  const isMigrate = dbReady && needsMigration;

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg animate-rise rounded-xl border border-rule bg-card p-7 shadow-md">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-warning/15 text-warning">
            <AlertTriangle className="size-4.5" />
          </span>
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">
              {t("setup.title")}
            </h1>
            {allReady && (
              <p className="mt-0.5 text-xs text-success">{t("setup.allReady")}</p>
            )}
          </div>
        </div>

        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          {t("setup.description")}
        </p>

        {error === "network" && (
          <Alert variant="destructive" className="mb-5">
            <WifiOff />
            <AlertTitle>{t("setup.networkError")}</AlertTitle>
            <AlertDescription>{t("setup.networkErrorHint")}</AlertDescription>
          </Alert>
        )}

        <div className="mb-5 flex flex-col gap-3">
          {/* Step 1: Bindings */}
          <section
            className={cn(
              "rounded-lg border p-4 transition-colors",
              bindingsState === "active"
                ? "border-warning/40 bg-warning/5"
                : "border-rule bg-muted/20",
            )}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <StepBadge state={bindingsState} />
              <h2 className="text-sm font-medium">{t("setup.stepBindingsTitle")}</h2>
            </div>

            {initialLoading && !data ? (
              <div className="flex flex-col gap-2 pl-8">
                <Skeleton className="h-5 w-full rounded-md" />
                <Skeleton className="h-5 w-3/4 rounded-md" />
              </div>
            ) : (
              <ul className="flex flex-col gap-2 pl-8 text-sm">
                <li className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Database className="size-3.5 shrink-0" />
                    {t("setup.dbBinding")}
                  </span>
                  {showBindingStatus ? (
                    <Badge variant={dbBindingOk ? "success" : "secondary"}>
                      {dbBindingOk ? t("setup.connected") : t("setup.notConnected")}
                    </Badge>
                  ) : (
                    <Skeleton className="h-5 w-14 rounded-full" />
                  )}
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <KeyRound className="size-3.5 shrink-0" />
                    {t("setup.kvBinding")}
                  </span>
                  {showBindingStatus ? (
                    <Badge variant={kvBindingOk ? "success" : "secondary"}>
                      {kvBindingOk ? t("setup.connected") : t("setup.notConnected")}
                    </Badge>
                  ) : (
                    <Skeleton className="h-5 w-14 rounded-full" />
                  )}
                </li>
              </ul>
            )}

            {bindingsState === "active" && (
              <ol className="mt-3 flex flex-col gap-1 pl-8 text-xs leading-relaxed text-muted-foreground [counter-reset:step]">
                <li className="[counter-increment:step] before:mr-1.5 before:font-medium before:text-foreground before:content-[counter(step)_'.']">
                  {t("setup.step1")}
                </li>
                <li className="[counter-increment:step] before:mr-1.5 before:font-medium before:text-foreground before:content-[counter(step)_'.']">
                  {t("setup.step2")}
                </li>
                <li className="[counter-increment:step] before:mr-1.5 before:font-medium before:text-foreground before:content-[counter(step)_'.']">
                  {t("setup.step3")}
                </li>
              </ol>
            )}
          </section>

          {/* Step 2: Database */}
          <section
            className={cn(
              "rounded-lg border p-4 transition-colors",
              dbState === "active"
                ? "border-warning/40 bg-warning/5"
                : "border-rule bg-muted/20",
            )}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <StepBadge state={dbState} />
              <h2 className="text-sm font-medium">{t("setup.stepDbTitle")}</h2>
            </div>

            {dbState === "done" && (
              <p className="pl-8 text-sm text-muted-foreground">{t("setup.dbReady")}</p>
            )}

            {showDbForm && (
              <div className="pl-8">
                {isMigrate ? (
                  <>
                    <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                      {t("setup.migrateHint")}
                    </p>
                    {initError && (
                      <p className="mb-3 text-xs text-destructive">{initError}</p>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 w-fit gap-1.5"
                      disabled={initRunning}
                      onClick={() => void handleMigrate()}
                    >
                      {initRunning ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          {t("setup.migrateRunning")}
                        </>
                      ) : (
                        t("setup.migrateAction")
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                      {t("setup.initHint")}
                    </p>
                    <form onSubmit={handleInit} className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="init-secret" className="text-xs">
                          {t("setup.initSecret")}
                        </Label>
                        <Input
                          id="init-secret"
                          type="password"
                          value={initSecret}
                          onChange={(e) => setInitSecret(e.target.value)}
                          autoComplete="off"
                          placeholder="••••••••"
                          className="h-9"
                          disabled={initRunning}
                        />
                      </div>
                      {initError && (
                        <p className="text-xs text-destructive">{initError}</p>
                      )}
                      <Button
                        type="submit"
                        size="sm"
                        className="h-9 w-fit gap-1.5"
                        disabled={initRunning || !initSecret.trim()}
                      >
                        {initRunning ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            {t("setup.initRunning")}
                          </>
                        ) : (
                          t("setup.initAction")
                        )}
                      </Button>
                    </form>
                  </>
                )}
              </div>
            )}
          </section>

          {/* Step 3: Admin */}
          <section
            className={cn(
              "rounded-lg border p-4 transition-colors",
              adminState === "active"
                ? "border-warning/40 bg-warning/5"
                : "border-rule bg-muted/20",
            )}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <StepBadge state={adminState} />
              <h2 className="text-sm font-medium">{t("setup.stepAdminTitle")}</h2>
            </div>

            {adminState === "done" && (
              <p className="pl-8 text-sm text-muted-foreground">{t("setup.adminReady")}</p>
            )}

            {adminState === "active" && (
              <div className="pl-8">
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                  {t("setup.adminHint")}
                </p>
                <Button asChild size="sm" className="h-9 gap-1.5">
                  <Link to="/login?setup=1">
                    <UserPlus className="size-3.5" />
                    {t("setup.goToAdminSetup")}
                  </Link>
                </Button>
              </div>
            )}
          </section>
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-10 w-full gap-2"
          aria-busy={rechecking}
          onClick={() => void recheck()}
        >
          <RefreshCw
            className={cn("size-4 shrink-0", rechecking && "animate-spin")}
          />
          {t("setup.recheck")}
        </Button>
      </div>
    </div>
  );
}
