# 测试策略

## 现状

**本项目尚未配置测试框架。** `package.json` 无 test 脚本，无 vitest/jest 依赖，仓库无测试文件。

## 当前门禁

`pnpm typecheck`（= api + web）是改完代码的主要验证手段。`tsconfig.json` 的 `strict` + `noUncheckedIndexedAccess` 能在编译期拦下一批错误。

## 手动闭环验证

- 后端：`pnpm /dev:api` → `curl http://localhost:8787/api/ping` 返回 `{"ok":true,"service":"opentranslator-api",...}`。
- 前后端闭环：`pnpm dev` → http://localhost:5173 首页请求 `/api/ping`。
- 翻译闭环：登录 → Dashboard 配供应商 → 回首页翻译，确认 SSE 逐字渲染。

## 加测试时（TODO）

若引入测试，推荐 Vitest（与 Vite 生态一致）。加完后更新本文件：写明 `npx vitest run <file>` 跑单个测试的命令，并把 per-change 验证从 typecheck 扩展到对应测试目录。
