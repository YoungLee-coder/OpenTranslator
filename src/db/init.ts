/**
 * Idempotent database initializer.
 *
 * 模式参照 cloud-mail：暴露一个 `POST /api/init` 接口，用 `X-Init-Secret`
 * 头携带 JWT_SECRET 做访问凭证（密钥不进 URL），被调用就在 Worker 里跑
 * 建表 + 种子数据 + 增量迁移，全部幂等，可重复执行。
 *
 * - 建表用 `CREATE TABLE IF NOT EXISTS`
 * - 种子数据用 `INSERT OR IGNORE`
 * - 增量改表（ALTER TABLE）用 try/catch 跳过已存在字段
 * - 版本化迁移方法逐个执行；仅成功后才写入 `_migrations`，失败可重试 */

interface InitContext {
  env: { DB: D1Database; SETTINGS_KV: KVNamespace };
}

/** 执行单条 SQL，吞掉「已存在」类错误，返回是否真的执行了。 */
async function runSafe(db: D1Database, sql: string): Promise<boolean> {
  try {
    await db.prepare(sql).run();
    return true;
  } catch (e) {
    console.warn(`[init] 跳过：${(e as Error).message}`);
    return false;
  }
}

/** v0.1.0：初始表结构 + 种子数据。 */
async function v0_1_0({ env }: InitContext): Promise<void> {
  const db = env.DB;

  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      display_name TEXT NOT NULL,
      encrypted_api_key TEXT NOT NULL,
      base_url TEXT,
      default_model TEXT,
      models TEXT,
      config_json TEXT,
      enabled BOOLEAN DEFAULT 1,
      is_public_default BOOLEAN DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password_hash TEXT,
      role TEXT DEFAULT 'admin',
      created_at INTEGER,
      avatar_updated_at INTEGER
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id TEXT,
      char_count INTEGER,
      is_public_request BOOLEAN,
      client_ip TEXT,
      created_at INTEGER
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS feature_modules (
      key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      enabled BOOLEAN DEFAULT 1,
      config_json TEXT,
      created_at INTEGER
    )`),
  ]);

  const now = Math.floor(Date.now() / 1000);
  await db.batch([
    db.prepare(
      `INSERT OR IGNORE INTO site_settings (key, value, updated_at) VALUES
        ('site_public', 'true', ${now}),
        ('public_rate_limit_per_minute', '20', ${now}),
        ('authed_rate_limit_per_minute', '60', ${now}),
        ('translation_cache_enabled', 'true', ${now})`,
    ),
    db.prepare(
      `INSERT OR IGNORE INTO feature_modules (key, name, enabled, config_json, created_at) VALUES
        ('public-access', '公开访问', 1, NULL, ${now}),
        ('ai-experts', 'AI 专家', 0, NULL, ${now})`,
    ),
  ]);
}

/** v0.2.0：为翻译结果缓存补一个 TTL（小时）的种子配置项。 */
async function v0_2_0({ env }: InitContext): Promise<void> {
  const db = env.DB;
  const now = Math.floor(Date.now() / 1000);
  await db.batch([
    db.prepare(
      `INSERT OR IGNORE INTO site_settings (key, value, updated_at) VALUES
        ('translation_cache_ttl_hours', '720', ${now})`,
    ),
  ]);
}

/** v0.3.0：把老的 translate 模块替换为 public-access，enabled 对齐当前 site_public。 */
async function v0_3_0({ env }: InitContext): Promise<void> {
  const db = env.DB;
  const now = Math.floor(Date.now() / 1000);
  // 以当前 site_public 的值作为 public-access 模块的初始 enabled，保持门禁语义一致。
  const row = await db
    .prepare("SELECT value FROM site_settings WHERE key = 'site_public'")
    .first<{ value: string }>();
  const enabled = row?.value === "false" ? 0 : 1;
  await db.batch([
    db.prepare(`DELETE FROM feature_modules WHERE key = 'translate'`),
    db.prepare(
      `INSERT OR IGNORE INTO feature_modules (key, name, enabled, config_json, created_at) VALUES
        ('public-access', '公开访问', ${enabled}, NULL, ${now})`,
    ),
  ]);
}

/** v0.4.0：providers 表新增 models 列（JSON 数组），支持单供应商多模型。 */
async function v0_4_0({ env }: InitContext): Promise<void> {
  await addColumn(env.DB, "providers", "models", "TEXT");
}

/** v0.5.0：admin_users 新增 avatar_updated_at，配合 KV 存自定义头像。 */
async function v0_5_0({ env }: InitContext): Promise<void> {
  await addColumn(env.DB, "admin_users", "avatar_updated_at", "INTEGER");
}

/** v0.6.0：术语库模块替换为 AI 专家（沉浸式翻译 prompts）。 */
async function v0_6_0({ env }: InitContext): Promise<void> {
  const db = env.DB;
  const now = Math.floor(Date.now() / 1000);
  await db.batch([
    db.prepare(`DELETE FROM feature_modules WHERE key = 'glossary'`),
    db.prepare(
      `INSERT OR IGNORE INTO feature_modules (key, name, enabled, config_json, created_at) VALUES
        ('ai-experts', 'AI 专家', 0, NULL, ${now})`,
    ),
    db.prepare(`DELETE FROM site_settings WHERE key = 'glossary'`),
  ]);
}

/** v0.7.0：AI 写作改为核心功能，移除 feature_modules 中的 ai-write 记录。 */
async function v0_7_0({ env }: InitContext): Promise<void> {
  await env.DB.prepare(`DELETE FROM feature_modules WHERE key = 'ai-write'`).run();
}

/** 迁移记录表，记录已执行的版本，避免重复跑。 */
async function ensureMigrationTable(db: D1Database): Promise<void> {
  await db
    .prepare(`CREATE TABLE IF NOT EXISTS _migrations (
      version TEXT PRIMARY KEY,
      applied_at INTEGER
    )`)
    .run();
}

interface Migration {
  version: string;
  run: (ctx: InitContext) => Promise<void>;
}

const migrations: Migration[] = [
  { version: "0.1.0", run: v0_1_0 },
  { version: "0.2.0", run: v0_2_0 },
  { version: "0.3.0", run: v0_3_0 },
  { version: "0.4.0", run: v0_4_0 },
  { version: "0.5.0", run: v0_5_0 },
  { version: "0.6.0", run: v0_6_0 },
  { version: "0.7.0", run: v0_7_0 },
];

export async function initDatabase(ctx: InitContext): Promise<{
  applied: string[];
}> {
  const { DB: db } = ctx.env;
  await ensureMigrationTable(db);

  const applied: string[] = [];
  for (const m of migrations) {
    const done = await db
      .prepare("SELECT version FROM _migrations WHERE version = ?")
      .bind(m.version)
      .first<{ version: string }>();
    if (done) continue;

    try {
      await m.run(ctx);
    } catch (e) {
      console.warn(`[init] 迁移 ${m.version} 失败：${(e as Error).message}`);
      // 失败不写入 _migrations，后续 init 可重试；不中断后续迁移。
      continue;
    }

    await db
      .prepare("INSERT OR IGNORE INTO _migrations (version, applied_at) VALUES (?, ?)")
      .bind(m.version, Math.floor(Date.now() / 1000))
      .run();
    applied.push(m.version);
  }

  return { applied };
}

/** 单条 ALTER TABLE 的快捷方式，用于增量迁移里加字段。 */
export async function addColumn(
  db: D1Database,
  table: string,
  column: string,
  definition: string,
): Promise<boolean> {
  return runSafe(db, `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

/** 代码定义的最新迁移版本（migrations 数组末项）。 */
export function getLatestDbVersion(): string | null {
  const last = migrations[migrations.length - 1];
  return last ? last.version : null;
}

/**
 * 查询 DB 当前已执行到的版本。纯读、无副作用：从代码 migrations 链末尾
 * 往前找第一个已记录在 _migrations 表里的版本。表不存在（从未初始化）
 * 或无任何已应用迁移时返回 null。
 */
export async function getCurrentDbVersion(db: D1Database): Promise<string | null> {
  let rows: { version: string }[];
  try {
    const res = await db
      .prepare("SELECT version FROM _migrations")
      .all<{ version: string }>();
    rows = res.results ?? [];
  } catch {
    // _migrations 表不存在（从未初始化）
    return null;
  }
  const appliedSet = new Set(rows.map((r) => r.version));
  for (let i = migrations.length - 1; i >= 0; i--) {
    const m = migrations[i];
    if (m && appliedSet.has(m.version)) return m.version;
  }
  return null;
}

/** 给定当前版本，返回尚未执行的迁移版本列表（按顺序）。 */
export function getPendingMigrations(currentVersion: string | null): string[] {
  if (!currentVersion) return migrations.map((m) => m.version);
  const idx = migrations.findIndex((m) => m.version === currentVersion);
  if (idx === -1) return migrations.map((m) => m.version);
  return migrations.slice(idx + 1).map((m) => m.version);
}
