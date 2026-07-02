import { useEffect, useState } from "react";
import type { SiteSettings } from "@opentranslator/shared-types";
import { apiGet, apiPut, ApiError } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check } from "lucide-react";
import { toast } from "@/components/ui/sonner";

export function SettingsSection() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await apiGet<{ settings: SiteSettings }>(
        "/api/admin/settings",
      );
      setSettings(res.settings);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(patch: Partial<SiteSettings>) {
    setSaving(true);
    try {
      const res = await apiPut<{ settings: SiteSettings }>(
        "/api/admin/settings",
        patch,
      );
      setSettings(res.settings);
      setError(null);
      toast.success("设置已保存");
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (settings === null) {
    return (
      <Card className="animate-rise">
        <CardHeader>
          <CardTitle>站点设置</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {error ? (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-16 rounded-md" />
              <Skeleton className="h-16 rounded-md" />
              <Skeleton className="h-16 rounded-md" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-rise">
      <CardHeader>
        <CardTitle>站点设置</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="divide-y divide-rule">
          <SettingRow
            title="公开访问"
            desc="关闭后，访客需登录才能使用翻译器。"
          >
            <Switch
              checked={settings.sitePublic}
              onCheckedChange={(v) =>
                setSettings({ ...settings, sitePublic: v })
              }
            />
          </SettingRow>

          <SettingRow
            title="公开模式限流（次/分钟）"
            desc="匿名访客每分钟最大请求数。"
          >
            <Input
              type="number"
              min={1}
              value={settings.publicRateLimitPerMinute}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  publicRateLimitPerMinute: Number(e.target.value),
                })
              }
              className="w-24"
            />
          </SettingRow>

          <SettingRow
            title="登录用户限流（次/分钟）"
            desc="登录管理员每分钟最大请求数。"
          >
            <Input
              type="number"
              min={1}
              value={settings.authedRateLimitPerMinute}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  authedRateLimitPerMinute: Number(e.target.value),
                })
              }
              className="w-24"
            />
          </SettingRow>

          <SettingRow
            title="翻译结果缓存"
            desc="相同文本+语言对命中 KV 缓存时直接返回，省时省额度。"
          >
            <Switch
              checked={settings.translationCacheEnabled}
              onCheckedChange={(v) =>
                setSettings({ ...settings, translationCacheEnabled: v })
              }
            />
          </SettingRow>
        </div>

        <div className="pt-3">
          <Button
            type="button"
            disabled={saving}
            onClick={() =>
              save({
                sitePublic: settings.sitePublic,
                publicRateLimitPerMinute: settings.publicRateLimitPerMinute,
                authedRateLimitPerMinute: settings.authedRateLimitPerMinute,
                translationCacheEnabled: settings.translationCacheEnabled,
              })
            }
            className="gap-1.5"
          >
            {saving ? (
              "保存中…"
            ) : (
              <>
                <Check className="size-4" />
                保存设置
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SettingRow({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      {children}
    </div>
  );
}
