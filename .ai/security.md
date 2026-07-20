# 安全规则（不可协商）

本项目处理密钥、鉴权与生产部署，以下为硬性约束。

## 密钥

- **绝不**提交 `JWT_SECRET`、`ENCRYPTION_KEY`、`.dev.vars`、供应商 API Key 明文。`.dev.vars` 已 gitignore——别把密钥写进 `wrangler.toml` 或源码。
- `JWT_SECRET`：JWT 签名密钥，**同时**是首次 `POST /api/init`（`X-Init-Secret` 头）建表的访问凭证。32 位以上随机字符串。已有库且仅有待迁移时，初始化页可无密钥触发升级。
- `ENCRYPTION_KEY`：供应商 API Key 的加密密钥。**不可恢复**——丢失 = 所有已存密钥作废。不要随意轮换 / 重新生成，除非同时重新加密全部密钥。**绝不删除。**
- 供应商 API Key 用 `ENCRYPTION_KEY` 加密后落 D1，明文绝不入库（见 `src/lib/crypto.ts`、`src/db/queries.ts`）。**绝不**在日志、响应、错误信息里输出明文 Key 或加密密钥。

## 数据库

- `src/db/schema.sql` 经 `src/db/init.ts` 幂等执行。改 schema 后**先** `pnpm db:init` 本地验证，确认无误再考虑 `pnpm db:init:remote`。`db:init:remote` 直接作用于生产 D1，谨慎。
- `POST /api/init`：首次建表 + 种子数据需请求头 `X-Init-Secret: <JWT_SECRET>`（密钥**绝不**放进 URL path）。若数据库已初始化且存在待执行迁移，允许无密钥升级（幂等）。**绝不**把真实 `JWT_SECRET` 写进文档、提交信息、分享的 URL 截图。本地调试用 `.dev.vars` 里的值。

## 鉴权

- `/api/admin/*` 必须挂在 `authMiddleware`（JWT）之后（见 `src/index.ts`）。新增 admin 路由**不要**绕过该中间件。
- 密码用 `src/lib/password.ts` 哈希，**绝不**明文存储或比较。JWT 签发 / 校验走 `src/lib/jwt.ts`。

## 部署 / 生产

- `wrangler deploy` 与 push 到 `main`（Cloudflare Git 自动部署）即上线边缘。**改完先 `pnpm typecheck`，能本地 `pnpm dev` 验证就先验证。**
- 跨域：`ORIGINS` 环境变量白名单。同源合并部署时无需设置；非同源部署必须显式配，**别放开成 `*`**。

## 限流

- 每 IP 滑动窗口由 `RATE_LIMITER` Durable Object 实现（`src/durable-objects/rate-limiter.ts`）。改限流逻辑要同时考虑公开用户与登录用户两套配额，别无意中放开。
- 登录 / setup 限流必须用独立桶（`enforceRateLimit(..., "auth")`），**不要**与翻译/write 共用同一 DO key，否则翻译几次就会把登录打成 429，扩展拿不到模型。
