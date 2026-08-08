import { useEffect, useState } from "react";
import type {
  CreateProviderRequest,
  ProviderField,
  ProviderRecord,
  ProviderType,
  TestProviderLatencyRequest,
  TestProviderLatencyResponse,
} from "@opentranslator/shared-types";
import {
  apiDelete,
  apiPost,
  apiPut,
  ApiError,
} from "@/lib/api-client";
import {
  EMPTY_SCHEMAS,
  beginProvidersWrite,
  getProvidersSnapshot,
  loadProvidersSnapshot,
  patchProvidersSnapshot,
} from "@/lib/dashboard-providers-cache";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Gauge, Plus, RotateCw, Server, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useOnceAnimation } from "@/lib/useOnceAnimation";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface FormState {
  type: ProviderType;
  displayName: string;
  apiKey: string;
  fields: Record<string, string>;
  enabled: boolean;
}

/** 延迟测速结果色档：绿 / 黄 / 红（失败恒为红） */
type LatencyTone = "success" | "warning" | "destructive";

type LatencyFeedback = {
  tone: LatencyTone;
  message: string;
};

function latencyToneFromMs(ms: number): LatencyTone {
  if (ms < 2000) return "success";
  if (ms < 5000) return "warning";
  return "destructive";
}

const LATENCY_TONE_CLASS: Record<LatencyTone, string> = {
  success: "border-success/25 bg-success/5 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning-foreground",
  destructive: "border-destructive/25 bg-destructive/5 text-destructive",
};

const EMPTY_FORM: FormState = {
  type: "openai",
  displayName: "",
  apiKey: "",
  fields: {},
  enabled: true,
};

// 技术类型 ID → 展示名，表格与下拉均用此映射
const PROVIDER_LABELS: Record<ProviderType, string> = {
  openai: "OpenAI",
  claude: "Claude",
  gemini: "Gemini",
  aihubmix: "AIHubMix",
  cloudflare: "Cloudflare",
  deepl: "DeepL",
};

function providerLabel(type: ProviderType): string {
  return PROVIDER_LABELS[type] ?? type;
}

function encodeModelKey(providerId: string, model: string): string {
  return `${providerId}|${model}`;
}

function decodeModelKey(key: string): { providerId: string; model: string } {
  const sep = key.indexOf("|");
  return { providerId: key.slice(0, sep), model: key.slice(sep + 1) };
}

