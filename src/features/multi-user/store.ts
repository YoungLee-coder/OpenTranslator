import { getFeatureModules } from "../../db/queries";

export const MULTI_USER_FEATURE_KEY = "multi-user";

/** 单实例账号上限（含管理员）。 */
export const MAX_USERS = 20;

export async function isMultiUserFeatureEnabled(db: D1Database): Promise<boolean> {
  const modules = await getFeatureModules(db);
  const row = modules.get(MULTI_USER_FEATURE_KEY);
  return row ? row.enabled === 1 : false;
}
