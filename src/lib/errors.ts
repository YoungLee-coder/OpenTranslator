/** Log upstream details server-side; return a generic client-facing message. */
export function publicProviderError(e: unknown): string {
  const detail = e instanceof Error ? e.message : String(e);
  console.warn(`[provider] ${detail}`);
  return "upstream provider error";
}
