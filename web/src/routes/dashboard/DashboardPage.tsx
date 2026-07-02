import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import type { FeatureManifest } from "@opentranslator/shared-types";
import { useAuth } from "@/lib/auth";
import { apiGet } from "@/lib/api-client";
import { featureComponents } from "@/features/registry";
import { OverviewSection } from "./OverviewSection";
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

const SYSTEM_TABS: SystemTab[] = [
  { key: "overview", name: "概览" },
  { key: "providers", name: "供应商" },
  { key: "settings", name: "设置" },
];

export function DashboardPage() {
  const { user, loading } = useAuth();
  const [features, setFeatures] = useState<FeatureManifest[]>([]);
  const [tab, setTab] = useState<string>("overview");

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

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        加载中…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const enabledFeatures = features.filter((f) => f.enabled);
  const tabs: SystemTab[] = [
    ...SYSTEM_TABS,
    ...enabledFeatures.map((f) => ({ key: f.key, name: f.name })),
  ];
  const activeFeature = featureComponents[tab];
  const isSystemTab = SYSTEM_TABS.some((t) => t.key === tab);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        控制台
      </h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <OverviewSection />
        </TabsContent>
        <TabsContent value="providers">
          <ProvidersSection />
        </TabsContent>
        <TabsContent value="settings">
          <div className="flex flex-col gap-6">
            <SettingsSection />
            <ModulesSection features={features} onChanged={refreshFeatures} />
            <DbVersionSection />
            <DbAuditSection />
          </div>
        </TabsContent>
        {!isSystemTab && activeFeature
          ? (() => {
              const FeaturePage = activeFeature;
              return (
                <TabsContent value={tab}>
                  <FeaturePage />
                </TabsContent>
              );
            })()
          : null}
      </Tabs>
    </div>
  );
}
