import type { AiExpertMeta } from "@opentranslator/shared-types";
import { bundledExperts } from "./bundled";
import type { AiExpertDefinition } from "./types";

const byId = new Map<string, AiExpertDefinition>(
  bundledExperts.map((e) => [e.id, e]),
);

export function listAllExperts(): AiExpertDefinition[] {
  return bundledExperts;
}

export function getExpert(id: string): AiExpertDefinition | undefined {
  return byId.get(id);
}

export function toExpertMeta(expert: AiExpertDefinition, locale = "zh-CN"): AiExpertMeta {
  const i18n = expert.i18n?.[locale];
  return {
    id: expert.id,
    version: expert.version,
    name: i18n?.name ?? expert.name,
    description: i18n?.description ?? expert.description,
    avatar: expert.avatar,
    author: expert.author,
    homepage: expert.homepage,
    i18n: expert.i18n,
  };
}

export function listExpertMeta(ids?: string[], locale = "zh-CN"): AiExpertMeta[] {
  const source = ids
    ? ids.map((id) => byId.get(id)).filter((e): e is AiExpertDefinition => !!e)
    : bundledExperts;
  return source.map((e) => toExpertMeta(e, locale));
}

/** Built-in generic expert — no specialized prompt. */
export const GENERAL_EXPERT_ID = "general";

export function isGeneralExpert(id: string | null | undefined): boolean {
  return !id || id === GENERAL_EXPERT_ID;
}

export function validExpertIds(): Set<string> {
  return new Set(bundledExperts.map((e) => e.id));
}
