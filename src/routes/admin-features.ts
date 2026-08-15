import { Hono } from "hono";
import { canAccessFeature } from "@opentranslator/shared-types";
import type { AppBindings, AppVariables } from "../types";
import { featureManifests } from "../features/manifests";
import { getFeatureModules, upsertFeatureModule, setSiteSetting } from "../db/queries";
import { invalidateSiteSettings } from "../settings/cache";

const adminFeaturesRoute = new Hono<{
  Bindings: AppBindings;
  Variables: AppVariables;
}>();

/**
 * GET /api/admin/features — manifests merged with the feature_modules table.
 * The Dashboard builds its nav from this list, so enabling a feature here is
 * all it takes to surface a new module.
 */
adminFeaturesRoute.get("/", async (c) => {
  const user = c.get("user");
  const dbModules = await getFeatureModules(c.env.DB);
  const features = featureManifests
    .map((m) => {
      const row = dbModules.get(m.key);
      return { ...m, enabled: row ? row.enabled === 1 : m.enabled };
    })
    .filter((f) => canAccessFeature(user, f.requiredAccess));
  return c.json({ features });
});

/** PUT /api/admin/features/:key { enabled: boolean } — toggle a feature. */
adminFeaturesRoute.put("/:key", async (c) => {
  const key = c.req.param("key");
  const body = (await c.req.json().catch(() => null)) as { enabled?: boolean } | null;
  if (!body || typeof body.enabled !== "boolean") {
    return c.json({ error: "enabled (boolean) is required" }, 400);
  }
  const manifest = featureManifests.find((m) => m.key === key);
  if (!manifest) return c.json({ error: "unknown feature" }, 404);
  if (!canAccessFeature(c.get("user"), manifest.requiredAccess)) {
    return c.json({ error: "forbidden" }, 403);
  }
  await upsertFeatureModule(c.env.DB, key, body.enabled);
  // 公开访问模块的 enabled 与 site_public 合一：联动写入站点设置并失效缓存。
  if (key === "public-access") {
    await setSiteSetting(c.env.DB, "site_public", String(body.enabled));
    await invalidateSiteSettings(c.env.KV);
  }
  return c.json({ feature: { ...manifest, enabled: body.enabled } });
});

export default adminFeaturesRoute;
