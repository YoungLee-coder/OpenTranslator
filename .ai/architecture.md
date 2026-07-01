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

- **后端入口** `src/index.ts` — Hono app。挂 `logger` + `cors`；`/api/ping` 健康检查；`/api/init/:secret` 建表（JWT_SECRET 守卫，幂等）；`/api/translate`、`/api/auth` 公开；`/api/admin/*` 挂在 `authMiddleware` 之后（需 JWT）；catch-all 把非 `/api` 请求交给 `ASSETS` 绑定服务 SPA。`import "./providers"` 以副作用在启动时注册全部 adapter。导出 `RateLimiter` DO。
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
    gemini.ts, azure-openai.ts
  routes/                     #   translate / auth / admin-{providers,settings,features,glossary,usage}
  db/                         #   schema.sql + queries.ts + init.ts（幂等初始化器）
  durable-objects/            #   rate-limiter.ts（每 IP 滑动窗口）
  features/                   #   功能模块后端（translate, glossary：manifest + handler/store）
  middleware/                 #   auth.ts, rate-limit.ts
  auth/session.ts
  lib/                        #   jwt, bytes, password, crypto, cache
  settings/cache.ts
web/                          # Vite + React SPA（构建产物输出到根 dist/）
  vite.config.ts              #   ★ build.outDir=../dist；dev 把 /api 代理到 :8787
  src/main.tsx, App.tsx       #   入口 + 路由
  src/routes/                 #   translator / dashboard(Overview/Providers/Settings/Modules) / login
  src/features/               #   功能模块前端（TranslationSettings, GlossaryManager）+ registry.ts
  src/components/RootLayout.tsx
  src/lib/                    #   api-client, languages, auth
shared-types/                 # 前后端共享类型，别名 @opentranslator/shared-types 引用
wrangler.toml                 # Worker 配置（[assets] 静态资源绑定）
```

## 扩展点（高频改动模式）

- **新增供应商**：`src/providers/` 加 adapter（实现 `TranslationProvider`；OpenAI 兼容可复用 `openai.ts`）→ `src/providers/index.ts` 加一行 `providerRegistry.register(...)` → `src/providers/schema.ts` 加表单字段。核心路由不动。
- **新增功能模块**：`web/src/features/` 加组件并在 `features/registry.ts` 注册 → `src/features/` 加后端 manifest/handler → Dashboard 模块管理里 DB 开关启用。
