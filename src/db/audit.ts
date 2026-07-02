import type { DbAuditIssue, PublicModelRef } from "@opentranslator/shared-types";
import {
  clearPublicDefaultFlag,
  getSiteSettingsMap,
  listProviderRows,
  updateProvider,
  type ProviderRow,
} from "./queries";
import { prunePublicModelRefs } from "../settings/cache";

/**
 * 数据库一致性审计与修复。
 *
 * 公开模型白名单（public_models / public_default_model / public_default_provider_id）
 * 是独立存储的引用快照，删 provider/模型时若未级联清理会残留「幽灵」引用；此外还可能
 * 出现默认模型越界、重复公开默认供应商标记、JSON 损坏等问题。本模块做只读体检 + 安全修复。
 *
 * 关键约束（见 plan）：
 * - 读原始行：用 listProviderRows + getSiteSettingsMap 直接 parse，不用 listProviderRecords
 *   /getSiteSettings（它们会吞掉损坏 JSON、后者还走 KV 缓存）。
 * - staleness 含「已禁用」；models 为空时回落 [default_model] 作为允许集合（镜像
 *   handler.ts 的 parseAllowedModels），避免误报。
 */

interface ProviderIndexEntry {
  row: ProviderRow;
  enabled: boolean;
  /** 声明的模型集合；models 为空且 default_model 存在时回落 [default_model]。损坏时为 null。 */
  modelsSet: Set<string> | null;
  /** 原始顺序的模型数组（用于修复时取首项）；损坏时为 null。 */
  modelsArray: string[] | null;
  modelsCorrupted: boolean;
  configCorrupted: boolean;
}

function isPublicModelRef(m: unknown): m is PublicModelRef {
  if (typeof m !== "object" || m === null) return false;
  const r = m as Record<string, unknown>;
  return typeof r.providerId === "string" && typeof r.model === "string";
}

function parsePublicModelRefs(raw: string | undefined): PublicModelRef[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.filter(isPublicModelRef);
  } catch {
    // ignore corrupted
  }
  return [];
}

function parsePublicModelRef(raw: string | undefined): PublicModelRef | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isPublicModelRef(parsed)) return parsed;
  } catch {
    // ignore corrupted
  }
  return null;
}

/** 解析 provider.models；损坏返回 { array: null, set: null, corrupted: true }。 */
function parseModelsField(raw: string | null): {
  array: string[] | null;
  set: Set<string> | null;
  corrupted: boolean;
} {
  if (!raw) return { array: null, set: null, corrupted: false };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const arr = parsed.filter((m): m is string => typeof m === "string");
      return { array: arr, set: new Set(arr), corrupted: false };
    }
    return { array: null, set: null, corrupted: true };
  } catch {
    return { array: null, set: null, corrupted: true };
  }
}

function isConfigCorrupted(raw: string | null): boolean {
  if (!raw) return false;
  try {
    JSON.parse(raw);
    return false;
  } catch {
    return true;
  }
}

function buildProviderIndex(rows: ProviderRow[]): Map<string, ProviderIndexEntry> {
  const index = new Map<string, ProviderIndexEntry>();
  for (const row of rows) {
    const { array, set, corrupted } = parseModelsField(row.models);
    // models 为空（但未损坏）且 default_model 存在时，回落 [default_model] 作为允许集合。
    let modelsSet = set;
    let modelsArray = array;
    if (!corrupted && (modelsSet === null || modelsSet.size === 0) && row.default_model) {
      modelsSet = new Set([row.default_model]);
      modelsArray = [row.default_model];
    }
    index.set(row.id, {
      row,
      enabled: row.enabled === 1,
      modelsSet,
      modelsArray,
      modelsCorrupted: corrupted,
      configCorrupted: isConfigCorrupted(row.config_json),
    });
  }
  return index;
}

/** 公开模型引用是否失效：provider 不存在/禁用，或 model 不在声明集合内。 */
function isStaleRef(
  ref: PublicModelRef,
  index: Map<string, ProviderIndexEntry>,
): boolean {
  const entry = index.get(ref.providerId);
  if (!entry || !entry.enabled) return true;
  // modelsSet===null（损坏）时不据 model 判定，交由 provider_models_corrupted 单独报告。
  if (entry.modelsSet !== null && !entry.modelsSet.has(ref.model)) return true;
  return false;
}

/** 公开默认 provider id 是否失效：provider 不存在或禁用。 */
function isStaleProviderId(
  pid: string,
  index: Map<string, ProviderIndexEntry>,
): boolean {
  const entry = index.get(pid);
  return !entry || !entry.enabled;
}

