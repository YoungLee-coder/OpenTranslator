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

export function DbAuditSection() {
  const [issues, setIssues] = useState<DbAuditIssue[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [repairing, setRepairing] = useState(false);
  const [repairingCode, setRepairingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<DbAuditResult>("/api/admin/db/audit");
      setIssues(res.issues);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
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
        toast.success(`已修复 ${res.repaired.length} 项：${res.repaired.join(", ")}`);
      } else {
        toast.info("无可修复项");
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
        toast.success(`已修复：${res.repaired.join(", ")}`);
      } else {
        toast.info("该项无需修复或未能修复");
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
          数据库一致性审计
        </CardTitle>
        <CardDescription>
          扫描公开模型引用、默认模型与供应商标记的一致性问题，可按需修复。损坏的
          JSON 字段需到供应商管理页重新填写。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 rounded-md" />
            <Skeleton className="h-9 w-40 rounded-md" />
          </div>
        ) : error ? (
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
              重试
            </Button>
          </>
        ) : issues ? (
          <>
            {issues.length === 0 ? (
              <div className="flex items-center gap-2">
                <Badge variant="success">无问题</Badge>
                <span className="text-xs text-muted-foreground">
                  所有检查项均通过
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
                        {issue.severity === "error" ? "错误" : "警告"}
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
                        {repairingCode === issue.code ? "修复中…" : "修复"}
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
                disabled={repairing || repairingCode !== null}
                onClick={() => void load()}
              >
                <RotateCw className="size-4" />
                重新检测
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={!hasRepairable || repairing || repairingCode !== null}
                onClick={() => setConfirming(true)}
              >
                <Wrench className="size-4" />
                修复全部
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>

      <Dialog open={confirming} onOpenChange={(o) => !o && setConfirming(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>修复一致性问题</DialogTitle>
            <DialogDescription>
              将对失效的公开模型引用、越界默认模型与重复公开默认供应商标记执行安全修复，操作幂等、可重复执行。损坏的
              JSON 字段不会自动修改，需到供应商管理页重填。确认继续？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirming(false)}
              disabled={repairing}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={() => void repairAll()}
              disabled={repairing}
            >
              {repairing ? "修复中…" : "确认修复"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
