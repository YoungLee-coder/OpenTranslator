import { GoogleGenAI } from "@google/genai/web";
import type {
  ProviderContext,
  TranslateRequest,
  TranslateResponse,
  TranslationProvider,
} from "@opentranslator/shared-types";
import { normalizeGeminiBaseURL } from "./base-url";
import { buildPrompt } from "./prompt";
import { streamFromDeltas } from "./sse";

/**
 * Google Gemini via the official `@google/genai` web build (Workers-safe).
 * `baseUrl` matches SDK `httpOptions.baseUrl`
 * (e.g. https://generativelanguage.googleapis.com).
 */

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
const DEFAULT_MODEL = "gemini-2.0-flash";

function createClient(ctx: ProviderContext): GoogleGenAI {
  const baseUrl = normalizeGeminiBaseURL(ctx.baseUrl?.trim() || DEFAULT_BASE_URL);
  return new GoogleGenAI({
    apiKey: ctx.apiKey,
    httpOptions: { baseUrl },
  });
}

function modelOf(ctx: ProviderContext): string {
  return ctx.defaultModel?.trim() || DEFAULT_MODEL;
}

function formatSdkError(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export const geminiProvider: TranslationProvider = {
  name: "gemini",
  async translate(req, ctx): Promise<TranslateResponse> {
    const { system, user } = buildPrompt(req);
    const ai = createClient(ctx);
    try {
      const response = await ai.models.generateContent({
        model: modelOf(ctx),
        contents: user,
        config: {
          systemInstruction: system,
        },
      });
      return {
        translatedText: response.text ?? "",
        provider: "gemini",
        usage: response.usageMetadata
          ? {
              inputTokens: response.usageMetadata.promptTokenCount ?? 0,
              outputTokens: response.usageMetadata.candidatesTokenCount ?? 0,
            }
          : undefined,
      };
    } catch (e) {
      throw new Error(`gemini: ${formatSdkError(e)}`);
    }
  },
  translateStream(req, ctx): ReadableStream<Uint8Array> {
    return streamFromDeltas(geminiDeltas(req, ctx));
  },
};

async function* geminiDeltas(req: TranslateRequest, ctx: ProviderContext): AsyncGenerator<string> {
  const { system, user } = buildPrompt(req);
  const ai = createClient(ctx);
  try {
    const stream = await ai.models.generateContentStream({
      model: modelOf(ctx),
      contents: user,
      config: {
        systemInstruction: system,
      },
    });
    for await (const chunk of stream) {
      const t = chunk.text;
      if (t) yield t;
    }
  } catch (e) {
    throw new Error(`gemini stream: ${formatSdkError(e)}`);
  }
}
