import { Hono } from "hono";
import type { FeatureManifest } from "@opentranslator/shared-types";
import type { AppBindings, AppVariables } from "../types";
import { publicAccessManifest } from "../features/public-access/manifest";
import { glossaryManifest } from "../features/glossary/manifest";
import { getFeatureModules, upsertFeatureModule, setSiteSetting } from "../db/queries";
import { invalidateSiteSettings } from "../settings/cache";

const adminFeaturesRoute = new Hono<{
  Bindings: AppBindings;
  Variables: AppVariables;
}>();

/** Static manifests declared by each feature's manifest.ts. */
const manifests: FeatureManifest[] = [publicAccessManifest, glossaryManifest];

/**
 * GET /api/admin/features — manifests merged with the feature_modules table.
 * The Dashboard builds its nav from this list, so enabling a feature here is
 * all it takes to surface a new module.
 */
adminFeaturesRoute.get("/", async (c) => {
  const dbModules = await getFeatureModules(c.env.DB);
  const features = manifests.map((m) => {
    const row = dbModules.get(m.key);
    return { ...m, enabled: row ? row.enabled === 1 : m.enabled };
  });
  return c.json({ features });
});

/** PUT /api/admin/features/:key { enabled: boolean } — toggle a feature. */
adminFeaturesRoute.put("/:key", async (c) => {
  const key = c.req.param("key");
  const body = (await c.req.json().catch(() => null)) as { enabled?: boolean } | null;
  if (!body || typeof body.enabled !== "boolean") {
    return c.json({ error: "enabled (boolean) is required" }, 400);
  }
  const manifest = manifests.find((m) => m.key === key);
  if (!manifest) return c.json({ error: "unknown feature" }, 404);
  await upsertFeatureModule(c.env.DB, key, body.enabled);
  // 公开访问模块的 enabled 与 site_public 合一：联动写入站点设置并失效缓存。
  if (key === "public-access") {
    await setSiteSetting(c.env.DB, "site_public", String(body.enabled));
    await invalidateSiteSettings(c.env.SETTINGS_KV);
  }
  return c.json({ feature: { ...manifest, enabled: body.enabled } });
});

export default adminFeaturesRoute;
