import { Hono } from "hono";
import type { DbMigrateResult, DbVersionInfo } from "@opentranslator/shared-types";
import type { AppBindings, AppVariables } from "../types";
import {
  getCurrentDbVersion,
  getLatestDbVersion,
  getPendingMigrations,
  initDatabase,
} from "../db/init";
import { invalidateSiteSettings } from "../settings/cache";

const adminDbRoute = new Hono<{
  Bindings: AppBindings;
  Variables: AppVariables;
}>();

function versionInfo(current: string | null): DbVersionInfo {
  const latest = getLatestDbVersion();
  const pending = getPendingMigrations(current);
  return { current, latest, needsUpdate: pending.length > 0, pending };
}

/** GET /api/admin/db/version — 检测当前 DB 版本与待执行迁移（纯读）。 */
adminDbRoute.get("/version", async (c) => {
  const current = await getCurrentDbVersion(c.env.DB);
  return c.json(versionInfo(current));
});

/** POST /api/admin/db/migrate — 执行未应用的迁移并失效 KV 缓存。 */
adminDbRoute.post("/migrate", async (c) => {
  const result = await initDatabase({ env: c.env });
  // 迁移可能改了 site_settings 种子数据/结构，清缓存确保一致
  await invalidateSiteSettings(c.env.SETTINGS_KV);
  const after = await getCurrentDbVersion(c.env.DB);
  const info = versionInfo(after);
  const res: DbMigrateResult = {
    ok: true,
    applied: result.applied,
    current: info.current,
    latest: info.latest,
    needsUpdate: info.needsUpdate,
  };
  return c.json(res);
});

export default adminDbRoute;
