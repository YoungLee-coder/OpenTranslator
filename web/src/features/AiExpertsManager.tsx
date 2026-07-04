import { useEffect, useState } from "react";
import type {
  AiExpertMeta,
  AiExpertsAdminResponse,
  AiExpertsConfig,
} from "@opentranslator/shared-types";
import { apiGet, apiPut, ApiError } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Check } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  expertDescription,
  expertLabel,
  useTranslation,
} from "@/lib/i18n";
import { cn } from "@/lib/utils";

const GENERAL_ID = "general";

/** AI 专家管理：启用/停用各场景策略，并设置站点默认专家。 */
export function AiExpertsManager() {
  const { t, locale } = useTranslation();
  const [experts, setExperts] = useState<AiExpertMeta[]>([]);
  const [enabledIds, setEnabledIds] = useState<Set<string>>(new Set());
  const [defaultExpertId, setDefaultExpertId] = useState<string>(GENERAL_ID);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function load() {
    try {
      const res = await apiGet<AiExpertsAdminResponse>("/api/admin/experts");
      setExperts(res.experts);
      setEnabledIds(new Set(res.config.enabledIds));
      setDefaultExpertId(res.config.defaultExpertId ?? GENERAL_ID);
      setError(null);
      setDirty(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function toggleExpert(id: string, on: boolean) {
    setEnabledIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
    setDirty(true);
  }

  function handleDefaultChange(id: string) {
    setDefaultExpertId(id);
    setDirty(true);
    if (id !== GENERAL_ID) {
      setEnabledIds((prev) => new Set(prev).add(id));
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    const config: AiExpertsConfig = {
      enabledIds: [...enabledIds],
      defaultExpertId: defaultExpertId === GENERAL_ID ? GENERAL_ID : defaultExpertId,
    };
    try {
      await apiPut("/api/admin/experts", config);
      toast.success(t("experts.saved"));
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const defaultOptions = [
    { id: GENERAL_ID, label: t("experts.generalDefault") },
    ...experts
      .filter((e) => enabledIds.has(e.id))
      .map((e) => ({ id: e.id, label: expertLabel(e, locale) })),
  ];

  return (
    <Card className="animate-rise">
      <CardHeader>
        <CardTitle>{t("experts.title")}</CardTitle>
        <CardDescription>{t("experts.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-rule bg-muted/20 p-3">
          <span className="text-sm text-muted-foreground">{t("experts.defaultExpert")}</span>
          <Select value={defaultExpertId} onValueChange={handleDefaultChange}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {defaultOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => void save()} disabled={!dirty || saving} className="ml-auto gap-1.5">
            <Check className="size-4" />
            {saving ? t("common.saving") : t("experts.saveConfig")}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {experts.map((expert) => {
            const on = enabledIds.has(expert.id);
            return (
              <div
                key={expert.id}
                className={cn(
                  "flex gap-3 rounded-md border border-rule p-3 transition-colors",
                  on && "border-primary/30 bg-primary/5",
                )}
              >
                {expert.avatar ? (
                  <img
                    src={expert.avatar}
                    alt=""
                    className="size-10 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="size-10 shrink-0 rounded-md bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium">{expertLabel(expert, locale)}</p>
                    <Switch
                      checked={on}
                      onCheckedChange={(v) => toggleExpert(expert.id, v)}
                      aria-label={t("experts.enableExpert", {
                        name: expertLabel(expert, locale),
                      })}
                    />
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {expertDescription(expert, locale)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
