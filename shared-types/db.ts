/** GET /api/admin/db/version — 检测 DB 版本与待执行迁移。 */
export interface DbVersionInfo {
  /** DB 已执行到的版本（代码迁移链中、_migrations 表里最靠后的已应用版本）。 */
  current: string | null;
  /** 代码定义的最新版本。 */
  latest: string | null;
  /** 是否存在待执行迁移。 */
  needsUpdate: boolean;
  /** 待执行版本列表。 */
  pending: string[];
}

/** POST /api/admin/db/migrate — 执行迁移后的结果。 */
export interface DbMigrateResult {
  ok: boolean;
  /** 本次实际执行的迁移版本。 */
  applied: string[];
  current: string | null;
  latest: string | null;
  needsUpdate: boolean;
}
