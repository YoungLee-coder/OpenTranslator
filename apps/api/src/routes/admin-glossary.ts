import { Hono } from "hono";
import type { GlossaryTerm } from "@opentranslator/shared-types";
import type { AppBindings, AppVariables } from "../types";
import { getGlossary, saveGlossary } from "../features/glossary/store";

const adminGlossaryRoute = new Hono<{
  Bindings: AppBindings;
  Variables: AppVariables;
}>();

/** GET /api/admin/glossary — list all terms. */
adminGlossaryRoute.get("/", async (c) => {
  const terms = await getGlossary(c.env.SETTINGS_KV, c.env.DB);
  return c.json({ terms });
});

/** POST /api/admin/glossary { source, target, targetLang } — add a term. */
adminGlossaryRoute.post("/", async (c) => {
  const body = (await c.req.json().catch(() => null)) as Partial<GlossaryTerm> | null;
  if (!body?.source?.trim() || !body?.target?.trim() || !body?.targetLang?.trim()) {
    return c.json({ error: "source, target, targetLang are required" }, 400);
  }
  const terms = await getGlossary(c.env.SETTINGS_KV, c.env.DB);
  const term: GlossaryTerm = {
    id: crypto.randomUUID(),
    source: body.source.trim(),
    target: body.target.trim(),
    targetLang: body.targetLang.trim(),
  };
  const next = [...terms, term];
  await saveGlossary(c.env.SETTINGS_KV, c.env.DB, next);
  return c.json({ term }, 201);
});

/** DELETE /api/admin/glossary/:id — remove a term. */
adminGlossaryRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const terms = await getGlossary(c.env.SETTINGS_KV, c.env.DB);
  const next = terms.filter((t) => t.id !== id);
  if (next.length === terms.length) return c.json({ error: "not found" }, 404);
  await saveGlossary(c.env.SETTINGS_KV, c.env.DB, next);
  return c.json({ ok: true });
});

export default adminGlossaryRoute;
