import { useEffect, useState } from "react";
import type {
  DbAuditIssue,
  DbAuditRepairResult,
  DbAuditResult,
} from "@opentranslator/shared-types";
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
import { AlertCircle, RotateCw, ShieldCheck, Wrench } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from "@/lib/i18n";

export function DbAuditSection() {
  const { t } = useTranslation();
  const [issues, setIssues] = useState<DbAuditIssue[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairingCode, setRepairingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function load(opts: { notify?: boolean } = {}) {
    const isInitial = issues === null;
    if (isInitial) {
      setLoading(true);
      setError(null);
    } else if (opts.notify) {
      setChecking(true);
    }
    try {
      const res = await apiGet<DbAuditResult>("/api/admin/db/audit");
      setIssues(res.issues);
      if (opts.notify) {
        if (res.issues.length === 0) {
          toast.success(t("dbAudit.passed"));
        } else {
          toast.info(t("dbAudit.issuesFound", { count: res.issues.length }));
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

  const hasRepairable = issues?.some((i) => i.repairable) ?? false;

  async function repairAll() {
    setRepairing(true);
    setError(null);
    try {
      const res = await apiPost<DbAuditRepairResult>("/api/admin/db/repair", {});
      if (res.repaired.length > 0) {
        toast.success(
          t("dbAudit.repaired", {
            count: res.repaired.length,
            list: res.repaired.join(", "),
          }),
        );
      } else {
        toast.info(t("dbAudit.nothingToRepair"));
      }
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setRepairing(false);
      setConfirming(false);
    }
  }

  async function repairOne(code: string) {
    setRepairingCode(code);
    try {
      const res = await apiPost<DbAuditRepairResult>("/api/admin/db/repair", {
        codes: [code],
      });
      if (res.repaired.length > 0) {
        toast.success(t("dbAudit.repairedOne", { list: res.repaired.join(", ") }));
      } else {
        toast.info(t("dbAudit.cannotRepair"));
      }
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      toast.error(msg);
    } finally {
      setRepairingCode(null);
    }
  }

  return (
    <Card className="animate-rise">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-4" />
          {t("dbAudit.title")}
        </CardTitle>
        <CardDescription>{t("dbAudit.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loading && issues === null ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 rounded-md" />
            <Skeleton className="h-9 w-40 rounded-md" />
          </div>
        ) : error && issues === null ? (
          <>
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 w-fit"
              onClick={() => void load()}
            >
              <RotateCw className="size-4" />
              {t("common.retry")}
            </Button>
          </>
        ) : issues ? (
          <>
            {issues.length === 0 ? (
              <div className="flex items-center gap-2">
                <Badge variant="success">{t("dbAudit.noIssues")}</Badge>
                <span className="text-xs text-muted-foreground">
                  {t("dbAudit.allPassed")}
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {issues.map((issue) => (
                  <div
                    key={issue.code}
                    className="flex flex-col gap-1.5 rounded-md border border-rule p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          issue.severity === "error" ? "destructive" : "secondary"
                        }
                      >
                        {issue.severity === "error" ? t("dbAudit.error") : t("dbAudit.warning")}
                      </Badge>
                      <span className="text-sm font-medium">{issue.title}</span>
                      {issue.ref && (
                        <span className="font-mono text-xs text-muted-foreground">
                          {issue.ref}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{issue.detail}</p>
                    {issue.repairable && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 w-fit"
                        disabled={repairingCode === issue.code || repairing}
                        onClick={() => void repairOne(issue.code)}
                      >
                        <Wrench className="size-4" />
                        {repairingCode === issue.code ? t("dbAudit.repairing") : t("dbAudit.repair")}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={repairing || repairingCode !== null || checking}
                onClick={() => void load({ notify: true })}
              >
                <RotateCw className={`size-4 ${checking ? "animate-spin" : ""}`} />
                {t("dbAudit.recheck")}
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={!hasRepairable || repairing || repairingCode !== null}
                onClick={() => setConfirming(true)}
              >
                <Wrench className="size-4" />
                {t("dbAudit.repairAll")}
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>

      <Dialog open={confirming} onOpenChange={(o) => !o && setConfirming(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dbAudit.repairTitle")}</DialogTitle>
            <DialogDescription>{t("dbAudit.repairDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirming(false)}
              disabled={repairing}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void repairAll()}
              disabled={repairing}
            >
              {repairing ? t("dbAudit.repairing") : t("dbAudit.confirmRepair")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
