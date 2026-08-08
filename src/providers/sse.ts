/**
 * Tiny SSE parser for raw upstream streams that speak `data: {json}\n\n`.
 * LLM adapters now use official SDKs; this remains for any raw-fetch callers
 * (e.g. probes) that still parse SSE by hand.
 * Lines that don't start with `data:` (event names, comments) are ignored.
 */
export async function* parseSSEEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).trimEnd();
      buffer = buffer.slice(idx + 1);
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) continue;
      if (trimmed.startsWith("data:")) {
        const data = trimmed.slice(5).trim();
        if (!data) continue;
        if (data === "[DONE]") return;
        try {
          yield JSON.parse(data);
        } catch {
          // skip non-JSON keepalives
        }
      }
    }
  }
}

/** Best-effort short error body for upstream error messages. */
export async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return "";
  }
}

/** Wrap an async generator of text deltas into a byte ReadableStream. */
export function streamFromDeltas(
  deltas: AsyncGenerator<string>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await deltas.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(value));
      } catch (e) {
        controller.error(e);
      }
    },
    cancel() {
      void deltas.return(undefined);
    },
  });
}
