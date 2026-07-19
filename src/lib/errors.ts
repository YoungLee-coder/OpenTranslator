/** Log upstream details server-side; return a generic client-facing message. */
export function publicProviderError(e: unknown): string {
  const detail = e instanceof Error ? e.message : String(e);
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
