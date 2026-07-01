-- Site global settings: key-value + JSON, add switches anytime without migration.
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER
);

-- Providers: `type` distinguishes vendor, config_json holds vendor-specific params.
CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                  -- openai | claude | gemini | deepseek | openrouter | aihubmix | azure_openai | custom
  display_name TEXT NOT NULL,
  encrypted_api_key TEXT NOT NULL,
  base_url TEXT,
  default_model TEXT,
  config_json TEXT,
  enabled BOOLEAN DEFAULT 1,
  is_public_default BOOLEAN DEFAULT 0,
  created_at INTEGER,
  updated_at INTEGER
);

-- Dashboard admin accounts.
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'admin',           -- reserved for multi-role permissions
  created_at INTEGER
);

-- Usage logs: power stats and future billing (migrate to Analytics Engine at scale).
CREATE TABLE IF NOT EXISTS usage_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id TEXT,
  char_count INTEGER,
  is_public_request BOOLEAN,
  client_ip TEXT,
  created_at INTEGER
);

-- Feature module registry: grey release and future feature expansion.
CREATE TABLE IF NOT EXISTS feature_modules (
  key TEXT PRIMARY KEY,                -- translate | glossary | doc_translate ...
  name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT 1,
  config_json TEXT,
  created_at INTEGER
);

-- Seed default site settings.
INSERT OR IGNORE INTO site_settings (key, value, updated_at) VALUES
  ('site_public', 'true', CAST(strftime('%s','now') AS INTEGER)),
  ('public_rate_limit_per_minute', '20', CAST(strftime('%s','now') AS INTEGER)),
  ('authed_rate_limit_per_minute', '60', CAST(strftime('%s','now') AS INTEGER)),
  ('translation_cache_enabled', 'true', CAST(strftime('%s','now') AS INTEGER));

-- Seed feature module registry: grey release + dynamic dashboard nav.
INSERT OR IGNORE INTO feature_modules (key, name, enabled, config_json, created_at) VALUES
  ('translate', '翻译', 1, NULL, CAST(strftime('%s','now') AS INTEGER)),
  ('glossary', '术语库', 1, NULL, CAST(strftime('%s','now') AS INTEGER));
