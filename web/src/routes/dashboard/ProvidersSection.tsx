import { useEffect, useState } from "react";
import type {
  CreateProviderRequest,
  ProviderField,
  ProviderRecord,
  ProviderType,
  TestProviderLatencyResponse,
} from "@opentranslator/shared-types";
import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  ApiError,
} from "@/lib/api-client";
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
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Gauge, Plus, RotateCw, Server, Star, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from "@/lib/i18n";
import type { MessageKey } from "@/locales/zh-CN";

interface FormState {
  type: ProviderType;
  displayName: string;
  apiKey: string;
  fields: Record<string, string>;
  enabled: boolean;
  isPublicDefault: boolean;
}

const EMPTY_FORM: FormState = {
  type: "openai",
  displayName: "",
  apiKey: "",
  fields: {},
  enabled: true,
  isPublicDefault: false,
};

// 技术类型 ID → 展示名，表格与下拉均用此映射（custom 走 i18n）
const PROVIDER_LABELS: Record<Exclude<ProviderType, "custom">, string> = {
  openai: "OpenAI",
  claude: "Claude",
  gemini: "Gemini",
  aihubmix: "AIHubMix",
  cloudflare: "Cloudflare",
  deepl: "DeepL",
};

function providerLabel(
  type: ProviderType,
  t: (key: MessageKey, params?: Record<string, string | number>) => string,
): string {
  if (type === "custom") return t("providers.typeCustom");
  return PROVIDER_LABELS[type] ?? type;
}

