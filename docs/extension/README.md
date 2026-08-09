# 附属插件开发文档

本目录供 **Chrome 扩展等独立仓库** 的维护者使用：对接自托管 OpenTranslator 实例、跟进 API 变更、对齐主站视觉与交互。

插件不修改主仓库代码。契约以 `shared-types/` 为准，行为参考 `web/src/lib/api-client.ts`，通过 Bearer JWT 调用 `/api/*`。

## 文档索引

| 文档 | 用途 |
|---|---|
| [api-reference.md](./api-reference.md) | 公开 API：鉴权、翻译/写作 SSE、错误码、类型引用 |
| [design-guide.md](./design-guide.md) | 视觉 token、组件范式、Popup 布局、交互状态机 |
| [plan.md](./plan.md) | Chrome 扩展 v1 实施计划、目录结构、manifest、检查清单 |

## 跟进主项目变更

1. **同步契约** — 将主仓库 `shared-types/` 复制到插件项目（submodule 或定期 diff）。常量如 `MAX_TRANSLATE_CHARS` 勿硬编码。
2. **对照 API 文档** — 阅读 [api-reference.md](./api-reference.md) 变更；重点看鉴权、SSE 事件、请求/响应字段、HTTP 错误码。
3. **对照参考实现** — diff `web/src/lib/api-client.ts`、`web/src/routes/translator/TranslatorPage.tsx`。
4. **运行时探测** — `GET /api/ping`（实例就绪）、`GET /api/auth/me`（`sitePublic`）、`GET /api/translate/models`（可用模型）。

| 主仓库变更 | 插件侧通常需要 |
|---|---|
| `shared-types/*.ts` 字段增删 | 更新类型与请求体 |
| 新增 `/api/*` 或 SSE 事件 | 实现调用与解析 |
| 翻译切块 / 限流计费 | 处理 `progress`、429 |
| 新公开能力（如 AI 专家列表） | 可选接入对应 GET 端点 |

破坏性变更应同步更新 `shared-types/` 与本目录文档；插件以二者为准。

## 主仓库内扩展

在本 repo 新增供应商、功能模块或 AI 专家，见 `.ai/architecture.md`「扩展点」与对应源码路径，不在此目录维护。
