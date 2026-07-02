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
import { Switch } from "@/components/ui/switch";
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

interface ModelOption {
  providerId: string;
  model: string;
  providerName: string;
}

/** 把「providerId|model」拆成两段；模型名假定不含「|」。 */
function decodeKey(key: string): { providerId: string; model: string } {
  const sep = key.indexOf("|");
  return { providerId: key.slice(0, sep), model: key.slice(sep + 1) };
}

/**
 * 公开访问模块设置页：勾选对匿名访客开放的模型，并指定一个公开默认模型。
 * 匿名访客在首页可在这些开放模型间切换；不主动选择时用公开默认模型。
 * 模块本身的启停（= site_public 总开关）在「设置 → 模块」里切换。
 */
export function PublicAccessSettings() {
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [rateLimit, setRateLimit] = useState<number>(20);
  // 开放集合与默认项均用「providerId|model」编码键
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [defaultKey, setDefaultKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingLimit, setSavingLimit] = useState(false);

  async function load() {
    try {
      const [provRes, setRes] = await Promise.all([
        apiGet<{ providers: ProviderRecord[] }>("/api/admin/providers"),
        apiGet<{ settings: SiteSettings }>("/api/admin/settings"),
      ]);
      setProviders(provRes.providers.filter((p) => p.enabled));
      setRateLimit(setRes.settings.publicRateLimitPerMinute);
      const pm = setRes.settings.publicModels ?? [];
      setOpenKeys(new Set(pm.map((m) => `${m.providerId}|${m.model}`)));
      const pdm = setRes.settings.publicDefaultModel;
      setDefaultKey(pdm ? `${pdm.providerId}|${pdm.model}` : null);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  // 所有 enabled provider 的模型展开
  const allOptions: ModelOption[] = providers.flatMap((p) =>
    (p.models?.length ? p.models : p.defaultModel ? [p.defaultModel] : []).map(
      (m) => ({ providerId: p.id, model: m, providerName: p.displayName }),
    ),
  );

  // 实时保存开放集合与默认项；乐观更新，失败回滚
  async function persist(nextOpen: Set<string>, nextDefault: string | null) {
    const prevOpen = openKeys;
    const prevDefault = defaultKey;
    setOpenKeys(nextOpen);
    setDefaultKey(nextDefault);
    try {
      await apiPut("/api/admin/settings", {
        publicModels: Array.from(nextOpen).map(decodeKey),
        publicDefaultModel: nextDefault ? decodeKey(nextDefault) : null,
      });
    } catch (e) {
      setOpenKeys(prevOpen);
      setDefaultKey(prevDefault);
      toast.error(e instanceof ApiError ? e.message : "保存失败");
    }
  }

  function toggleOpen(key: string) {
    const next = new Set(openKeys);
    let nextDefault = defaultKey;
    if (next.has(key)) {
      next.delete(key);
      if (defaultKey === key) nextDefault = null;
    } else {
      next.add(key);
    }
    void persist(next, nextDefault);
  }

  function setDefault(key: string) {
    // 标为默认时自动加入开放集合
    void persist(new Set(openKeys).add(key), key);
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
          勾选对匿名访客开放的模型，并指定一个公开默认模型。匿名访客可在首页在这些模型间切换。
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
          <div className="text-sm font-medium">公开模型</div>
          {allOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              暂无已启用供应商的模型，请先在「供应商」中配置模型。
            </p>
          ) : (
            <>
              <div className="overflow-hidden rounded-md border border-rule">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>供应商</TableHead>
                      <TableHead>模型</TableHead>
                      <TableHead>开放</TableHead>
                      <TableHead className="text-right">公开默认</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allOptions.map((o) => {
                      const key = `${o.providerId}|${o.model}`;
                      const isOpen = openKeys.has(key);
                      const isDefault = defaultKey === key;
                      return (
                        <TableRow key={key}>
                          <TableCell className="font-medium">
                            {o.providerName}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {o.model}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={isOpen}
                              onCheckedChange={() => toggleOpen(key)}
                              aria-label={`开放 ${o.model}`}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {isDefault ? (
                              <Badge variant="accent">默认</Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7"
                                type="button"
                                onClick={() => setDefault(key)}
                              >
                                设为默认
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <p className="pt-1 text-xs text-muted-foreground">
                勾选与设默认即时保存。未开放任何模型时，匿名访客将无法翻译。
              </p>
            </>
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
