import type { AiExpertsConfig } from "@opentranslator/shared-types";
import { getSiteSettingsMap, setSiteSetting, getFeatureModules } from "../../db/queries";

const CACHE_KEY = "ai-experts:v1";
const SETTING_KEY = "ai_experts_config";
const TTL_SECONDS = 120;

const DEFAULT_CONFIG: AiExpertsConfig = {
  enabledIds: [],
  defaultExpertId: "general",
};

function safeParse(raw: string): AiExpertsConfig {
  try {
    const v = JSON.parse(raw) as Partial<AiExpertsConfig>;
    if (!v || typeof v !== "object") return DEFAULT_CONFIG;
    return {
      enabledIds: Array.isArray(v.enabledIds)
        ? v.enabledIds.filter((id): id is string => typeof id === "string")
        : [],
      defaultExpertId:
        typeof v.defaultExpertId === "string" ? v.defaultExpertId : "general",
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function getAiExpertsConfig(
  kv: KVNamespace,
  db: D1Database,
): Promise<AiExpertsConfig> {
  const cached = await kv.get(CACHE_KEY);
  if (cached) return safeParse(cached);

  const map = await getSiteSettingsMap(db);
  const config = safeParse(map[SETTING_KEY] ?? "");
  void kv.put(CACHE_KEY, JSON.stringify(config), { expirationTtl: TTL_SECONDS });
  return config;
}

export async function saveAiExpertsConfig(
  kv: KVNamespace,
  db: D1Database,
  config: AiExpertsConfig,
): Promise<AiExpertsConfig> {
  await setSiteSetting(db, SETTING_KEY, JSON.stringify(config));
  await kv.delete(CACHE_KEY);
  return config;
}

export async function isAiExpertsFeatureEnabled(db: D1Database): Promise<boolean> {
  const modules = await getFeatureModules(db);
  const row = modules.get("ai-experts");
  return row ? row.enabled === 1 : false;
}

/** Resolve the expert id for a translate request (client override or site default). */
export async function resolveExpertId(
  kv: KVNamespace,
  db: D1Database,
  requestedId: string | undefined,
): Promise<string | null> {
  if (!(await isAiExpertsFeatureEnabled(db))) return null;

  const config = await getAiExpertsConfig(kv, db);
  if (requestedId) {
    if (requestedId === "general") return null;
    if (config.enabledIds.includes(requestedId)) return requestedId;
  }
  const def = config.defaultExpertId;
  if (!def || def === "general") return null;
  if (config.enabledIds.includes(def)) return def;
  return null;
}
