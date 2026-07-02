import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import type {
  ProviderContext,
  ProviderType,
  TranslateRequest,
  TranslateStreamEvent,
} from "@opentranslator/shared-types";
import type { AppBindings, AppVariables } from "../../types";
import { getSessionUser } from "../../auth/session";
import { getSiteSettings } from "../../settings/cache";
import {
  getPublicDefaultProviderRow,
  getProviderRow,
  logUsage,
} from "../../db/queries";
import { decryptSecret } from "../../lib/crypto";
import {
  getTranslationCache,
  setTranslationCache,
  translationCacheKey,
} from "../../lib/cache";
import { getGlossaryForTarget } from "../glossary/store";
import { providerRegistry } from "../../providers/registry";
import { getClientIp, enforceRateLimit } from "../../middleware/rate-limit";

// Side-effect: register every adapter into the registry.
import "../../providers";

type C = Context<{ Bindings: AppBindings; Variables: AppVariables }>;

export async function handleTranslate(c: C): Promise<Response> {
  let req: TranslateRequest;
  try {
    req = (await c.req.json()) as TranslateRequest;
  } catch {
    return c.json({ error: "invalid JSON body" }, 400);
  }

  if (!req.text?.trim() || !req.targetLang?.trim()) {
    return c.json({ error: "text and targetLang are required" }, 400);
  }

  const user = await getSessionUser(c.req.header("cookie"), c.env.JWT_SECRET);
  const isPublic = !user;
  const settings = await getSiteSettings(c.env.SETTINGS_KV, c.env.DB);

  // Private site gate: anonymous users can't pass when the site is closed.
  if (!settings.sitePublic && !user) {
    return c.json({ error: "site is private", authenticated: false }, 403);
  }

  // Apply the site-wide glossary for this target language (plugin hook).
  const siteGlossary = await getGlossaryForTarget(
    c.env.SETTINGS_KV,
    c.env.DB,
    req.targetLang,
  );
  if (Object.keys(siteGlossary).length > 0) {
    req = { ...req, glossary: { ...siteGlossary, ...req.glossary } };
  }

  // Rate limit: stricter for anonymous, looser for logged-in admins.
  const limit = user
    ? settings.authedRateLimitPerMinute
    : settings.publicRateLimitPerMinute;
  const blocked = await enforceRateLimit(c, limit);
  if (blocked) return blocked;

  // Provider selection: explicit (authed) or public default / first enabled.
  let row;
  if (user && req.providerId) {
    row = await getProviderRow(c.env.DB, req.providerId);
    if (!row || !row.enabled) {
      return c.json({ error: "provider not available" }, 404);
    }
  } else {
    row = await getPublicDefaultProviderRow(c.env.DB);
  }
  if (!row) {
    return c.json({ error: "no provider configured" }, 503);
  }

  // Decrypt the stored API key.
  let apiKey: string;
  try {
    apiKey = await decryptSecret(row.encrypted_api_key, c.env.ENCRYPTION_KEY);
  } catch {
    return c.json({ error: "api key decryption failed" }, 500);
  }

  const ctx: ProviderContext = {
    apiKey,
    baseUrl: row.base_url ?? undefined,
    defaultModel: row.default_model ?? undefined,
    configJson: row.config_json
      ? (JSON.parse(row.config_json) as Record<string, unknown>)
      : undefined,
  };

  const providerType = row.type as ProviderType;
  let adapter;
  try {
    adapter = providerRegistry.get(providerType);
  } catch {
    return c.json({ error: `provider type "${providerType}" not registered` }, 501);
  }

  const wantStream = req.stream === true && adapter.translateStream !== undefined;

  // Translation cache: serve identical repeats without hitting the upstream.
  const cacheKey = settings.translationCacheEnabled
    ? await translationCacheKey(req, row.id)
    : null;
  if (cacheKey) {
    const cached = await getTranslationCache(c.env.SETTINGS_KV, cacheKey);
    if (cached) {
      if (wantStream) {
        return streamSSE(c, async (stream) => {
          await stream.writeSSE({
            data: JSON.stringify({
              type: "delta",
              text: cached.translatedText,
            } satisfies TranslateStreamEvent),
          });
          await stream.writeSSE({
            data: JSON.stringify({
              type: "done",
              translatedText: cached.translatedText,
              provider: cached.provider,
              usage: cached.usage,
            } satisfies TranslateStreamEvent),
          });
        });
      }
      return c.json(cached);
    }
  }

  if (wantStream && adapter.translateStream) {
    const upstream = adapter.translateStream(req, ctx);
    return streamSSE(c, async (stream) => {
      const reader = upstream.getReader();
      const decoder = new TextDecoder();
      let full = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          if (text) {
            full += text;
            await stream.writeSSE({
              data: JSON.stringify({ type: "delta", text } satisfies TranslateStreamEvent),
            });
          }
        }
        const tail = decoder.decode();
        if (tail) {
          full += tail;
          await stream.writeSSE({
            data: JSON.stringify({ type: "delta", text: tail } satisfies TranslateStreamEvent),
          });
        }
        const result = { translatedText: full, provider: providerType };
        await stream.writeSSE({
          data: JSON.stringify({
            type: "done",
            ...result,
          } satisfies TranslateStreamEvent),
        });
        if (cacheKey) void setTranslationCache(c.env.SETTINGS_KV, cacheKey, result);
        c.executionCtx?.waitUntil(logUsage(c.env.DB, row.id, req.text.length, isPublic, getClientIp(c)));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await stream.writeSSE({
          data: JSON.stringify({ type: "error", error: msg } satisfies TranslateStreamEvent),
        });
      } finally {
        reader.releaseLock();
      }
    });
  }

  // Non-streaming path.
  try {
    const result = await adapter.translate(req, ctx);
    if (cacheKey) void setTranslationCache(c.env.SETTINGS_KV, cacheKey, result);
    c.executionCtx?.waitUntil(logUsage(c.env.DB, row.id, req.text.length, isPublic, getClientIp(c)));
    return c.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 502);
  }
}
