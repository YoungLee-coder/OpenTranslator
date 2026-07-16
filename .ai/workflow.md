# 命令与验证

## 命令（pnpm，Node 22.13+）

```bash
pnpm install              # 装依赖
pnpm dev                  # 并行启动 web(5173) + api(8787)
pnpm /dev:api             # 只起后端 wrangler dev
pnpm /dev:web             # 只起前端 vite
pnpm build                # 前端打包到 ./dist
pnpm deploy               # build + wrangler deploy（上线）
pnpm typecheck            # typecheck:api + typecheck:web
pnpm typecheck:api        # 后端 + shared-types
pnpm typecheck:web        # 前端
pnpm db:init              # 本地 D1 建表（本地 SQLite，无需登录）
pnpm db:init:remote       # 远程 D1 建表（需 wrangler login）
```

本地密钥来自 `.dev.vars`（已 gitignore）。开发期 Vite 把 `/api` 代理到 `http://localhost:8787`，同源无 CORS。

## 验证（改完跑什么再提交）

| 改动 | 验证 |
|---|---|
| 后端 `src/` | `pnpm typecheck:api`；`pnpm /dev:api` 起服务，`curl http://localhost:8787/api/ping` 应返回 `{"ok":true,...}` |
| 前端 `web/` | `pnpm typecheck:web`；`pnpm /dev:web` 打开 http://localhost:5173 验证页面 |
| `shared-types/` | `pnpm typecheck`（前后端都过） |
| `src/db/schema.sql` | 先 `pnpm db:init` 本地验证，再考虑 `db:init:remote`（见 security.md） |
| 仅文档 | 无需构建，检查链接即可 |

**没有测试套件**——本项目尚未配测试框架，typecheck 是主要门禁。详见 `testing.md`。

## 部署（= 发布）

本项目无版本 tag / changelog 流程，"发布"即部署到 Cloudflare 边缘。两条路径：

1. **Cloudflare Git 连接**（推荐）：push 到 `main` → Cloudflare 自动构建部署。**push 到 main 即上线，谨慎。**
2. **本地 wrangler**：`pnpm deploy`（= `pnpm build && wrangler deploy`）。

部署后若 schema 有增量迁移，用 `POST /api/init` + 头 `X-Init-Secret: <JWT_SECRET>` 幂等建表（见 security.md）。
