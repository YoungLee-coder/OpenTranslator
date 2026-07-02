import type {
  ProviderContext,
  TranslateRequest,
  TranslateResponse,
  TranslationProvider,
} from "@opentranslator/shared-types";
import { buildPrompt } from "./prompt";
import { parseSSEEvents, safeText, streamFromDeltas } from "./sse";

/**
 * Anthropic Messages API adapter.
 * Docs: POST {baseUrl}，baseUrl 需填完整端点 URL（含 /v1/messages），
 * adapter 直接使用、不再拼接路径。请求头带 x-api-key + anthropic-version。
 */

interface ClaudeContent {
  type: string;
  text?: string;
}
interface ClaudeResponse {
  content?: ClaudeContent[];
  usage?: { input_tokens?: number; output_tokens?: number };
}
interface ClaudeStreamEvent {
  type: string;
  delta?: { text?: string };
}

const DEFAULT_BASE_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-5";
const MAX_TOKENS = 8192;
const ANTHROPIC_VERSION = "2023-06-01";

function resolve(baseUrl: string | undefined, apiKey: string) {
  const url = (baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
  return {
    url,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
  };
}

export const claudeProvider: TranslationProvider = {
  name: "claude",
  async translate(req, ctx): Promise<TranslateResponse> {
    const { system, user } = buildPrompt(req);
    const { url, headers } = resolve(ctx.baseUrl, ctx.apiKey);
    const model = ctx.defaultModel?.trim() || DEFAULT_MODEL;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        system,
        stream: false,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`claude: ${res.status} ${await safeText(res)}`);
    const data = (await res.json()) as ClaudeResponse;
    const text = data.content?.map((c) => c.text ?? "").join("") ?? "";
    return {
      translatedText: text,
      provider: "claude",
      usage: data.usage
        ? {
            inputTokens: data.usage.input_tokens ?? 0,
            outputTokens: data.usage.output_tokens ?? 0,
          }
        : undefined,
    };
  },
  translateStream(req, ctx): ReadableStream<Uint8Array> {
    return streamFromDeltas(claudeDeltas(req, ctx));
  },
};

async function* claudeDeltas(req: TranslateRequest, ctx: ProviderContext): AsyncGenerator<string> {
  const { system, user } = buildPrompt(req);
  const { url, headers } = resolve(ctx.baseUrl, ctx.apiKey);
  const model = ctx.defaultModel?.trim() || DEFAULT_MODEL;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system,
      stream: true,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`claude stream: ${res.status} ${await safeText(res)}`);
  }
  for await (const ev of parseSSEEvents(res.body)) {
    const e = ev as ClaudeStreamEvent;
    if (e.type === "content_block_delta" && e.delta?.text) yield e.delta.text;
  }
}
