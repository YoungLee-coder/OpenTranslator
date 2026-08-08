import Anthropic from "@anthropic-ai/sdk";
import type {
  ProviderContext,
  TranslateRequest,
  TranslateResponse,
  TranslationProvider,
} from "@opentranslator/shared-types";
import { normalizeAnthropicBaseURL } from "./base-url";
import { buildPrompt } from "./prompt";
import { streamFromDeltas } from "./sse";

/**
 * Anthropic Messages API via the official `@anthropic-ai/sdk`.
 * `baseUrl` is the SDK root (e.g. https://api.anthropic.com); the SDK appends
 * /v1/messages.
 */

const DEFAULT_BASE_URL = "https://api.anthropic.com";
const DEFAULT_MODEL = "claude-sonnet-4-5";
/** Raised for long-text chunks; models may still truncate below this. */
const MAX_TOKENS = 16_384;

function createClient(apiKey: string, baseURL: string): Anthropic {
  return new Anthropic({
    apiKey,
    baseURL,
    fetch: globalThis.fetch.bind(globalThis),
  });
}

function resolveBaseURL(ctx: ProviderContext): string {
  return normalizeAnthropicBaseURL(ctx.baseUrl?.trim() || DEFAULT_BASE_URL);
}

function formatSdkError(e: unknown): string {
  if (e && typeof e === "object" && "status" in e && "message" in e) {
    const err = e as { status?: number; message?: string };
    return `${err.status ?? ""} ${err.message ?? ""}`.trim();
  }
  return e instanceof Error ? e.message : String(e);
}

export const claudeProvider: TranslationProvider = {
  name: "claude",
  async translate(req, ctx): Promise<TranslateResponse> {
    const { system, user } = buildPrompt(req);
    const model = ctx.defaultModel?.trim() || DEFAULT_MODEL;
    const client = createClient(ctx.apiKey, resolveBaseURL(ctx));
    try {
      const message = await client.messages.create({
        model,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: "user", content: user }],
      });
      const text = message.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("");
      return {
        translatedText: text,
        provider: "claude",
        usage: {
          inputTokens: message.usage.input_tokens ?? 0,
          outputTokens: message.usage.output_tokens ?? 0,
        },
      };
    } catch (e) {
      throw new Error(`claude: ${formatSdkError(e)}`);
    }
  },
  translateStream(req, ctx): ReadableStream<Uint8Array> {
    return streamFromDeltas(claudeDeltas(req, ctx));
  },
};

async function* claudeDeltas(req: TranslateRequest, ctx: ProviderContext): AsyncGenerator<string> {
  const { system, user } = buildPrompt(req);
  const model = ctx.defaultModel?.trim() || DEFAULT_MODEL;
  const client = createClient(ctx.apiKey, resolveBaseURL(ctx));
  try {
    const stream = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
      stream: true,
    });
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta" &&
        event.delta.text
      ) {
        yield event.delta.text;
      }
    }
  } catch (e) {
    throw new Error(`claude stream: ${formatSdkError(e)}`);
  }
}
