/**
 * Per-IP sliding-window rate limiter backed by a Durable Object.
 */
export class RateLimiter {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const windowMs = 60_000;
    const raw = Number(url.searchParams.get("limit") ?? 20);
    // NaN / Infinity / 非正数会让 `length >= limit` 恒为 false，等同无限流。
    const limit =
      Number.isFinite(raw) && raw >= 1
        ? Math.min(Math.round(raw), 1000)
        : 20;

    const now = Date.now();
    let timestamps: number[] =
      (await this.state.storage.get<number[]>("timestamps")) ?? [];
    timestamps = timestamps.filter((t) => now - t < windowMs);

    const costRaw = Number(url.searchParams.get("cost") ?? 1);
    const cost =
      Number.isFinite(costRaw) && costRaw >= 1
        ? Math.min(Math.round(costRaw), limit)
        : 1;

    if (timestamps.length + cost > limit) {
      return new Response("Rate limited", { status: 429 });
    }

    for (let i = 0; i < cost; i++) timestamps.push(now);
    await this.state.storage.put("timestamps", timestamps);
    return new Response("OK", { status: 200 });
  }
}
