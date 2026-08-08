import type { ProviderContext, ProviderType } from "@opentranslator/shared-types";
import { assertPublicHttpUrl } from "../lib/url-safety";
import {
  anthropicMessagesURL,
  normalizeGeminiBaseURL,
  openAIChatCompletionsURL,
} from "./base-url";
import { cloudflareBaseURL } from "./cloudflare";
import { deeplProvider } from "./deepl";
import { safeText } from "./sse";

const PROBE_TIMEOUT_MS = 15_000;
const PROBE_USER = "say hi";
const PROBE_MAX_TOKENS = 16;
const PREVIEW_MAX = 48;

const PROVIDER_DEFAULTS: Partial<
  Record<ProviderType, { baseUrl: string; model: string }>
> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  aihubmix: {
    baseUrl: "https://aihubmix.com/v1",
    model: "gpt-4o-mini",
  },
  claude: {
    baseUrl: "https://api.anthropic.com",
    model: "claude-sonnet-4-5",
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com",
    model: "gemini-2.0-flash",
  },
  cloudflare: {
    baseUrl: "",
    model: "@cf/google/gemma-4-26b-a4b-it",
  },
  deepl: {
    baseUrl: "https://api.deepl.com",
    model: "prefer_quality_optimized",
  },
};

const AIHUBMIX_HEADERS = { "APP-Code": "JFRG5263" };
const ANTHROPIC_VERSION = "2023-06-01";

export type LatencyProbeResult = {
  ok: boolean;
  latencyMs: number;
  status?: number;
  error?: string;
  replyPreview?: string;
};

function preview(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= PREVIEW_MAX) return t;
  return `${t.slice(0, PREVIEW_MAX)}…`;
}

function timedOut(message: string): boolean {
  return /timeout|timed out|aborted|AbortError/i.test(message);
}

async function timedProbe(
  url: string,
  init: RequestInit,
  parseOk: (res: Response) => Promise<LatencyProbeResult>,
): Promise<LatencyProbeResult> {
  const checked = assertPublicHttpUrl(url);
  if ("error" in checked) {
    return { ok: false, latencyMs: 0, error: checked.error };
  }

  const started = Date.now();
  try {
    const res = await fetch(checked.url, {
      ...init,
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      const detail = (await safeText(res)).slice(0, 200);
      return {
        ok: false,
        latencyMs,
        status: res.status,
        error: detail || `HTTP ${res.status}`,
      };
    }
    const parsed = await parseOk(res);
    return { ...parsed, latencyMs, status: res.status };
  } catch (e) {
    const latencyMs = Date.now() - started;
    const message = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      latencyMs,
      error: timedOut(message) ? "request timed out" : message || "request failed",
    };
  }
}

async function probeOpenAICompat(
  baseURL: string,
  apiKey: string,
  model: string,
  extraHeaders?: Record<string, string>,
): Promise<LatencyProbeResult> {
  return timedProbe(openAIChatCompletionsURL(baseURL), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      max_tokens: PROBE_MAX_TOKENS,
      stream: false,
      messages: [{ role: "user", content: PROBE_USER }],
    }),
  }, async (res) => {
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    return { ok: true, latencyMs: 0, replyPreview: preview(text) };
  });
}

async function probeClaude(
  baseUrl: string,
  apiKey: string,
  model: string,
): Promise<LatencyProbeResult> {
  return timedProbe(anthropicMessagesURL(baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: PROBE_MAX_TOKENS,
      stream: false,
      messages: [{ role: "user", content: PROBE_USER }],
    }),
  }, async (res) => {
    const data = (await res.json()) as {
      content?: { text?: string }[];
    };
    const text = data.content?.map((c) => c.text ?? "").join("") ?? "";
    return { ok: true, latencyMs: 0, replyPreview: preview(text) };
  });
}

async function probeGemini(
  baseUrl: string,
  apiKey: string,
  model: string,
): Promise<LatencyProbeResult> {
  const root = normalizeGeminiBaseURL(baseUrl);
  const url = `${root}/v1beta/models/${model}:generateContent?key=${apiKey}`;
  return timedProbe(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: PROBE_USER }] }],
    }),
  }, async (res) => {
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return { ok: true, latencyMs: 0, replyPreview: preview(text) };
  });
}

