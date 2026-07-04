import type { AiExpertMeta } from "@opentranslator/shared-types";

export interface AiExpertLangOverride {
  id: string;
  systemPrompt?: string;
  multipleSystemPrompt?: string;
  prompt?: string;
  multiplePrompt?: string;
  subtitlePrompt?: string;
}

/** Full expert definition parsed from Immersive Translate YAML plugins. */
export interface AiExpertDefinition extends AiExpertMeta {
  details?: string;
  env: Record<string, string>;
  systemPrompt?: string;
  multipleSystemPrompt?: string;
  prompt?: string;
  multiplePrompt?: string;
  langOverrides: AiExpertLangOverride[];
}

export interface ResolvedExpertPrompts {
  system: string;
  user: string;
  /** When set, parse model output as YAML and extract this field. */
  outputField?: string;
  usesYamlOutput: boolean;
}
