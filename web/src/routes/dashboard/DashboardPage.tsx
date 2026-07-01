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
import { Button } from "@/components/ui/button";
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
  { key: "modules", name: "模块" },
  { key: "settings", name: "设置" },
];

export function DashboardPage() {
  const { user, loading, logout } = useAuth();
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">控制台</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="hidden sm:inline">{user.email}</span>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => void logout()}
          >
            退出
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="max-w-full overflow-x-auto">
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
        <TabsContent value="modules">
          <ModulesSection features={features} onChanged={refreshFeatures} />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsSection />
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
