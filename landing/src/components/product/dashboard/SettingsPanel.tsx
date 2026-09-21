import { useState } from "react";
import { useContent } from "@/lib/i18n";
import type { DemoModuleRow } from "@/demo-content";
import { CheckIcon } from "../icons";
import { MockInput, MockSwitch } from "../mock-ui";

type SettingsPanelProps = {
  modules: readonly DemoModuleRow[];
  onToggleModule: (id: string, next: boolean) => void;
};

/** Dashboard → 设置: site switches plus the feature-module table. */
export function SettingsPanel({ modules, onToggleModule }: SettingsPanelProps) {
  const { product } = useContent();
  const s = product.dashboard.settings;
  const m = product.dashboard.modules;
  const [rateLimit, setRateLimit] = useState("60");
  const [cache, setCache] = useState(true);
  const [ttl, setTtl] = useState("720");
  const [organize, setOrganize] = useState(false);
  const [reasoning, setReasoning] = useState(false);
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  return (
    <div className="mock-stack">
      <section className="mock-card-block">
        <div className="mock-card-head">
          <strong>{s.cardTitle}</strong>
        </div>
        <div className="mock-settings">
          <div className="mock-settings-row">
            <span className="mock-settings-text">
              <span className="mock-settings-title">{s.authedRateLimit.label}</span>
              <span className="mock-settings-desc">{s.authedRateLimit.description}</span>
            </span>
            <MockInput
              value={rateLimit}
              onChange={setRateLimit}
              type="number"
              ariaLabel={s.authedRateLimit.label}
            />
          </div>
          <div className="mock-settings-row">
            <span className="mock-settings-text">
              <span className="mock-settings-title">{s.translationCache.label}</span>
              <span className="mock-settings-desc">{s.translationCache.description}</span>
            </span>
            <MockSwitch
              checked={cache}
              onChange={setCache}
              label={s.translationCache.label}
            />
          </div>
          <div className={cache ? "mock-settings-row" : "mock-settings-row is-disabled"}>
            <span className="mock-settings-text">
              <span className="mock-settings-title">{s.cacheTtl.label}</span>
              <span className="mock-settings-desc">{s.cacheTtl.description}</span>
            </span>
            <MockInput
              value={ttl}
              onChange={setTtl}
              type="number"
              ariaLabel={s.cacheTtl.label}
              min={1}
              max={720}
            />
          </div>
          <div className="mock-settings-row">
            <span className="mock-settings-text">
              <span className="mock-settings-title">{s.organizeFormat.label}</span>
              <span className="mock-settings-desc">{s.organizeFormat.description}</span>
            </span>
            <MockSwitch
              checked={organize}
              onChange={setOrganize}
              label={s.organizeFormat.label}
            />
          </div>
          <div className="mock-settings-row">
            <span className="mock-settings-text">
              <span className="mock-settings-title">{s.disableReasoning.label}</span>
              <span className="mock-settings-desc">{s.disableReasoning.description}</span>
            </span>
            <MockSwitch
              checked={reasoning}
              onChange={setReasoning}
              label={s.disableReasoning.label}
            />
          </div>
        </div>
        <div className="mock-card-foot">
          <button type="button" className="mock-btn sm" onClick={save}>
            {saved ? <CheckIcon /> : null}
            {saved ? product.ui.savedLabel : s.save}
          </button>
        </div>
      </section>

      <section className="mock-card-block">
        <div className="mock-card-head">
          <strong>{m.cardTitle}</strong>
        </div>
        <div className="mock-table mock-table-plain">
          <table>
            <thead>
              <tr>
                <th>{m.moduleCol}</th>
                <th>{m.descCol}</th>
                <th className="mock-col-status">{m.statusCol}</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((row) => (
                <tr key={row.id} className={row.enabled ? undefined : "is-off"}>
                  <td className="mock-cell-strong">{row.name}</td>
                  <td className="mock-cell-desc">{row.description}</td>
                  <td className="mock-col-status">
                    <span className="mock-status">
                      <MockSwitch
                        checked={row.enabled}
                        onChange={(next) => onToggleModule(row.id, next)}
                        label={row.name}
                      />
                      {row.enabled ? m.enabled : m.disabled}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
