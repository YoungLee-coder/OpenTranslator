import { useEffect, useState } from "react";
import type { DbMigrateResult, DbVersionInfo } from "@opentranslator/shared-types";
import { apiGet, apiPost, ApiError } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Database, RotateCw, ArrowUpCircle } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from "@/lib/i18n";

export function DbVersionSection() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<DbVersionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function load(opts: { notify?: boolean } = {}) {
    const isInitial = info === null;
    if (isInitial) {
      setLoading(true);
      setError(null);
    } else if (opts.notify) {
      setChecking(true);
    }
    try {
      const res = await apiGet<DbVersionInfo>("/api/admin/db/version");
      setInfo(res);
      if (opts.notify) {
        if (res.needsUpdate) {
          const detail =
            res.pending.length > 0 ? `：${res.pending.join(" → ")}` : "";
          toast.success(t("dbVersion.pendingFound", { detail }));
        } else {
          toast.success(t("dbVersion.upToDate"));
        }
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      if (isInitial) {
        setError(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      if (isInitial) setLoading(false);
      if (opts.notify) setChecking(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function runMigrate() {
    setMigrating(true);
    setError(null);
    try {
      const res = await apiPost<DbMigrateResult>("/api/admin/db/migrate", {});
      if (res.applied.length > 0) {
        toast.success(
          t("dbVersion.migrated", {
            count: res.applied.length,
            list: res.applied.join(", "),
          }),
        );
      } else {
        toast.success(t("dbVersion.noMigrationNeeded"));
      }
      setInfo({
        current: res.current,
        latest: res.latest,
        needsUpdate: res.needsUpdate,
        pending: res.needsUpdate
          ? // migrate 不返回 pending，重新检测补齐
            []
          : [],
      });
      // 重新检测以补齐 pending 列表
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setMigrating(false);
      setConfirming(false);
    }
  }

  return (
    <Card className="animate-rise">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="size-4" />
          {t("dbVersion.title")}
        </CardTitle>
        <CardDescription>{t("dbVersion.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loading && info === null ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 rounded-md" />
            <Skeleton className="h-9 w-40 rounded-md" />
          </div>
        ) : error && info === null ? (
          <>
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => void load()}
            >
              <RotateCw className="size-4" />
              {t("common.retry")}
            </Button>
          </>
        ) : info ? (
          <>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-rule bg-rule">
              <div className="flex flex-col gap-1 bg-card p-4">
                <div className="text-xs text-muted-foreground">{t("dbVersion.current")}</div>
                <div className="font-mono text-lg font-semibold tracking-tight">
                  {info.current ?? t("dbVersion.uninitialized")}
                </div>
              </div>
              <div className="flex flex-col gap-1 bg-card p-4">
                <div className="text-xs text-muted-foreground">{t("dbVersion.latest")}</div>
                <div className="font-mono text-lg font-semibold tracking-tight">
                  {info.latest ?? "—"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {info.needsUpdate ? (
                <>
                  <Badge variant="secondary">{t("dbVersion.pendingUpdate")}</Badge>
                  {info.pending.length > 0 && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {info.pending.join(" → ")}
                    </span>
                  )}
                </>
              ) : (
                <Badge variant="success">{t("dbVersion.latestBadge")}</Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={migrating || checking}
                onClick={() => void load({ notify: true })}
              >
                <RotateCw className={`size-4 ${checking ? "animate-spin" : ""}`} />
                {t("dbVersion.checkUpdate")}
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={!info.needsUpdate || migrating}
                onClick={() => setConfirming(true)}
              >
                <ArrowUpCircle className="size-4" />
                {t("dbVersion.runUpdate")}
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>

      <Dialog open={confirming} onOpenChange={(o) => !o && setConfirming(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dbVersion.migrateTitle")}</DialogTitle>
            <DialogDescription>{t("dbVersion.migrateDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirming(false)}
              disabled={migrating}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void runMigrate()}
              disabled={migrating}
            >
              {migrating ? t("dbVersion.migrating") : t("dbVersion.confirmUpdate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
