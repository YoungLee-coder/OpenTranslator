---
name: opentranslator-release-check
description: Verify deploy readiness for OpenTranslator — run typecheck, confirm no secrets in diff, validate DB migration safety. Use before deploy / 发布前检查 / 部署前检查.
---

# Release Check

Verify that OpenTranslator is ready to deploy. 本项目"发布"即部署到 Cloudflare 边缘（见 `.ai/workflow.md` 部署章节）——无版本 tag / changelog 流程。

## Steps

1. **读部署流程**：`.ai/workflow.md` 部署章节——push 到 `main` 即触发 Cloudflare Git 自动部署，或本地 `pnpm deploy`。
2. **跑全量 typecheck**：`pnpm typecheck`（api + web 都过）。这是本项目主要门禁（无测试套件）。
3. **本地构建**：`pnpm build` 应成功，产物输出到 `./dist`。
4. **本地闭环**：`pnpm dev` 起服务，`curl http://localhost:8787/api/ping` 返回 `{"ok":true,...}`，前端 http://localhost:5173 正常。
5. **密钥扫描**：确认 diff 里无 `JWT_SECRET` / `ENCRYPTION_KEY` / API Key 明文、无 `.dev.vars` 被追踪。`.ai/security.md` 适用时调用 `security-auditor` 子代理扫自上次部署以来的改动。
6. **DB 迁移安全**：若改了 `src/db/schema.sql`，确认本地 `pnpm db:init` 验证过；部署后需访问一次 `/api/init/<JWT_SECRET>` 幂等建表——确认这点已告知。
7. **敏感端点**：确认 `/api/init/:secret` 的 secret 没出现在文档 / 提交信息 / 分享的 URL。
8. **报告**：汇总。任一检查失败，报告失败项与上线前需修的内容。

## 项目特定约束

- 无版本号 / changelog 需要检查——跳过传统 release 的版本与 changelog 步骤。
- 部署 = `pnpm deploy` 或 push 到 `main`，二者都直接上线边缘，谨慎。
