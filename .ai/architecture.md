# 架构与仓库地图

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vite、React 19、React Router 7、TypeScript |
| 后端 | Hono、Cloudflare Workers、TypeScript |
| 数据 | Cloudflare D1（持久）、KV（缓存/设置）、Durable Object（限流） |
| 部署 | 单个 Cloudflare Worker（前端产物 + API，`[assets]` 绑定） |
| 工程 | pnpm、Node 22.13+、tsconfig `paths` 别名共享类型 |

## 入口点

- **后端入口** `src/index.ts` — Hono app。挂 `logger` + `cors`；`/api/ping` 健康检查；`POST /api/init`（首次建表需 `X-Init-Secret` = JWT_SECRET；仅待迁移时可无密钥）幂等建表/升级；`/api/translate`、`/api/write`、`/api/auth` 公开；`/api/admin/*` 挂在 `authMiddleware` 之后（需 JWT）；catch-all 把非 `/api` 请求交给 `ASSETS` 绑定服务 SPA。`import "./providers"` 以副作用在启动时注册全部 adapter。导出 `RateLimiter` DO。
- **前端入口** `web/src/main.tsx` → `web/src/App.tsx`（React Router）。
- **Worker 配置** `wrangler.toml` — `[assets]` 指向 `./dist`，`run_worker_first = true`；D1/KV 绑定在 Dashboard 网页配（toml 里注释掉）。

## 仓库地图

```
src/                          # Hono Worker 后端（REST/SSE + 静态资源）
  index.ts                    #   入口：路由挂载、CORS、catch-all → ASSETS
  types.ts                    #   AppBindings / AppVariables
  providers/                  #   供应商 adapter + 注册表 + 表单 schema
    index.ts                  #   ★ 注册所有 adapter（side-effect import）
    registry.ts, schema.ts    #   providerRegistry / Dashboard 表单字段
    prompt.ts, sse.ts         #   共用提示词 / SSE 流式
    openai.ts, claude.ts,     #   各家 adapter（实现 TranslationProvider）
    gemini.ts, deepl.ts, cloudflare.ts
  routes/                     #   translate / write / auth / admin-*
  db/                         #   schema.sql + queries.ts + init.ts（幂等初始化器）
  durable-objects/            #   rate-limiter.ts（每 IP 滑动窗口）
  features/                   #   功能模块后端（translate, write, glossary, ai-experts, public-access）
  experts/                    #   AI expert 插件（plugins/*.yml → bundled.ts）
  middleware/                 #   auth.ts, rate-limit.ts
  auth/session.ts
  lib/                        #   jwt, bytes, password, crypto, cache
  settings/cache.ts
web/                          # Vite + React SPA（构建产物输出到根 dist/）
  vite.config.ts              #   ★ build.outDir=../dist；dev 把 /api 代理到 :8787
  src/main.tsx, App.tsx       #   入口 + 路由
  src/routes/                 #   translator / write / dashboard / login / setup-required
  src/features/               #   功能模块前端（AiExpertsManager, PublicAccessSettings）+ registry.ts
  src/components/RootLayout.tsx
  src/lib/                    #   api-client, languages, auth
shared-types/                 # 前后端共享类型，别名 @opentranslator/shared-types 引用
wrangler.toml                 # Worker 配置（[assets] 静态资源绑定）
```

## 扩展点（高频改动模式）

- **新增供应商**：`src/providers/` 加 adapter（实现 `TranslationProvider`；OpenAI 兼容可复用 `openai.ts`）→ `src/providers/index.ts` 加一行 `providerRegistry.register(...)` → `src/providers/schema.ts` 加表单字段。核心路由不动。
- **新增功能模块**：`web/src/features/` 加组件并在 `features/registry.ts` 注册 → `src/features/` 加后端 manifest/handler → Dashboard 模块管理里 DB 开关启用。
- **新增 AI expert**：`src/experts/plugins/*.yml` 加定义 → `pnpm bundle-experts` 重生成 `bundled.ts`。解析逻辑在 `src/experts/resolve.ts`、`registry.ts`。

## 大文件与所有权

以下文件行数多或为自动生成物。改前先确认边界与验证命令；完整非目标见 `project.md`。

| 文件 | 性质 | 边界 / 怎么改 | 验证 |
|---|---|---|---|
| `src/experts/bundled.ts` | 生成物 | **禁止手改**。改 `src/experts/plugins/*.yml` 或 `scripts/bundle-experts.mjs`，再跑 `pnpm bundle-experts` | `pnpm typecheck:api` |
| `web/src/routes/dashboard/ProvidersSection.tsx` | Dashboard 供应商 UI | 表格、模型选择、表单展示；adapter 逻辑在 `src/providers/`，契约在 `shared-types/` | `pnpm typecheck:web`；手动配供应商 |
| `web/src/routes/write/WritePage.tsx` | Write 模式页面 | 写作/润色 UI 与交互；后端 handler 在 `src/features/write` 与 `/api/write` | `pnpm typecheck:web` |
| `src/db/audit.ts` | DB 一致性审计 | 审计与修复逻辑；schema 变更须同步 `src/db/schema.sql` | `pnpm typecheck:api`；`pnpm db:init` 本地验证 |
| `src/index.ts` | 后端入口 | 路由挂载顺序、中间件分层；非路由任务不要动 | `pnpm typecheck:api`；`curl /api/ping` |
