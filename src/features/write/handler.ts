import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import type {
  ProviderContext,
  ProviderType,
  TranslateRequest,
  WriteRequest,
  WriteStreamEvent,
} from "@opentranslator/shared-types";
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
import { buildWritePrompt } from "./prompt";
import { providerRegistry } from "../../providers/registry";
import { getClientIp, enforceRateLimit } from "../../middleware/rate-limit";
import { publicProviderError } from "../../lib/errors";

import "../../providers";

type C = Context<{ Bindings: AppBindings; Variables: AppVariables }>;

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

function validateWriteRequest(req: WriteRequest): string | null {
  if (!req.text?.trim()) return "text is required";
  if (!req.mode) return "mode is required";
  if (req.mode === "style" && !req.style) return "style is required for style mode";
  if (req.mode === "formality" && !req.formality) {
    return "formality is required for formality mode";
  }
  return null;
}

function toTranslateRequest(req: WriteRequest): TranslateRequest {
  const prompt = buildWritePrompt(req);
  return {
    text: req.text,
    // Placeholder — LLM adapters use promptOverride; language stays with the text.
    sourceLang: "auto",
    targetLang: "auto",
    stream: req.stream,
    providerId: req.providerId,
    model: req.model,
    promptOverride: prompt,
  };
}

export async function handleWrite(c: C): Promise<Response> {
  let req: WriteRequest;
  try {
    req = (await c.req.json()) as WriteRequest;
  } catch {
    return c.json({ error: "invalid JSON body" }, 400);
  }

  const validationError = validateWriteRequest(req);
  if (validationError) {
    return c.json({ error: validationError }, 400);
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
      // 匿名默认必须落在公开白名单内；站点默认若不在白名单则回落首个开放模型
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
      { error: "DeepL provider does not support AI Write; use an LLM provider" },
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
    baseUrl: row.base_url ?? undefined,
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

  const translateReq = toTranslateRequest(req);
  const clientWantsStream = req.stream === true;
  const wantStream = clientWantsStream && adapter.translateStream !== undefined;

  if (wantStream && adapter.translateStream) {
    const upstream = adapter.translateStream(translateReq, ctx);
    const providerRowId = row.id;
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
              data: JSON.stringify({ type: "delta", text } satisfies WriteStreamEvent),
            });
          }
        }
        const tail = decoder.decode();
        if (tail) {
          full += tail;
          await stream.writeSSE({
            data: JSON.stringify({ type: "delta", text: tail } satisfies WriteStreamEvent),
          });
        }
        await stream.writeSSE({
          data: JSON.stringify({
            type: "done",
            revisedText: full,
            provider: providerType,
          } satisfies WriteStreamEvent),
        });
        c.executionCtx?.waitUntil(
          logUsage(c.env.DB, providerRowId, req.text.length, isPublic, getClientIp(c)),
        );
      } catch (e) {
        await stream.writeSSE({
          data: JSON.stringify({
            type: "error",
            error: publicProviderError(e),
          } satisfies WriteStreamEvent),
        });
      } finally {
        reader.releaseLock();
      }
    });
  }

  if (clientWantsStream && !adapter.translateStream) {
    try {
      const result = await adapter.translate(translateReq, ctx);
      const final = {
        revisedText: result.translatedText,
        provider: result.provider,
        usage: result.usage,
      };
      c.executionCtx?.waitUntil(
        logUsage(c.env.DB, row.id, req.text.length, isPublic, getClientIp(c)),
      );
      return streamSSE(c, async (stream) => {
        await stream.writeSSE({
          data: JSON.stringify({
            type: "delta",
            text: final.revisedText,
          } satisfies WriteStreamEvent),
        });
        await stream.writeSSE({
          data: JSON.stringify({ type: "done", ...final } satisfies WriteStreamEvent),
        });
      });
    } catch (e) {
      return streamSSE(c, async (stream) => {
        await stream.writeSSE({
          data: JSON.stringify({
            type: "error",
            error: publicProviderError(e),
          } satisfies WriteStreamEvent),
        });
      });
    }
  }

  try {
    const result = await adapter.translate(translateReq, ctx);
    c.executionCtx?.waitUntil(
      logUsage(c.env.DB, row.id, req.text.length, isPublic, getClientIp(c)),
    );
    return c.json({
      revisedText: result.translatedText,
      provider: result.provider,
      usage: result.usage,
    });
  } catch (e) {
    return c.json({ error: publicProviderError(e) }, 502);
  }
}
