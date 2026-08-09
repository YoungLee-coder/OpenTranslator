import { useEffect, useState } from "react";
import type { SiteSettings } from "@opentranslator/shared-types";
import {
  TRANSLATION_CACHE_TTL_HOURS_MAX,
  TRANSLATION_CACHE_TTL_HOURS_MIN,
} from "@opentranslator/shared-types";
import { apiPut, ApiError } from "@/lib/api-client";
import {
  beginSettingsWrite,
  getSettingsSnapshot,
  loadSettingsSnapshot,
  PLACEHOLDER_SETTINGS,
  setSettingsSnapshot,
} from "@/lib/dashboard-settings-cache";
import { useOnceAnimation } from "@/lib/useOnceAnimation";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check } from "lucide-react";
import { toast } from "@/components/ui/sonner";

export function SettingsSection() {
  const { t } = useTranslation();
  const initial = getSettingsSnapshot();
  const [settings, setSettings] = useState<SiteSettings>(
    () => initial?.settings ?? PLACEHOLDER_SETTINGS,
  );
  const [ready, setReady] = useState(() => !!initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fromCache = !!initial;
  const formEnter = useOnceAnimation(ready && !fromCache, 400);
  const interactive = ready && !saving;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const snap = await loadSettingsSnapshot();
        if (cancelled) return;
        setSettings(snap.settings);
        setReady(true);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setReady(true);
        if (!getSettingsSnapshot()) {
          setError(e instanceof ApiError ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(patch: Partial<SiteSettings>) {
    const writeGen = beginSettingsWrite();
    setSaving(true);
    try {
      const res = await apiPut<{ settings: SiteSettings }>(
        "/api/admin/settings",
        patch,
      );
      setSettings(res.settings);
      setSettingsSnapshot(res.settings, writeGen);
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

        <div
          className={cn(
            "divide-y divide-rule transition-opacity duration-300 motion-reduce:transition-none",
            formEnter && "animate-soft-in motion-reduce:animate-none",
            ready ? "opacity-100" : "opacity-70",
          )}
        >
          <SettingRow
            title={t("settings.authedRateLimit")}
            desc={t("settings.authedRateLimitDesc")}
          >
            <Input
              type="number"
              min={1}
              value={settings.authedRateLimitPerMinute}
              disabled={!interactive}
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
              disabled={!interactive}
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
              disabled={!interactive || !settings.translationCacheEnabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  translationCacheTtlHours: Number(e.target.value),
                })
              }
              className="w-24"
            />
          </SettingRow>

          <SettingRow
            title={t("settings.organizeFormat")}
            desc={t("settings.organizeFormatDesc")}
          >
            <Switch
              checked={!!settings.organizeFormatEnabled}
              disabled={!interactive}
              onCheckedChange={(v) =>
                setSettings({ ...settings, organizeFormatEnabled: v })
              }
            />
          </SettingRow>

          <SettingRow
            title={t("settings.disableModelReasoning")}
            desc={t("settings.disableModelReasoningDesc")}
          >
            <Switch
              checked={!!settings.disableModelReasoning}
              disabled={!interactive}
              onCheckedChange={(v) =>
                setSettings({ ...settings, disableModelReasoning: v })
              }
            />
          </SettingRow>
        </div>

        <div className="pt-3">
          <Button
            type="button"
            disabled={!interactive}
            onClick={() =>
              save({
                authedRateLimitPerMinute: settings.authedRateLimitPerMinute,
                translationCacheEnabled: settings.translationCacheEnabled,
                translationCacheTtlHours: settings.translationCacheTtlHours,
                organizeFormatEnabled: settings.organizeFormatEnabled,
                disableModelReasoning: settings.disableModelReasoning,
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
