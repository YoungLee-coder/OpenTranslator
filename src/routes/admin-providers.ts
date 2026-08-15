import { Hono } from "hono";
import type {
  CreateProviderRequest,
  ProviderType,
  PublicModelRef,
  TestProviderLatencyRequest,
  TestProviderLatencyResponse,
} from "@opentranslator/shared-types";
import type { AppBindings, AppVariables } from "../types";
import { providerSchemas } from "../providers/schema";
import { normalizeStoredProviderBaseUrl } from "../providers/base-url";
import {
  clearPublicDefaultFlag,
  deleteProvider,
  getProviderRow,
  insertProvider,
  listProviderRecords,
  providerRowToRecord,
  updateProvider,
  type ProviderPatch,
} from "../db/queries";
import { decryptSecret, encryptSecret } from "../lib/crypto";
import { getSiteSettings, invalidateSiteSettings, prunePublicModelRefs, updateSetting } from "../settings/cache";
import { probeProviderLatency } from "../providers/latency-probe";

const adminProvidersRoute = new Hono<{
  Bindings: AppBindings;
  Variables: AppVariables;
}>();

/** GET /api/admin/providers — list all (no api keys). */
adminProvidersRoute.get("/", async (c) => {
  const [providers, settings] = await Promise.all([
    listProviderRecords(c.env.DB),
    getSiteSettings(c.env.KV, c.env.DB),
  ]);
  return c.json({
    providers,
    types: Object.keys(providerSchemas) as ProviderType[],
    defaultModel: settings.defaultModel ?? null,
  });
});

/** GET /api/admin/providers/schema — form schema per provider type. */
adminProvidersRoute.get("/schema", (c) => c.json({ schemas: providerSchemas }));

function isModelRef(m: unknown): m is PublicModelRef {
  if (typeof m !== "object" || m === null) return false;
  const r = m as Record<string, unknown>;
  return typeof r.providerId === "string" && typeof r.model === "string";
}

/** PUT /api/admin/providers/default-model — 站点默认模型的唯一写入面（providers 权限）。 */
adminProvidersRoute.put("/default-model", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { defaultModel?: unknown } | null;
  if (!body || typeof body !== "object") {
    return c.json({ error: "invalid body" }, 400);
  }
  if (!("defaultModel" in body)) {
    return c.json({ error: "defaultModel is required" }, 400);
  }
  const m = body.defaultModel;
  if (m != null && m !== "" && !isModelRef(m)) {
    return c.json({ error: "invalid defaultModel" }, 400);
  }
  await updateSetting(
    c.env.KV,
    c.env.DB,
    "default_model",
    isModelRef(m) ? JSON.stringify(m) : "",
  );
  const settings = await getSiteSettings(c.env.KV, c.env.DB);
  return c.json({ defaultModel: settings.defaultModel ?? null });
});

/**
 * POST /api/admin/providers/test-latency — Worker → model API probe ("say hi").
 * Must be registered before /:id routes.
 */
adminProvidersRoute.post("/test-latency", async (c) => {
  const body = (await c.req.json().catch(() => null)) as TestProviderLatencyRequest | null;
  if (!body?.type || !providerSchemas[body.type]) {
    return c.json({ error: "valid provider type is required" }, 400);
  }

  let apiKey = body.apiKey?.trim() ?? "";
  if (!apiKey && body.providerId) {
    const row = await getProviderRow(c.env.DB, body.providerId);
    if (!row) return c.json({ error: "provider not found" }, 404);
    try {
      apiKey = await decryptSecret(row.encrypted_api_key, c.env.ENCRYPTION_KEY);
    } catch {
      return c.json({ error: "api key decryption failed" }, 500);
    }
  }
  if (!apiKey) {
    return c.json({ error: "apiKey is required" }, 400);
  }

  const result = await probeProviderLatency(body.type, {
    apiKey,
    baseUrl: normalizeStoredProviderBaseUrl(body.type, body.baseUrl?.trim()),
    defaultModel: body.model?.trim() || undefined,
    configJson: body.configJson,
  });

  const payload: TestProviderLatencyResponse = {
    ok: result.ok,
    latencyMs: result.latencyMs,
    status: result.status,
    error: result.error,
    replyPreview: result.replyPreview,
  };
  return c.json(payload);
});

/** GET /api/admin/providers/:id — fetch one. */
adminProvidersRoute.get("/:id", async (c) => {
  const row = await getProviderRow(c.env.DB, c.req.param("id"));
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json({ provider: providerRowToRecord(row) });
});

