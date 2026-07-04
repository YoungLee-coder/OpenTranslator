import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import type {
  ProviderContext,
  ProviderType,
  PublicModelRef,
  TranslateModelOption,
  TranslateModelsResponse,
  TranslateRequest,
  TranslateStreamEvent,
} from "@opentranslator/shared-types";
import type { AppBindings, AppVariables } from "../../types";
import { getSessionUser } from "../../auth/session";
import { getSiteSettings } from "../../settings/cache";
import {
  getPublicDefaultProviderRow,
  getProviderRow,
  listProviderRecords,
  logUsage,
  type ProviderRow,
} from "../../db/queries";
import { decryptSecret } from "../../lib/crypto";
import {
  getTranslationCache,
  setTranslationCache,
  translationCacheKey,
} from "../../lib/cache";
import { getAiExpertsConfig, resolveExpertId, isAiExpertsFeatureEnabled } from "../ai-experts/store";
import { listExpertMeta, GENERAL_EXPERT_ID } from "../../experts/registry";
import { buildTranslationPrompt } from "../../experts/prompt";
import { providerRegistry } from "../../providers/registry";
import { resolveModelLabel } from "../../providers/schema";
import { getClientIp, enforceRateLimit } from "../../middleware/rate-limit";

// Side-effect: register every adapter into the registry.
import "../../providers";

type C = Context<{ Bindings: AppBindings; Variables: AppVariables }>;

/** 解析一行 provider 声明的可选模型集合；旧记录无 models 时回落到 default_model。 */
function parseAllowedModels(row: ProviderRow): string[] {
  let allowed: string[] = [];
  if (row.models) {
    try {
      const parsed = JSON.parse(row.models) as unknown;
      if (Array.isArray(parsed)) {
        allowed = parsed.filter((m): m is string => typeof m === "string");
      }
    } catch {
      // 损坏的 JSON 忽略
    }
  }
  if (allowed.length === 0 && row.default_model) {
    allowed = [row.default_model];
  }
  return allowed;
}

/** GET /api/translate/models — 返回当前用户可选的模型与默认项。 */
export async function handleListModels(c: C): Promise<Response> {
  const user = await getSessionUser(c.req.header("cookie"), c.env.JWT_SECRET);
  const settings = await getSiteSettings(c.env.SETTINGS_KV, c.env.DB);

  // 私站且未登录：不暴露任何模型
  if (!user && !settings.sitePublic) {
    return c.json({ models: [], default: null } satisfies TranslateModelsResponse);
  }

  const records = await listProviderRecords(c.env.DB);

  if (user) {
    // 登录用户：所有 enabled provider 的全部已声明模型
    const models: TranslateModelOption[] = records
      .filter((p) => p.enabled)
      .flatMap((p) =>
        (p.models?.length ? p.models : p.defaultModel ? [p.defaultModel] : []).map(
          (m) => ({
            providerId: p.id,
            model: m,
            modelLabel: resolveModelLabel(p.type, m),
            providerName: p.displayName,
          }),
        ),
      );
    return c.json({ models, default: null } satisfies TranslateModelsResponse);
  }

  // 匿名：只返回公开白名单中仍有效的项——provider 存在且 enabled、
  // 且 model 仍在该 provider 声明的 models 集合内。读取兜底，避免白名单
  // 残留已删除/已禁用的模型而暴露给访客（写入侧见 admin-providers 的级联清理）。
  const publicModels = settings.publicModels ?? [];
  const models: TranslateModelOption[] = [];
  const validRefs: PublicModelRef[] = [];
  for (const m of publicModels) {
    const p = records.find((r) => r.id === m.providerId && r.enabled);
    if (!p) continue;
    const allowed = p.models?.length
      ? p.models
      : p.defaultModel
        ? [p.defaultModel]
        : [];
    if (!allowed.includes(m.model)) continue;
    models.push({
      providerId: m.providerId,
      model: m.model,
      modelLabel: resolveModelLabel(p.type, m.model),
      providerName: p.displayName,
    });
    validRefs.push(m);
  }
  const isRefValid = (
    m: PublicModelRef | null | undefined,
  ): m is PublicModelRef =>
    !!m && validRefs.some((v) => v.providerId === m.providerId && v.model === m.model);
  const def = isRefValid(settings.publicDefaultModel)
    ? settings.publicDefaultModel
    : (validRefs[0] ?? null);
  return c.json({ models, default: def } satisfies TranslateModelsResponse);
}

/** GET /api/translate/experts — enabled AI experts for the translator UI. */
export async function handleListExperts(c: C): Promise<Response> {
  const user = await getSessionUser(c.req.header("cookie"), c.env.JWT_SECRET);
  const settings = await getSiteSettings(c.env.SETTINGS_KV, c.env.DB);

  if (!user && !settings.sitePublic) {
    return c.json({ experts: [], defaultExpertId: GENERAL_EXPERT_ID });
  }

  if (!(await isAiExpertsFeatureEnabled(c.env.DB))) {
    return c.json({ experts: [], defaultExpertId: GENERAL_EXPERT_ID });
  }

  const config = await getAiExpertsConfig(c.env.SETTINGS_KV, c.env.DB);
  const experts = listExpertMeta(config.enabledIds);
  return c.json({
    experts,
    defaultExpertId: config.defaultExpertId ?? GENERAL_EXPERT_ID,
  });
}