async function probeDeepL(ctx: ProviderContext): Promise<LatencyProbeResult> {
  const base = deeplBase(ctx);
  const checked = assertPublicHttpUrl(base);
  if ("error" in checked) {
    return { ok: false, latencyMs: 0, error: checked.error };
  }

  const started = Date.now();
  try {
    const result = await Promise.race([
      deeplProvider.translate(
        { text: PROBE_USER, sourceLang: "auto", targetLang: "en" },
        { apiKey: ctx.apiKey.trim(), defaultModel: ctx.defaultModel, configJson: ctx.configJson },
      ),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("request timed out")), PROBE_TIMEOUT_MS);
      }),
    ]);
    return {
      ok: true,
      latencyMs: Date.now() - started,
      replyPreview: preview(result.translatedText),
    };
  } catch (e) {
    const latencyMs = Date.now() - started;
    const message = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      latencyMs,
      error: timedOut(message) ? "request timed out" : message || "request failed",
    };
  }
}

function resolveModel(type: ProviderType, ctx: ProviderContext): string {
  const fromCtx = ctx.defaultModel?.trim();
  if (fromCtx) return fromCtx;
  return PROVIDER_DEFAULTS[type]?.model ?? "";
}

function resolveBaseUrl(type: ProviderType, ctx: ProviderContext): string | null {
  const fromCtx = ctx.baseUrl?.trim();
  if (fromCtx) return fromCtx;
  const def = PROVIDER_DEFAULTS[type]?.baseUrl;
  return def || null;
}

function deeplBase(ctx: ProviderContext): string {
  const plan =
    typeof ctx.configJson?.plan === "string"
      ? ctx.configJson.plan.trim().toLowerCase()
      : "";
  if (plan === "free") return "https://api-free.deepl.com";
  return resolveBaseUrl("deepl", ctx) ?? "https://api.deepl.com";
}

/**
 * Worker → provider minimal model probe ("say hi"). Measures end-to-end API RTT
 * including model inference, not bare HTTP reachability.
 */
export async function probeProviderLatency(
  type: ProviderType,
  ctx: ProviderContext,
): Promise<LatencyProbeResult> {
  if (!ctx.apiKey?.trim()) {
    return { ok: false, latencyMs: 0, error: "apiKey is required" };
  }

  const apiKey = ctx.apiKey.trim();
  const model = resolveModel(type, ctx);

  switch (type) {
    case "openai":
    case "custom": {
      const baseUrl = resolveBaseUrl(type, ctx);
      if (!baseUrl) return { ok: false, latencyMs: 0, error: "baseUrl is required" };
      if (!model) return { ok: false, latencyMs: 0, error: "model is required" };
      return probeOpenAICompat(baseUrl, apiKey, model);
    }
    case "aihubmix": {
      const baseUrl = resolveBaseUrl(type, ctx);
      if (!baseUrl) return { ok: false, latencyMs: 0, error: "baseUrl is required" };
      if (!model) return { ok: false, latencyMs: 0, error: "model is required" };
      return probeOpenAICompat(baseUrl, apiKey, model, AIHUBMIX_HEADERS);
    }
    case "claude": {
      const baseUrl = resolveBaseUrl(type, ctx);
      if (!baseUrl) return { ok: false, latencyMs: 0, error: "baseUrl is required" };
      if (!model) return { ok: false, latencyMs: 0, error: "model is required" };
      return probeClaude(baseUrl, apiKey, model);
    }
    case "gemini": {
      const baseUrl = resolveBaseUrl(type, ctx);
      if (!baseUrl) return { ok: false, latencyMs: 0, error: "baseUrl is required" };
      if (!model) return { ok: false, latencyMs: 0, error: "model is required" };
      return probeGemini(baseUrl, apiKey, model);
    }
    case "cloudflare": {
      const accountId =
        typeof ctx.configJson?.accountId === "string"
          ? ctx.configJson.accountId.trim()
          : "";
      if (!accountId) {
        return { ok: false, latencyMs: 0, error: "accountId is required" };
      }
      if (!model) return { ok: false, latencyMs: 0, error: "model is required" };
      return probeOpenAICompat(cloudflareBaseURL(accountId), apiKey, model);
    }
    case "deepl": {
      if (!model) return { ok: false, latencyMs: 0, error: "model is required" };
      return probeDeepL({
        apiKey,
        defaultModel: model,
        configJson: ctx.configJson,
      });
    }
    default:
      return { ok: false, latencyMs: 0, error: `unknown provider type "${type}"` };
  }
}
