import { useEffect, useState } from "react";
import type {
  CreateProviderRequest,
  ProviderField,
  ProviderRecord,
  ProviderType,
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
import { AlertCircle, Plus, RotateCw, Server, Star, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";

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

// 技术类型 ID → 展示名，表格与下拉均用此映射
const PROVIDER_LABELS: Record<ProviderType, string> = {
  openai: "OpenAI",
  claude: "Claude",
  gemini: "Gemini",
  aihubmix: "AIHubMix",
  custom: "自定义",
};

function providerLabel(t: ProviderType): string {
  return PROVIDER_LABELS[t] ?? t;
}

export function ProvidersSection() {
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [types, setTypes] = useState<ProviderType[]>([]);
  const [schemas, setSchemas] = useState<Record<ProviderType, ProviderField[]>>(
    {
      openai: [],
      claude: [],
      gemini: [],
      aihubmix: [],
      custom: [],
    },
  );
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<null | { id: string | null }>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProviderRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  function startCreate() {
    setForm({ ...EMPTY_FORM });
    setEditing({ id: null });
    setError(null);
  }

  function startEdit(p: ProviderRecord) {
    setForm({
      type: p.type,
      displayName: p.displayName,
      apiKey: "",
      fields: {
        baseUrl: p.baseUrl ?? "",
        // 旧记录可能只有 defaultModel，回填时合并展示
        models: (p.models?.length ? p.models : p.defaultModel ? [p.defaultModel] : []).join("\n"),
      },
      enabled: p.enabled,
      isPublicDefault: p.isPublicDefault,
    });
    setEditing({ id: p.id });
    setError(null);
  }

  function closeDialog() {
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  // 取字段有效值：preset 优先，其次用户输入
  function eff(key: string): string {
    const f = (schemas[form.type] ?? []).find((x) => x.key === key);
    return f ? (f.preset ?? form.fields[key] ?? "") : "";
  }

  function buildRequest(): CreateProviderRequest | null {
    const schemaFields = schemas[form.type] ?? [];
    // 必填校验（preset 字段恒有值，跳过）
    for (const f of schemaFields) {
      if (f.required && !f.preset && !form.fields[f.key]?.trim()) {
        setError(`「${f.label}」为必填项`);
        return null;
      }
    }
    const baseUrl = eff("baseUrl").trim() || undefined;
    // Base URL 需为完整地址（以 http:// 或 https:// 开头）
    if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
      setError("Base URL 需填写完整地址（以 http:// 或 https:// 开头）");
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
      const v = (f.preset ?? form.fields[f.key] ?? "").trim();
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
      setError("显示名称和 API Key 为必填项");
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
        toast.success("供应商已更新");
      } else {
        await apiPost("/api/admin/providers", built);
        toast.success("供应商已添加");
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
      toast.success(`已删除「${target.displayName}」`);
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
      toast.success(`已${p.enabled ? "停用" : "启用"}「${p.displayName}」`);
    } catch (e) {
      setProviders(prev);
      toast.error(e instanceof ApiError ? e.message : "操作失败");
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
      toast.success(`已将「${p.displayName}」设为默认供应商`);
    } catch (e) {
      setProviders(prev);
      toast.error(e instanceof ApiError ? e.message : "操作失败");
    } finally {
      setBusyId(null);
    }
  }

  function onTypeChange(type: ProviderType) {
    setForm({ ...form, type, fields: {} });
  }

  return (
    <Card className="animate-rise">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>供应商</CardTitle>
          <Button type="button" size="sm" onClick={startCreate} className="gap-1.5">
            <Plus className="size-4" />
            新增
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
                重试
              </Button>
            </div>
          </>
        ) : providers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Server className="size-5" />
            </div>
            <div className="text-sm text-muted-foreground">
              还没有供应商，添加一个即可开始翻译。
            </div>
            <Button
              type="button"
              size="sm"
              onClick={startCreate}
              className="gap-1.5"
            >
              <Plus className="size-4" />
              新增供应商
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-rule">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>模型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.displayName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {providerLabel(p.type)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.models?.length ? p.models.join("、") : (p.defaultModel ?? "—")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={p.enabled}
                          disabled={busyId === p.id}
                          onCheckedChange={() => void toggleEnabled(p)}
                          aria-label={`切换${p.displayName}启用状态`}
                        />
                        {p.isPublicDefault ? (
                          <Badge variant="accent">默认</Badge>
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
                            设为默认
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
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2 className="size-3" />
                          删除
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
            <DialogTitle>{editing?.id ? "编辑供应商" : "新增供应商"}</DialogTitle>
            <DialogDescription>
              配置模型供应商的连接信息。API Key 加密存储，明文不入库。
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>类型</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => onTypeChange(v as ProviderType)}
                  disabled={!!editing?.id}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t} value={t}>
                        {providerLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="display-name">显示名称</Label>
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
                API Key{editing?.id ? "（留空则不修改）" : ""}
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
                      已锁定
                    </span>
                  )}
                  {f.type === "models" && (
                    <span className="text-xs font-normal text-muted-foreground">
                      一行一个，首项为默认
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
                <Label htmlFor="enabled">启用</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="public-default"
                  checked={form.isPublicDefault}
                  onCheckedChange={(v) =>
                    setForm({ ...form, isPublicDefault: v })
                  }
                />
                <Label htmlFor="public-default">设为公开默认</Label>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
              >
                取消
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "保存中…" : "保存"}
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
            <DialogTitle>删除供应商</DialogTitle>
            <DialogDescription>
              确认删除「{deleteTarget?.displayName}」？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
            >
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