export async function handleTranslate(c: C): Promise<Response> {
  let req: TranslateRequest;
  try {
    req = (await c.req.json()) as TranslateRequest;
  } catch {
    return c.json({ error: "invalid JSON body" }, 400);
  }

  // Ignore client-supplied prompt overrides — only the write API sets these server-side.
  if (req.promptOverride) {
    const { promptOverride: _, ...rest } = req;
    req = rest;
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

  // Resolve AI expert (when feature enabled via non-empty enabledIds).
  const expertId = await resolveExpertId(c.env.SETTINGS_KV, c.env.DB, req.expertId);
  if (expertId) {
    req = { ...req, expertId };
  } else {
    const { expertId: _, ...rest } = req;
    req = rest;
  }

  const promptBuilt = buildTranslationPrompt(req);
  const needsPostProcess = !!promptBuilt.postProcess;

  // Rate limit: stricter for anonymous, looser for logged-in admins.
  const limit = user
    ? settings.authedRateLimitPerMinute
    : settings.publicRateLimitPerMinute;
  const blocked = await enforceRateLimit(c, limit);
  if (blocked) return blocked;

  // ---- 选择 provider 与 model ----
  // 登录用户：可选任意 enabled provider 的已声明 model；
  // 匿名用户：只能在「公开模型」白名单内选，不选则用公开默认模型。
  let row: ProviderRow | null = null;
  let resolvedModel: string | undefined;

  if (user) {
    if (req.providerId) {
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
    // model 必须落在该供应商声明的集合内，避免越权调用其他模型
    const allowedModels = parseAllowedModels(row);
    resolvedModel = row.default_model ?? undefined;
    if (req.model) {
      if (!allowedModels.includes(req.model)) {
        return c.json({ error: "model not available" }, 404);
      }
      resolvedModel = req.model;
    }
  } else {
    // 匿名：只能在公开模型白名单内翻译；未开放任何模型则拒绝
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
      const def = settings.publicDefaultModel ?? publicModels[0] ?? null;
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
    defaultModel: resolvedModel,
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

  // 解耦"客户端要 SSE"与"适配器能流式"：客户端请求 stream 时始终返回 SSE，
  // 适配器不支持流式（如 DeepL）则一次性翻译后包成单帧 delta + done。
  // 否则前端 streamTranslate 按 SSE 协议解析普通 JSON 响应，零事件 → 结果不显示。
  const clientWantsStream = req.stream === true;
  const wantStream =
    clientWantsStream && adapter.translateStream !== undefined && !needsPostProcess;

  // Translation cache: serve identical repeats without hitting the upstream.
  const cacheKey = settings.translationCacheEnabled
    ? await translationCacheKey(req, row.id)
    : null;
  const cacheTtlSeconds = settings.translationCacheTtlHours * 3600;
  if (cacheKey) {
    const cached = await getTranslationCache(c.env.SETTINGS_KV, cacheKey);
    if (cached) {
      if (clientWantsStream) {
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
        if (cacheKey) void setTranslationCache(c.env.SETTINGS_KV, cacheKey, result, cacheTtlSeconds);
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

  // YAML-output experts need the full response before extraction — same as DeepL 非流式路径。
  if (clientWantsStream && (needsPostProcess || !adapter.translateStream)) {
    try {
      const result = await adapter.translate(req, ctx);
      let text = result.translatedText;
      if (promptBuilt.postProcess) text = promptBuilt.postProcess(text);
      const final = { ...result, translatedText: text };
      if (cacheKey) void setTranslationCache(c.env.SETTINGS_KV, cacheKey, final, cacheTtlSeconds);
      c.executionCtx?.waitUntil(logUsage(c.env.DB, row.id, req.text.length, isPublic, getClientIp(c)));
      return streamSSE(c, async (stream) => {
        await stream.writeSSE({
          data: JSON.stringify({ type: "delta", text } satisfies TranslateStreamEvent),
        });
        await stream.writeSSE({
          data: JSON.stringify({ type: "done", ...final } satisfies TranslateStreamEvent),
        });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return streamSSE(c, async (stream) => {
        await stream.writeSSE({
          data: JSON.stringify({ type: "error", error: msg } satisfies TranslateStreamEvent),
        });
      });
    }
  }

  // 非流式 JSON 路径（客户端未请求 SSE）。
  try {
    const result = await adapter.translate(req, ctx);
    let text = result.translatedText;
    if (promptBuilt.postProcess) text = promptBuilt.postProcess(text);
    const final = { ...result, translatedText: text };
    if (cacheKey) void setTranslationCache(c.env.SETTINGS_KV, cacheKey, final, cacheTtlSeconds);
    c.executionCtx?.waitUntil(logUsage(c.env.DB, row.id, req.text.length, isPublic, getClientIp(c)));
    return c.json(final);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return c.json({ error: msg }, 502);
  }
}
