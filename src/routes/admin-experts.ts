import { Hono } from "hono";
import type { AiExpertsConfig } from "@opentranslator/shared-types";
import type { AppBindings, AppVariables } from "../types";
import { listAllExperts, listExpertMeta, toExpertMeta } from "../experts/registry";
import { getAiExpertsConfig, saveAiExpertsConfig } from "../features/ai-experts/store";

const adminExpertsRoute = new Hono<{
  Bindings: AppBindings;
  Variables: AppVariables;
}>();

/** GET /api/admin/experts — all bundled experts + site config. */
adminExpertsRoute.get("/", async (c) => {
  const config = await getAiExpertsConfig(c.env.SETTINGS_KV, c.env.DB);
  const experts = listAllExperts().map((e) => toExpertMeta(e));
  return c.json({ experts, config });
});

/** PUT /api/admin/experts { enabledIds, defaultExpertId } */
adminExpertsRoute.put("/", async (c) => {
  const body = (await c.req.json().catch(() => null)) as Partial<AiExpertsConfig> | null;
  if (!body || !Array.isArray(body.enabledIds)) {
    return c.json({ error: "enabledIds (string[]) is required" }, 400);
  }
  const validIds = new Set(listAllExperts().map((e) => e.id));
  const enabledIds = body.enabledIds.filter((id) => validIds.has(id));
  const defaultExpertId =
    typeof body.defaultExpertId === "string" ? body.defaultExpertId : "general";
  if (defaultExpertId !== "general" && !validIds.has(defaultExpertId)) {
    return c.json({ error: "unknown defaultExpertId" }, 400);
  }
  const config = await saveAiExpertsConfig(c.env.SETTINGS_KV, c.env.DB, {
    enabledIds,
    defaultExpertId,
  });
  const experts = listExpertMeta(listAllExperts().map((e) => e.id));
  return c.json({ experts, config });
});

export default adminExpertsRoute;
