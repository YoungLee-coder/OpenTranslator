# OpenTranslator

DeepL 风格的在线 AI 翻译器：以大模型为底座，多供应商动态切换，配置驱动、插件化扩展。
架构是 **Vite + React SPA（前端）** 与 **Hono Worker（后端）** 物理分离，分别部署到 Cloudflare Pages 与 Workers，全部跑在边缘网络，按量计费、几乎零成本。

## 为什么用它

- **多供应商，随时切换** — OpenAI、Claude、Gemini、DeepSeek、OpenRouter、Azure OpenAI、自定义 OpenAI 兼容端点，七种 adapter 内置，在 Dashboard 里填 Key 即用，无需改代码。
- **流式翻译** — 译文经 SSE 逐字渲染，跟读 DeepL 的即时手感。
- **插件化扩展** — 供应商走注册表，功能模块走 DB 驱动开关。新增一家厂商或一个功能，只需加一个 adapter 文件 + 一行注册，核心逻辑不动。
- **密钥加密存储** — 供应商 API Key 用 `ENCRYPTION_KEY` 加密后落 D1，明文绝不入库。
- **细粒度限流** — 基于 Durable Object 的每 IP 滑动窗口，公开用户与登录用户分别配额。
- **缓存与统计** — KV 翻译缓存避免重复请求；用量日志落 D1，Dashboard 可视化。
- **术语库** — glossary 作为首个插件化功能验证案例，词条自动注入翻译提示词。
- **站点开关** — 一键关闭公开访问，转为纯私有部署。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vite、React 19、React Router 7、TypeScript |
| 后端 | Hono、Cloudflare Workers、TypeScript |
| 数据 | Cloudflare D1（持久）、KV（缓存/设置）、Durable Object（限流） |
| 部署 | Cloudflare Pages（前端）、Workers Builds（后端） |
| 工程 | pnpm workspace、共享类型包 `@opentranslator/shared-types` |

## 项目结构

```
apps/web                 # Vite + React SPA（静态产物 → Cloudflare Pages）
  src/routes             #   翻译页 / 登录页 / Dashboard
  src/features           #   功能模块注册表（Dashboard 动态渲染）
apps/api                 # Hono Worker（REST/SSE → Cloudflare Workers）
  src/providers          #   供应商 adapter + 注册表 + 表单 schema
  src/routes             #   translate / auth / admin-*
  src/db                 #   D1 表结构与迁移
  src/durable-objects    #   限流器
  src/features           #   功能模块后端
packages/shared-types    # 前后端共享的 TypeScript 类型定义
```

## 前置条件

- Node 20+、pnpm 11+
- Cloudflare 账号（仅部署 / 远程资源时需要；本地开发无需登录）

## 本地开发

```bash
pnpm install
pnpm db:init        # 初始化本地 D1（wrangler dev 用本地 SQLite，无需登录）
pnpm dev            # 并行启动 web(5173) + api(8787)
```

打开 http://localhost:5173 ，首页会请求 `/api/ping` 验证前后端闭环。
Vite 把 `/api` 代理到 `http://localhost:8787`，开发期同源、无需 CORS。
本地密钥由 `apps/api/.dev.vars` 提供（已 gitignore），首次开发会自动读取。

### 首次初始化

1. 打开 `/login`，点击「首次使用？初始化管理员」创建第一个管理员账号。
2. 进入 `/dashboard` → 供应商 → 新增（填入真实 API Key 并勾选「设为公开默认」）。
3. 回到 `/` 即可翻译，译文流式逐字渲染。

## 部署

> **数据库自动初始化**：部署后访问 `/api/init/<JWT_SECRET>` 即可建表 + 写入种子数据，幂等可重复执行。GitHub Action 会在部署后自动调用它，无需人肉进 Dashboard 粘贴 SQL。
>
> **无需手填资源 ID**：`apps/api/wrangler.toml` 里的 D1/KV 绑定已注释掉，资源在 Cloudflare Dashboard 创建后直接在网页「Bindings」里绑上去，全程不碰配置文件。

