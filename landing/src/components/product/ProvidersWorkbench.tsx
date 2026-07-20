import { useState } from "react";
import { useContent } from "@/lib/i18n";
import type { GallerySlideId } from "@/content";
import { AppChrome } from "./AppChrome";
import { useGalleryNav } from "./gallery-nav";

const SLIDE_TABS = new Set<string>(["overview", "providers"]);

/** Interactive providers table — mirrors web ProvidersSection. */
export function ProvidersWorkbench() {
  const data = useContent().product.providers;
  const galleryNav = useGalleryNav();
  const [rows, setRows] = useState(() =>
    data.rows.map((row) => ({ ...row })),
  );
  const [flashAdd, setFlashAdd] = useState(false);

  function onTab(id: string) {
    if (!SLIDE_TABS.has(id)) return;
    galleryNav?.goTo(id as GallerySlideId);
  }

  function toggleEnabled(name: string) {
    setRows((prev) =>
      prev.map((row) =>
        row.name === name ? { ...row, enabled: !row.enabled } : row,
      ),
    );
  }

  function onAdd() {
    setFlashAdd(true);
    window.setTimeout(() => setFlashAdd(false), 900);
  }

  return (
    <AppChrome active="dashboard" title={data.pageTitle}>
      <div className="mock-card">
        <div className="mock-tabs" role="tablist">
          {data.tabs.map((tab) => {
            const linked = SLIDE_TABS.has(tab.id);
            const on = tab.id === "providers";
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={on}
                className={on ? "on" : undefined}
                disabled={!linked}
                onClick={() => onTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        <div className="mock-card-head">
          <strong>{data.heading}</strong>
          <button
            type="button"
            className={flashAdd ? "mock-btn sm is-flash" : "mock-btn sm"}
            onClick={onAdd}
          >
            {data.addLabel}
          </button>
        </div>
        <div className="mock-dash mock-dash-flush">
          <div className="mock-table">
            <table>
              <thead>
                <tr>
                  <th>{data.nameCol}</th>
                  <th>{data.typeCol}</th>
                  <th>{data.modelCol}</th>
                  <th>{data.statusCol}</th>
                  <th>{data.actionsCol}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.name} className={row.enabled ? undefined : "is-off"}>
                    <td>{row.name}</td>
                    <td>{row.type}</td>
                    <td>
                      <span className="mock-mono">{row.model}</span>
                    </td>
                    <td>
                      <span className="mock-status">
                        <button
                          type="button"
                          className={
                            row.enabled ? "mock-toggle" : "mock-toggle off"
                          }
                          aria-pressed={row.enabled}
                          aria-label={`${row.name} ${data.statusCol}`}
                          onClick={() => toggleEnabled(row.name)}
                        />
                        {row.isDefault ? (
                          <span className="mock-badge">{data.defaultBadge}</span>
                        ) : null}
                      </span>
                    </td>
                    <td>
                      <span className="mock-row-actions">
                        <button type="button" className="mock-foot-action">
                          {data.editLabel}
                        </button>
                        <button type="button" className="mock-foot-action danger">
                          {data.deleteLabel}
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppChrome>
  );
}
