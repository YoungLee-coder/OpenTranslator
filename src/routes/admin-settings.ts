import { Hono } from "hono";
import type { PublicModelRef, SiteSettingsUpdate } from "@opentranslator/shared-types";
import type { AppBindings, AppVariables } from "../types";
import { getSiteSettings, updateSetting, clampCacheTtlHours } from "../settings/cache";

function isPublicModelRef(m: unknown): m is PublicModelRef {
  if (typeof m !== "object" || m === null) return false;
  const r = m as Record<string, unknown>;
  return typeof r.providerId === "string" && typeof r.model === "string";
}

const adminSettingsRoute = new Hono<{
  Bindings: AppBindings;
  Variables: AppVariables;
}>();

/** GET /api/admin/settings. */
adminSettingsRoute.get("/", async (c) => {
  const settings = await getSiteSettings(c.env.SETTINGS_KV, c.env.DB);
  return c.json({ settings });
});

/** PUT /api/admin/settings — partial update; busts the KV cache. */
adminSettingsRoute.put("/", async (c) => {
  const body = (await c.req.json().catch(() => null)) as SiteSettingsUpdate | null;
  if (!body) return c.json({ error: "invalid body" }, 400);

  if (body.publicRateLimitPerMinute !== undefined) {
    await updateSetting(
      c.env.SETTINGS_KV,
      c.env.DB,
      "public_rate_limit_per_minute",
      body.publicRateLimitPerMinute,
    );
  }
  if (body.authedRateLimitPerMinute !== undefined) {
    await updateSetting(
      c.env.SETTINGS_KV,
      c.env.DB,
      "authed_rate_limit_per_minute",
      body.authedRateLimitPerMinute,
    );
  }
  if (body.translationCacheEnabled !== undefined) {
    await updateSetting(
      c.env.SETTINGS_KV,
      c.env.DB,
      "translation_cache_enabled",
      body.translationCacheEnabled,
    );
  }
  if (body.translationCacheTtlHours !== undefined) {
    // 夹到合法区间后落库，避免前端或脏数据写入越界值。
    await updateSetting(
      c.env.SETTINGS_KV,
      c.env.DB,
      "translation_cache_ttl_hours",
      clampCacheTtlHours(body.translationCacheTtlHours),
    );
  }
  if (body.publicDefaultProviderId !== undefined) {
    await updateSetting(
      c.env.SETTINGS_KV,
      c.env.DB,
      "public_default_provider_id",
      body.publicDefaultProviderId ?? "",
    );
  }
  // 公开模型白名单：JSON 数组落库；空数组清空。
  if (body.publicModels !== undefined) {
    const arr = Array.isArray(body.publicModels)
      ? body.publicModels.filter(isPublicModelRef)
      : [];
    await updateSetting(
      c.env.SETTINGS_KV,
      c.env.DB,
      "public_models",
      arr.length ? JSON.stringify(arr) : "",
    );
  }
  // 公开默认模型：JSON 对象落库；非法或清空时存空串。
  if (body.publicDefaultModel !== undefined) {
    const m = body.publicDefaultModel;
    await updateSetting(
      c.env.SETTINGS_KV,
      c.env.DB,
      "public_default_model",
      isPublicModelRef(m) ? JSON.stringify(m) : "",
    );
  }

  const settings = await getSiteSettings(c.env.SETTINGS_KV, c.env.DB);
  return c.json({ settings });
});

export default adminSettingsRoute;
