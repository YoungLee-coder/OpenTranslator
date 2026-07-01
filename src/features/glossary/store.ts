import type { GlossaryTerm } from "@opentranslator/shared-types";
import { getSiteSettingsMap, setSiteSetting } from "../../db/queries";

/**
 * Site-wide glossary stored as JSON under the `glossary` site_setting, with a
 * KV cache so the translate hot path doesn't hit D1 on every request.
 * This is the reference plugin: a self-contained feature module with its own
 * store + admin route + translate-handler integration.
 */

const CACHE_KEY = "glossary:v1";
const TTL_SECONDS = 120;

function safeParse(raw: string): GlossaryTerm[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as GlossaryTerm[]) : [];
  } catch {
    return [];
  }
}

export async function getGlossary(
  kv: KVNamespace,
  db: D1Database,
): Promise<GlossaryTerm[]> {
  const cached = await kv.get(CACHE_KEY);
  if (cached) {
    const parsed = safeParse(cached);
    if (parsed.length > 0 || cached === "[]") return parsed;
  }
  const map = await getSiteSettingsMap(db);
  const terms = safeParse(map["glossary"] ?? "");
  void kv.put(CACHE_KEY, JSON.stringify(terms), { expirationTtl: TTL_SECONDS });
  return terms;
}

export async function saveGlossary(
  kv: KVNamespace,
  db: D1Database,
  terms: GlossaryTerm[],
): Promise<GlossaryTerm[]> {
  await setSiteSetting(db, "glossary", JSON.stringify(terms));
  await kv.delete(CACHE_KEY);
  return terms;
}

/** Build a source->target map for the terms matching a target language. */
export async function getGlossaryForTarget(
  kv: KVNamespace,
  db: D1Database,
  targetLang: string,
): Promise<Record<string, string>> {
  const terms = await getGlossary(kv, db);
  const map: Record<string, string> = {};
  for (const t of terms) {
    if (t.targetLang === targetLang) map[t.source] = t.target;
  }
  return map;
}
