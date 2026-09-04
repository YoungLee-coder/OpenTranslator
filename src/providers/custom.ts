import type {
  ProviderApiFormat,
  ProviderContext,
  TranslateRequest,
  TranslateResponse,
  TranslationProvider,
} from "@opentranslator/shared-types";
import {
  findEndpointForModel,
  parseProviderEndpoints,
} from "@opentranslator/shared-types";
import { normalizeStoredProviderBaseUrl } from "./base-url";
import { claudeProvider } from "./claude";
import { geminiProvider } from "./gemini";
import { openaiProvider } from "./openai";

/**
 * Multi-format aggregator: one API key, several SDK roots (OpenAI / Claude / Gemini).
 * Dispatches each request to the inner adapter that matches the selected model's endpoint.
 */

function adapterFor(format: ProviderApiFormat): TranslationProvider {
  switch (format) {
    case "openai":
      return openaiProvider;
    case "claude":
      return claudeProvider;
    case "gemini":
      return geminiProvider;
  }
}

function resolveDispatch(ctx: ProviderContext): {
  adapter: TranslationProvider;
  inner: ProviderContext;
} {
  const endpoints = parseProviderEndpoints(ctx.configJson?.endpoints);
  if (endpoints.length === 0) {
    throw new Error("custom: no API endpoints configured");
  }
  const model = ctx.defaultModel?.trim() ?? "";
  if (!model) {
    throw new Error("custom: model is required");
  }
  const ep = findEndpointForModel(endpoints, model);
  if (!ep) {
    throw new Error(`custom: model "${model}" is not assigned to any API endpoint`);
  }
  if (!ep.baseUrl) {
    throw new Error("custom: endpoint baseUrl is required");
  }
  return {
    adapter: adapterFor(ep.format),
    inner: {
      ...ctx,
      baseUrl: normalizeStoredProviderBaseUrl(ep.format, ep.baseUrl),
      defaultModel: model,
    },
  };
}

export const customProvider: TranslationProvider = {
  name: "custom",
  async translate(req: TranslateRequest, ctx: ProviderContext): Promise<TranslateResponse> {
    const { adapter, inner } = resolveDispatch(ctx);
    const result = await adapter.translate(req, inner);
    return { ...result, provider: "custom" };
  },
  translateStream(req: TranslateRequest, ctx: ProviderContext): ReadableStream<Uint8Array> {
    const { adapter, inner } = resolveDispatch(ctx);
    if (!adapter.translateStream) {
      throw new Error(`custom: format "${adapter.name}" does not support streaming`);
    }
    return adapter.translateStream(req, inner);
  },
};
