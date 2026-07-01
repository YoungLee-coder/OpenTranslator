import { Hono } from "hono";
import type { AppBindings, AppVariables } from "../types";
import { handleTranslate } from "../features/translate/handler";

const translateRoute = new Hono<{
  Bindings: AppBindings;
  Variables: AppVariables;
}>();

translateRoute.get("/ping", (c) => c.json({ ok: true, route: "translate" }));

// POST /api/translate { text, sourceLang, targetLang, stream?, providerId? }
// -> JSON { translatedText, provider, usage? } or SSE stream of deltas.
translateRoute.post("/", handleTranslate);

export default translateRoute;
