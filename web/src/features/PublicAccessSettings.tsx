import { useEffect, useState } from "react";
import type { ProviderRecord, SiteSettings } from "@opentranslator/shared-types";
import { apiGet, apiPut, ApiError } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check } from "lucide-react";
import { toast } from "@/components/ui/sonner";

/**
 * 公开访问模块设置页：选对外公开的默认供应商，并设置匿名访客的限流。
 * 模块本身的启停（= site_public 总开关）在「设置 → 模块」里切换。
 */
export function PublicAccessSettings() {
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [rateLimit, setRateLimit] = useState<number>(20);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingLimit, setSavingLimit] = useState(false);

  async function load() {
    try {
      const [provRes, setRes] = await Promise.all([
        apiGet<{ providers: ProviderRecord[] }>("/api/admin/providers"),
        apiGet<{ settings: SiteSettings }>("/api/admin/settings"),
      ]);
      setProviders(provRes.providers.filter((p) => p.enabled));
      setRateLimit(setRes.settings.publicRateLimitPerMinute);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function setDefault(id: string, name: string) {
    setSavingId(id);
    try {
      await apiPut(`/api/admin/providers/${id}`, { isPublicDefault: true });
      toast.success(`已将「${name}」设为公开默认`);
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingId(null);
    }
  }

  async function saveLimit() {
    setSavingLimit(true);
    try {
      const res = await apiPut<{ settings: SiteSettings }>(
        "/api/admin/settings",
        { publicRateLimitPerMinute: rateLimit },
      );
      setRateLimit(res.settings.publicRateLimitPerMinute);
      setError(null);
      toast.success("限流设置已保存");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingLimit(false);
    }
  }

  return (
    <Card className="animate-rise">
      <CardHeader>
        <CardTitle>公开访问</CardTitle>
        <CardDescription>
          匿名访客的翻译入口。选择对外公开的默认供应商，并设置每分钟请求上限。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <div className="text-sm font-medium">公开默认供应商</div>
          {providers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              暂无已启用的供应商，请先在「供应商」中添加。
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border border-rule">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>模型</TableHead>
                    <TableHead className="text-right">公开默认</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.displayName}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {p.type}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {p.defaultModel ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.isPublicDefault ? (
                          <Badge variant="accent">默认</Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7"
                            type="button"
                            disabled={savingId !== null}
                            onClick={() => void setDefault(p.id, p.displayName)}
                          >
                            设为默认
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">匿名访客限流（次/分钟）</div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={rateLimit}
              onChange={(e) => setRateLimit(Number(e.target.value))}
              className="w-24"
            />
            <Button
              type="button"
              size="sm"
              disabled={savingLimit}
              onClick={() => void saveLimit()}
              className="gap-1.5"
            >
              {savingLimit ? (
                "保存中…"
              ) : (
                <>
                  <Check className="size-4" />
                  保存
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            匿名访客每分钟最大请求数；超出会触发限流。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
