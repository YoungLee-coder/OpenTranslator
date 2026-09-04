import type { ProviderApiFormat } from "@opentranslator/shared-types";
import {
  MAX_CUSTOM_ENDPOINTS,
  PROVIDER_API_FORMATS,
  isProviderApiFormat,
  parseModelLines,
  parseProviderEndpoints,
  type ProviderEndpoint,
} from "@opentranslator/shared-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProviderIcon } from "@/components/ProviderIcon";
import { useTranslation } from "@/lib/i18n";
import type { MessageKey } from "@/locales/zh-CN";
import { Gauge, Plus, Trash2 } from "lucide-react";

export type EndpointFormState = {
  format: ProviderApiFormat;
  baseUrl: string;
  modelsText: string;
};

const FORMAT_PLACEHOLDER: Record<ProviderApiFormat, string> = {
  openai: "https://api.example.com/v1",
  claude: "https://api.example.com",
  gemini: "https://api.example.com",
};

const FORMAT_LABEL_KEY: Record<ProviderApiFormat, MessageKey> = {
  openai: "providers.format.openai",
  claude: "providers.format.claude",
  gemini: "providers.format.gemini",
};

export function emptyEndpointForm(): EndpointFormState {
  return { format: "openai", baseUrl: "", modelsText: "" };
}

export function endpointsFromRecord(
  configJson: Record<string, unknown> | undefined,
  fallback?: { baseUrl?: string; models?: string[] },
): EndpointFormState[] {
  const raw = configJson?.endpoints;
  const parsed = parseProviderEndpoints(raw);
  if (parsed.length) {
    return parsed.map((ep) => ({
      format: ep.format,
      baseUrl: ep.baseUrl,
      modelsText: ep.models.join("\n"),
    }));
  }
  if (fallback?.baseUrl || fallback?.models?.length) {
    return [
      {
        format: "openai",
        baseUrl: fallback.baseUrl ?? "",
        modelsText: (fallback.models ?? []).join("\n"),
      },
    ];
  }
  return [emptyEndpointForm()];
}

export function parseEndpointFormField(raw: string | undefined): EndpointFormState[] {
  if (!raw?.trim()) return [emptyEndpointForm()];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return [emptyEndpointForm()];
    const out: EndpointFormState[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      if (!isProviderApiFormat(rec.format)) continue;
      out.push({
        format: rec.format,
        baseUrl: typeof rec.baseUrl === "string" ? rec.baseUrl : "",
        modelsText: typeof rec.modelsText === "string" ? rec.modelsText : "",
      });
      if (out.length >= MAX_CUSTOM_ENDPOINTS) break;
    }
    return out.length ? out : [emptyEndpointForm()];
  } catch {
    return [emptyEndpointForm()];
  }
}

export function serializeEndpointForm(items: EndpointFormState[]): string {
  return JSON.stringify(items);
}

export function endpointFormToEndpoints(items: EndpointFormState[]): ProviderEndpoint[] {
  return items.map((item) => ({
    format: item.format,
    baseUrl: item.baseUrl.trim(),
    models: parseModelLines(item.modelsText),
  }));
}

export function ProviderEndpointsField({
  value,
  onChange,
  onTest,
  testingIndex,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  onTest: (index: number) => void;
  testingIndex: number | null;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const items = parseEndpointFormField(value);

  function commit(next: EndpointFormState[]) {
    onChange(serializeEndpointForm(next));
  }

  function update(index: number, patch: Partial<EndpointFormState>) {
    commit(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("providers.customHint")}
      </p>
      {items.map((item, index) => (
        <div
          key={index}
          className="flex min-w-0 flex-col gap-3 rounded-md border border-rule p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              {t("providers.endpointN", { n: index + 1 })}
            </span>
            {items.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={disabled}
                onClick={() => commit(items.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-3" />
                {t("providers.removeEndpoint")}
              </Button>
            )}
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor={`endpoint-format-${index}`}>
                {t("providers.endpointFormat")}
              </Label>
              <Select
                value={item.format}
                disabled={disabled}
                onValueChange={(v) =>
                  update(index, { format: v as ProviderApiFormat })
                }
              >
                <SelectTrigger id={`endpoint-format-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_API_FORMATS.map((format) => (
                    <SelectItem key={format} value={format}>
                      <span className="inline-flex items-center gap-1.5">
                        <ProviderIcon type={format} size={16} />
                        {t(FORMAT_LABEL_KEY[format])}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor={`endpoint-url-${index}`}>Base URL</Label>
              <Input
                id={`endpoint-url-${index}`}
                type="text"
                value={item.baseUrl}
                placeholder={FORMAT_PLACEHOLDER[item.format]}
                disabled={disabled}
                onChange={(e) => update(index, { baseUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <Label
              htmlFor={`endpoint-models-${index}`}
              className="flex items-center gap-1.5"
            >
              {t("providers.models")}
              <span className="text-xs font-normal text-muted-foreground">
                {t("providers.modelsHint")}
              </span>
            </Label>
            <Textarea
              id={`endpoint-models-${index}`}
              value={item.modelsText}
              placeholder={
                item.format === "claude"
                  ? "claude-sonnet-4-5\nclaude-opus-4-1"
                  : item.format === "gemini"
                    ? "gemini-2.5-flash\ngemini-2.5-pro"
                    : "gpt-4o-mini\ngpt-4o"
              }
              rows={3}
              disabled={disabled}
              onChange={(e) => update(index, { modelsText: e.target.value })}
              className="font-mono text-xs"
            />
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 self-start"
            disabled={disabled || testingIndex !== null}
            onClick={() => onTest(index)}
          >
            <Gauge className="size-3.5" />
            {testingIndex === index
              ? t("providers.testLatencyTesting")
              : t("providers.testLatency")}
          </Button>
        </div>
      ))}
      {items.length < MAX_CUSTOM_ENDPOINTS && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 self-start"
          disabled={disabled}
          onClick={() => commit([...items, emptyEndpointForm()])}
        >
          <Plus className="size-4" />
          {t("providers.addEndpoint")}
        </Button>
      )}
    </div>
  );
}
