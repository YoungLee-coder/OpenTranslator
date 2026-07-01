import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import type { FeatureManifest } from "@opentranslator/shared-types";
import { useAuth } from "../../lib/auth";
import { apiGet } from "../../lib/api-client";
import { featureComponents } from "../../features/registry";
import { OverviewSection } from "./OverviewSection";
import { ProvidersSection } from "./ProvidersSection";
import { SettingsSection } from "./SettingsSection";
import { ModulesSection } from "./ModulesSection";

interface SystemTab {
  key: string;
  name: string;
}

const SYSTEM_TABS: SystemTab[] = [
  { key: "overview", name: "概览" },
  { key: "providers", name: "供应商" },
  { key: "modules", name: "模块" },
  { key: "settings", name: "设置" },
];

export function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const [features, setFeatures] = useState<FeatureManifest[]>([]);
  const [tab, setTab] = useState<string>("overview");

  async function refreshFeatures() {
    try {
      const res = await apiGet<{ features: FeatureManifest[] }>("/api/admin/features");
      setFeatures(res.features);
    } catch {
      // non-fatal: nav falls back to system tabs only
    }
  }

  useEffect(() => {
    void refreshFeatures();
  }, []);

  if (loading) return <div className="page">加载中…</div>;
  if (!user) return <Navigate to="/login" replace />;

  const enabledFeatures = features.filter((f) => f.enabled);
  const tabs: SystemTab[] = [
    ...SYSTEM_TABS,
    ...enabledFeatures.map((f) => ({ key: f.key, name: f.name })),
  ];
  const activeFeature = featureComponents[tab];
  const isSystemTab = SYSTEM_TABS.some((t) => t.key === tab);

  return (
    <div className="page dashboard">
      <div className="dashboard__head">
        <h1>控制台</h1>
        <div className="dashboard__user">
          <span>{user.email}</span>
          <button className="link-btn" onClick={() => void logout()} type="button">
            退出
          </button>
        </div>
      </div>

      <nav className="tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "tab active" : "tab"}
            onClick={() => setTab(t.key)}
            type="button"
          >
            {t.name}
          </button>
        ))}
      </nav>

      <div className="dashboard__body">
        {isSystemTab && tab === "overview" && <OverviewSection />}
        {isSystemTab && tab === "providers" && <ProvidersSection />}
        {isSystemTab && tab === "modules" && (
          <ModulesSection features={features} onChanged={refreshFeatures} />
        )}
        {isSystemTab && tab === "settings" && <SettingsSection />}
        {!isSystemTab && activeFeature && (() => {
          const FeaturePage = activeFeature;
          return <FeaturePage />;
        })()}
      </div>
    </div>
  );
}
