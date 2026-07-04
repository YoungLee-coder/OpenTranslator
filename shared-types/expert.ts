/** Public metadata for an AI translation expert (Immersive Translate prompt plugin). */
export interface AiExpertMeta {
  id: string;
  version: string;
  name: string;
  description: string;
  avatar?: string;
  author?: string;
  homepage?: string;
  i18n?: Record<string, { name?: string; description?: string; details?: string }>;
}

/** Site-wide AI experts configuration stored in site_settings. */
export interface AiExpertsConfig {
  /** Expert ids enabled for end users. Empty = feature effectively off for selection. */
  enabledIds: string[];
  /** Default expert id; null or "general" uses the built-in generic prompt. */
  defaultExpertId: string | null;
}

/** GET /api/admin/experts */
export interface AiExpertsAdminResponse {
  experts: AiExpertMeta[];
  config: AiExpertsConfig;
}

/** GET /api/translate/experts — enabled experts for the translator UI. */
export interface AiExpertsPublicResponse {
  experts: AiExpertMeta[];
  defaultExpertId: string | null;
}
