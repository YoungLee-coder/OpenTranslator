import { Hono } from "hono";
import type { AppBindings, AppVariables } from "../types";
import { handleWrite } from "../features/write/handler";

const writeRoute = new Hono<{
  Bindings: AppBindings;
  Variables: AppVariables;
}>();

// POST /api/write { text, lang, mode, style?, formality?, stream?, providerId?, model? }
writeRoute.post("/", handleWrite);

export default writeRoute;
