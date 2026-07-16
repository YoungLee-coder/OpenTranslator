import type { Context } from "hono";
import type { AppBindings, AppVariables } from "../types";
import { clampRateLimitPerMinute } from "../settings/cache";

type C = Context<{ Bindings: AppBindings; Variables: AppVariables }>;

export function getClientIp(c: C): string {
  const cf = c.req.header("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = c.req.header("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0];
    if (first) return first.trim();
  }
  return "0.0.0.0";
}

/**
 * Sliding-window rate limit via the per-IP Durable Object.
 * Returns null when allowed, or a 429 Response when the quota is exceeded.
 */
export async function enforceRateLimit(
  c: C,
  limitPerMinute: number,
): Promise<Response | null> {
  const limit = clampRateLimitPerMinute(limitPerMinute);
  const ip = getClientIp(c);
  const id = c.env.RATE_LIMITER.idFromName(ip);
  const stub = c.env.RATE_LIMITER.get(id);
  const res = await stub.fetch(`http://rate-limit/?limit=${limit}`);
  if (res.status === 429) {
    return c.json({ error: "rate limited", retryAfterSeconds: 60 }, 429);
  }
  return null;
}
