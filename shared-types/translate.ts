export interface TranslateRequest {
  text: string;
  sourceLang: string; // "auto" for detection
  targetLang: string;
  glossary?: Record<string, string>;
  stream?: boolean;
  providerId?: string; // optional explicit provider; public mode ignores this
  /** 显式指定的模型名；需属于该 provider 声明的 models 集合，否则被拒。 */
  model?: string;
}

/** 首页模型选择下拉里的一项。 */
export interface TranslateModelOption {
  providerId: string;
  model: string;
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
  | { type: "done"; translatedText: string; provider: string; usage?: TranslateUsage; detectedSourceLang?: string }
  | { type: "error"; error: string };
