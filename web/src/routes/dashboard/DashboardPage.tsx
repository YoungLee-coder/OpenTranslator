import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import type { FeatureManifest } from "@opentranslator/shared-types";
import { useAuth } from "@/lib/auth";
import { apiGet } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n";
import { featureComponents } from "@/features/registry";
import { OverviewSection } from "./OverviewSection";
import { ProfileSection } from "./ProfileSection";
import { ProvidersSection } from "./ProvidersSection";
import { SettingsSection } from "./SettingsSection";
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

  const systemTabs: SystemTab[] = [
    { key: "overview", name: t("dashboard.tabOverview") },
    { key: "providers", name: t("dashboard.tabProviders") },
    { key: "settings", name: t("dashboard.tabSettings") },
  ];
  const [features, setFeatures] = useState<FeatureManifest[]>([]);
  const [tab, setTab] = useState<string>("overview");
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(
    () => new Set(["overview"]),
  );

  async function refreshFeatures() {
    try {
      const res = await apiGet<{ features: FeatureManifest[] }>(
        "/api/admin/features",
      );
      setFeatures(res.features);
    } catch {
      // non-fatal: nav falls back to system tabs only
    }
  }

  useEffect(() => {
    void refreshFeatures();
  }, []);

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

  const enabledFeatures = features.filter((f) => f.enabled);
  const featureTabs = enabledFeatures.filter((f) => featureComponents[f.key]);
  const tabs: SystemTab[] = [
    ...systemTabs,
    ...featureTabs.map((f) => ({ key: f.key, name: f.name })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        {t("dashboard.title")}
      </h1>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" {...keepMounted(visitedTabs.has("overview"))}>
          <div className="flex flex-col gap-6">
            <OverviewSection />
            <ProfileSection />
          </div>
        </TabsContent>
        <TabsContent value="providers" {...keepMounted(visitedTabs.has("providers"))}>
          <ProvidersSection />
        </TabsContent>
        <TabsContent value="settings" {...keepMounted(visitedTabs.has("settings"))}>
          <div className="flex flex-col gap-6">
            <SettingsSection />
            <ModulesSection features={features} onChanged={refreshFeatures} />
            <DbVersionSection />
            <DbAuditSection />
          </div>
        </TabsContent>
        {enabledFeatures.map((f) => {
          const FeaturePage = featureComponents[f.key];
          if (!FeaturePage) return null;
          return (
            <TabsContent
              key={f.key}
              value={f.key}
              {...keepMounted(visitedTabs.has(f.key))}
            >
              <FeaturePage />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
