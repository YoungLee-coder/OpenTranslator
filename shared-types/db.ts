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

/** 一致性问题的严重级别。 */
export type DbAuditSeverity = "error" | "warning";

/** 一项 DB 一致性问题。 */
export interface DbAuditIssue {
  /** 机器码，用于定位修复逻辑。 */
  code: string;
  /** 人类可读标题。 */
  title: string;
  /** 详情。 */
  detail: string;
  severity: DbAuditSeverity;
  /** 是否可自动修复。 */
  repairable: boolean;
  /** 涉及对象标识（providerId 或 setting key），供前端展示。 */
  ref?: string;
}

/** GET /api/admin/db/audit — 一致性检测结果。 */
export interface DbAuditResult {
  issues: DbAuditIssue[];
  /** 是否存在可自动修复项。 */
  hasRepairable: boolean;
}

/** POST /api/admin/db/repair — 修复结果。 */
export interface DbAuditRepairResult {
  ok: boolean;
  /** 本次实际修复的问题 code 列表。 */
  repaired: string[];
  /** 修复后仍残留的问题（不可自动修复或未选中）。 */
  remaining: DbAuditIssue[];
}
