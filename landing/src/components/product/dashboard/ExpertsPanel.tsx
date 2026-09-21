import { useState } from "react";
import { useContent } from "@/lib/i18n";
import { CheckIcon } from "../icons";
import { MockSelect, MockSwitch } from "../mock-ui";

/** Dashboard → AI 专家: site default expert plus the enable grid. */
export function ExpertsPanel() {
  const { product } = useContent();
  const d = product.dashboard.experts;
  const [enabled, setEnabled] = useState<ReadonlySet<string>>(
    () => new Set(d.rows.slice(0, 6).map((row) => row.id)),
  );
  const [defaultExpert, setDefaultExpert] = useState("");
  const [saved, setSaved] = useState(false);

  const defaultOptions = [
    { value: "", label: d.generalDefault },
    ...d.rows
      .filter((row) => enabled.has(row.id))
      .map((row) => ({ value: row.id, label: row.name })),
  ];

  function toggle(id: string, next: boolean) {
    setEnabled((prev) => {
      const set = new Set(prev);
      if (next) set.add(id);
      else set.delete(id);
      return set;
    });
    if (!next && defaultExpert === id) setDefaultExpert("");
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

        <div className="mock-inline-row mock-inline-bar">
          <span className="mock-inline-label">{d.defaultLabel}</span>
          <MockSelect
            value={defaultExpert}
            options={defaultOptions}
            onChange={setDefaultExpert}
            label={d.defaultLabel}
            className="mock-select-wide"
          />
          <button type="button" className="mock-btn sm" onClick={save}>
            {saved ? <CheckIcon /> : null}
            {saved ? product.ui.savedLabel : d.save}
          </button>
        </div>

        <div className="mock-expert-grid">
          {d.rows.map((row) => {
            const on = enabled.has(row.id);
            return (
              <div
                key={row.id}
                className={on ? "mock-expert-card is-on" : "mock-expert-card"}
              >
                <span className="mock-expert-avatar" aria-hidden>
                  {row.name.slice(0, 1)}
                </span>
                <div className="mock-expert-text">
                  <span className="mock-expert-name">{row.name}</span>
                  <span className="mock-expert-desc">{row.description}</span>
                </div>
                <MockSwitch
                  checked={on}
                  onChange={(next) => toggle(row.id, next)}
                  label={row.name}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