/** GET /api/admin/db/audit 的纯读扫描。 */
export async function auditDatabase(db: D1Database): Promise<DbAuditIssue[]> {
  const [rows, settings] = await Promise.all([
    listProviderRows(db),
    getSiteSettingsMap(db),
  ]);
  const index = buildProviderIndex(rows);
  const issues: DbAuditIssue[] = [];

  // --- provider 级 ---
  for (const entry of index.values()) {
    const row = entry.row;
    if (entry.modelsCorrupted) {
      issues.push({
        code: "provider_models_corrupted",
        title: "供应商 models 字段损坏",
        detail: `models 值无法解析为字符串数组，需在供应商管理页重新填写。`,
        severity: "warning",
        repairable: false,
        ref: row.id,
      });
    }
    if (entry.configCorrupted) {
      issues.push({
        code: "provider_config_corrupted",
        title: "供应商 configJson 损坏",
        detail: `config_json 无法解析为 JSON，需在供应商管理页重新填写。`,
        severity: "warning",
        repairable: false,
        ref: row.id,
      });
    }
    // 默认模型越界：models 可解析且 default_model 非空却不在集合内。
    if (
      !entry.modelsCorrupted &&
      row.default_model &&
      entry.modelsSet !== null &&
      !entry.modelsSet.has(row.default_model)
    ) {
      issues.push({
        code: "provider_default_model_out_of_range",
        title: "默认模型不在声明集合内",
        detail: `default_model="${row.default_model}" 不在该供应商的 models 集合内，将重置为首项。`,
        severity: "error",
        repairable: true,
        ref: row.id,
      });
    }
  }

  // 多个公开默认供应商
  const flagged = rows.filter((r) => r.is_public_default === 1);
  if (flagged.length > 1) {
    issues.push({
      code: "multiple_public_default_providers",
      title: "存在多个公开默认供应商",
      detail: `${flagged.length} 个供应商标记了 is_public_default，将保留最早且启用的一个。`,
      severity: "warning",
      repairable: true,
      ref: flagged.map((r) => r.id).join(","),
    });
  }

  // --- 公开设置级 ---
  const publicModels = parsePublicModelRefs(settings.public_models);
  const staleCount = publicModels.filter((m) => isStaleRef(m, index)).length;
  if (staleCount > 0) {
    issues.push({
      code: "public_model_stale",
      title: "公开模型白名单含失效引用",
      detail: `${staleCount} 个公开模型引用指向已删除/禁用的供应商或已移除的模型，将被剔除。`,
      severity: "error",
      repairable: true,
      ref: "public_models",
    });
  }

  const publicDefaultModel = parsePublicModelRef(settings.public_default_model);
  if (publicDefaultModel && isStaleRef(publicDefaultModel, index)) {
    issues.push({
      code: "public_default_model_stale",
      title: "公开默认模型失效",
      detail: `公开默认模型指向已删除/禁用的供应商或已移除的模型，将被清空。`,
      severity: "error",
      repairable: true,
      ref: "public_default_model",
    });
  }

  const publicDefaultProviderId = settings.public_default_provider_id;
  if (publicDefaultProviderId && isStaleProviderId(publicDefaultProviderId, index)) {
    issues.push({
      code: "public_default_provider_stale",
      title: "公开默认供应商失效",
      detail: `public_default_provider_id 指向已删除/禁用的供应商，将被清空。`,
      severity: "warning",
      repairable: true,
      ref: "public_default_provider_id",
    });
  }

  return issues;
}

/** POST /api/admin/db/repair — 修复指定 code（缺省=全部可修），返回残留问题。 */
export async function repairDatabase(
  env: { DB: D1Database; SETTINGS_KV: KVNamespace },
  codes?: string[],
): Promise<{ repaired: string[]; remaining: DbAuditIssue[] }> {
  const before = await auditDatabase(env.DB);
  const allRepairable = before.filter((i) => i.repairable).map((i) => i.code);
  // 缺省=全部可修；传入则只取其中确实可修的 code。
  const target = new Set(
    codes?.length ? codes.filter((c) => allRepairable.includes(c)) : allRepairable,
  );

  if (target.size > 0) {
    const rows = await listProviderRows(env.DB);
    const index = buildProviderIndex(rows);

    // 任一 public_*_stale → 一次 prune（两个 predicate 都传，清三项设置）。
    if (
      target.has("public_model_stale") ||
      target.has("public_default_model_stale") ||
      target.has("public_default_provider_stale")
    ) {
      await prunePublicModelRefs(
        env.SETTINGS_KV,
        env.DB,
        (r) => isStaleRef(r, index),
        (pid) => isStaleProviderId(pid, index),
      );
    }

    // 默认模型越界 → 重置为 models 首项（跳过 models 损坏者）。
    if (target.has("provider_default_model_out_of_range")) {
      for (const entry of index.values()) {
        const row = entry.row;
        if (entry.modelsCorrupted) continue;
        if (
          row.default_model &&
          entry.modelsSet !== null &&
          !entry.modelsSet.has(row.default_model)
        ) {
          const nextDefault = entry.modelsArray?.[0] ?? null;
          await updateProvider(env.DB, row.id, { default_model: nextDefault });
        }
      }
    }

    // 多个公开默认供应商 → 全清后保留最早且 enabled 的。
    if (target.has("multiple_public_default_providers")) {
      const flagged = rows
        .filter((r) => r.is_public_default === 1)
        .sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));
      await clearPublicDefaultFlag(env.DB);
      const keeper = flagged.find((r) => r.enabled === 1);
      if (keeper) {
        await updateProvider(env.DB, keeper.id, { is_public_default: 1 });
      }
    }
  }

  const after = await auditDatabase(env.DB);
  const afterCodes = new Set(after.map((i) => i.code));
  const repaired = [...target].filter((code) => !afterCodes.has(code));
  return { repaired, remaining: after };
}
