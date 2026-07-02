import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import type { AppBindings, AppVariables } from "./types";
import { authMiddleware } from "./middleware/auth";
import translateRoute from "./routes/translate";
import authRoute from "./routes/auth";
import adminProvidersRoute from "./routes/admin-providers";
import adminSettingsRoute from "./routes/admin-settings";
import adminFeaturesRoute from "./routes/admin-features";
import adminGlossaryRoute from "./routes/admin-glossary";
import adminUsageRoute from "./routes/admin-usage";
import adminDbRoute from "./routes/admin-db";
import { initDatabase } from "./db/init";
import { RateLimiter } from "./durable-objects/rate-limiter";

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

// Health check — minimum closed loop. Also reports whether the D1 / KV
// bindings are attached so the frontend can redirect to a setup-required
// page when the Worker is deployed without them.
app.get("/api/ping", (c) =>
  c.json({
    ok: true,
    service: "opentranslator-api",
    env: c.env.ENV,
    bindings: { db: !!c.env.DB, kv: !!c.env.SETTINGS_KV },
  }),
);

// Database initializer — guarded by JWT_SECRET. Idempotent, safe to call
// repeatedly. Call it manually once after first deploy to create tables.
app.get("/api/init/:secret", async (c) => {
  const secret = c.req.param("secret");
  if (!c.env.JWT_SECRET || secret !== c.env.JWT_SECRET) {
    return c.text("Unauthorized", 401);
  }
  const result = await initDatabase({ env: c.env });
  return c.json({ ok: true, applied: result.applied });
});

app.route("/api/translate", translateRoute);
app.route("/api/auth", authRoute);

// Admin endpoints sit behind JWT auth.
app.use("/api/admin/*", authMiddleware);
app.route("/api/admin/providers", adminProvidersRoute);
app.route("/api/admin/settings", adminSettingsRoute);
app.route("/api/admin/features", adminFeaturesRoute);
app.route("/api/admin/glossary", adminGlossaryRoute);
app.route("/api/admin/usage", adminUsageRoute);
app.route("/api/admin/db", adminDbRoute);

// Catch-all: anything that isn't an /api route is served as a static asset
// from the bundled frontend (SPA). With run_worker_first = true, the Worker
// runs first; non-API paths fall through to the ASSETS binding, which handles
// client-side routing via single-page-application fallback.
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
export { RateLimiter };
