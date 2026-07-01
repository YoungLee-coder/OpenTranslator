import type {
  ProviderContext,
  ProviderType,
  TranslateRequest,
  TranslateResponse,
  TranslationProvider,
} from "@opentranslator/shared-types";
import { buildPrompt } from "./prompt";
import { parseSSEEvents, streamFromDeltas, safeText } from "./sse";

/**
 * OpenAI-compatible chat completions adapter. DeepSeek, OpenRouter and custom
 * OpenAI-compatible endpoints reuse the same wire format with different
 * defaults — add a line here (or call makeOpenAICompat) to support another
 * OpenAI-compatible vendor.
 */

interface OpenAIChoice {
  delta?: { content?: string };
  message?: { content?: string };
}
interface OpenAIResponse {
  choices?: OpenAIChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

function endpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/chat/completions`;
}

function authHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

function chatBody(model: string, system: string, user: string, stream: boolean) {
  const body: Record<string, unknown> = {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    stream,
  };
  if (model) body.model = model;
  return body;
}

export function makeOpenAICompat(
  name: ProviderType,
  defaultBaseUrl: string,
  defaultModel: string,
): TranslationProvider {
  const resolveBaseUrl = (ctx: ProviderContext): string => {
    const baseUrl = ctx.baseUrl?.trim() || defaultBaseUrl;
    if (!baseUrl) {
      throw new Error(`${name}: baseUrl is required (configure it on the provider)`);
    }
    return baseUrl;
  };
  return {
    name,
    async translate(req: TranslateRequest, ctx: ProviderContext): Promise<TranslateResponse> {
      const baseUrl = resolveBaseUrl(ctx);
      const model = ctx.defaultModel?.trim() || defaultModel;
      const { system, user } = buildPrompt(req);
      const res = await fetch(endpoint(baseUrl), {
        method: "POST",
        headers: authHeaders(ctx.apiKey),
        body: JSON.stringify(chatBody(model, system, user, false)),
      });
      if (!res.ok) throw new Error(`${name}: ${res.status} ${await safeText(res)}`);
      const data = (await res.json()) as OpenAIResponse;
      const content = data.choices?.[0]?.message?.content ?? "";
      return {
        translatedText: content,
        provider: name,
        usage: data.usage
          ? {
              inputTokens: data.usage.prompt_tokens ?? 0,
              outputTokens: data.usage.completion_tokens ?? 0,
            }
          : undefined,
      };
    },
    translateStream(req: TranslateRequest, ctx: ProviderContext): ReadableStream<Uint8Array> {
      return streamFromDeltas(
        openaiDeltas(req, ctx, name, defaultBaseUrl, defaultModel, resolveBaseUrl),
      );
    },
  };
}

async function* openaiDeltas(
  req: TranslateRequest,
  ctx: ProviderContext,
  name: ProviderType,
  defaultBaseUrl: string,
  defaultModel: string,
  resolveBaseUrl: (ctx: ProviderContext) => string,
): AsyncGenerator<string> {
  const baseUrl = resolveBaseUrl(ctx);
  const model = ctx.defaultModel?.trim() || defaultModel;
  const { system, user } = buildPrompt(req);
  const res = await fetch(endpoint(baseUrl), {
    method: "POST",
    headers: authHeaders(ctx.apiKey),
    body: JSON.stringify(chatBody(model, system, user, true)),
  });
  if (!res.ok || !res.body) {
    throw new Error(`${name} stream: ${res.status} ${await safeText(res)}`);
  }
  for await (const chunk of parseSSEEvents(res.body)) {
    const c = chunk as OpenAIResponse;
    const delta = c.choices?.[0]?.delta?.content;
    if (delta) yield delta;
  }
}

export const openaiProvider = makeOpenAICompat(
  "openai",
  "https://api.openai.com/v1",
  "gpt-4o-mini",
);
export const deepseekProvider = makeOpenAICompat(
  "deepseek",
  "https://api.deepseek.com",
  "deepseek-chat",
);
export const openrouterProvider = makeOpenAICompat(
  "openrouter",
  "https://openrouter.ai/api/v1",
  "openrouter/auto",
);
export const aihubmixProvider = makeOpenAICompat(
  "aihubmix",
  "https://aihubmix.com/v1",
  "gpt-4o-mini",
);
// Generic OpenAI-compatible endpoint — baseUrl is required on the provider row.
export const customProvider = makeOpenAICompat("custom", "", "");
