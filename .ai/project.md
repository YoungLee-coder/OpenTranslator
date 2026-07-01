# 项目背景

OpenTranslator 是 DeepL 风格的在线 AI 翻译器：以大模型为底座，多供应商动态切换，配置驱动、插件化扩展。架构是 **Vite + React 19 SPA（前端）** 与 **Hono Worker（后端）** 合并部署到同一个 Cloudflare Worker——前端打包产物通过 `[assets]` 绑定由同一个 Worker 服务，同源无 CORS，一次 `wrangler deploy` 全搞定。全部跑在边缘网络，按量计费。

完整产品说明见 `README.md`。这里只记录 agent 工作所需的最小背景。

**塑造工作方式的关键点**：这是「单 Worker 合并部署」架构——前端和后端在同一个 Cloudflare Worker 里，改任意一端都影响同一个部署单元。扩展（新增供应商 / 功能模块）走注册表 + DB 开关，核心路由不动。

## 语言

AI agent 用**中文（zh-CN）**回复。涵盖对话回复、提交信息、agent 建议的代码注释与子代理输出。代码、标识符、命令保持英文。
