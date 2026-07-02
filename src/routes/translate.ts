import { Hono } from "hono";
import type { AppBindings, AppVariables } from "../types";
import { handleListModels, handleTranslate } from "../features/translate/handler";

const translateRoute = new Hono<{
  Bindings: AppBindings;
  Variables: AppVariables;
}>();

translateRoute.get("/ping", (c) => c.json({ ok: true, route: "translate" }));

// GET /api/translate/models — 当前用户可选的模型列表与默认项（公开，登录/匿名分别返回）
translateRoute.get("/models", handleListModels);

// POST /api/translate { text, sourceLang, targetLang, stream?, providerId?, model? }
// -> JSON { translatedText, provider, usage? } or SSE stream of deltas.
translateRoute.post("/", handleTranslate);

export default translateRoute;
