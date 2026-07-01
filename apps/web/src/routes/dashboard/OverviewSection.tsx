import { useEffect, useState } from "react";
import type { UsageSummary } from "@opentranslator/shared-types";
import { apiGet } from "../../lib/api-client";
import { ApiError } from "../../lib/api-client";

export function OverviewSection() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await apiGet<{ usage: UsageSummary }>("/api/admin/usage");
      setUsage(res.usage);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="panel">
      <h2>用量概览</h2>
      {error && <p className="error-text">{error}</p>}
      {usage ? (
        <div className="stat-grid">
          <div className="stat">
            <div className="stat__value">{usage.totalRequests}</div>
            <div className="stat__label">总请求数</div>
          </div>
          <div className="stat">
            <div className="stat__value">{usage.totalChars.toLocaleString()}</div>
            <div className="stat__label">总字符数</div>
          </div>
        </div>
      ) : (
        !error && <p className="hint">加载中…</p>
      )}

      {usage && usage.byProvider.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>供应商</th>
              <th>请求数</th>
              <th>字符数</th>
            </tr>
          </thead>
          <tbody>
            {usage.byProvider.map((p) => (
              <tr key={p.providerId}>
                <td className="mono">{p.providerId.slice(0, 8)}</td>
                <td>{p.requests}</td>
                <td>{p.chars.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