### 方式一：GitHub Actions（推荐，全自动部署 + 自动初始化）

push 到 `main` → Action 自动构建部署 Worker、自动建表初始化，全程无需任何本地命令或网页操作。

**1. 在 Cloudflare 创建资源**
- D1：Storage & D1 → Create database → 名字 `opentranslator`
- KV：Workers & Pages → KV → Create namespace → 名字 `SETTINGS_KV`
- API Token：My Profile → API Tokens → Create Token → 选「Edit Cloudflare Workers」模板，记下 token
- Account ID：Dashboard 右侧栏可见

**2. 在 GitHub 仓库加 Secrets**
Settings → Secrets and variables → Actions → New repository secret：

| Secret | 必需 | 用途 |
|---|:---:|---|
| `CLOUDFLARE_API_TOKEN` | 是 | Cloudflare API 令牌 |
| `CLOUDFLARE_ACCOUNT_ID` | 是 | Cloudflare 账户 ID |
| `JWT_SECRET` | 是 | JWT 签名密钥，32 位以上随机字符串，同时作为 init 接口凭证 |
| `ENCRYPTION_KEY` | 是 | 供应商 API Key 加密密钥，**务必备份，丢了等于所有密钥作废** |
| `ORIGINS` | 是 | 允许的跨域来源（你未来的 Pages 域名，如 `https://opentranslator-web.pages.dev`）|
| `D1_DATABASE_ID` | 否 | 手动指定 D1 ID；不填则 Action 自动创建/查找名为 `opentranslator` 的库 |
| `KV_NAMESPACE_ID` | 否 | 手动指定 KV ID；不填则 Action 自动创建/查找名为 `SETTINGS_KV` 的命名空间 |
| `CUSTOM_DOMAIN` | 否 | 自定义 API 域名；不填则用 `*.workers.dev` |

**3. 在 Cloudflare Worker 绑定资源**（只做一次）
部署成功后，Dashboard → Workers → opentranslator-api → Settings → Bindings：
- D1 binding，名字填 `DB` → 选 `opentranslator` 数据库
- KV binding，名字填 `SETTINGS_KV` → 选刚才的命名空间

> 首次 push 触发 Action 后，Worker 会部署上去、数据库会自动建表。绑定资源后下次 push 即可正常工作。

**4. 部署前端 Web**
见下方「部署前端 Web」一节。

**5. 后续更新**
改完代码 push 到 `main`，Action 自动重新部署并跑增量迁移。换域名时改 GitHub Secrets 里的 `ORIGINS` 即可，无需改代码。

### 方式二：Cloudflare Git 连接（Dashboard 网页操作）

适合不想配 GitHub Actions 的场景。push 到 GitHub → Cloudflare 自动构建部署，但数据库需要手动初始化一次。

**1. 创建资源（Dashboard）**：D1 `opentranslator` + KV `SETTINGS_KV`（同上）

**2. 连接后端 API（Workers Builds）**
Dashboard → Workers & Pages → Create → Workers → Import a repository → 选仓库，配置：
- Root directory：`/`
- Build command：`pnpm install --frozen-lockfile`
- Deploy command：`wrangler deploy --config apps/api/wrangler.toml`

创建后进 Worker → Settings：
- **Variables and Secrets** 加 `JWT_SECRET`、`ENCRYPTION_KEY`、`ORIGINS`（同上表）
- **Bindings** → D1 `DB` + KV `SETTINGS_KV`（同上）

**3. 初始化数据库（只做一次）**
部署成功后，浏览器访问 `https://<你的-worker-域名>/api/init/<你的-JWT_SECRET>`，看到 `{"ok":true,...}` 即完成建表。幂等，重复访问无副作用。

### 部署前端 Web（Pages）

Dashboard → Workers & Pages → Create → Pages → Connect to Git → 选同一仓库，配置：
- Root directory：`/`
- Build command：`pnpm install --frozen-lockfile && pnpm --filter @opentranslator/web build`
- Build output directory：`apps/web/dist`

