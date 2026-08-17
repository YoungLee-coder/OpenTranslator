import { HTTPClient } from "@openrouter/sdk/lib/http.js";
import { Chat } from "@openrouter/sdk/sdk/chat.js";
import type {
  ProviderContext,
  TranslateRequest,
  TranslateResponse,
  TranslationProvider,
} from "@opentranslator/shared-types";
import { normalizeOpenAIBaseURL } from "./base-url";
import { buildPrompt } from "./prompt";
import { isReasoningDisableRejected, openrouterDisableReasoning } from "./reasoning";
import { streamFromDeltas } from "./sse";

/**
 * OpenRouter Chat Completions via the official `@openrouter/sdk`.
 * Native client fields (`httpReferer`, `appTitle`, `serverURL`) map to
 * HTTP-Referer / X-OpenRouter-Title. Uses the Chat client rather than the
 * full `OpenRouter` facade so unused Speakeasy resources stay out of the
 * Worker bundle.
 *
 * @see https://openrouter.ai/docs/quickstart#using-the-openrouter-api
 */

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

/** App URL for OpenRouter rankings (HTTP-Referer). */
export const OPENROUTER_HTTP_REFERER = "https://github.com/YoungLee-coder/OpenTranslator";
/** App display name (X-OpenRouter-Title). */
export const OPENROUTER_APP_TITLE = "OpenTranslator";

function resolveBaseURL(ctx: ProviderContext): string {
  const raw = ctx.baseUrl?.trim() || DEFAULT_BASE_URL;
  if (!raw) {
    throw new Error("openrouter: baseUrl is required (configure it on the provider)");
  }
  return normalizeOpenAIBaseURL(raw);
}

function modelOf(ctx: ProviderContext): string {
  return ctx.defaultModel?.trim() || DEFAULT_MODEL;
}

function chatRequest(
  model: string,
  system: string,
  user: string,
  stream: boolean,
  ctx: ProviderContext,
) {
  return {
    model,
    messages: [
      { role: "system" as const, content: system },
      { role: "user" as const, content: user },
    ],
    stream,
    ...openrouterDisableReasoning(ctx),
  };
}

async function sendChat(
  client: Chat,
  model: string,
  system: string,
  user: string,
  stream: boolean,
  ctx: ProviderContext,
) {
  try {
    return await client.send({
      chatRequest: chatRequest(model, system, user, stream, ctx),
    });
  } catch (e) {
    if (!ctx.disableModelReasoning || !isReasoningDisableRejected(e)) throw e;
    return await client.send({
      chatRequest: chatRequest(model, system, user, stream, {
        ...ctx,
        disableModelReasoning: false,
      }),
    });
  }
}

function createClient(apiKey: string, serverURL: string): Chat {
  return new Chat({
    apiKey,
    serverURL,
    httpReferer: OPENROUTER_HTTP_REFERER,
    appTitle: OPENROUTER_APP_TITLE,
    // SDK default backoff retries 5XX for up to an hour — not viable on Workers.
    retryConfig: { strategy: "none" },
    httpClient: new HTTPClient({
      fetcher: globalThis.fetch.bind(globalThis),
    }),
  });
}

function formatSdkError(e: unknown): string {
  if (e && typeof e === "object") {
    const err = e as {
      statusCode?: number;
      status?: number;
      message?: string;
      pretty?: () => string;
    };
    if (typeof err.pretty === "function") {
      try {
        const pretty = err.pretty();
        if (pretty.trim()) return pretty;
      } catch {
        // fall through to status/message
      }
    }
    const status = err.statusCode ?? err.status;
    const message = typeof err.message === "string" ? err.message : "";
    if (status != null || message) {
      return `${status ?? ""} ${message}`.trim();
    }
  }
  return e instanceof Error ? e.message : String(e);
}

function isChatResult(value: unknown): value is {
  choices: Array<{ message?: { content?: unknown } }>;
  usage?: { promptTokens?: number; completionTokens?: number };
} {
  return (
    typeof value === "object" &&
    value !== null &&
    "object" in value &&
    (value as { object?: unknown }).object === "chat.completion"
  );
}

function isChatStream(
  value: unknown,
): value is AsyncIterable<{
  error?: { message?: string };
  choices: Array<{ delta?: { content?: string | null } }>;
}> {
  return typeof value === "object" && value !== null && Symbol.asyncIterator in value;
}

function assistantText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  const parts: string[] = [];
  for (const item of content) {
    if (
      item &&
      typeof item === "object" &&
      "type" in item &&
      item.type === "text" &&
      "text" in item &&
      typeof item.text === "string"
    ) {
      parts.push(item.text);
    }
  }
  return parts.join("");
}

export const openrouterProvider: TranslationProvider = {
  name: "openrouter",
  async translate(req, ctx): Promise<TranslateResponse> {
    const { system, user } = buildPrompt(req);
    const model = modelOf(ctx);
    const client = createClient(ctx.apiKey, resolveBaseURL(ctx));
    try {
      const completion = await sendChat(client, model, system, user, false, ctx);
      if (!isChatResult(completion)) {
        throw new Error("unexpected streaming response");
      }
      return {
        translatedText: assistantText(completion.choices[0]?.message?.content),
        provider: "openrouter",
        usage: completion.usage
          ? {
              inputTokens: completion.usage.promptTokens ?? 0,
              outputTokens: completion.usage.completionTokens ?? 0,
            }
          : undefined,
      };
    } catch (e) {
      throw new Error(`openrouter: ${formatSdkError(e)}`);
    }
  },
  translateStream(req, ctx): ReadableStream<Uint8Array> {
    return streamFromDeltas(openrouterDeltas(req, ctx));
  },
};

async function* openrouterDeltas(
  req: TranslateRequest,
  ctx: ProviderContext,
): AsyncGenerator<string> {
  const { system, user } = buildPrompt(req);
  const model = modelOf(ctx);
  const client = createClient(ctx.apiKey, resolveBaseURL(ctx));
  try {
    const stream = await sendChat(client, model, system, user, true, ctx);
    if (!isChatStream(stream)) {
      throw new Error("expected streaming response");
    }
    for await (const chunk of stream) {
      if (chunk.error?.message) {
        throw new Error(chunk.error.message);
      }
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  } catch (e) {
    throw new Error(`openrouter stream: ${formatSdkError(e)}`);
  }
}
