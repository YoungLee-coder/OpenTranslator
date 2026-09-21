import { useState } from "react";
import { useContent } from "@/lib/i18n";
import type { DemoPublicModelRow } from "@/demo-content";
import { CheckIcon } from "../icons";
import { MockInput, MockSwitch } from "../mock-ui";

/** Dashboard → 公开访问: open models, public default, anonymous rate limit. */
export function PublicAccessPanel() {
  const { product } = useContent();
  const d = product.dashboard.publicAccess;
  const [rows, setRows] = useState<DemoPublicModelRow[]>(() =>
    d.rows.map((row) => ({ ...row })),
  );
  const [rateLimit, setRateLimit] = useState("20");
  const [saved, setSaved] = useState(false);

  function setOpen(id: string, next: boolean) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, open: next, isDefault: next && row.isDefault } : row,
      ),
    );
  }

  // Picking a public default also opens that model, mirroring the real app.
  function setDefault(id: string) {
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        isDefault: row.id === id,
        open: row.id === id ? true : row.open,
      })),
    );
  }

  function save() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  return (
    <section className="mock-card-block">
      <div className="mock-card-pad">
        <div className="mock-card-title">{d.cardTitle}</div>
        <p className="mock-card-subtitle">{d.description}</p>

        <div className="mock-section-title">{d.modelsTitle}</div>
        <div className="mock-table mock-table-plain">
          <table>
            <thead>
              <tr>
                <th>{d.providerCol}</th>
                <th>{d.modelCol}</th>
                <th className="mock-col-status">{d.openCol}</th>
                <th className="mock-col-actions">{d.defaultCol}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={row.open ? undefined : "is-off"}>
                  <td>{row.provider}</td>
                  <td>
                    <span className="mock-mono">{row.model}</span>
                  </td>
                  <td className="mock-col-status">
                    <MockSwitch
                      checked={row.open}
                      onChange={(next) => setOpen(row.id, next)}
                      label={`${d.openCol} ${row.model}`}
                    />
                  </td>
                  <td className="mock-col-actions">
                    {row.isDefault ? (
                      <span className="mock-badge">{d.defaultBadge}</span>
                    ) : (
                      <button
                        type="button"
                        className="mock-btn ghost sm"
                        onClick={() => setDefault(row.id)}
                      >
                        {d.setDefault}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mock-hint">{d.hint}</p>

        <div className="mock-inline-row">
          <span className="mock-inline-label">{d.anonRateLimit}</span>
          <MockInput
            value={rateLimit}
            onChange={setRateLimit}
            type="number"
            ariaLabel={d.anonRateLimit}
          />
          <button type="button" className="mock-btn sm" onClick={save}>
            {saved ? <CheckIcon /> : null}
            {saved ? product.ui.savedLabel : d.save}
          </button>
        </div>
        <p className="mock-hint">{d.anonRateLimitDesc}</p>
      </div>
    </section>
  );
}