进 Pages 项目 → Settings → Environment variables（Production），加：
- `VITE_API_BASE_URL` = API Worker 域名（如 `https://opentranslator-api.<sub>.workers.dev`）
- `NODE_VERSION` = `20`

部署完成后打开 Pages 域名 → `/login` →「首次使用？初始化管理员」→ Dashboard 新增供应商（填真实 API Key、勾「设为公开默认」）→ 回首页即可翻译。

### 方式三：本地 wrangler（可选）

```bash
cd apps/api
wrangler login
wrangler d1 create opentranslator            # 用返回的 ID 取消注释 wrangler.toml 里的 d1 段并填入
wrangler kv namespace create SETTINGS_KV      # 同上，取消注释 kv 段并填入
wrangler secret put JWT_SECRET
wrangler secret put ENCRYPTION_KEY
wrangler deploy
curl https://api.yourdomain.com/api/init/$(grep JWT_SECRET .dev.vars | cut -d= -f2)   # 自动建表

cd ../web
VITE_API_BASE_URL=https://api.yourdomain.com pnpm build
wrangler pages deploy dist
```

## 配置参考

### API Worker

| 类型 | 名称 | 说明 |
|---|---|---|
| Secret | `JWT_SECRET` | JWT 签名密钥，32 位以上随机字符串 |
| Secret | `ENCRYPTION_KEY` | 供应商 API Key 加密密钥，**务必备份** |
| Variable | `ORIGINS` | 允许的跨域来源，逗号分隔；不填则默认仅允许 localhost |
| Variable | `ENV` | 环境标识，默认 `development` |
| Binding (D1) | `DB` | 绑定到 `opentranslator` 数据库 |
| Binding (KV) | `SETTINGS_KV` | 绑定到设置/缓存命名空间 |
| Binding (DO) | `RATE_LIMITER` | Durable Object，部署时自动创建，无需 ID |

### Web（Pages）

| 类型 | 名称 | 说明 |
|---|---|---|
| Variable | `VITE_API_BASE_URL` | API Worker 域名，构建期注入 |
| Variable | `NODE_VERSION` | `20` |

## 扩展点

### 新增一家供应商

1. 在 `apps/api/src/providers/` 加一个 adapter（实现 `TranslationProvider` 接口），OpenAI 兼容的厂商可直接复用 `openai.ts`。
2. 在 `apps/api/src/providers/index.ts` 加一行 `providerRegistry.register(...)`。
3. 在 `apps/api/src/providers/schema.ts` 加一条表单字段定义，Dashboard 自动渲染配置表单。

核心路由与翻译逻辑无需改动。

### 新增一个功能模块

1. 在 `apps/web/src/features/` 加一个组件，并在 `features/registry.ts` 注册。
2. 在 Dashboard → 模块管理里启用（DB 驱动开关），导航与页面自动出现。

## 路线图

- [x] 基础设施 + 最小闭环
- [x] 翻译核心：OpenAI/Claude/Gemini adapter、`/api/translate`、SSE、前端翻译页
- [x] 鉴权 + Dashboard：JWT、首次初始化、站点开关、供应商 CRUD、密钥加密、用量概览
- [x] 供应商补全 + 缓存 + 统计：Azure OpenAI / DeepSeek / OpenRouter / custom adapter；KV 翻译缓存；用量统计
- [x] 功能模块化：`/api/admin/features` DB 驱动开关、Dashboard 动态导航、术语库 glossary 插件化
- [ ] 远期（按需排期）：文档翻译 / OCR、多角色权限、Analytics Engine 迁移、计费 / 配额

## 贡献

欢迎提 Issue 与 PR。新增供应商或功能模块时，请遵循上面的「扩展点」两节，保持注册表式扩展。

## 许可证

本项目基于 [GPL-3.0](./LICENSE) 发布。派生项目必须以同等协议开源。
