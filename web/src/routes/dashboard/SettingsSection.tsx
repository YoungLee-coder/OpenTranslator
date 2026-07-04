import { useEffect, useState } from "react";
import type { SiteSettings } from "@opentranslator/shared-types";
import {
  TRANSLATION_CACHE_TTL_HOURS_MAX,
  TRANSLATION_CACHE_TTL_HOURS_MIN,
} from "@opentranslator/shared-types";
import { apiGet, apiPut, ApiError } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n";
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
  const { t } = useTranslation();
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
      toast.success(t("settings.saved"));
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
          <CardTitle>{t("settings.title")}</CardTitle>
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
        <CardTitle>{t("settings.title")}</CardTitle>
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
            title={t("settings.authedRateLimit")}
            desc={t("settings.authedRateLimitDesc")}
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
            title={t("settings.translationCache")}
            desc={t("settings.translationCacheDesc")}
          >
            <Switch
              checked={settings.translationCacheEnabled}
              onCheckedChange={(v) =>
                setSettings({ ...settings, translationCacheEnabled: v })
              }
            />
          </SettingRow>

          <SettingRow
            title={t("settings.cacheTtl")}
            desc={t("settings.cacheTtlDesc", {
              min: TRANSLATION_CACHE_TTL_HOURS_MIN,
              max: TRANSLATION_CACHE_TTL_HOURS_MAX,
            })}
          >
            <Input
              type="number"
              min={TRANSLATION_CACHE_TTL_HOURS_MIN}
              max={TRANSLATION_CACHE_TTL_HOURS_MAX}
              value={settings.translationCacheTtlHours}
              disabled={!settings.translationCacheEnabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  translationCacheTtlHours: Number(e.target.value),
                })
              }
              className="w-24"
            />
          </SettingRow>
        </div>

        <div className="pt-3">
          <Button
            type="button"
            disabled={saving}
            onClick={() =>
              save({
                authedRateLimitPerMinute: settings.authedRateLimitPerMinute,
                translationCacheEnabled: settings.translationCacheEnabled,
                translationCacheTtlHours: settings.translationCacheTtlHours,
              })
            }
            className="gap-1.5"
          >
            {saving ? (
              t("common.saving")
            ) : (
              <>
                <Check className="size-4" />
                {t("common.saveSettings")}
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
