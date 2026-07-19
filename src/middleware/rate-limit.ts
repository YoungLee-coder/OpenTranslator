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
 *
 * @param bucket 独立限流桶名。登录/setup 必须用 `auth`，避免与翻译配额互相抢占。
 * @param cost 本次消耗的配额点数（长文多块翻译按块数计费，默认 1）。
 */
export async function enforceRateLimit(
  c: C,
  limitPerMinute: number,
  bucket: "default" | "auth" = "default",
  cost = 1,
): Promise<Response | null> {
  const limit = clampRateLimitPerMinute(limitPerMinute);
  const ip = getClientIp(c);
  const key = bucket === "auth" ? `auth:${ip}` : ip;
  const id = c.env.RATE_LIMITER.idFromName(key);
  const stub = c.env.RATE_LIMITER.get(id);
  const safeCost = Number.isFinite(cost) && cost >= 1 ? Math.min(Math.round(cost), 1000) : 1;
  const res = await stub.fetch(`http://rate-limit/?limit=${limit}&cost=${safeCost}`);
  if (res.status === 429) {
    return c.json({ error: "rate limited", retryAfterSeconds: 60 }, 429);
  }
  return null;
}
