import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import type {
  ProviderContext,
  ProviderType,
  TranslateEmailRequest,
  TranslateRequest,
  TranslateStreamEvent,
} from "@opentranslator/shared-types";
import { MAX_EMAIL_HTML_CHARS } from "@opentranslator/shared-types";
import type { AppBindings, AppVariables } from "../../types";
import { getSessionUser } from "../../auth/session";
import { getSiteSettings } from "../../settings/cache";
import {
  getProviderRow,
  logUsage,
  resolveSiteDefaultModel,
  type ProviderRow,
} from "../../db/queries";
import { decryptSecret } from "../../lib/crypto";
import { providerRegistry } from "../../providers/registry";
import { normalizeStoredProviderBaseUrl } from "../../providers/base-url";
import { getClientIp, enforceRateLimit } from "../../middleware/rate-limit";
import { publicProviderError } from "../../lib/errors";
import {
  buildEmailTranslatePrompt,
  splitEmailQuotes,
  unwrapEmailHtml,
} from "./email-prompt";

import "../../providers";

type C = Context<{ Bindings: AppBindings; Variables: AppVariables }>;

type SseWriter = {
  writeSSE: (message: { data: string }) => Promise<void>;
};

async function writeEvent(stream: SseWriter, ev: TranslateStreamEvent): Promise<void> {
  await stream.writeSSE({ data: JSON.stringify(ev) });
}

function parseAllowedModels(row: ProviderRow): string[] {
  let allowed: string[] = [];
  if (row.models) {
    try {
      const parsed = JSON.parse(row.models) as unknown;
      if (Array.isArray(parsed)) {
        allowed = parsed.filter((m): m is string => typeof m === "string");
      }
    } catch {
      // ignore corrupt JSON
    }
  }
  if (allowed.length === 0 && row.default_model) {
    allowed = [row.default_model];
  }
  return allowed;
}

function toTranslateRequest(req: TranslateEmailRequest, html: string): TranslateRequest {
  const prompt = buildEmailTranslatePrompt(req, html);
  return {
    text: html,
    sourceLang: req.sourceLang || "auto",
    targetLang: req.targetLang,
    stream: req.stream,
    providerId: req.providerId,
    model: req.model,
    promptOverride: prompt,
  };
}

/**
 * POST /api/translate/email
 * Whole-email HTML translation with a fixed layout-preserving prompt.
 * `display: "bilingual"` interleaves source + translation in one HTML response.
 */
