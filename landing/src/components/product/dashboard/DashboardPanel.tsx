import { useEffect, useState } from "react";
import { useContent } from "@/lib/i18n";
import type { DashboardTabId } from "@/content";
import type { DemoModuleRow } from "@/demo-content";
import { useDemoNav } from "../demo-nav";
import { OverviewPanel } from "./OverviewPanel";
import { ProvidersPanel } from "./ProvidersPanel";
import { SettingsPanel } from "./SettingsPanel";
import { PublicAccessPanel } from "./PublicAccessPanel";
import { ExpertsPanel } from "./ExpertsPanel";
import { UsersPanel } from "./UsersPanel";

/** Feature module → the dashboard tab it owns. Disabling it removes the tab. */
const MODULE_TAB: Record<string, DashboardTabId> = {
  "public-access": "public",
  "ai-experts": "experts",
  "multi-user": "users",
};

/** Dashboard tabs + panels — the six the real app renders. Shell lives in AppChrome. */
export function DashboardPanel({ activeTab }: { activeTab: DashboardTabId }) {
  const { product } = useContent();
  const d = product.dashboard;
  const demo = useDemoNav();
  const [modules, setModules] = useState<DemoModuleRow[]>(() =>
    d.modules.rows.map((row) => ({ ...row })),
  );
  const [mounted, setMounted] = useState<ReadonlySet<DashboardTabId>>(
    () => new Set([activeTab]),
  );

  useEffect(() => {
    setMounted((prev) =>
      prev.has(activeTab) ? prev : new Set(prev).add(activeTab),
    );
  }, [activeTab]);

  const disabledTabs = new Set(
    modules.filter((row) => !row.enabled).map((row) => MODULE_TAB[row.id]),
  );
  const tabs = d.tabs.filter((tab) => !disabledTabs.has(tab.id));
  const activeAvailable = tabs.some((tab) => tab.id === activeTab);

  // Turning a module off removes its tab; fall back to the first one.
  useEffect(() => {
    if (!activeAvailable) demo?.openTab("overview");
  }, [activeAvailable, demo]);

  function toggleModule(id: string, next: boolean) {
    setModules((prev) =>
      prev.map((row) => (row.id === id ? { ...row, enabled: next } : row)),
    );
  }

  return (
    <>
      <div className="mock-tabs" role="tablist" aria-label={d.pageTitle}>
        {tabs.map((tab) => {
          const on = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`demo-tab-${tab.id}`}
              aria-selected={on}
              aria-controls={`demo-panel-${tab.id}`}
              className={on ? "on" : undefined}
              onClick={() => demo?.openTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="mock-panel">
        {mounted.has("overview") ? (
          <div
            className="mock-view"
            role="tabpanel"
            id="demo-panel-overview"
            aria-labelledby="demo-tab-overview"
            hidden={activeTab !== "overview"}
          >
            <OverviewPanel />
          </div>
        ) : null}
        {mounted.has("providers") ? (
          <div
            className="mock-view"
            role="tabpanel"
            id="demo-panel-providers"
            aria-labelledby="demo-tab-providers"
            hidden={activeTab !== "providers"}
          >
            <ProvidersPanel />
          </div>
        ) : null}
        {mounted.has("settings") ? (
          <div
            className="mock-view"
            role="tabpanel"
            id="demo-panel-settings"
            aria-labelledby="demo-tab-settings"
            hidden={activeTab !== "settings"}
          >
            <SettingsPanel modules={modules} onToggleModule={toggleModule} />
          </div>
        ) : null}
        {mounted.has("public") ? (
          <div
            className="mock-view"
            role="tabpanel"
            id="demo-panel-public"
            aria-labelledby="demo-tab-public"
            hidden={activeTab !== "public"}
          >
            <PublicAccessPanel />
          </div>
        ) : null}
        {mounted.has("experts") ? (
          <div
            className="mock-view"
            role="tabpanel"
            id="demo-panel-experts"
            aria-labelledby="demo-tab-experts"
            hidden={activeTab !== "experts"}
          >
            <ExpertsPanel />
          </div>
        ) : null}
        {mounted.has("users") ? (
          <div
            className="mock-view"
            role="tabpanel"
            id="demo-panel-users"
            aria-labelledby="demo-tab-users"
            hidden={activeTab !== "users"}
          >
            <UsersPanel />
          </div>
        ) : null}
      </div>
    </>
  );
}
