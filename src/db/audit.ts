import type { DbAuditIssue, PublicModelRef, AiExpertsConfig } from "@opentranslator/shared-types";
import {
  clearPublicDefaultFlag,
  deleteFeatureModule,
  deleteSiteSetting,
  getFeatureModules,
  getSiteSettingsMap,
  listProviderRows,
  setSiteSetting,
  updateProvider,
  type ProviderRow,
} from "./queries";
import { prunePublicModelRefs } from "../settings/cache";
import { GENERAL_EXPERT_ID, validExpertIds } from "../experts/registry";

const AI_EXPERTS_SETTING_KEY = "ai_experts_config";
const AI_EXPERTS_KV_CACHE_KEY = "ai-experts:v1";

/**
 * 数据库一致性审计与修复。
 *
 * 站点默认模型（default_model）与公开模型白名单
 * （public_models / public_default_model / public_default_provider_id）是独立存储的
 * 引用快照，删 provider/模型时若未级联清理会残留「幽灵」引用；此外还可能
 * 出现默认模型越界、重复公开默认供应商标记、JSON 损坏、AI 专家配置无效、术语库迁移
 * 残留等问题。本模块做只读体检 + 安全修复。
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

type AiExpertsAuditParse =
  | { ok: false; corrupted: true }
  | { ok: true; config: AiExpertsConfig; rawPresent: boolean };

/** 严格解析 ai_experts_config；损坏时不回落默认值（供审计用）。 */
function parseAiExpertsConfigForAudit(raw: string | undefined): AiExpertsAuditParse {
  if (!raw) {
    return {
      ok: true,
      rawPresent: false,
      config: { enabledIds: [], defaultExpertId: GENERAL_EXPERT_ID },
    };
  }
  try {
    const v = JSON.parse(raw) as Partial<AiExpertsConfig>;
    if (!v || typeof v !== "object") return { ok: false, corrupted: true };
    const enabledIds = Array.isArray(v.enabledIds)
      ? v.enabledIds.filter((id): id is string => typeof id === "string")
      : [];
    const defaultExpertId =
      typeof v.defaultExpertId === "string" ? v.defaultExpertId : GENERAL_EXPERT_ID;
    return { ok: true, rawPresent: true, config: { enabledIds, defaultExpertId } };
  } catch {
    return { ok: false, corrupted: true };
  }
}

function auditAiExpertsAndLegacy(
  settings: Record<string, string>,
  featureModules: Map<string, { key: string; enabled: number }>,
  issues: DbAuditIssue[],
): void {
  const bundled = validExpertIds();

  if (settings.glossary !== undefined) {
    issues.push({
      code: "glossary_setting_stale",
      title: "残留术语库站点设置",
      detail: "site_settings 中仍有 glossary 键（v0.6.0 已移除术语库），将被删除。",
      severity: "warning",
      repairable: true,
      ref: "glossary",
    });
  }

  if (featureModules.has("glossary")) {
    issues.push({
      code: "glossary_module_stale",
      title: "残留术语库功能模块",
      detail: "feature_modules 中仍有 glossary 行（已替换为 ai-experts），将被删除。",
      severity: "warning",
      repairable: true,
      ref: "glossary",
    });
  }

  const parsed = parseAiExpertsConfigForAudit(settings[AI_EXPERTS_SETTING_KEY]);
  if (!parsed.ok) {
    issues.push({
      code: "ai_experts_config_corrupted",
      title: "AI 专家配置损坏",
      detail: "ai_experts_config 无法解析为 JSON，需在控制台 AI 专家页重新保存配置。",
      severity: "warning",
      repairable: false,
      ref: AI_EXPERTS_SETTING_KEY,
    });
    return;
  }

  const { config } = parsed;
  const unknownIds = config.enabledIds.filter((id) => !bundled.has(id));
  if (unknownIds.length > 0) {
    issues.push({
      code: "ai_experts_unknown_ids",
      title: "AI 专家启用列表含未知 id",
      detail: `${unknownIds.length} 个 enabledIds 不在当前内置专家列表中，将被剔除。`,
      severity: "warning",
      repairable: true,
      ref: unknownIds.join(","),
    });
  }

  const validEnabled = config.enabledIds.filter((id) => bundled.has(id));
  const def = config.defaultExpertId ?? GENERAL_EXPERT_ID;
  const defaultUnknown = def !== GENERAL_EXPERT_ID && !bundled.has(def);
  const defaultNotEnabled =
    def !== GENERAL_EXPERT_ID && bundled.has(def) && !validEnabled.includes(def);
  if (defaultUnknown || defaultNotEnabled) {
    issues.push({
      code: "ai_experts_default_invalid",
      title: "AI 专家默认项无效",
      detail: defaultUnknown
        ? `defaultExpertId="${def}" 不是有效专家，将重置为「通用」。`
        : `defaultExpertId="${def}" 未在 enabledIds 中，将重置为「通用」。`,
      severity: "warning",
      repairable: true,
      ref: def,
    });
  }

  const aiExpertsModule = featureModules.get("ai-experts");
  if (aiExpertsModule?.enabled === 1 && validEnabled.length === 0) {
    issues.push({
      code: "ai_experts_enabled_empty",
      title: "AI 专家模块已启用但未开放任何专家",
      detail: "feature_modules.ai-experts 为启用状态，但 enabledIds 为空；翻译页不会出现专家选择。请在 AI 专家页勾选要开放的专家。",
      severity: "warning",
      repairable: false,
      ref: "ai-experts",
    });
  }
}