export function ProvidersSection() {
  const { t } = useTranslation();
  const initial = getProvidersSnapshot();
  const [providers, setProviders] = useState<ProviderRecord[]>(
    () => initial?.providers ?? [],
  );
  const [types, setTypes] = useState<ProviderType[]>(
    () => initial?.types ?? [],
  );
  const [schemas, setSchemas] = useState<Record<ProviderType, ProviderField[]>>(
    () => initial?.schemas ?? EMPTY_SCHEMAS,
  );
  const [ready, setReady] = useState(() => !!initial);
  const [editing, setEditing] = useState<null | { id: string | null }>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProviderRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [latencyTesting, setLatencyTesting] = useState(false);
  const [latencyFeedback, setLatencyFeedback] = useState<LatencyFeedback | null>(
    null,
  );
  // 站点默认模型：「providerId|model」；不依赖公开访问模块
  const [defaultModelKey, setDefaultModelKey] = useState<string | null>(
    () => initial?.defaultModelKey ?? null,
  );
  const [savingDefault, setSavingDefault] = useState(false);
  const fromCache = !!initial;
  const tableEnter = useOnceAnimation(
    ready && !fromCache && providers.length > 0,
    400,
  );

  async function load(opts?: { force?: boolean }) {
    try {
      const snap = await loadProvidersSnapshot(opts);
      setProviders(snap.providers);
      setTypes(snap.types);
      setSchemas(snap.schemas);
      setDefaultModelKey(snap.defaultModelKey);
      setReady(true);
      setError(null);
    } catch (e) {
      setReady(true);
      if (!getProvidersSnapshot()) {
        setError(e instanceof ApiError ? e.message : String(e));
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const snap = await loadProvidersSnapshot();
        if (cancelled) return;
        setProviders(snap.providers);
        setTypes(snap.types);
        setSchemas(snap.schemas);
        setDefaultModelKey(snap.defaultModelKey);
        setReady(true);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setReady(true);
        if (!getProvidersSnapshot()) {
          setError(e instanceof ApiError ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function clearLatencyFeedback() {
    setLatencyFeedback(null);
  }

  function startCreate() {
    setForm({ ...EMPTY_FORM });
    setEditing({ id: null });
    setError(null);
    clearLatencyFeedback();
  }

  function startEdit(p: ProviderRecord) {
    // 按 schema 回填字段：baseUrl/models 走专属列，其余自定义字段从 configJson 取
    const fields: Record<string, string> = {};
    for (const f of schemas[p.type] ?? []) {
      if (f.key === "baseUrl") {
        fields.baseUrl = p.baseUrl ?? "";
      } else if (f.key === "models") {
        // 旧记录可能只有 defaultModel，回填时合并展示
        fields.models = (p.models?.length ? p.models : p.defaultModel ? [p.defaultModel] : []).join("\n");
      } else {
        const v = p.configJson?.[f.key];
        fields[f.key] = typeof v === "string" ? v : "";
      }
    }
    setForm({
      type: p.type,
      displayName: p.displayName,
      apiKey: "",
      fields,
      enabled: p.enabled,
    });
    setEditing({ id: p.id });
    setError(null);
    clearLatencyFeedback();
  }

  function closeDialog() {
    setEditing(null);
    setForm(EMPTY_FORM);
    clearLatencyFeedback();
  }

  // 取字段有效值：preset 优先，其次用户输入，最后 defaultValue（select 初始选中项）
  function eff(key: string): string {
    const f = (schemas[form.type] ?? []).find((x) => x.key === key);
    return f ? (f.preset ?? form.fields[key] ?? f.defaultValue ?? "") : "";
  }

  function buildRequest(): CreateProviderRequest | null {
    const schemaFields = schemas[form.type] ?? [];
    // 必填校验（preset / defaultValue 恒有值，跳过）
    for (const f of schemaFields) {
      if (f.required && !f.preset && !eff(f.key).trim()) {
        setError(t("providers.fieldRequired", { label: f.label }));
        return null;
      }
    }
    const baseUrl = eff("baseUrl").trim() || undefined;
    // Base URL 需为完整地址（以 http:// 或 https:// 开头）
    if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
      setError(t("providers.baseUrlInvalid"));
      return null;
    }
    // models：一行一个模型名，去空、去重；首项视为默认模型
    const models = Array.from(
      new Set(
        eff("models")
          .split("\n")
          .map((m) => m.trim())
          .filter(Boolean),
      ),
    );
    const configJson: Record<string, string> = {};
    for (const f of schemaFields) {
      if (f.key === "baseUrl" || f.key === "models") continue;
      const v = (f.preset ?? form.fields[f.key] ?? f.defaultValue ?? "").trim();
      if (v) configJson[f.key] = v;
    }
    return {
      type: form.type,
      displayName: form.displayName.trim(),
      apiKey: form.apiKey,
      baseUrl,
      models,
      configJson,
      enabled: form.enabled,
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.displayName.trim() || (!editing?.id && !form.apiKey)) {
      setError(t("providers.nameKeyRequired"));
      return;
    }
    const built = buildRequest();
    if (!built) return;
    setSaving(true);
    setError(null);
    try {
      if (editing?.id) {
        // Always send type-scoped fields so switching type clears stale baseUrl /
        // models / configJson from the previous adapter schema.
        const body: Partial<CreateProviderRequest> = {
          ...built,
          baseUrl: built.baseUrl ?? "",
          models: built.models ?? [],
          configJson: built.configJson ?? {},
        };
        if (!body.apiKey) delete body.apiKey;
        await apiPut(`/api/admin/providers/${editing.id}`, body);
        toast.success(t("providers.updated"));
      } else {
        await apiPost("/api/admin/providers", {
          ...built,
          models: built.models?.length ? built.models : undefined,
          configJson: Object.keys(built.configJson ?? {}).length
            ? built.configJson
            : undefined,
        });
        toast.success(t("providers.added"));
      }
      closeDialog();
      await load({ force: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    try {
      await apiDelete(`/api/admin/providers/${target.id}`);
      toast.success(t("providers.deleted", { name: target.displayName }));
      await load({ force: true });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    } finally {
      setDeleteTarget(null);
    }
  }

  // 行内切换启用：乐观更新，失败回滚
  async function toggleEnabled(p: ProviderRecord) {
    if (busyId) return;
    const writeGen = beginProvidersWrite();
    const prev = providers;
    const next = prev.map((x) =>
      x.id === p.id ? { ...x, enabled: !x.enabled } : x,
    );
    setProviders(next);
    patchProvidersSnapshot({ providers: next }, writeGen);
    setBusyId(p.id);
    try {
      await apiPut(`/api/admin/providers/${p.id}`, { enabled: !p.enabled });
      toast.success(
        p.enabled
          ? t("providers.disabledToast", { name: p.displayName })
          : t("providers.enabledToast", { name: p.displayName }),
      );
    } catch (e) {
      setProviders(prev);
      patchProvidersSnapshot({ providers: prev }, writeGen);
      toast.error(e instanceof ApiError ? e.message : t("common.operationFailed"));
    } finally {
      setBusyId(null);
    }
  }

  // 站点默认模型：写入 defaultModel，与公开访问相互独立
  async function saveDefaultModel(key: string) {
    if (savingDefault || key === defaultModelKey) return;
    const writeGen = beginProvidersWrite();
    const prev = defaultModelKey;
    setDefaultModelKey(key);
    patchProvidersSnapshot({ defaultModelKey: key }, writeGen);
    setSavingDefault(true);
    try {
      await apiPut("/api/admin/settings", {
        defaultModel: decodeModelKey(key),
      });
      toast.success(t("providers.defaultModelSaved"));
    } catch (e) {
      setDefaultModelKey(prev);
      patchProvidersSnapshot({ defaultModelKey: prev }, writeGen);
      toast.error(e instanceof ApiError ? e.message : t("common.operationFailed"));
    } finally {
      setSavingDefault(false);
    }
  }

  const defaultModelOptions = providers
    .filter((p) => p.enabled)
    .flatMap((p) =>
      (p.models?.length ? p.models : p.defaultModel ? [p.defaultModel] : []).map(
        (m) => ({
          key: encodeModelKey(p.id, m),
          label: `${p.displayName} · ${m}`,
        }),
      ),
    );
  // 当前默认若不在可选列表（供应商已停用/模型已删），仍展示以便管理员改选
  const defaultSelectValue =
    defaultModelKey &&
    defaultModelOptions.some((o) => o.key === defaultModelKey)
      ? defaultModelKey
      : undefined;

  function onTypeChange(type: ProviderType) {
    setForm({ ...form, type, fields: {} });
    clearLatencyFeedback();
  }

  async function testProviderLatency() {
    const built = buildRequest();
    if (!built) return;
    if (!built.apiKey && !editing?.id) {
      setLatencyFeedback({
        tone: "destructive",
        message: t("providers.testLatencyNeedKey"),
      });
      return;
    }
    const model = built.models?.[0];
    if (!model) {
      setLatencyFeedback({
        tone: "destructive",
        message: t("providers.testLatencyNeedModel"),
      });
      return;
    }
    setLatencyTesting(true);
    setLatencyFeedback(null);
    try {
      const body: TestProviderLatencyRequest = {
        type: built.type,
        baseUrl: built.baseUrl,
        model,
        configJson: built.configJson,
      };
      if (built.apiKey) body.apiKey = built.apiKey;
      else if (editing?.id) body.providerId = editing.id;

      const res = await apiPost<TestProviderLatencyResponse>(
        "/api/admin/providers/test-latency",
        body,
      );
      if (res.ok && res.latencyMs != null) {
        setLatencyFeedback({
          tone: latencyToneFromMs(res.latencyMs),
          message: t("providers.testLatencyOk", {
            ms: res.latencyMs,
            preview: res.replyPreview ?? "—",
          }),
        });
      } else {
        const detail = mapLatencyError(res.error);
        setLatencyFeedback({
          tone: "destructive",
          message: t("providers.testLatencyFail", { error: detail }),
        });
      }
    } catch (e) {
      const raw = e instanceof ApiError ? e.message : String(e);
      const detail = mapLatencyError(raw);
      setLatencyFeedback({
        tone: "destructive",
        message: t("providers.testLatencyFail", { error: detail }),
      });
    } finally {
      setLatencyTesting(false);
    }
  }

  function mapLatencyError(raw: string | undefined): string {
    if (!raw) return t("providers.testLatencyUnreachable");
    if (/timed out|timeout|AbortError/i.test(raw)) {
      return t("providers.testLatencyTimeout");
    }
    if (
      /private or link-local|localhost|invalid URL|must use http|credentials|baseUrl is required|accountId is required|model is required|apiKey is required/i.test(
        raw,
      )
    ) {
      return t("providers.testLatencyBadConfig");
    }
    return raw.length > 120 ? `${raw.slice(0, 120)}…` : raw;
  }

  function modelsText(p: ProviderRecord): string {
    return p.models?.length ? p.models.join("、") : (p.defaultModel ?? "—");
  }

  return (
    <Card className="animate-rise">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{t("providers.title")}</CardTitle>
          <Button
            type="button"
            size="sm"
            onClick={startCreate}
            disabled={!ready}
            className="w-full gap-1.5 sm:w-auto"
          >
            <Plus className="size-4" />
            {t("common.add")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <>
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            {providers.length === 0 && (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setReady(false);
                    setError(null);
                    void load({ force: true });
                  }}
                >
                  <RotateCw className="size-4" />
                  {t("common.retry")}
                </Button>
              </div>
            )}
          </>
        )}

        {ready && providers.length === 0 && !error ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Server className="size-5" />
            </div>
            <div className="text-sm text-muted-foreground">
              {t("providers.empty")}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={startCreate}
              className="gap-1.5"
            >
              <Plus className="size-4" />
              {t("providers.addProvider")}
            </Button>
          </div>
        ) : providers.length > 0 || !ready ? (
          <div
            className={cn(
              "flex flex-col gap-4",
              tableEnter && "animate-soft-in motion-reduce:animate-none",
            )}
          >
            {ready && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="text-sm font-medium">{t("providers.defaultModel")}</div>
                {defaultModelOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("providers.defaultModelNone")}
                  </p>
                ) : (
                  <Select
                    value={defaultSelectValue}
                    onValueChange={(v) => void saveDefaultModel(v)}
                    disabled={savingDefault}
                  >
                    <SelectTrigger className="w-full sm:max-w-md">
                      <SelectValue placeholder={t("providers.defaultModelPick")} />
                    </SelectTrigger>
                    <SelectContent>
                      {defaultModelOptions.map((o) => (
                        <SelectItem key={o.key} value={o.key}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            <div
              className={cn(
                "rounded-md border border-rule transition-opacity duration-300 motion-reduce:transition-none",
                ready ? "opacity-100" : "opacity-70",
              )}
            >
              <Table className="min-w-[640px] lg:table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="lg:w-40">{t("providers.name")}</TableHead>
                    <TableHead className="lg:w-28">{t("providers.type")}</TableHead>
                    <TableHead className="lg:w-48">{t("providers.models")}</TableHead>
                    <TableHead className="lg:w-44">{t("providers.status")}</TableHead>
                    <TableHead className="lg:w-44 text-right">{t("providers.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-0 font-medium">
                        <span className="block truncate" title={p.displayName}>
                          {p.displayName}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {providerLabel(p.type)}
                      </TableCell>
                      <TableCell className="max-w-0">
                        <span
                          className="block truncate font-mono text-xs text-muted-foreground"
                          title={modelsText(p)}
                        >
                          {modelsText(p)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={p.enabled}
                          disabled={!ready || busyId === p.id}
                          onCheckedChange={() => void toggleEnabled(p)}
                          aria-label={t("providers.toggleEnabled", { name: p.displayName })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7"
                            type="button"
                            disabled={!ready}
                            onClick={() => startEdit(p)}
                          >
                            {t("common.edit")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            type="button"
                            disabled={!ready}
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash2 className="size-3" />
                            <span className="hidden sm:inline">{t("common.delete")}</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
      </CardContent>

      {/* 编辑 / 新增 对话框 */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("providers.editTitle") : t("providers.addTitle")}</DialogTitle>
            <DialogDescription>{t("providers.formDesc")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="flex min-w-0 flex-col gap-4">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-2">
                <Label>{t("providers.type")}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => onTypeChange(v as ProviderType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((type) => (
                      <SelectItem key={type} value={type}>
                        {providerLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <Label htmlFor="display-name">{t("providers.displayName")}</Label>
                <Input
                  id="display-name"
                  type="text"
                  value={form.displayName}
                  onChange={(e) =>
                    setForm({ ...form, displayName: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="api-key">
                {t("providers.apiKey")}
                {editing?.id ? t("providers.apiKeyOptional") : ""}
              </Label>
              <Input
                id="api-key"
                type="password"
                value={form.apiKey}
                onChange={(e) =>
                  setForm({ ...form, apiKey: e.target.value })
                }
                placeholder={editing?.id ? "••••••••" : "sk-..."}
                required={!editing?.id}
                autoComplete="new-password"
              />
            </div>

            {schemas[form.type]?.map((f) => (
              <div className="flex min-w-0 flex-col gap-2" key={f.key}>
                <Label
                  htmlFor={`field-${f.key}`}
                  className="flex items-center gap-1.5"
                >
                  {f.label}
                  {f.required && (
                    <span className="text-destructive">*</span>
                  )}
                  {f.preset && (
                    <span className="text-xs font-normal text-muted-foreground">
                      {t("providers.locked")}
                    </span>
                  )}
                  {f.type === "models" && (
                    <span className="text-xs font-normal text-muted-foreground">
                      {t("providers.modelsHint")}
                    </span>
                  )}
                </Label>
                {f.type === "models" ? (
                  <Textarea
                    id={`field-${f.key}`}
                    value={f.preset ?? form.fields[f.key] ?? ""}
                    placeholder={f.placeholder}
                    required={f.required}
                    disabled={!!f.preset}
                    rows={4}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        fields: { ...form.fields, [f.key]: e.target.value },
                      })
                    }
                    className="font-mono text-xs"
                  />
                ) : f.type === "select" ? (
                  <Select
                    value={f.preset ?? form.fields[f.key] ?? f.defaultValue ?? ""}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        fields: { ...form.fields, [f.key]: v },
                      })
                    }
                    disabled={!!f.preset}
                  >
                    <SelectTrigger id={`field-${f.key}`}>
                      <SelectValue placeholder={f.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {f.options?.map((opt) => {
                        const value =
                          typeof opt === "string" ? opt : opt.value;
                        const label =
                          typeof opt === "string"
                            ? opt
                            : (opt.label ?? opt.value);
                        return (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : f.key === "baseUrl" ? (
                  <Input
                    id={`field-${f.key}`}
                    type="text"
                    value={f.preset ?? form.fields[f.key] ?? ""}
                    placeholder={f.placeholder}
                    required={f.required}
                    disabled={!!f.preset}
                    onChange={(e) => {
                      clearLatencyFeedback();
                      setForm({
                        ...form,
                        fields: { ...form.fields, [f.key]: e.target.value },
                      });
                    }}
                  />
                ) : (
                  <Input
                    id={`field-${f.key}`}
                    type="text"
                    value={f.preset ?? form.fields[f.key] ?? ""}
                    placeholder={f.placeholder}
                    required={f.required}
                    disabled={!!f.preset}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        fields: { ...form.fields, [f.key]: e.target.value },
                      })
                    }
                  />
                )}
              </div>
            ))}

            <div className="flex flex-wrap gap-6 pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  id="enabled"
                  checked={form.enabled}
                  onCheckedChange={(v) =>
                    setForm({ ...form, enabled: v })
                  }
                />
                <Label htmlFor="enabled">{t("providers.enable")}</Label>
              </div>
            </div>

            <DialogFooter className="flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1.5 sm:min-w-0 sm:flex-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 self-start"
                  disabled={latencyTesting || saving}
                  onClick={() => void testProviderLatency()}
                >
                  <Gauge className="size-3.5" />
                  {latencyTesting
                    ? t("providers.testLatencyTesting")
                    : t("providers.testLatency")}
                </Button>
                {latencyFeedback && (
                  <div
                    key={latencyFeedback.message}
                    role="status"
                    className={cn(
                      "max-w-full rounded-md border px-2.5 py-1.5 text-xs leading-relaxed break-all",
                      "animate-rise motion-reduce:animate-none",
                      LATENCY_TONE_CLASS[latencyFeedback.tone],
                    )}
                  >
                    {latencyFeedback.message}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-2 self-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("providers.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {t("providers.deleteConfirm", { name: deleteTarget?.displayName ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
            >
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
