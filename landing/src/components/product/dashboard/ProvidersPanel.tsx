import { useState } from "react";
import { useContent } from "@/lib/i18n";
import type { DemoProviderRow, ProviderTypeId } from "@/demo-content";
import { CheckIcon, PencilIcon, PlusIcon, ServerIcon, TrashIcon } from "../icons";
import { MockField, MockInput, MockSelect, MockSwitch, type MockOption } from "../mock-ui";

type Draft = {
  /** null → creating a new provider. */
  id: string | null;
  name: string;
  type: ProviderTypeId;
  apiKey: string;
  models: string;
  enabled: boolean;
};

const TYPE_IDS: readonly ProviderTypeId[] = [
  "openai",
  "claude",
  "gemini",
  "deepseek",
  "aihubmix",
  "openrouter",
  "cloudflare",
  "deepl",
  "custom",
];

function modelKey(rowId: string, model: string) {
  return `${rowId}::${model}`;
}

/** Dashboard → 供应商: default-model picker, CRUD table, inline editor. */
export function ProvidersPanel() {
  const { product } = useContent();
  const d = product.dashboard.providers;
  const [rows, setRows] = useState<DemoProviderRow[]>(() =>
    d.rows.map((row) => ({ ...row })),
  );
  const [draft, setDraft] = useState<Draft | null>(null);
  const [defaultModel, setDefaultModel] = useState(() => {
    const first = d.rows.find((row) => row.isDefault);
    return first ? modelKey(first.id, first.models[0] ?? "") : "";
  });

  const typeOptions: MockOption[] = TYPE_IDS.map((id) => ({
    value: id,
    label: d.types[id],
  }));

  const modelOptions: MockOption[] = rows
    .filter((row) => row.enabled)
    .flatMap((row) =>
      row.models.map((model) => ({
        value: modelKey(row.id, model),
        label: `${row.name} · ${model}`,
      })),
    );

  function startAdd() {
    setDraft({
      id: null,
      name: "",
      type: "openai",
      apiKey: "",
      models: "",
      enabled: true,
    });
  }

  function startEdit(row: DemoProviderRow) {
    setDraft({
      id: row.id,
      name: row.name,
      type: row.type,
      apiKey: "",
      models: row.models.join("\n"),
      enabled: row.enabled,
    });
  }

  function toggle(id: string, next: boolean) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, enabled: next } : row)),
    );
  }

  function remove(row: DemoProviderRow) {
    setRows((prev) => prev.filter((item) => item.id !== row.id));
    setDefaultModel((prev) =>
      prev.startsWith(`${row.id}::`) || prev === "" ? "" : prev,
    );
    if (draft?.id === row.id) setDraft(null);
  }

  function saveDraft() {
    if (!draft) return;
    const models = draft.models
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (draft.id === null) {
      const id = `p-new-${rows.length + 1}`;
      setRows((prev) => [
        ...prev,
        {
          id,
          name: draft.name.trim() || d.types[draft.type],
          type: draft.type,
          models: models.length > 0 ? models : ["gpt-4.1-mini"],
          enabled: draft.enabled,
        },
      ]);
    } else {
      const id = draft.id;
      setRows((prev) =>
        prev.map((row) =>
          row.id === id
            ? {
                ...row,
                name: draft.name.trim() || row.name,
                type: draft.type,
                models: models.length > 0 ? models : row.models,
                enabled: draft.enabled,
              }
            : row,
        ),
      );
    }
    setDraft(null);
  }

  return (
    <div className="mock-stack">
      {draft ? (
        <section className="mock-card-block mock-editor">
          <div className="mock-card-head">
            <strong>{draft.id === null ? d.addTitle : d.editTitle}</strong>
          </div>
          <div className="mock-card-pad">
            <MockField label={d.formName}>
              <MockInput
                value={draft.name}
                onChange={(value) => setDraft({ ...draft, name: value })}
                ariaLabel={d.formName}
              />
            </MockField>
            <div className="mock-field-row">
              <MockField label={d.typeCol}>
                <MockSelect
                  value={draft.type}
                  options={typeOptions}
                  onChange={(value) =>
                    setDraft({ ...draft, type: value as ProviderTypeId })
                  }
                  label={d.typeCol}
                />
              </MockField>
              <MockField label={d.formKey}>
                <MockInput
                  value={draft.apiKey}
                  onChange={(value) => setDraft({ ...draft, apiKey: value })}
                  type="password"
                  ariaLabel={d.formKey}
                  placeholder="sk-…"
                />
              </MockField>
            </div>
            <MockField label={d.formModel} hint={d.formModelHint}>
              <textarea
                className="mock-input mock-textarea"
                value={draft.models}
                aria-label={d.formModel}
                onChange={(e) => setDraft({ ...draft, models: e.target.value })}
              />
            </MockField>
            <div className="mock-switch-row">
              <span className="mock-switch-title">{d.formEnabled}</span>
              <MockSwitch
                checked={draft.enabled}
                onChange={(next) => setDraft({ ...draft, enabled: next })}
                label={d.formEnabled}
              />
            </div>
            <div className="mock-form-actions">
              <button
                type="button"
                className="mock-btn ghost sm"
                onClick={() => setDraft(null)}
              >
                {d.cancel}
              </button>
              <button type="button" className="mock-btn sm" onClick={saveDraft}>
                <CheckIcon />
                {d.save}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mock-card-block">
        <div className="mock-card-head">
          <strong>{d.cardTitle}</strong>
          <button type="button" className="mock-btn sm" onClick={startAdd}>
            <PlusIcon />
            {d.addLabel}
          </button>
        </div>
        {rows.length === 0 ? (
          <div className="mock-empty">
            <span className="mock-empty-icon">
              <ServerIcon />
            </span>
            <p>{d.empty}</p>
          </div>
        ) : (
          <>
            <div className="mock-inline-row">
              <span className="mock-inline-label">{d.defaultModelLabel}</span>
              <MockSelect
                value={defaultModel}
                options={[
                  { value: "", label: "—" },
                  ...modelOptions,
                ]}
                onChange={setDefaultModel}
                label={d.defaultModelLabel}
                className="mock-select-wide"
              />
            </div>
            <div className="mock-table mock-table-plain">
              <table>
                <thead>
                  <tr>
                    <th>{d.nameCol}</th>
                    <th>{d.typeCol}</th>
                    <th>{d.modelCol}</th>
                    <th>{d.statusCol}</th>
                    <th className="mock-col-actions">{d.actionsCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className={row.enabled ? undefined : "is-off"}>
                      <td className="mock-cell-strong">{row.name}</td>
                      <td>
                        <span className="mock-provider">
                          <span className={`mock-dot mock-dot-${row.type}`} aria-hidden />
                          {d.types[row.type]}
                        </span>
                      </td>
                      <td>
                        <span className="mock-mono">{row.models.join("、")}</span>
                      </td>
                      <td>
                        <MockSwitch
                          checked={row.enabled}
                          onChange={(next) => toggle(row.id, next)}
                          label={`${row.name} ${d.statusCol}`}
                        />
                      </td>
                      <td className="mock-col-actions">
                        <span className="mock-row-actions">
                          <button
                            type="button"
                            className="mock-foot-action"
                            onClick={() => startEdit(row)}
                          >
                            <PencilIcon />
                            {d.editLabel}
                          </button>
                          <button
                            type="button"
                            className="mock-foot-action danger"
                            onClick={() => remove(row)}
                          >
                            <TrashIcon />
                            {d.deleteLabel}
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