/** 归一化 ai_experts_config：剔除未知 id、修正 defaultExpertId。 */
function normalizeAiExpertsConfig(config: AiExpertsConfig): AiExpertsConfig {
  const bundled = validExpertIds();
  const enabledIds = config.enabledIds.filter((id) => bundled.has(id));
  let defaultExpertId = config.defaultExpertId ?? GENERAL_EXPERT_ID;
  if (
    defaultExpertId !== GENERAL_EXPERT_ID &&
    (!bundled.has(defaultExpertId) || !enabledIds.includes(defaultExpertId))
  ) {
    defaultExpertId = GENERAL_EXPERT_ID;
  }
  return { enabledIds, defaultExpertId };
}

/** GET /api/admin/db/audit 的纯读扫描。 */
export async function auditDatabase(db: D1Database): Promise<DbAuditIssue[]> {
  const [rows, settings, featureModules] = await Promise.all([
    listProviderRows(db),
    getSiteSettingsMap(db),
    getFeatureModules(db),
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

  const siteDefaultModel = parsePublicModelRef(settings.default_model);
  if (siteDefaultModel && isStaleRef(siteDefaultModel, index)) {
    issues.push({
      code: "default_model_stale",
      title: "站点默认模型失效",
      detail: `站点默认模型指向已删除/禁用的供应商或已移除的模型，将被清空。`,
      severity: "error",
      repairable: true,
      ref: "default_model",
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

  auditAiExpertsAndLegacy(settings, featureModules, issues);

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

    // 任一模型引用 stale → 一次 prune（清站点默认、公开白名单与公开默认）。
    if (
      target.has("public_model_stale") ||
      target.has("public_default_model_stale") ||
      target.has("default_model_stale") ||
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

    if (target.has("glossary_setting_stale")) {
      await deleteSiteSetting(env.DB, "glossary");
    }

    if (target.has("glossary_module_stale")) {
      await deleteFeatureModule(env.DB, "glossary");
    }

    if (target.has("ai_experts_unknown_ids") || target.has("ai_experts_default_invalid")) {
      const settings = await getSiteSettingsMap(env.DB);
      const parsed = parseAiExpertsConfigForAudit(settings[AI_EXPERTS_SETTING_KEY]);
      if (parsed.ok) {
        const next = normalizeAiExpertsConfig(parsed.config);
        await setSiteSetting(env.DB, AI_EXPERTS_SETTING_KEY, JSON.stringify(next));
        await env.SETTINGS_KV.delete(AI_EXPERTS_KV_CACHE_KEY);
      }
    }
  }

  const after = await auditDatabase(env.DB);
  const afterCodes = new Set(after.map((i) => i.code));
  const repaired = [...target].filter((code) => !afterCodes.has(code));
  return { repaired, remaining: after };
}
