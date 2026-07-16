# OpenTranslator 扩展开发指南

OpenTranslator 采用**注册表 + 配置驱动**的插件化架构：核心路由与 UI 框架保持稳定，新能力通过注册扩展点接入。本文档目录汇总所有扩展类型的开发流程，供写插件时查阅。

## 扩展类型一览

| 类型 | 适用场景 | 文档 | 核心路径 |
|---|---|---|---|
| **翻译供应商** | 接入 OpenAI、Claude、DeepL 等新 LLM / 翻译 API | [providers.md](./providers.md) | `src/providers/`、`shared-types/provider.ts` |
| **AI 专家** | 按场景定制翻译策略（沉浸式翻译 YAML 兼容） | [ai-experts.md](./ai-experts.md) | `src/experts/plugins/*.yml` |
| **功能模块** | Dashboard 可开关的产品功能（设置页、管理页） | [features.md](./features.md) | `src/features/`、`web/src/features/` |
| **外部客户端** | Chrome 扩展、移动端、第三方集成 | [api-reference.md](./api-reference.md)、[plan.md](./plan.md) | `shared-types/`、`web/src/lib/api-client.ts` |
| **视觉范式** | 扩展 UI 与主站保持一致 | [design-guide.md](./design-guide.md) | `web/src/index.css` |

## 通用原则

1. **共享类型单一来源** — API 契约放 `shared-types/`，前后端通过 `@opentranslator/shared-types` 引用，不要在两端各写一份。
2. **走注册表，不改核心路由** — 新供应商注册到 `providerRegistry`；新功能模块注册到 `features/registry.ts` 与 `admin-features.ts` 的 manifests 数组；AI 专家通过 YAML + `pnpm bundle-experts` 打包。
3. **配置在 Dashboard，逻辑在代码** — 供应商 API Key、功能开关、专家启用列表等由管理员在 Dashboard 配置，客户端只消费 API。
4. **验证命令** — 改后端后跑 `pnpm typecheck:api`（含 `bundle-experts`）；改前端后跑 `pnpm typecheck:web`；两端都动则 `pnpm typecheck`。

## 快速决策：我要加什么？

```
需要接一个新的 LLM / 翻译 API？
  → providers.md

需要为特定领域写翻译提示词（科技、法律、意译…）？
  → ai-experts.md

需要新的 Dashboard 功能页（带开关、设置、管理）？
  → features.md

要写 Chrome 扩展或调用已有实例 API？
  → api-reference.md + design-guide.md + plan.md
```

## 相关仓库文件

| 内容 | 路径 |
|---|---|
| 架构总览 | `.ai/architecture.md` |
| 编码约定 | `.ai/coding-style.md` |
| 供应商注册 | `src/providers/index.ts` |
| 供应商表单 schema | `src/providers/schema.ts` |
| 功能模块前端注册 | `web/src/features/registry.ts` |
| 功能模块后端 manifests | `src/routes/admin-features.ts` |
| AI 专家打包脚本 | `scripts/bundle-experts.mjs` |
| 主站 API 客户端（参考实现） | `web/src/lib/api-client.ts` |
