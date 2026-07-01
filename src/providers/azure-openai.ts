import type {
  ProviderContext,
  TranslateRequest,
  TranslateResponse,
  TranslationProvider,
} from "@opentranslator/shared-types";
import { buildPrompt } from "./prompt";
import { parseSSEEvents, safeText, streamFromDeltas } from "./sse";

/**
 * Azure OpenAI adapter. Unlike the OpenAI-compat vendors, Azure keys the
 * model as a *deployment* in the URL path and authenticates with the
 * `api-key` header instead of a Bearer token. The response/stream shape is
 * identical to OpenAI chat completions.
 *
 * Provider config:
 *   baseUrl  = resource endpoint, e.g. https://myresource.openai.azure.com
 *   defaultModel = deployment name
 *   configJson.apiVersion = optional override (defaults to a stable GA version)
 */

const DEFAULT_API_VERSION = "2024-10-21";

interface OpenAIChoice {
  delta?: { content?: string };
  message?: { content?: string };
}
interface OpenAIResponse {
  choices?: OpenAIChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

function apiVersion(ctx: ProviderContext): string {
  const v = ctx.configJson?.["apiVersion"];
  return typeof v === "string" && v ? v : DEFAULT_API_VERSION;
}

function endpoint(ctx: ProviderContext): string {
  const base = (ctx.baseUrl ?? "").replace(/\/$/, "");
  const deployment = (ctx.defaultModel ?? "").trim();
  if (!base || !deployment) {
    throw new Error("azure_openai: baseUrl (endpoint) and defaultModel (deployment) are required");
  }
  return `${base}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${apiVersion(ctx)}`;
}

function headers(apiKey: string): Record<string, string> {
  return { "Content-Type": "application/json", "api-key": apiKey };
}

function body(system: string, user: string, stream: boolean) {
  return {
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    stream,
  };
}

export const azureOpenAIProvider: TranslationProvider = {
  name: "azure_openai",
  async translate(req, ctx): Promise<TranslateResponse> {
    const { system, user } = buildPrompt(req);
    const res = await fetch(endpoint(ctx), {
      method: "POST",
      headers: headers(ctx.apiKey),
      body: JSON.stringify(body(system, user, false)),
    });
    if (!res.ok) throw new Error(`azure_openai: ${res.status} ${await safeText(res)}`);
    const data = (await res.json()) as OpenAIResponse;
    return {
      translatedText: data.choices?.[0]?.message?.content ?? "",
      provider: "azure_openai",
      usage: data.usage
        ? {
            inputTokens: data.usage.prompt_tokens ?? 0,
            outputTokens: data.usage.completion_tokens ?? 0,
          }
        : undefined,
    };
  },
  translateStream(req, ctx): ReadableStream<Uint8Array> {
    return streamFromDeltas(azureDeltas(req, ctx));
  },
};

async function* azureDeltas(req: TranslateRequest, ctx: ProviderContext): AsyncGenerator<string> {
  const { system, user } = buildPrompt(req);
  const res = await fetch(endpoint(ctx), {
    method: "POST",
    headers: headers(ctx.apiKey),
    body: JSON.stringify(body(system, user, true)),
  });
  if (!res.ok || !res.body) {
    throw new Error(`azure_openai stream: ${res.status} ${await safeText(res)}`);
  }
  for await (const chunk of parseSSEEvents(res.body)) {
    const c = chunk as OpenAIResponse;
    const delta = c.choices?.[0]?.delta?.content;
    if (delta) yield delta;
  }
}
