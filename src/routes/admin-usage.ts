import { Hono } from "hono";
import type { AppBindings, AppVariables } from "../types";
import { getUsageSummary } from "../db/queries";

const adminUsageRoute = new Hono<{
  Bindings: AppBindings;
  Variables: AppVariables;
}>();

/** GET /api/admin/usage — aggregate counts for the dashboard overview. */
adminUsageRoute.get("/", async (c) => {
  const usage = await getUsageSummary(c.env.DB);
  return c.json({ usage });
});

export default adminUsageRoute;