export async function handleTranslateEmail(c: C): Promise<Response> {
  let req: TranslateEmailRequest;
  try {
    req = (await c.req.json()) as TranslateEmailRequest;
  } catch {
    return c.json({ error: "invalid JSON body" }, 400);
  }

  if (!req.html?.trim() || !req.targetLang?.trim()) {
    return c.json({ error: "html and targetLang are required" }, 400);
  }

  const preserveQuotes = req.preserveQuotes !== false;
  const { body, tail } = splitEmailQuotes(req.html.trim(), preserveQuotes);
  if (!body) {
    return c.json({ error: "no translatable email body" }, 400);
  }
  if (body.length > MAX_EMAIL_HTML_CHARS) {
    return c.json(
      {
        error: `html exceeds maximum length of ${MAX_EMAIL_HTML_CHARS} characters`,
      },
      400,
    );
  }

  const user = await getSessionUser(
    c.req.header("cookie"),
    c.env.JWT_SECRET,
    c.req.header("authorization"),
  );
  const isPublic = !user;
  const settings = await getSiteSettings(c.env.SETTINGS_KV, c.env.DB);

  if (!settings.sitePublic && !user) {
    return c.json({ error: "site is private", authenticated: false }, 403);
  }

  const limit = user
    ? settings.authedRateLimitPerMinute
    : settings.publicRateLimitPerMinute;
  const blocked = await enforceRateLimit(c, limit);
  if (blocked) return blocked;

  let row: ProviderRow | null = null;
  let resolvedModel: string | undefined;

  if (user) {
    if (req.providerId) {
      row = await getProviderRow(c.env.DB, req.providerId);
      if (!row || !row.enabled) {
        return c.json({ error: "provider not available" }, 404);
      }
      const allowedModels = parseAllowedModels(row);
      resolvedModel = row.default_model ?? allowedModels[0];
      if (req.model) {
        if (!allowedModels.includes(req.model)) {
          return c.json({ error: "model not available" }, 404);
        }
        resolvedModel = req.model;
      }
    } else {
      const def = await resolveSiteDefaultModel(c.env.DB, settings);
      if (!def) {
        return c.json({ error: "no provider configured" }, 503);
      }
      row = await getProviderRow(c.env.DB, def.providerId);
      if (!row || !row.enabled) {
        return c.json({ error: "no provider configured" }, 503);
      }
      const allowedModels = parseAllowedModels(row);
      if (req.model) {
        if (!allowedModels.includes(req.model)) {
          return c.json({ error: "model not available" }, 404);
        }
        resolvedModel = req.model;
      } else {
        resolvedModel = def.model;
      }
    }
  } else {
    const publicModels = settings.publicModels ?? [];
    if (req.providerId && req.model) {
      const hit = publicModels.find(
        (m) => m.providerId === req.providerId && m.model === req.model,
      );
      if (!hit) {
        return c.json({ error: "model not available" }, 404);
      }
      row = await getProviderRow(c.env.DB, req.providerId);
      if (!row || !row.enabled) {
        return c.json({ error: "provider not available" }, 404);
      }
      resolvedModel = req.model;
    } else {
      const pdm = settings.publicDefaultModel;
      const def =
        pdm &&
        publicModels.some(
          (m) => m.providerId === pdm.providerId && m.model === pdm.model,
        )
          ? pdm
          : (publicModels[0] ?? null);
      if (!def) {
        return c.json({ error: "no public model configured" }, 503);
      }
      row = await getProviderRow(c.env.DB, def.providerId);
      if (!row || !row.enabled) {
        return c.json({ error: "public default model unavailable" }, 503);
      }
      resolvedModel = def.model;
    }
    if (!row) {
      return c.json({ error: "no provider configured" }, 503);
    }
  }

  const providerType = row.type as ProviderType;
  if (providerType === "deepl") {
    return c.json(
      {
        error: "DeepL provider does not support email HTML translation; use an LLM provider",
      },
      400,
    );
  }

  let apiKey: string;
  try {
    apiKey = await decryptSecret(row.encrypted_api_key, c.env.ENCRYPTION_KEY);
  } catch {
    return c.json({ error: "api key decryption failed" }, 500);
  }

  const ctx: ProviderContext = {
    apiKey,
    baseUrl: normalizeStoredProviderBaseUrl(providerType, row.base_url),
    defaultModel: resolvedModel,
    configJson: row.config_json
      ? (JSON.parse(row.config_json) as Record<string, unknown>)
      : undefined,
  };

  let adapter;
  try {
    adapter = providerRegistry.get(providerType);
  } catch {
    return c.json({ error: `provider type "${providerType}" not registered` }, 501);
  }

  const translateReq = toTranslateRequest(req, body);
  const clientWantsStream = req.stream === true;
  const wantStream = clientWantsStream && adapter.translateStream !== undefined;
  const providerRowId = row.id;
  const usageChars = body.length;

  const finalize = (raw: string) => {
    const translated = unwrapEmailHtml(raw);
    return tail ? `${translated}${tail}` : translated;
  };

  if (wantStream && adapter.translateStream) {
    return streamSSE(c, async (stream) => {
      try {
        // Buffer full HTML before emitting — partial tags would break the page.
        const reader = adapter.translateStream!(translateReq, ctx).getReader();
        const decoder = new TextDecoder();
        let full = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            if (text) full += text;
          }
          const end = decoder.decode();
          if (end) full += end;
        } finally {
          reader.releaseLock();
        }

        const translatedText = finalize(full);
        await writeEvent(stream, { type: "delta", text: translatedText });
        await writeEvent(stream, {
          type: "done",
          translatedText,
          provider: providerType,
        });
        c.executionCtx?.waitUntil(
          logUsage(c.env.DB, providerRowId, usageChars, isPublic, getClientIp(c)),
        );
      } catch (e) {
        await writeEvent(stream, { type: "error", error: publicProviderError(e) });
      }
    });
  }

  if (clientWantsStream) {
    try {
      const result = await adapter.translate(translateReq, ctx);
      const translatedText = finalize(result.translatedText);
      const final = {
        translatedText,
        provider: result.provider,
        usage: result.usage,
        detectedSourceLang: result.detectedSourceLang,
      };
      c.executionCtx?.waitUntil(
        logUsage(c.env.DB, providerRowId, usageChars, isPublic, getClientIp(c)),
      );
      return streamSSE(c, async (stream) => {
        await writeEvent(stream, { type: "delta", text: translatedText });
        await writeEvent(stream, { type: "done", ...final });
      });
    } catch (e) {
      return streamSSE(c, async (stream) => {
        await writeEvent(stream, { type: "error", error: publicProviderError(e) });
      });
    }
  }

  try {
    const result = await adapter.translate(translateReq, ctx);
    const translatedText = finalize(result.translatedText);
    c.executionCtx?.waitUntil(
      logUsage(c.env.DB, providerRowId, usageChars, isPublic, getClientIp(c)),
    );
    return c.json({
      translatedText,
      provider: result.provider,
      usage: result.usage,
      detectedSourceLang: result.detectedSourceLang,
    });
  } catch (e) {
    return c.json({ error: publicProviderError(e) }, 502);
  }
}
