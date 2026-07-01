# OpenTranslator

DeepL 风格的在线 AI 翻译器：以 AI 大模型为底座，多供应商动态切换，配置驱动、插件化扩展。
架构：**Vite SPA（前端） + Hono Worker（后端）**，前后端物理分离，分别部署到 Cloudflare Pages 与 Workers。

## 结构

```
apps/web                 # Vite + React SPA（纯静态产物 → Cloudflare Pages）
apps/api                 # Hono Worker（REST/SSE → Cloudflare Workers，持有 D1/KV/DO 绑定）
packages/shared-types    # 前后端共享的 TypeScript 类型定义
```

## 前置条件

- Node 20+、pnpm 11+
- Cloudflare 账号（**仅部署 / 远程资源时需要；本地开发无需登录**）

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

## 部署（需 Cloudflare 登录）

```bash
cd apps/api
wrangler login
wrangler d1 create opentranslator            # 把返回的 database_id 填进 wrangler.toml
wrangler kv namespace create SETTINGS_KV      # 把返回的 id 填进 wrangler.toml
wrangler secret put JWT_SECRET
wrangler secret put ENCRYPTION_KEY
pnpm db:init:remote
wrangler deploy

cd ../web
VITE_API_BASE_URL=https://api.yourdomain.com pnpm build   # 注入 API Worker 域名
wrangler pages deploy dist
```

部署前记得把 `apps/api/src/index.ts` 的 CORS origin 与 `apps/web` 的构建域名改为真实域名。

## 开发阶段

- ✅ 阶段一：基础设施 + 最小闭环
- ✅ 阶段二：翻译核心（OpenAI/Claude/Gemini adapter、`/api/translate`、SSE、前端翻译页）
- ✅ 阶段三：鉴权 + Dashboard（JWT、首次初始化、站点开关、供应商 CRUD、密钥加密、用量概览）
- ✅ 阶段四：补全供应商 + 结果缓存 + 用量统计（Azure OpenAI / custom / DeepSeek / OpenRouter adapter 齐全；KV 翻译缓存；用量统计）
- ✅ 阶段五：功能模块化（`/api/admin/features` DB 驱动 + 开关、Dashboard 导航动态遍历、术语库 glossary 作为插件化验证案例，自动注入翻译提示词）
- ⬜ 阶段六（远期，按需排期）：文档翻译 / OCR、多角色权限、Analytics Engine 迁移、计费 / 配额

## 待确认事项

见原计划「待确认事项」：是否同根子域部署（默认采用，便于 Cookie 鉴权）、公开模式默认供应商与限额、BYOK、流式优先级、域名与 Cloudflare 账号。