export function ProvidersSection() {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [types, setTypes] = useState<ProviderType[]>([]);
  const [schemas, setSchemas] = useState<Record<ProviderType, ProviderField[]>>(
    {
      openai: [],
      claude: [],
      gemini: [],
      aihubmix: [],
      custom: [],
      cloudflare: [],
      deepl: [],
    },
  );
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<null | { id: string | null }>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProviderRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [latencyTesting, setLatencyTesting] = useState(false);
  const [latencyResult, setLatencyResult] = useState<string | null>(null);
  const [latencyError, setLatencyError] = useState<string | null>(null);

  async function load() {
    try {
      const [listRes, schemaRes] = await Promise.all([
        apiGet<{ providers: ProviderRecord[]; types: ProviderType[] }>(
          "/api/admin/providers",
        ),
        apiGet<{ schemas: Record<ProviderType, ProviderField[]> }>(
          "/api/admin/providers/schema",
        ),
      ]);
      setProviders(listRes.providers);
      setTypes(listRes.types);
      setSchemas(schemaRes.schemas);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function clearLatencyFeedback() {
    setLatencyResult(null);
    setLatencyError(null);
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
      isPublicDefault: p.isPublicDefault,
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
      models: models.length ? models : undefined,
      configJson: Object.keys(configJson).length ? configJson : undefined,
      enabled: form.enabled,
      isPublicDefault: form.isPublicDefault,
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
        const body: Partial<CreateProviderRequest> = { ...built };
        if (!body.apiKey) delete body.apiKey;
        await apiPut(`/api/admin/providers/${editing.id}`, body);
        toast.success(t("providers.updated"));
      } else {
        await apiPost("/api/admin/providers", built);
        toast.success(t("providers.added"));
      }
      closeDialog();
      await load();
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
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : String(e));
    } finally {
      setDeleteTarget(null);
    }
  }

  // 行内切换启用：乐观更新，失败回滚
  async function toggleEnabled(p: ProviderRecord) {
    if (busyId) return;
    const prev = providers;
    setProviders(
      prev.map((x) => (x.id === p.id ? { ...x, enabled: !x.enabled } : x)),
    );
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
      toast.error(e instanceof ApiError ? e.message : t("common.operationFailed"));
    } finally {
      setBusyId(null);
    }
  }

  // 行内设为默认：互斥，乐观更新
  async function setDefault(p: ProviderRecord) {
    if (p.isPublicDefault || busyId) return;
    const prev = providers;
    setProviders(
      prev.map((x) => ({ ...x, isPublicDefault: x.id === p.id })),
    );
    setBusyId(p.id);
    try {
      await apiPut(`/api/admin/providers/${p.id}`, { isPublicDefault: true });
      toast.success(t("providers.setDefaultToast", { name: p.displayName }));
    } catch (e) {
      setProviders(prev);
      toast.error(e instanceof ApiError ? e.message : t("common.operationFailed"));
    } finally {
      setBusyId(null);
    }
  }

  function onTypeChange(type: ProviderType) {
    setForm({ ...form, type, fields: {} });
    clearLatencyFeedback();
  }

  async function testBaseUrlLatency() {
    const baseUrl = eff("baseUrl").trim();
    if (!baseUrl || !/^https?:\/\//i.test(baseUrl)) {
      setLatencyResult(null);
      setLatencyError(t("providers.testLatencyNeedUrl"));
      return;
    }
    setLatencyTesting(true);
    setLatencyResult(null);
    setLatencyError(null);
    try {
      const res = await apiPost<TestProviderLatencyResponse>(
        "/api/admin/providers/test-latency",
        { baseUrl },
      );
      if (res.ok && res.latencyMs != null) {
        setLatencyResult(
          t("providers.testLatencyOk", {
            ms: res.latencyMs,
            status: res.status ?? "—",
          }),
        );
      } else {
        const detail = mapLatencyError(res.error);
        setLatencyError(t("providers.testLatencyFail", { error: detail }));
      }
    } catch (e) {
      const raw = e instanceof ApiError ? e.message : String(e);
      const detail = mapLatencyError(raw);
      setLatencyError(t("providers.testLatencyFail", { error: detail }));
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
      /private or link-local|localhost|invalid URL|must use http|credentials|baseUrl is required/i.test(
        raw,
      )
    ) {
      return t("providers.testLatencyBadUrl");
    }
    return t("providers.testLatencyUnreachable");
  }

  function modelsText(p: ProviderRecord): string {
    return p.models?.length ? p.models.join("、") : (p.defaultModel ?? "—");
  }

  return (
    <Card className="animate-rise">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{t("providers.title")}</CardTitle>
          <Button type="button" size="sm" onClick={startCreate} className="w-full gap-1.5 sm:w-auto">
            <Plus className="size-4" />
            {t("common.add")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-md" />
            ))}
          </div>
        ) : error ? (
          <>
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setLoading(true);
                  void load();
                }}
              >
                <RotateCw className="size-4" />
                {t("common.retry")}
              </Button>
            </div>
          </>
        ) : providers.length === 0 ? (
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
        ) : (
          <div className="rounded-md border border-rule">
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
                      {providerLabel(p.type, t)}
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
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={p.enabled}
                          disabled={busyId === p.id}
                          onCheckedChange={() => void toggleEnabled(p)}
                          aria-label={t("providers.toggleEnabled", { name: p.displayName })}
                        />
                        {p.isPublicDefault ? (
                          <Badge variant="accent">{t("common.default")}</Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => void setDefault(p)}
                          >
                            <Star className="size-3" />
                            <span className="hidden sm:inline">{t("providers.setDefault")}</span>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          type="button"
                          onClick={() => startEdit(p)}
                        >
                          {t("common.edit")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          type="button"
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
        )}
      </CardContent>

      {/* 编辑 / 新增 对话框 */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("providers.editTitle") : t("providers.addTitle")}</DialogTitle>
            <DialogDescription>{t("providers.formDesc")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>{t("providers.type")}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => onTypeChange(v as ProviderType)}
                  disabled={!!editing?.id}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((type) => (
                      <SelectItem key={type} value={type}>
                        {providerLabel(type, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
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

            <div className="flex flex-col gap-2">
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
              <div className="flex flex-col gap-2" key={f.key}>
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
                  <>
                    <div className="flex gap-2">
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
                        className="min-w-0 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 shrink-0 gap-1.5"
                        disabled={latencyTesting}
                        onClick={() => void testBaseUrlLatency()}
                      >
                        <Gauge className="size-3.5" />
                        {latencyTesting
                          ? t("providers.testLatencyTesting")
                          : t("providers.testLatency")}
                      </Button>
                    </div>
                    {latencyResult && (
                      <p className="text-xs text-muted-foreground">{latencyResult}</p>
                    )}
                    {latencyError && (
                      <p className="text-xs text-destructive">{latencyError}</p>
                    )}
                  </>
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
              <div className="flex items-center gap-2">
                <Switch
                  id="public-default"
                  checked={form.isPublicDefault}
                  onCheckedChange={(v) =>
                    setForm({ ...form, isPublicDefault: v })
                  }
                />
                <Label htmlFor="public-default">{t("providers.publicDefault")}</Label>
              </div>
            </div>

            <DialogFooter className="pt-2">
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
