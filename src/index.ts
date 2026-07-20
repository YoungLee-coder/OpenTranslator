import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import type { AppBindings, AppVariables } from "./types";
import { authMiddleware } from "./middleware/auth";
import translateRoute from "./routes/translate";
import writeRoute from "./routes/write";
import authRoute from "./routes/auth";
import adminProvidersRoute from "./routes/admin-providers";
import adminSettingsRoute from "./routes/admin-settings";
import adminFeaturesRoute from "./routes/admin-features";
import adminExpertsRoute from "./routes/admin-experts";
import adminUsageRoute from "./routes/admin-usage";
import adminDbRoute from "./routes/admin-db";
import adminProfileRoute from "./routes/admin-profile";
import {
  getCurrentDbVersion,
  getPendingMigrations,
  initDatabase,
} from "./db/init";
import { getAdminCount } from "./db/queries";
import { invalidateSiteSettings } from "./settings/cache";
import { RateLimiter } from "./durable-objects/rate-limiter";
import { constantTimeEqual } from "./lib/bytes";

// Side-effect: register every provider adapter into the registry at startup.
import "./providers";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use("*", logger());
app.use(
  "*",
  cors({
    // Allowed origins come from the ORIGINS env var (comma-separated).
    // Set it in Cloudflare Dashboard → Worker → Settings → Variables.
    // Falls back to localhost for local dev when ORIGINS is unset.
    origin: (origin, c) => {
      const raw = c.env.ORIGINS;
      const list = raw
        ? raw.split(",").map((s: string) => s.trim()).filter(Boolean)
        : ["http://localhost:5173"];
      return list.includes(origin) ? origin : null;
    },
    credentials: true,
  }),
);

// Health check — binding presence + schema/admin readiness (no env/deploy details).
app.get("/api/ping", async (c) => {
  const bindings = { db: !!c.env.DB, kv: !!c.env.SETTINGS_KV };
  const base = {
    ok: true,
    service: "opentranslator-api",
    bindings,
    dbReady: false,
    needsMigration: false,
    adminReady: false,
  };

  if (!bindings.db || !bindings.kv) {
    return c.json(base);
  }

  try {
    const current = await getCurrentDbVersion(c.env.DB);
    const dbReady = current !== null;
    const needsMigration =
      dbReady && getPendingMigrations(current).length > 0;
    const adminReady =
      dbReady && (await getAdminCount(c.env.DB)) > 0;
    return c.json({ ...base, dbReady, needsMigration, adminReady });
  } catch {
    return c.json(base);
  }
});

// Database initializer — JWT_SECRET via X-Init-Secret for first-time bootstrap.
// Pending migrations (db already initialized) may run without the secret so the
// setup page can one-click upgrade after deploy.
app.post("/api/init", async (c) => {
  if (!c.env.DB || !c.env.SETTINGS_KV) {
    return c.text("Bindings not ready", 503);
  }

  let current: string | null = null;
  try {
    current = await getCurrentDbVersion(c.env.DB);
  } catch {
    current = null;
  }
  const pending = getPendingMigrations(current);
  const isBootstrap = current === null;
  const needsMigration = !isBootstrap && pending.length > 0;

  // 首次建表必须持有 JWT_SECRET；仅升级待迁移时允许无密钥（幂等、可公开触发）。
  if (!needsMigration) {
    const secret = c.req.header("X-Init-Secret") ?? "";
    const expected = c.env.JWT_SECRET ?? "";
    if (!expected || !constantTimeEqual(secret, expected)) {
      return c.text("Unauthorized", 401);
    }
  }

  const result = await initDatabase({ env: c.env });
  // 迁移可能改了 site_settings；清 KV 缓存与 admin migrate 对齐
  await invalidateSiteSettings(c.env.SETTINGS_KV);
  return c.json({ ok: true, applied: result.applied });
});

app.route("/api/translate", translateRoute);
app.route("/api/write", writeRoute);
app.route("/api/auth", authRoute);

// Admin endpoints sit behind JWT auth.
app.use("/api/admin/*", authMiddleware);
app.route("/api/admin/providers", adminProvidersRoute);
app.route("/api/admin/settings", adminSettingsRoute);
app.route("/api/admin/features", adminFeaturesRoute);
app.route("/api/admin/experts", adminExpertsRoute);
app.route("/api/admin/usage", adminUsageRoute);
app.route("/api/admin/db", adminDbRoute);
app.route("/api/admin/profile", adminProfileRoute);

// Catch-all: anything that isn't an /api route is served as a static asset
// from the bundled frontend (SPA). With run_worker_first = true, the Worker
// runs first; non-API paths fall through to the ASSETS binding, which handles
// client-side routing via single-page-application fallback.
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
export { RateLimiter };