/** POST /api/admin/providers — create. */
adminProvidersRoute.post("/", async (c) => {
  const body = (await c.req.json().catch(() => null)) as CreateProviderRequest | null;
  if (!body?.type || !body.displayName || !body.apiKey) {
    return c.json({ error: "type, displayName, apiKey are required" }, 400);
  }
  if (!providerSchemas[body.type]) {
    return c.json({ error: `unknown provider type "${body.type}"` }, 400);
  }
  const encrypted = await encryptSecret(body.apiKey, c.env.ENCRYPTION_KEY);
  const id = crypto.randomUUID();
  if (body.isPublicDefault) {
    await clearPublicDefaultFlag(c.env.DB);
    await invalidateSiteSettings(c.env.KV);
  }
  // models 首项作为默认模型，兼容旧 defaultModel 字段与兜底展示。
  const modelsJson = body.models?.length ? JSON.stringify(body.models) : null;
  const defaultModel = body.models?.[0] ?? body.defaultModel ?? null;
  await insertProvider(c.env.DB, {
    id,
    type: body.type,
    display_name: body.displayName,
    encrypted_api_key: encrypted,
    base_url: normalizeStoredProviderBaseUrl(body.type, body.baseUrl) ?? null,
    default_model: defaultModel,
    models: modelsJson,
    config_json: body.configJson ? JSON.stringify(body.configJson) : null,
    enabled: body.enabled === false ? 0 : 1,
    is_public_default: body.isPublicDefault ? 1 : 0,
  });
  const row = await getProviderRow(c.env.DB, id);
  return c.json({ provider: row ? providerRowToRecord(row) : null }, 201);
});

/** PUT /api/admin/providers/:id — update. */
adminProvidersRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await getProviderRow(c.env.DB, id);
  if (!existing) return c.json({ error: "not found" }, 404);
  const body = (await c.req.json().catch(() => null)) as Partial<CreateProviderRequest> | null;
  if (!body) return c.json({ error: "invalid body" }, 400);
  if (body.type !== undefined && !providerSchemas[body.type]) {
    return c.json({ error: `unknown provider type "${body.type}"` }, 400);
  }

  const patch: ProviderPatch = {};
  if (body.type !== undefined) patch.type = body.type;
  if (body.displayName !== undefined) patch.display_name = body.displayName;
  if (body.baseUrl !== undefined) {
    const type = (body.type ?? existing.type) as ProviderType;
    patch.base_url = normalizeStoredProviderBaseUrl(type, body.baseUrl) ?? null;
  }
  // models 与 default_model 联动：传了 models 就从首项派生默认模型。
  if (body.models !== undefined) {
    patch.models = body.models.length ? JSON.stringify(body.models) : null;
    patch.default_model = body.models[0] ?? null;
  } else if (body.defaultModel !== undefined) {
    patch.default_model = body.defaultModel || null;
  }
  if (body.configJson !== undefined) {
    patch.config_json =
      body.configJson && Object.keys(body.configJson).length > 0
        ? JSON.stringify(body.configJson)
        : null;
  }
  if (body.enabled !== undefined) patch.enabled = body.enabled ? 1 : 0;
  if (body.isPublicDefault !== undefined) {
    if (body.isPublicDefault) {
      await clearPublicDefaultFlag(c.env.DB);
      await invalidateSiteSettings(c.env.KV);
    }
    patch.is_public_default = body.isPublicDefault ? 1 : 0;
  }
  if (body.apiKey) {
    patch.encrypted_api_key = await encryptSecret(body.apiKey, c.env.ENCRYPTION_KEY);
  }
  await updateProvider(c.env.DB, id, patch);
  // 改了 models 时，级联剔除公开白名单中已被移除的模型引用。
  if (body.models !== undefined) {
    const newModels = new Set(body.models);
    await prunePublicModelRefs(c.env.KV, c.env.DB, (r) =>
      r.providerId === id && !newModels.has(r.model),
    );
  }
  const row = await getProviderRow(c.env.DB, id);
  return c.json({ provider: row ? providerRowToRecord(row) : null });
});

/** DELETE /api/admin/providers/:id. */
adminProvidersRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const ok = await deleteProvider(c.env.DB, id);
  if (!ok) return c.json({ error: "not found" }, 404);
  // 级联清理公开白名单中指向该 provider 的引用（含公开默认 provider 与默认模型）。
  await prunePublicModelRefs(
    c.env.KV,
    c.env.DB,
    (r) => r.providerId === id,
    (pid) => pid === id,
  );
  return c.json({ ok: true });
});

export default adminProvidersRoute;
