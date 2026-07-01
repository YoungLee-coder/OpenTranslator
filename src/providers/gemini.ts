import type {
  ProviderContext,
  TranslateRequest,
  TranslateResponse,
  TranslationProvider,
} from "@opentranslator/shared-types";
import { buildPrompt } from "./prompt";
import { parseSSEEvents, safeText, streamFromDeltas } from "./sse";

/**
 * Google Gemini generateContent / streamGenerateContent (alt=sse) adapter.
 * API key is passed as a query param.
 */

interface GeminiPart {
  text?: string;
}
interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
const DEFAULT_MODEL = "gemini-2.0-flash";

function base(ctx: ProviderContext): string {
  return (ctx.baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function modelOf(ctx: ProviderContext): string {
  return ctx.defaultModel?.trim() || DEFAULT_MODEL;
}

function body(system: string, user: string) {
  return {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
  };
}

function extractText(data: GeminiResponse): string {
  return (
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? ""
  );
}

export const geminiProvider: TranslationProvider = {
  name: "gemini",
  async translate(req, ctx): Promise<TranslateResponse> {
    const { system, user } = buildPrompt(req);
    const url = `${base(ctx)}/v1beta/models/${modelOf(ctx)}:generateContent?key=${ctx.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body(system, user)),
    });
    if (!res.ok) throw new Error(`gemini: ${res.status} ${await safeText(res)}`);
    const data = (await res.json()) as GeminiResponse;
    return {
      translatedText: extractText(data),
      provider: "gemini",
      usage: data.usageMetadata
        ? {
            inputTokens: data.usageMetadata.promptTokenCount ?? 0,
            outputTokens: data.usageMetadata.candidatesTokenCount ?? 0,
          }
        : undefined,
    };
  },
  translateStream(req, ctx): ReadableStream<Uint8Array> {
    return streamFromDeltas(geminiDeltas(req, ctx));
  },
};

async function* geminiDeltas(req: TranslateRequest, ctx: ProviderContext): AsyncGenerator<string> {
  const { system, user } = buildPrompt(req);
  const url = `${base(ctx)}/v1beta/models/${modelOf(ctx)}:streamGenerateContent?alt=sse&key=${ctx.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body(system, user)),
  });
  if (!res.ok || !res.body) {
    throw new Error(`gemini stream: ${res.status} ${await safeText(res)}`);
  }
  for await (const chunk of parseSSEEvents(res.body)) {
    const t = extractText(chunk as GeminiResponse);
    if (t) yield t;
  }
}
