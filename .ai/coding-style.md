# 编码约定

## TypeScript

- `tsconfig.json` 开了 `strict` + `noUncheckedIndexedAccess`：索引访问返回 `T | undefined`，必须窄化，**别用 `!` 绕过**。
- 前后端共享类型走别名 `@opentranslator/shared-types`（见 `shared-types/index.ts`）。新增共享类型放 `shared-types/`，**不要**在前后端各写一份。
- 前端有独立 `web/tsconfig.json`；typecheck 分两步：`pnpm typecheck:api`（根）和 `pnpm typecheck:web`。

## 格式化

- 项目未配 prettier / eslint。**匹配周围代码风格**：2 空格缩进、双引号、行尾分号、ES2022+ 语法。
- `.claude/hooks/post-edit-check.sh` 自检可用 formatter，本项目里会回退到 `pnpm typecheck`。

## 扩展（必须走注册表）

- 新增供应商 / 功能模块见 `architecture.md` 扩展点。**不要**在核心路由里硬编码新供应商或新功能——走 `providers/index.ts` / `features/registry.ts` 注册。

## 提交信息

- 约定式提交（conventional commits），描述用**中文**：`feat: 添加 aihubmix 供应商支持`、`fix: 修复 SSE 断流`。类型前缀用英文（feat/fix/docs/refactor/chore/test）。
- 现有提交历史无 AI 署名 trailer，保持这一习惯。

## 注释

- 代码注释可用中文（与 `src/index.ts` 等现有代码一致），但别给显而易见的代码加噪声注释。
