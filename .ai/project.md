# 项目背景

OpenTranslator 是 DeepL 风格的在线 AI 翻译器：以大模型为底座，多供应商动态切换，配置驱动、插件化扩展。架构是 **Vite + React 19 SPA（前端）** 与 **Hono Worker（后端）** 合并部署到同一个 Cloudflare Worker——前端打包产物通过 `[assets]` 绑定由同一个 Worker 服务，同源无 CORS，一次 `wrangler deploy` 全搞定。全部跑在边缘网络，按量计费。

完整产品说明见 `README.md`。这里只记录 agent 工作所需的最小背景。

**塑造工作方式的关键点**：这是「单 Worker 合并部署」架构——前端和后端在同一个 Cloudflare Worker 里，改任意一端都影响同一个部署单元。扩展（新增供应商 / 功能模块）走注册表 + DB 开关，核心路由不动。

## 范围与非目标

**在范围内：**

- 供应商 adapter、AI experts、功能模块（注册表 + DB 开关扩展）
- Dashboard / 翻译 / Write 页面功能迭代
- `shared-types/` 共享契约、D1 schema 增量迁移

**非目标（除非任务明确要求，否则不要做）：**

- 不改 `src/index.ts` 的路由挂载顺序与中间件分层（admin 路由必须在 `authMiddleware` 之后）
- 不手改 `src/experts/bundled.ts`（生成物，改 YAML 源文件后重跑 bundle）
- 不在核心路由或页面里硬编码新供应商 / 功能模块（走 `providers/index.ts`、`features/registry.ts`）
- 不在前后端各写一份类型（统一放 `shared-types/`）
- 不做破坏性 DB 操作（远程 init / 清库见 `security.md`）
- 不为小改动引入新框架、构建链或第二套部署单元

## 语言

AI agent 用**中文（zh-CN）**回复。涵盖对话回复、提交信息、agent 建议的代码注释与子代理输出。代码、标识符、命令保持英文。

## Persistent memory

共享事实应写在 `.ai/`（不要写进 `AGENTS.md` 或 `CLAUDE.md`）。用 `/opentranslator-remember` 或说「记住这个」添加/更新。Agent 发现稳定约定时会提议保存——写入前需你确认。
