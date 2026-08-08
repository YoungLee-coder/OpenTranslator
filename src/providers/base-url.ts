import type { ProviderType } from "@opentranslator/shared-types";

/**
 * Normalize Dashboard `baseUrl` to official SDK root URLs.
 *
 * New configs should already use SDK-style roots. Legacy rows that stored a
 * full endpoint path (…/chat/completions, …/v1/messages) are stripped so
 * existing deployments keep working after the SDK migration.
 */

export function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Normalize a stored provider baseUrl for API responses / SDK clients. */
export function normalizeStoredProviderBaseUrl(
  type: ProviderType,
  baseUrl: string | null | undefined,
): string | undefined {
  if (!baseUrl?.trim()) return undefined;
  switch (type) {
    case "openai":
    case "aihubmix":
    case "custom":
      return normalizeOpenAIBaseURL(baseUrl);
    case "claude":
      return normalizeAnthropicBaseURL(baseUrl);
    case "gemini":
      return normalizeGeminiBaseURL(baseUrl);
    default:
      return stripTrailingSlash(baseUrl.trim());
  }
}

/** OpenAI SDK `baseURL` — e.g. https://api.openai.com/v1 */
export function normalizeOpenAIBaseURL(url: string): string {
  let u = stripTrailingSlash(url.trim());
  u = u.replace(/\/chat\/completions$/i, "");
  u = u.replace(/\/completions$/i, "");
  return stripTrailingSlash(u);
}

/** Anthropic SDK `baseURL` — e.g. https://api.anthropic.com */
export function normalizeAnthropicBaseURL(url: string): string {
  let u = stripTrailingSlash(url.trim());
  u = u.replace(/\/v1\/messages$/i, "");
  return stripTrailingSlash(u);
}

/** Gemini SDK `httpOptions.baseUrl` — e.g. https://generativelanguage.googleapis.com */
export function normalizeGeminiBaseURL(url: string): string {
  let u = stripTrailingSlash(url.trim());
  // Legacy probes sometimes appended /v1beta/…; keep host/root only.
  u = u.replace(/\/v1beta(?:\/.*)?$/i, "");
  return stripTrailingSlash(u);
}

/** Full Chat Completions URL for raw probes (OpenAI-compatible). */
export function openAIChatCompletionsURL(baseURL: string): string {
  return `${normalizeOpenAIBaseURL(baseURL)}/chat/completions`;
}

/** Full Messages URL for raw Anthropic probes. */
export function anthropicMessagesURL(baseURL: string): string {
  return `${normalizeAnthropicBaseURL(baseURL)}/v1/messages`;
}
