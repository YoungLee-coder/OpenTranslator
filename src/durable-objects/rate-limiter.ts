/**
 * Per-IP sliding-window rate limiter backed by a Durable Object.
 * Phase 2 wires this into the translate route; Phase 1 ships the skeleton.
 */
export class RateLimiter {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const windowMs = 60_000;
    const limit = Number(url.searchParams.get("limit") ?? 20);

    const now = Date.now();
    let timestamps: number[] =
      (await this.state.storage.get<number[]>("timestamps")) ?? [];
    timestamps = timestamps.filter((t) => now - t < windowMs);

    if (timestamps.length >= limit) {
      return new Response("Rate limited", { status: 429 });
    }

    timestamps.push(now);
    await this.state.storage.put("timestamps", timestamps);
    return new Response("OK", { status: 200 });
  }
}
