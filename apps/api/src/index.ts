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
import { RateLimiter } from "./durable-objects/rate-limiter";

// Side-effect: register every provider adapter into the registry at startup.
import "./providers";

const app = new Hono<{ Bindings: AppBindings; Variables: AppVariables }>();

app.use("*", logger());
app.use(
  "*",
  cors({
    // Lock down to your production domain before deploy.
    origin: ["http://localhost:5173", "https://yourdomain.com"],
    credentials: true,
  }),
);

// Health check — minimum closed loop.
app.get("/api/ping", (c) =>
  c.json({ ok: true, service: "opentranslator-api", env: c.env.ENV }),
);

app.route("/api/translate", translateRoute);
app.route("/api/auth", authRoute);

// Admin endpoints sit behind JWT auth.
app.use("/api/admin/*", authMiddleware);
app.route("/api/admin/providers", adminProvidersRoute);
app.route("/api/admin/settings", adminSettingsRoute);
app.route("/api/admin/features", adminFeaturesRoute);
app.route("/api/admin/glossary", adminGlossaryRoute);
app.route("/api/admin/usage", adminUsageRoute);

export default app;
export { RateLimiter };
