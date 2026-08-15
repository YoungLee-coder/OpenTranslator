import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import type { FeatureManifest } from "@opentranslator/shared-types";
import { canAccessFeature, hasPermission, isAdminRole } from "@opentranslator/shared-types";
import { useAuth } from "@/lib/auth";
import { apiGet } from "@/lib/api-client";
import { clearDashboardCaches } from "@/lib/dashboard-caches";
import { useTranslation } from "@/lib/i18n";
import { featureComponents } from "@/features/registry";
import { OverviewSection } from "./OverviewSection";
import { ProfileSection } from "./ProfileSection";
import { ProvidersSection } from "./ProvidersSection";
import { SettingsSection } from "./SettingsSection";
import { DataBackupSection } from "./DataBackupSection";
import { ModulesSection } from "./ModulesSection";
import { DbVersionSection } from "./DbVersionSection";
import { DbAuditSection } from "./DbAuditSection";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface SystemTab {
  key: string;
  name: string;
}

function keepMounted(visited: boolean) {
  return visited ? ({ forceMount: true } as const) : {};
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  const [features, setFeatures] = useState<FeatureManifest[]>([]);
  const [tab, setTab] = useState<string>("overview");
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    () => new Set(["overview"]),
  );
  const [configEpoch, setConfigEpoch] = useState(0);

  async function refreshFeatures() {
    if (!hasPermission(user, "settings")) {
      setFeatures([]);
      return;
    }
    try {
      const res = await apiGet<{ features: FeatureManifest[] }>(
        "/api/admin/features",
      );
      setFeatures(res.features);
    } catch {
      // non-fatal: nav falls back to system tabs only
    }
  }

  async function handleDataImported() {
    clearDashboardCaches();
    setConfigEpoch((n) => n + 1);
    await refreshFeatures();
  }

  useEffect(() => {
    if (loading) return;
    void refreshFeatures();
  }, [loading, user]);

  function handleTabChange(value: string) {
    setTab(value);
    setVisitedTabs((prev) => {
      if (prev.has(value)) return prev;
      return new Set(prev).add(value);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {t("common.loading")}
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const canUsage = hasPermission(user, "usage");
  const canProviders = hasPermission(user, "providers");
  const canSettings = hasPermission(user, "settings");
  const isAdmin = isAdminRole(user.role);

  const systemTabs: SystemTab[] = [
    { key: "overview", name: t("dashboard.tabOverview") },
    ...(canProviders ? [{ key: "providers", name: t("dashboard.tabProviders") }] : []),
    ...(canSettings ? [{ key: "settings", name: t("dashboard.tabSettings") }] : []),
  ];

  const enabledFeatures = features.filter((f) => f.enabled);
  const featureTabs = enabledFeatures.filter((f) => {
    if (!featureComponents[f.key]) return false;
    return canAccessFeature(user, f.requiredAccess);
  });
  const tabs: SystemTab[] = [
    ...systemTabs,
    ...featureTabs.map((f) => ({ key: f.key, name: f.name })),
  ];
  const tabKeys = new Set(tabs.map((item) => item.key));
  const activeTab = tabKeys.has(tab) ? tab : (tabs[0]?.key ?? "overview");
  const visibleFeatureKeys = new Set(featureTabs.map((f) => f.key));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        {t("dashboard.title")}
      </h1>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 sm:mx-0 sm:px-0">
          <TabsList className="min-w-max">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" {...keepMounted(visitedTabs.has("overview"))}>
          <div className="flex flex-col gap-6">
            {canUsage ? <OverviewSection key={`overview-${configEpoch}`} /> : null}
            <ProfileSection />
          </div>
        </TabsContent>
        {canProviders ? (
          <TabsContent value="providers" {...keepMounted(visitedTabs.has("providers"))}>
            <ProvidersSection key={`providers-${configEpoch}`} />
          </TabsContent>
        ) : null}
        {canSettings ? (
          <TabsContent value="settings" {...keepMounted(visitedTabs.has("settings"))}>
            <div className="flex flex-col gap-6">
              <SettingsSection key={`settings-${configEpoch}`} />
              {isAdmin ? (
                <DataBackupSection onImported={handleDataImported} />
              ) : null}
              <ModulesSection
                key={`modules-${configEpoch}`}
                features={features}
                onChanged={refreshFeatures}
              />
              {isAdmin ? <DbVersionSection /> : null}
              {isAdmin ? <DbAuditSection /> : null}
            </div>
          </TabsContent>
        ) : null}
        {enabledFeatures.map((f) => {
          if (!visibleFeatureKeys.has(f.key)) return null;
          const FeaturePage = featureComponents[f.key];
          if (!FeaturePage) return null;
          return (
            <TabsContent
              key={f.key}
              value={f.key}
              {...keepMounted(visitedTabs.has(f.key))}
            >
              <FeaturePage key={`${f.key}-${configEpoch}`} />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
