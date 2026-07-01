import type { AuthUser } from "@opentranslator/shared-types";

export interface AppBindings {
  DB: D1Database;
  SETTINGS_KV: KVNamespace;
  RATE_LIMITER: DurableObjectNamespace;
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  ENV: string;
  ORIGINS?: string;
}

export interface AppVariables {
  user: AuthUser | null;
}

export type Bindings = AppBindings;
