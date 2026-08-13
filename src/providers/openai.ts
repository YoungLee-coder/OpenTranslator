import OpenAI from "openai";
import type {
  ProviderContext,
  ProviderType,
  TranslateRequest,
  TranslateResponse,
  TranslationProvider,
} from "@opentranslator/shared-types";
import { normalizeOpenAIBaseURL } from "./base-url";
import { buildPrompt } from "./prompt";
import { openAICompatDisableReasoning } from "./reasoning";
import { streamFromDeltas } from "./sse";

/**
 * OpenAI-compatible chat completions via the official `openai` SDK.
 * `baseUrl` is the SDK root (e.g. https://api.openai.com/v1); the SDK appends
 * /chat/completions. aihubmix / OpenRouter / Cloudflare share the same wire format.
 */

function createClient(
  apiKey: string,
  baseURL: string,
  defaultHeaders?: Record<string, string>,
): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL,
    defaultHeaders,
    // Workers expose global fetch; be explicit for edge runtimes.
    fetch: globalThis.fetch.bind(globalThis),
  });
}

export function makeOpenAICompat(
  name: ProviderType,
  defaultBaseURL: string,
  defaultModel: string,
  extraHeaders?: Record<string, string>,
): TranslationProvider {
  const resolveBaseURL = (ctx: ProviderContext): string => {
    const raw = ctx.baseUrl?.trim() || defaultBaseURL;
    if (!raw) {
      throw new Error(`${name}: baseUrl is required (configure it on the provider)`);
    }
    return normalizeOpenAIBaseURL(raw);
  };

  return {
    name,
    async translate(req: TranslateRequest, ctx: ProviderContext): Promise<TranslateResponse> {
      const baseURL = resolveBaseURL(ctx);
      const model = ctx.defaultModel?.trim() || defaultModel;
      const { system, user } = buildPrompt(req);
      const client = createClient(ctx.apiKey, baseURL, extraHeaders);
      try {
        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          stream: false,
          ...openAICompatDisableReasoning(ctx, name),
        });
        const content = completion.choices[0]?.message?.content ?? "";
        return {
          translatedText: content,
          provider: name,
          usage: completion.usage
            ? {
                inputTokens: completion.usage.prompt_tokens ?? 0,
                outputTokens: completion.usage.completion_tokens ?? 0,
              }
            : undefined,
        };
      } catch (e) {
        throw new Error(`${name}: ${formatSdkError(e)}`);
      }
    },
    translateStream(req: TranslateRequest, ctx: ProviderContext): ReadableStream<Uint8Array> {
      return streamFromDeltas(openaiDeltas(req, ctx, name, resolveBaseURL, defaultModel, extraHeaders));
    },
  };
}

async function* openaiDeltas(
  req: TranslateRequest,
  ctx: ProviderContext,
  name: ProviderType,
  resolveBaseURL: (ctx: ProviderContext) => string,
  defaultModel: string,
  extraHeaders?: Record<string, string>,
): AsyncGenerator<string> {
  const baseURL = resolveBaseURL(ctx);
  const model = ctx.defaultModel?.trim() || defaultModel;
  const { system, user } = buildPrompt(req);
  const client = createClient(ctx.apiKey, baseURL, extraHeaders);
  try {
    const stream = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      stream: true,
      ...openAICompatDisableReasoning(ctx, name),
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  } catch (e) {
    throw new Error(`${name} stream: ${formatSdkError(e)}`);
  }
}

function formatSdkError(e: unknown): string {
  if (e && typeof e === "object" && "status" in e && "message" in e) {
    const err = e as { status?: number; message?: string };
    return `${err.status ?? ""} ${err.message ?? ""}`.trim();
  }
  return e instanceof Error ? e.message : String(e);
}

export const openaiProvider = makeOpenAICompat(
  "openai",
  "https://api.openai.com/v1",
  "gpt-4o-mini",
);
export const aihubmixProvider = makeOpenAICompat(
  "aihubmix",
  "https://aihubmix.com/v1",
  "gpt-4o-mini",
  { "APP-Code": "JFRG5263" },
);
export const openrouterProvider = makeOpenAICompat(
  "openrouter",
  "https://openrouter.ai/api/v1",
  "openai/gpt-4o-mini",
  {
    "HTTP-Referer": "https://github.com/YoungLee-coder/OpenTranslator",
    "X-OpenRouter-Title": "OpenTranslator",
  },
);
