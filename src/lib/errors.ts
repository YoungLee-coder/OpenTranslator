/** Strip API-key-like tokens before logging or returning upstream errors. */
export function redactProviderSecrets(text: string): string {
  return text
    .replace(/\bsk-ant-[A-Za-z0-9_-]+/g, "sk-ant-***")
    .replace(/\bsk-[A-Za-z0-9_-]+/g, "sk-***")
    .replace(/\bAIza[A-Za-z0-9_-]+/g, "AIza***")
    .replace(/\bBearer\s+\S+/gi, "Bearer ***");
}

export function providerErrorDetail(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  return redactProviderSecrets(raw);
}

/** Log upstream details server-side; return a generic client-facing message. */
export function publicProviderError(e: unknown): string {
  const detail = providerErrorDetail(e);
  console.warn(`[provider] ${detail}`);
  if (
    /context.?length|maximum.?context|too many tokens|max_tokens|token.?limit|prompt is too long|input too long/i.test(
      detail,
    )
  ) {
    return "text too long for model context";
  }
  if (/timeout|timed out|deadline/i.test(detail)) {
    return "upstream provider timeout";
  }
  return "upstream provider error";
}

/**
 * Public UI message plus optional raw detail for browser console.
 * `detail` is only attached when the caller opts in (logged-in provider managers).
 */
export function providerErrorPayload(
  e: unknown,
  includeDetail: boolean,
): { error: string; detail?: string } {
  const error = publicProviderError(e);
  if (!includeDetail) return { error };
  return { error, detail: providerErrorDetail(e) };
}
