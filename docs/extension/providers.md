# 翻译供应商插件开发

供应商（Provider）是连接上游 LLM / 翻译 API 的适配器。新增一家厂商 = 实现 `TranslationProvider` 接口 + 注册一行 + 补充 Dashboard 表单字段。

## 架构

```
Dashboard 配置（API Key、baseUrl、models）
        ↓
D1 providers 表
        ↓
translate/handler.ts 解密 Key、组装 ProviderContext
        ↓
providerRegistry.get(type) → adapter.translate / translateStream
        ↓
SSE 或 JSON 返回客户端
```

核心路由 `POST /api/translate` **不需要修改**；handler 通过 `providerRegistry` 动态分发。

## 契约：`TranslationProvider`

定义见 `shared-types/provider.ts`：

```typescript
export interface TranslationProvider {
  name: ProviderType;
  translate(req: TranslateRequest, ctx: ProviderContext): Promise<TranslateResponse>;
  translateStream?(req: TranslateRequest, ctx: ProviderContext): ReadableStream<Uint8Array>;
}
```

| 字段 / 方法 | 说明 |
|---|---|
| `name` | 与 `ProviderType` 枚举一致，如 `"openai"` |
| `translate` | 非流式翻译，返回完整 `TranslateResponse` |
| `translateStream?` | 可选；发出 UTF-8 译文增量，路由层包装为 SSE `delta` 事件 |
| `ProviderContext.apiKey` | 服务端解密后的明文 Key |
| `ProviderContext.baseUrl` | Dashboard 填写的完整端点 URL |
| `ProviderContext.defaultModel` | 本次请求解析出的模型名 |
| `ProviderContext.configJson` | schema 中 select 等字段的额外配置 |

**流式约定：** `translateStream` 只输出译文文本字节流；SSE 帧格式（`delta` / `done` / `error`）由 `src/features/translate/handler.ts` 统一封装。不支持流式的供应商（如 DeepL）可省略 `translateStream`，handler 会一次性翻译后合成 SSE。

**提示词：** LLM 类供应商通过 `buildPrompt(req)`（`src/providers/prompt.ts`）获取 system + user 消息，其中已集成 AI 专家逻辑。DeepL 等专用翻译 API 直接传 `text` / 语言码，忽略 `expertId`。

## 开发步骤清单

### 1. 扩展 `ProviderType`

`shared-types/provider.ts`：

```typescript
export type ProviderType =
  | "openai"
  | "claude"
  // ...
  | "your-vendor";  // 新增
```

### 2. 实现 adapter

在 `src/providers/your-vendor.ts` 新建文件。

**OpenAI 兼容端点**（最常见）— 复用 `makeOpenAICompat`：

```typescript
import { makeOpenAICompat } from "./openai";

export const yourVendorProvider = makeOpenAICompat(
  "your-vendor",
  "https://api.example.com/v1/chat/completions",  // 默认 baseUrl
  "default-model-name",
  { "X-Custom-Header": "value" },  // 可选额外请求头
);
```

参考：`src/providers/openai.ts`（`openai`、`aihubmix`、`custom` 均由此工厂生成）。

**独立 API 格式** — 参考：

| 文件 | 特点 |
|---|---|
| `src/providers/claude.ts` | Anthropic Messages API，`x-api-key` 鉴权 |
| `src/providers/gemini.ts` | Google Generative Language API |
| `src/providers/deepl.ts` | 专用翻译 API，无流式、无自定义 prompt |
| `src/providers/cloudflare.ts` | Workers AI REST，需 `accountId` |

### 3. 注册 adapter

`src/providers/index.ts`：

```typescript
import { yourVendorProvider } from "./your-vendor";

providerRegistry.register("your-vendor", yourVendorProvider);
```

`src/index.ts` 通过 `import "./providers"` 在启动时完成全部注册。

### 4. 补充 Dashboard 表单 schema

`src/providers/schema.ts` 的 `providerSchemas` 增加条目，驱动 Dashboard 动态表单：

```typescript
your-vendor: [
  {
    key: "baseUrl",
    label: "Base URL",
    type: "text",
    required: true,
    placeholder: "https://api.example.com/v1/chat/completions",
  },
  {
    key: "models",
    label: "模型",
    type: "models",           // 多行文本，一行一个模型名
    placeholder: "model-a\nmodel-b",
  },
],
```

**字段类型：**

| `type` | 用途 |
|---|---|
| `text` | 单行文本（baseUrl、accountId 等） |
| `password` | 敏感字段（少见，API Key 有独立输入框） |
| `models` | 多行模型列表，首项为默认模型 |
| `select` | 下拉（如 DeepL 套餐、正式度） |
| `boolean` | 开关 |

**preset：** 设 `preset: "https://..."` 可锁定为预设值，前端不可编辑（见 `aihubmix`）。

**defaultValue：** select 字段的初始选中项，用户可改选。

### 5. 验证

```bash
pnpm typecheck:api
```

手动：Dashboard → 供应商 → 添加新类型 → 填 Key / URL / 模型 → 翻译页选模型测试流式与非流式。

## baseUrl 约定

- **必须**以 `http://` 或 `https://` 开头的**完整端点 URL**。
- OpenAI 兼容：含 `/v1/chat/completions`。
- Claude：含 `/v1/messages`。
- adapter **不再拼接路径**，只去掉末尾 `/` 后直接使用。

## models 字段语义

- Dashboard「模型」输入框一行一个模型名。
- 存储为 JSON 数组；**首项视为默认模型**。
- 翻译请求中的 `model` 必须属于该供应商声明的集合，否则 404。
- 对 DeepL 等，`models` 复用为 `model_type` 枚举值（见 schema 中的 select options）。

## 与 AI 专家的交互

| 供应商类型 | expertId | 流式 | 说明 |
|---|---|---|---|
| LLM（OpenAI 兼容等） | 生效 | 支持 | `buildPrompt` 注入专家 system/user |
| LLM + YAML 输出专家 | 生效 | 伪流式 | handler 等完整响应后 `postProcess` 提取字段，再合成 SSE |
| DeepL | **忽略** | 不支持 | 固定 API 格式，无法注入自定义 prompt |

## 常见陷阱

1. **忘记改 `ProviderType`** — typecheck 会在 registry / schema / DB 多处报错。
2. **baseUrl 只填域名** — 必须填完整 path，否则 404。
3. **流式解析错误** — OpenAI 兼容流用 `src/providers/sse.ts` 的 `parseSSEEvents`；不要自己猜 SSE 格式。
4. **在核心路由硬编码** — 一律走 `providerRegistry`，保持 `translate/handler.ts` 不变。

## 参考文件

| 内容 | 路径 |
|---|---|
| 注册表 | `src/providers/registry.ts` |
| 注册入口 | `src/providers/index.ts` |
| OpenAI 兼容工厂 | `src/providers/openai.ts` |
| 表单 schema | `src/providers/schema.ts` |
| 翻译分发 | `src/features/translate/handler.ts` |
| 共享类型 | `shared-types/provider.ts` |
