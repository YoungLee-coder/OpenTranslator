/** Max source characters accepted by POST /api/translate. */
export const MAX_TRANSLATE_CHARS = 80_000;
/** Above this length, server splits into chunks (LLM providers). */
export const TRANSLATE_CHUNK_THRESHOLD = 3_500;
/** DeepL tolerates longer single requests — higher threshold. */
export const DEEPL_CHUNK_THRESHOLD = 20_000;
/** Target size per chunk when splitting. */
export const TRANSLATE_TARGET_CHUNK_CHARS = 2_000;
/** Characters of previous chunk kept for terminology continuity. */
export const TRANSLATE_CONTEXT_TAIL_CHARS = 300;

export interface TranslateRequest {
  text: string;
  sourceLang: string; // "auto" for detection
  targetLang: string;
  /** AI expert id from Immersive Translate prompts; "general" or omitted = default prompt. */
  expertId?: string;
  stream?: boolean;
  providerId?: string; // optional explicit provider; public mode ignores this
  /** 显式指定的模型名；需属于该 provider 声明的 models 集合，否则被拒。 */
  model?: string;
  /**
   * Server-side only — bypasses default translation prompt building.
   * Ignored on the public translate API when sent by clients.
   */
  promptOverride?: { system: string; user: string };
  /**
   * Server-side only — previous chunk tails for long-text continuity.
   * Stripped when sent by clients.
   */
  previousContext?: { sourceTail: string; translationTail: string };
}

/** 首页模型选择下拉里的一项。 */
export interface TranslateModelOption {
  providerId: string;
  /** API 请求用的模型值（如 DeepL 的 prefer_quality_optimized）。 */
  model: string;
  /** 界面展示名；select 型 schema 有 label 时与 model 不同。 */
  modelLabel: string;
  providerName: string;
}

/** GET /api/translate/models 返回体：当前用户可选的模型与默认项。 */
export interface TranslateModelsResponse {
  models: TranslateModelOption[];
  default: { providerId: string; model: string } | null;
}

export interface TranslateUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface TranslateResponse {
  translatedText: string;
  detectedSourceLang?: string;
  provider: string;
  usage?: TranslateUsage;
}

/**
 * SSE events emitted by POST /api/translate?stream=true.
 * Each event is JSON-encoded and wrapped as an SSE `data:` frame.
 */
export type TranslateStreamEvent =
  | { type: "delta"; text: string }
  | {
      type: "progress";
      chunkIndex: number;
      chunkTotal: number;
    }
  | { type: "done"; translatedText: string; provider: string; usage?: TranslateUsage; detectedSourceLang?: string }
  | { type: "error"; error: string };
