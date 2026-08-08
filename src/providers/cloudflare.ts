import OpenAI from "openai";
import type {
  ProviderContext,
  TranslateRequest,
  TranslateResponse,
  TranslationProvider,
} from "@opentranslator/shared-types";
import { buildPrompt } from "./prompt";
import { streamFromDeltas } from "./sse";

/**
 * Cloudflare Workers AI via the official `openai` SDK against the OpenAI-compatible
 * root: https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1
 * Account ID lives in configJson; API Token uses the shared apiKey field.
 */

const DEFAULT_MODEL = "@cf/google/gemma-4-26b-a4b-it";

function cloudflareBaseURL(accountId: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`;
}

function resolveAccountId(ctx: ProviderContext): string {
  const raw = ctx.configJson?.accountId;
  const accountId = typeof raw === "string" ? raw.trim() : "";
  if (!accountId) {
    throw new Error("cloudflare: accountId is required (configure it on the provider)");
  }
  return accountId;
}

function createClient(apiKey: string, accountId: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: cloudflareBaseURL(accountId),
    fetch: globalThis.fetch.bind(globalThis),
  });
}

function formatSdkError(e: unknown): string {
  if (e && typeof e === "object" && "status" in e && "message" in e) {
    const err = e as { status?: number; message?: string };
    return `${err.status ?? ""} ${err.message ?? ""}`.trim();
  }
  return e instanceof Error ? e.message : String(e);
}

export const cloudflareProvider: TranslationProvider = {
  name: "cloudflare",
  async translate(req: TranslateRequest, ctx: ProviderContext): Promise<TranslateResponse> {
    const accountId = resolveAccountId(ctx);
    const model = ctx.defaultModel?.trim() || DEFAULT_MODEL;
    const { system, user } = buildPrompt(req);
    const client = createClient(ctx.apiKey, accountId);
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        stream: false,
      });
      const content = completion.choices[0]?.message?.content ?? "";
      return {
        translatedText: content,
        provider: "cloudflare",
        usage: completion.usage
          ? {
              inputTokens: completion.usage.prompt_tokens ?? 0,
              outputTokens: completion.usage.completion_tokens ?? 0,
            }
          : undefined,
      };
    } catch (e) {
      throw new Error(`cloudflare: ${formatSdkError(e)}`);
    }
  },
  translateStream(req: TranslateRequest, ctx: ProviderContext): ReadableStream<Uint8Array> {
    return streamFromDeltas(cloudflareDeltas(req, ctx));
  },
};

async function* cloudflareDeltas(
  req: TranslateRequest,
  ctx: ProviderContext,
): AsyncGenerator<string> {
  const accountId = resolveAccountId(ctx);
  const model = ctx.defaultModel?.trim() || DEFAULT_MODEL;
  const { system, user } = buildPrompt(req);
  const client = createClient(ctx.apiKey, accountId);
  try {
    const stream = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      stream: true,
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  } catch (e) {
    throw new Error(`cloudflare stream: ${formatSdkError(e)}`);
  }
}

/** Exported for latency probe URL construction. */
export { cloudflareBaseURL };
