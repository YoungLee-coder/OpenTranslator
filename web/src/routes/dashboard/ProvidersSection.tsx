import { useEffect, useState } from "react";
import type {
  CreateProviderRequest,
  ProviderField,
  ProviderRecord,
  ProviderType,
} from "@opentranslator/shared-types";
import { ApiError, apiDelete, apiGet, apiPost, apiPut } from "../../lib/api-client";

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
  const [schemas, setSchemas] = useState<Record<ProviderType, ProviderField[]>>({
    openai: [],
    claude: [],
    gemini: [],
    deepseek: [],
    openrouter: [],
    azure_openai: [],
    custom: [],
  });
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
      if (k !== "baseUrl" && k !== "defaultModel" && v.trim()) configJson[k] = v.trim();
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
    <section className="panel">
      <div className="panel__head">
        <h2>供应商</h2>
        {!editing && (
          <button className="btn btn-primary" type="button" onClick={startCreate}>
            + 新增
          </button>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}

      {editing && (
        <form className="provider-form" onSubmit={submit}>
          <h3>{editing.id ? "编辑供应商" : "新增供应商"}</h3>

          <label className="field">
            <span>类型</span>
            <select
              value={form.type}
              onChange={(e) => onTypeChange(e.target.value as ProviderType)}
              disabled={!!editing.id}
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>显示名称</span>
            <input
              type="text"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              required
            />
          </label>

          <label className="field">
            <span>API Key{editing.id ? "（留空则不修改）" : ""}</span>
            <input
              type="password"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder={editing.id ? "••••••••" : "sk-..."}
              required={!editing.id}
              autoComplete="new-password"
            />
          </label>

          {schemas[form.type]?.map((f) => (
            <label className="field" key={f.key}>
              <span>{f.label}</span>
              <input
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
            </label>
          ))}

          <div className="checks">
            <label>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              启用
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.isPublicDefault}
                onChange={(e) => setForm({ ...form, isPublicDefault: e.target.checked })}
              />
              设为公开默认
            </label>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "保存中…" : "保存"}
            </button>
            <button className="btn btn-secondary" type="button" onClick={cancel}>
              取消
            </button>
          </div>
        </form>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>名称</th>
            <th>类型</th>
            <th>模型</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {providers.length === 0 && (
            <tr>
              <td colSpan={5} className="hint">
                暂无供应商，点击「新增」添加。
              </td>
            </tr>
          )}
          {providers.map((p) => (
            <tr key={p.id}>
              <td>{p.displayName}</td>
              <td className="mono">{p.type}</td>
              <td className="mono">{p.defaultModel ?? "—"}</td>
              <td>
                {p.enabled ? (
                  <span className="badge badge-ok">启用</span>
                ) : (
                  <span className="badge">停用</span>
                )}
                {p.isPublicDefault && <span className="badge badge-accent">默认</span>}
              </td>
              <td>
                <button className="link-btn" type="button" onClick={() => startEdit(p)}>
                  编辑
                </button>
                <button className="link-btn danger" type="button" onClick={() => remove(p.id)}>
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
