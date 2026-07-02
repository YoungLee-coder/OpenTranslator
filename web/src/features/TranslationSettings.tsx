import { useEffect, useState } from "react";
import type { ProviderRecord } from "@opentranslator/shared-types";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/sonner";

/** Translate feature admin page: pick which enabled provider serves public use. */
export function TranslationSettings() {
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await apiGet<{ providers: ProviderRecord[] }>(
        "/api/admin/providers",
      );
      setProviders(res.providers.filter((p) => p.enabled));
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

  return (
    <Card className="animate-rise">
      <CardHeader>
        <CardTitle>翻译设置</CardTitle>
        <CardDescription>
          选择对外公开访问时默认使用的供应商。匿名访客的翻译请求会路由到此供应商。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
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
      </CardContent>
    </Card>
  );
}
