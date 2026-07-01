---
name: implement-feature
description: Implement a new feature in OpenTranslator, following project conventions from .ai/ files. Use when asked to add a feature / implement something / build X / 加功能.
---

# Implement Feature

Implement a new feature following the conventions defined in `.ai/`:

1. **读项目上下文**：`.ai/project.md`（这是什么）、`.ai/architecture.md`（东西放哪）、`.ai/coding-style.md`（怎么写）、`.ai/workflow.md`（命令与验证）。
2. **规划改动**：识别改哪些文件、涉及哪些层、适用哪些约定。
3. **实现**：按 `.ai/coding-style.md` 写代码。用文档里的 helper 与模式，别用原始替代。
4. **验证**：跑 `.ai/workflow.md` Verification 表里对应改动类型的命令。后端 → `pnpm typecheck:api`；前端 → `pnpm typecheck:web`；shared-types → `pnpm typecheck`。
5. **Review**：非平凡改动，调用 code-reviewer 和/或 architect 子代理后再算完成。

## 项目特定约束

- **新增供应商**：`src/providers/` 加 adapter → `src/providers/index.ts` 注册 → `src/providers/schema.ts` 加表单字段。OpenAI 兼容厂商可复用 `openai.ts`。核心路由不动。
- **新增功能模块**：`web/src/features/` 加组件并在 `features/registry.ts` 注册 → `src/features/` 加后端 manifest/handler → Dashboard 模块管理里 DB 开关启用。
- **共享类型**放 `shared-types/`，经别名 `@opentranslator/shared-types` 引用，别在前后端各写一份。
- **admin 路由**必须挂在 `authMiddleware` 之后（见 `src/index.ts`）。
