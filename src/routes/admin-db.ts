import { Hono } from "hono";
import type {
  DbAuditRepairResult,
  DbAuditResult,
  DbMigrateResult,
  DbVersionInfo,
} from "@opentranslator/shared-types";
import type { AppBindings, AppVariables } from "../types";
import {
  getCurrentDbVersion,
  getLatestDbVersion,
  getPendingMigrations,
  initDatabase,
} from "../db/init";
import { invalidateSiteSettings } from "../settings/cache";
import { auditDatabase, repairDatabase } from "../db/audit";

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

/** GET /api/admin/db/audit — 只读扫描 DB 一致性问题（公开引用、默认模型、标记冲突等）。 */
adminDbRoute.get("/audit", async (c) => {
  const issues = await auditDatabase(c.env.DB);
  return c.json({
    issues,
    hasRepairable: issues.some((i) => i.repairable),
  } satisfies DbAuditResult);
});

/** POST /api/admin/db/repair — 修复指定 code（缺省=全部可修）并返回残留问题。 */
adminDbRoute.post("/repair", async (c) => {
  const body = (await c.req.json().catch(() => null)) as
    | { codes?: string[] }
    | null;
  const res = await repairDatabase(
    { DB: c.env.DB, SETTINGS_KV: c.env.SETTINGS_KV },
    body?.codes,
  );
  const result: DbAuditRepairResult = {
    ok: true,
    repaired: res.repaired,
    remaining: res.remaining,
  };
  return c.json(result);
});

export default adminDbRoute;
