import type {
  ProviderContext,
  TranslateRequest,
  TranslateResponse,
  TranslationProvider,
} from "@opentranslator/shared-types";
import { buildPrompt } from "./prompt";
import { parseSSEEvents, streamFromDeltas, safeText } from "./sse";

/**
 * Cloudflare Workers AI 适配器（OpenAI 兼容端点）。
 * Account ID 作为独立表单字段存入 configJson，这里拼出完整端点 URL；
 * API Token 走通用 apiKey 字段（Bearer）。wire 格式与 OpenAI 兼容端点一致：
 * POST {endpoint} + Authorization: Bearer + {messages, model, stream}，
 * 响应 choices[0].message.content / 流式 choices[0].delta.content。
 */

interface OpenAIChoice {
  delta?: { content?: string };
  message?: { content?: string };
}
interface OpenAIResponse {
  choices?: OpenAIChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

const DEFAULT_MODEL = "@cf/google/gemma-4-26b-a4b-it";

function endpoint(accountId: string): string {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
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

function resolveAccountId(ctx: ProviderContext): string {
  const raw = ctx.configJson?.accountId;
  const accountId = typeof raw === "string" ? raw.trim() : "";
  if (!accountId) {
    throw new Error("cloudflare: accountId is required (configure it on the provider)");
  }
  return accountId;
}

export const cloudflareProvider: TranslationProvider = {
  name: "cloudflare",
  async translate(req: TranslateRequest, ctx: ProviderContext): Promise<TranslateResponse> {
    const accountId = resolveAccountId(ctx);
    const model = ctx.defaultModel?.trim() || DEFAULT_MODEL;
    const { system, user } = buildPrompt(req);
    const res = await fetch(endpoint(accountId), {
      method: "POST",
      headers: authHeaders(ctx.apiKey),
      body: JSON.stringify(chatBody(model, system, user, false)),
    });
    if (!res.ok) throw new Error(`cloudflare: ${res.status} ${await safeText(res)}`);
    const data = (await res.json()) as OpenAIResponse;
    const content = data.choices?.[0]?.message?.content ?? "";
    return {
      translatedText: content,
      provider: "cloudflare",
      usage: data.usage
        ? {
            inputTokens: data.usage.prompt_tokens ?? 0,
            outputTokens: data.usage.completion_tokens ?? 0,
          }
        : undefined,
    };
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
  const res = await fetch(endpoint(accountId), {
    method: "POST",
    headers: authHeaders(ctx.apiKey),
    body: JSON.stringify(chatBody(model, system, user, true)),
  });
  if (!res.ok || !res.body) {
    throw new Error(`cloudflare stream: ${res.status} ${await safeText(res)}`);
  }
  for await (const chunk of parseSSEEvents(res.body)) {
    const c = chunk as OpenAIResponse;
    const delta = c.choices?.[0]?.delta?.content;
    if (delta) yield delta;
  }
}
