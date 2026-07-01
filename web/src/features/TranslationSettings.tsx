import { useEffect, useState } from "react";
import type { ProviderRecord } from "@opentranslator/shared-types";
import { ApiError, apiGet, apiPut } from "../lib/api-client";

/** Translate feature admin page: pick which enabled provider serves public use. */
export function TranslationSettings() {
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await apiGet<{ providers: ProviderRecord[] }>("/api/admin/providers");
      setProviders(res.providers.filter((p) => p.enabled));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function setDefault(id: string) {
    setSavingId(id);
    try {
      await apiPut(`/api/admin/providers/${id}`, { isPublicDefault: true });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="panel">
      <h2>翻译设置</h2>
      <p className="row__desc" style={{ marginTop: 0 }}>
        选择对外公开访问时默认使用的供应商。匿名访客的翻译请求会路由到此供应商。
      </p>
      {error && <p className="error-text">{error}</p>}
      {providers.length === 0 ? (
        <p className="hint">暂无已启用的供应商，请先在「供应商」中添加。</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>名称</th>
              <th>类型</th>
              <th>模型</th>
              <th>公开默认</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr key={p.id}>
                <td>{p.displayName}</td>
                <td className="mono">{p.type}</td>
                <td className="mono">{p.defaultModel ?? "—"}</td>
                <td>
                  <input
                    type="radio"
                    name="public-default"
                    checked={p.isPublicDefault}
                    onChange={() => void setDefault(p.id)}
                    disabled={savingId !== null}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
