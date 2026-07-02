import { Hono } from "hono";
import type {
  CreateProviderRequest,
  ProviderType,
} from "@opentranslator/shared-types";
import type { AppBindings, AppVariables } from "../types";
import { providerSchemas } from "../providers/schema";
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
import { encryptSecret } from "../lib/crypto";
import { invalidateSiteSettings } from "../settings/cache";

const adminProvidersRoute = new Hono<{
  Bindings: AppBindings;
  Variables: AppVariables;
}>();

/** GET /api/admin/providers — list all (no api keys). */
adminProvidersRoute.get("/", async (c) => {
  const providers = await listProviderRecords(c.env.DB);
  return c.json({
    providers,
    types: Object.keys(providerSchemas) as ProviderType[],
  });
});

/** GET /api/admin/providers/schema — form schema per provider type. */
adminProvidersRoute.get("/schema", (c) => c.json({ schemas: providerSchemas }));

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
    await invalidateSiteSettings(c.env.SETTINGS_KV);
  }
  // models 首项作为默认模型，兼容旧 defaultModel 字段与兜底展示。
  const modelsJson = body.models?.length ? JSON.stringify(body.models) : null;
  const defaultModel = body.models?.[0] ?? body.defaultModel ?? null;
  await insertProvider(c.env.DB, {
    id,
    type: body.type,
    display_name: body.displayName,
    encrypted_api_key: encrypted,
    base_url: body.baseUrl ?? null,
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

  const patch: ProviderPatch = {};
  if (body.type !== undefined) patch.type = body.type;
  if (body.displayName !== undefined) patch.display_name = body.displayName;
  if (body.baseUrl !== undefined) patch.base_url = body.baseUrl || null;
  // models 与 default_model 联动：传了 models 就从首项派生默认模型。
  if (body.models !== undefined) {
    patch.models = body.models.length ? JSON.stringify(body.models) : null;
    patch.default_model = body.models[0] ?? null;
  } else if (body.defaultModel !== undefined) {
    patch.default_model = body.defaultModel || null;
  }
  if (body.configJson !== undefined) {
    patch.config_json = body.configJson ? JSON.stringify(body.configJson) : null;
  }
  if (body.enabled !== undefined) patch.enabled = body.enabled ? 1 : 0;
  if (body.isPublicDefault !== undefined) {
    if (body.isPublicDefault) {
      await clearPublicDefaultFlag(c.env.DB);
      await invalidateSiteSettings(c.env.SETTINGS_KV);
    }
    patch.is_public_default = body.isPublicDefault ? 1 : 0;
  }
  if (body.apiKey) {
    patch.encrypted_api_key = await encryptSecret(body.apiKey, c.env.ENCRYPTION_KEY);
  }
  await updateProvider(c.env.DB, id, patch);
  const row = await getProviderRow(c.env.DB, id);
  return c.json({ provider: row ? providerRowToRecord(row) : null });
});

/** DELETE /api/admin/providers/:id. */
adminProvidersRoute.delete("/:id", async (c) => {
  const ok = await deleteProvider(c.env.DB, c.req.param("id"));
  if (!ok) return c.json({ error: "not found" }, 404);
  await invalidateSiteSettings(c.env.SETTINGS_KV);
  return c.json({ ok: true });
});

export default adminProvidersRoute;
