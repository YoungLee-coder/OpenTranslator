import type { FeatureManifest } from "@opentranslator/shared-types";
import { apiPut } from "../../lib/api-client";

interface Props {
  features: FeatureManifest[];
  onChanged: () => Promise<void>;
}

/** Modules (system) tab: enable/disable feature modules — drives the dynamic nav. */
export function ModulesSection({ features, onChanged }: Props) {
  async function toggle(key: string, enabled: boolean) {
    try {
      await apiPut(`/api/admin/features/${key}`, { enabled: !enabled });
    } catch {
      // ignore — refresh reflects server truth either way
    }
    await onChanged();
  }

  return (
    <section className="panel">
      <h2>功能模块</h2>
      <p className="row__desc" style={{ marginTop: 0 }}>
        启用的模块会出现在控制台导航中。新增模块只需在后端注册 manifest + 前端注册组件。
      </p>
      <table className="table">
        <thead>
          <tr>
            <th>模块</th>
            <th>说明</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {features.map((f) => (
            <tr key={f.key}>
              <td>{f.name}</td>
              <td className="row__desc">{f.description ?? "—"}</td>
              <td>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={f.enabled}
                    onChange={() => void toggle(f.key, f.enabled)}
                  />
                  <span>{f.enabled ? "已启用" : "已停用"}</span>
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
