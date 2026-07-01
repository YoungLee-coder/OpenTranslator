export interface TranslateRequest {
  text: string;
  sourceLang: string; // "auto" for detection
  targetLang: string;
  glossary?: Record<string, string>;
  stream?: boolean;
  providerId?: string; // optional explicit provider; public mode ignores this
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
