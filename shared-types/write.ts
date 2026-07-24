/** AI Write mode — similar to DeepL Write actions. */
export type WriteMode = "improve" | "style" | "formality" | "shorten";

export type WriteStyle = "simple" | "business" | "academic" | "casual";

export type WriteFormality = "formal" | "informal";

export interface WriteRequest {
  text: string;
  mode: WriteMode;
  /** Required when mode is "style". */
  style?: WriteStyle;
  /** Required when mode is "formality". */
  formality?: WriteFormality;
  stream?: boolean;
  providerId?: string;
  model?: string;
}

export interface WriteUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface WriteResponse {
  revisedText: string;
  provider: string;
  usage?: WriteUsage;
}

/**
 * SSE events emitted by POST /api/write when stream: true.
 * Same framing as translate — JSON in `data:` frames.
 */
export type WriteStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; revisedText: string; provider: string; usage?: WriteUsage }
  | { type: "error"; error: string };
