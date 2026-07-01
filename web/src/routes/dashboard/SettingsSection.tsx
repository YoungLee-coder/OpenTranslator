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

export function SettingsSection() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    setSaved(false);
    try {
      const res = await apiPut<{ settings: SiteSettings }>(
        "/api/admin/settings",
        patch,
      );
      setSettings(res.settings);
      setSaved(true);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (settings === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>站点设置</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <p className="text-sm text-muted-foreground">加载中…</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>站点设置</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && <p className="text-sm text-success">已保存</p>}

        <div className="divide-y">
          <div className="flex items-center justify-between gap-4 py-4">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">公开访问</div>
              <div className="text-xs text-muted-foreground">
                关闭后，访客需登录才能使用翻译器。
              </div>
            </div>
            <Switch
              checked={settings.sitePublic}
              onCheckedChange={(v) =>
                setSettings({ ...settings, sitePublic: v })
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4 py-4">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">公开模式限流（次/分钟）</div>
              <div className="text-xs text-muted-foreground">
                匿名访客每分钟最大请求数。
              </div>
            </div>
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
          </div>

          <div className="flex items-center justify-between gap-4 py-4">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">登录用户限流（次/分钟）</div>
              <div className="text-xs text-muted-foreground">
                登录管理员每分钟最大请求数。
              </div>
            </div>
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
          </div>

          <div className="flex items-center justify-between gap-4 py-4">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">翻译结果缓存</div>
              <div className="text-xs text-muted-foreground">
                相同文本+语言对命中 KV 缓存时直接返回，省时省额度。
              </div>
            </div>
            <Switch
              checked={settings.translationCacheEnabled}
              onCheckedChange={(v) =>
                setSettings({ ...settings, translationCacheEnabled: v })
              }
            />
          </div>
        </div>

        <div className="pt-2">
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
          >
            {saving ? "保存中…" : "保存设置"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
