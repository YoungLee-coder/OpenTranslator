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

export function ProvidersSection() {
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [types, setTypes] = useState<ProviderType[]>([]);
  const [schemas, setSchemas] = useState<Record<ProviderType, ProviderField[]>>(
    {
      openai: [],
      claude: [],
      gemini: [],
      deepseek: [],
      openrouter: [],
      aihubmix: [],
      azure_openai: [],
      custom: [],
    },
  );
  const [editing, setEditing] = useState<null | { id: string | null }>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
        defaultModel: p.defaultModel ?? "",
      },
      enabled: p.enabled,
      isPublicDefault: p.isPublicDefault,
    });
    setEditing({ id: p.id });
    setError(null);
  }

  function cancel() {
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  function buildRequest(): CreateProviderRequest {
    const fields = form.fields;
    const baseUrl = fields.baseUrl?.trim() || undefined;
    const defaultModel = fields.defaultModel?.trim() || undefined;
    const configJson: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (k !== "baseUrl" && k !== "defaultModel" && v.trim())
        configJson[k] = v.trim();
    }
    return {
      type: form.type,
      displayName: form.displayName.trim(),
      apiKey: form.apiKey,
      baseUrl,
      defaultModel,
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
    setSaving(true);
    setError(null);
    try {
      const built = buildRequest();
      if (editing?.id) {
        const body: Partial<CreateProviderRequest> = { ...built };
        if (!body.apiKey) delete body.apiKey;
        await apiPut(`/api/admin/providers/${editing.id}`, body);
      } else {
        await apiPost("/api/admin/providers", built);
      }
      setEditing(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("确认删除该供应商？")) return;
    try {
      await apiDelete(`/api/admin/providers/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  function onTypeChange(type: ProviderType) {
    setForm({ ...form, type, fields: {} });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>供应商</CardTitle>
          {!editing && (
            <Button type="button" size="sm" onClick={startCreate}>
              + 新增
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {editing && (
          <form
            onSubmit={submit}
            className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4"
          >
            <h3 className="text-sm font-medium">
              {editing.id ? "编辑供应商" : "新增供应商"}
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>类型</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => onTypeChange(v as ProviderType)}
                  disabled={!!editing.id}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
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
                API Key{editing.id ? "（留空则不修改）" : ""}
              </Label>
              <Input
                id="api-key"
                type="password"
                value={form.apiKey}
                onChange={(e) =>
                  setForm({ ...form, apiKey: e.target.value })
                }
                placeholder={editing.id ? "••••••••" : "sk-..."}
                required={!editing.id}
                autoComplete="new-password"
              />
            </div>

            {schemas[form.type]?.map((f) => (
              <div className="flex flex-col gap-2" key={f.key}>
                <Label htmlFor={`field-${f.key}`}>{f.label}</Label>
                <Input
                  id={`field-${f.key}`}
                  type="text"
                  value={form.fields[f.key] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fields: { ...form.fields, [f.key]: e.target.value },
                    })
                  }
                />
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

            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "保存中…" : "保存"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancel}
              >
                取消
              </Button>
            </div>
          </form>
        )}

        <div className="rounded-lg border">
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
              {providers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    暂无供应商，点击「新增」添加。
                  </TableCell>
                </TableRow>
              )}
              {providers.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.displayName}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.type}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {p.defaultModel ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {p.enabled ? (
                        <Badge variant="success">启用</Badge>
                      ) : (
                        <Badge variant="secondary">停用</Badge>
                      )}
                      {p.isPublicDefault && <Badge variant="accent">默认</Badge>}
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
                        className="h-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        type="button"
                        onClick={() => remove(p.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
