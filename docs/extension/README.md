# 附属插件开发文档

本目录供 **Chrome 扩展等独立仓库** 的维护者使用：对接用户自托管的 OpenTranslator 实例。

**边界：**

- 插件**只调用**用户配置的 OpenTranslator 后端（`/api/*`），**不直接**请求任何第三方翻译 API。
- 插件**不依赖**本仓库的 `web/` 前端代码；契约以 `shared-types/` 与本目录 [api-reference.md](./api-reference.md) 为准。
- 品牌视觉见 [design-guide.md](./design-guide.md)（设计风格与色彩 token，已内联，无需复制主站源码）。

## 文档索引

| 文档 | 用途 |
|---|---|
| [api-reference.md](./api-reference.md) | 鉴权、翻译/写作/邮件 SSE、错误码、语言表、类型与客户端示例 |
| [design-guide.md](./design-guide.md) | 设计风格、OKLCH 色彩 token |

## 快速开始

1. **同步类型** — 将主仓库 `shared-types/` 复制到插件项目（submodule、定期 diff 或私有包）。常量如 `MAX_TRANSLATE_CHARS` 勿硬编码。
2. **配置实例** — Options 页保存 `baseUrl`（无尾斜杠）；`GET {baseUrl}/api/ping` 测试连通。
3. **CORS** — 用户须在实例 Worker 环境变量 `ORIGINS` 中加入扩展 origin，例如 `chrome-extension://<extension-id>`。本地开发 id 随加载变化，可用开发专用实例或临时放宽。
4. **鉴权** — `POST /api/auth/login` 取 JWT，后续请求带 `Authorization: Bearer <token>`。私站须登录；扩展建议始终登录，不走匿名翻译。
5. **翻译** — `GET /api/translate/models` 拉模型；`POST /api/translate` + `stream: true` 解析 SSE（见 api-reference）。

### manifest.json 要点（MV3）

```json
{
  "manifest_version": 3,
  "permissions": ["storage"],
  "host_permissions": ["<all_urls>"]
}
```

`host_permissions` 用于向用户配置的任意实例发请求。若目标实例域名固定，可收窄为具体域名。

## 跟进主项目变更

| 主仓库变更 | 插件侧通常需要 |
|---|---|
| `shared-types/*.ts` 字段增删 | 更新类型与请求体 |
| 新增 `/api/*` 或 SSE 事件 | 实现调用与解析（以 api-reference 为准） |
| 翻译切块 / 限流 | 处理 `progress`、429 |
| 新公开能力（如 AI 专家） | 可选接入对应 GET 端点 |

破坏性变更应同步更新 `shared-types/` 与本目录 `api-reference.md`；插件以二者为准。

## 主仓库内扩展

在本 repo 新增供应商、功能模块或 AI 专家，见 `.ai/architecture.md`「扩展点」，不在此目录维护。
