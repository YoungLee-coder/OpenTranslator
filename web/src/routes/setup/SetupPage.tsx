import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AuthUser } from "@opentranslator/shared-types";
import { LogoMark } from "@opentranslator/brand/LogoMark";
import { ApiError, apiPost } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { useWorkerReadiness } from "@/lib/useWorkerReadiness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LanguageMenuButton } from "@/components/LanguageMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  KeyRound,
  Loader2,
  RefreshCw,
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

export function SetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const {
    error,
    data,
    bindingsOk,
    dbReady,
    needsMigration,
    adminReady,
    initialLoading,
    recheck,
  } = useWorkerReadiness({ pollIntervalMs: 5000 });

  const [initSecret, setInitSecret] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [recheckSpinning, setRecheckSpinning] = useState(false);

  const fullyOperational = bindingsOk && dbReady && adminReady && !needsMigration;
  const showBindingStatus = data !== null && !error;
  const dbBindingOk = data?.bindings?.db;
  const kvBindingOk = data?.bindings?.kv;
  const needsFirstInit = bindingsOk && !dbReady;
  const showAdminForm = bindingsOk && !needsMigration && !adminReady;
  const showMigrate = bindingsOk && dbReady && needsMigration;

  useEffect(() => {
    if (!fullyOperational) return;
    navigate(user ? "/dashboard" : "/", { replace: true });
  }, [fullyOperational, user, navigate]);

  async function handleRecheck() {
    if (recheckSpinning) return;
    setRecheckSpinning(true);
    const started = Date.now();
    try {
      await recheck();
    } finally {
      const remain = 1000 - (Date.now() - started);
      if (remain > 0) {
        await new Promise((r) => window.setTimeout(r, remain));
      }
      setRecheckSpinning(false);
    }
  }

  async function handleMigrate() {
    setSubmitting(true);
    setFormError(null);
    try {
      await runDbInit();
      await recheck();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    if (needsFirstInit && !initSecret.trim()) return;
    if (password !== passwordConfirm) {
      setFormError(t("setup.passwordMismatch"));
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (needsFirstInit) {
        await runDbInit(initSecret.trim());
        setInitSecret("");
      }
      await apiPost<{ user: AuthUser }>("/api/auth/setup", { email, password });
      await refresh();
      await recheck();
    } catch (err) {
      try {
        await recheck();
      } catch {
        // ignore
      }
      if (err instanceof ApiError && err.status === 401) {
        setFormError(t("setup.badSecret"));
      } else if (err instanceof ApiError && err.status === 409) {
        await refresh();
        await recheck();
      } else {
        setFormError(err instanceof ApiError ? err.message : String(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col overflow-y-auto px-4 py-10">
      <div className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] flex items-center gap-1">
        <ThemeToggle />
        <LanguageMenuButton />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center">
        <div className="w-full animate-rise rounded-xl border border-rule bg-card p-7 shadow-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <LogoMark
              size={40}
              variant="mark"
              decorative
              haloFill="var(--card)"
              className="mb-4 text-foreground"
            />
            <h1 className="font-display text-xl font-semibold tracking-tight">
              {t("setup.title")}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {fullyOperational ? t("setup.allReady") : t("setup.description")}
            </p>
          </div>

          {error === "network" && (
            <Alert variant="destructive" className="mb-5">
              <WifiOff />
              <AlertTitle>{t("setup.networkError")}</AlertTitle>
              <AlertDescription>{t("setup.networkErrorHint")}</AlertDescription>
            </Alert>
          )}

          <section className="mb-5 rounded-lg border border-rule bg-muted/20 p-4">
            <h2 className="mb-3 text-sm font-medium">{t("setup.stepBindingsTitle")}</h2>
            {initialLoading && !data ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-full rounded-md" />
                <Skeleton className="h-5 w-3/4 rounded-md" />
              </div>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
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

            {data && !bindingsOk && (
              <ol className="mt-3 flex flex-col gap-1 text-xs leading-relaxed text-muted-foreground [counter-reset:step]">
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

          {showMigrate && (
            <section className="mb-5 rounded-lg border border-warning/40 bg-warning/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="size-4 text-warning" />
                <h2 className="text-sm font-medium">{t("setup.stepDbTitle")}</h2>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                {t("setup.migrateHint")}
              </p>
              {formError && (
                <p className="mb-3 text-xs text-destructive">{formError}</p>
              )}
              <Button
                type="button"
                className="h-9 w-full gap-1.5"
                disabled={submitting}
                onClick={() => void handleMigrate()}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    {t("setup.migrateRunning")}
                  </>
                ) : (
                  t("setup.migrateAction")
                )}
              </Button>
            </section>
          )}

          {showAdminForm && (
            <form onSubmit={(e) => void handleComplete(e)} className="flex flex-col gap-4">
              <div>
                <h2 className="text-sm font-medium">{t("setup.stepAdminTitle")}</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {needsFirstInit ? t("setup.initHint") : t("setup.adminHint")}
                </p>
              </div>

              {needsFirstInit && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="init-secret">{t("setup.initSecret")}</Label>
                  <Input
                    id="init-secret"
                    type="password"
                    value={initSecret}
                    onChange={(e) => setInitSecret(e.target.value)}
                    autoComplete="off"
                    placeholder="••••••••"
                    className="h-10"
                    disabled={submitting}
                    required
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="setup-email">{t("setup.adminEmail")}</Label>
                <Input
                  id="setup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  placeholder="you@example.com"
                  required
                  className="h-10"
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="setup-password">
                  {t("setup.adminPassword")}
                  {t("auth.passwordMin")}
                </Label>
                <Input
                  id="setup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="h-10"
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="setup-password-confirm">
                  {t("setup.adminPasswordConfirm")}
                </Label>
                <Input
                  id="setup-password-confirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="h-10"
                  disabled={submitting}
                />
              </div>

              {formError && (
                <p className="text-xs text-destructive">{formError}</p>
              )}

              <Button
                type="submit"
                className="h-10 w-full"
                disabled={
                  submitting ||
                  (needsFirstInit && !initSecret.trim()) ||
                  !email.trim() ||
                  password.length < 8 ||
                  !passwordConfirm
                }
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t("setup.completeRunning")}
                  </>
                ) : needsFirstInit ? (
                  t("setup.completeAction")
                ) : (
                  t("setup.createAdminAction")
                )}
              </Button>
            </form>
          )}

          {adminReady && dbReady && !needsMigration && (
            <p className="flex items-center justify-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="size-4" />
              {t("setup.adminReady")}
            </p>
          )}

          {(!bindingsOk || error === "network") && (
            <Button
              type="button"
              variant="outline"
              className="mt-5 h-10 w-full gap-2"
              aria-busy={recheckSpinning}
              onClick={() => void handleRecheck()}
            >
              <RefreshCw
                className={cn("size-4 shrink-0", recheckSpinning && "animate-spin")}
              />
              {t("setup.recheck")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
