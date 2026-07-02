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

export function DbVersionSection() {
  const [info, setInfo] = useState<DbVersionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGet<DbVersionInfo>("/api/admin/db/version");
      setInfo(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
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
        toast.success(`已执行 ${res.applied.length} 项迁移：${res.applied.join(", ")}`);
      } else {
        toast.success("数据库已是最新，无需迁移");
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
          数据库版本
        </CardTitle>
        <CardDescription>
          检测 D1 schema 迁移状态，按需执行未应用的迁移。KV 缓存会在迁移后自动失效。
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
              className="gap-1.5"
              onClick={() => void load()}
            >
              <RotateCw className="size-4" />
              重试
            </Button>
          </>
        ) : info ? (
          <>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-rule bg-rule">
              <div className="flex flex-col gap-1 bg-card p-4">
                <div className="text-xs text-muted-foreground">当前版本</div>
                <div className="font-mono text-lg font-semibold tracking-tight">
                  {info.current ?? "未初始化"}
                </div>
              </div>
              <div className="flex flex-col gap-1 bg-card p-4">
                <div className="text-xs text-muted-foreground">最新版本</div>
                <div className="font-mono text-lg font-semibold tracking-tight">
                  {info.latest ?? "—"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {info.needsUpdate ? (
                <>
                  <Badge variant="secondary">有待更新</Badge>
                  {info.pending.length > 0 && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {info.pending.join(" → ")}
                    </span>
                  )}
                </>
              ) : (
                <Badge variant="success">已是最新</Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={migrating}
                onClick={() => void load()}
              >
                <RotateCw className="size-4" />
                检测更新
              </Button>
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={!info.needsUpdate || migrating}
                onClick={() => setConfirming(true)}
              >
                <ArrowUpCircle className="size-4" />
                执行更新
              </Button>
            </div>
          </>
        ) : null}
      </CardContent>

      <Dialog open={confirming} onOpenChange={(o) => !o && setConfirming(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>执行数据库迁移</DialogTitle>
            <DialogDescription>
              将对 D1 执行未应用的 schema 迁移并清空 KV 设置缓存，操作幂等、可重复执行。确认继续？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirming(false)}
              disabled={migrating}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={() => void runMigrate()}
              disabled={migrating}
            >
              {migrating ? "迁移中…" : "确认更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
