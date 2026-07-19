# 外部客户端 API 参考

供 Chrome 扩展、移动端、脚本等**非主站 SPA** 调用自托管 OpenTranslator 实例。契约以 `shared-types/` 为准；主站实现见 `web/src/lib/api-client.ts`。

## 基础信息

| 项 | 说明 |
|---|---|
| Base URL | 用户自填实例地址，如 `https://translate.example.com` |
| 前缀 | 所有 API 以 `/api/` 开头 |
| 健康检查 | `GET /api/ping` → `{ ok, service, bindings }` |
| CORS | Worker 环境变量 `ORIGINS` 逗号分隔允许来源；扩展 origin 须列入 |
| 内容类型 | JSON 请求/响应；流式翻译为 SSE（`text/event-stream`） |

## 鉴权

主站 SPA 用 HttpOnly Cookie `ot_session`；外部客户端用 **Bearer JWT**。

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/auth/login` | POST | `{ email, password }` → `AuthSessionResponse`（含 `token`） |
| `/api/auth/setup` | POST | 首次初始化管理员（仅无用户时） |
| `/api/auth/logout` | POST | 注销（Cookie 客户端；Bearer 客户端本地删 token 即可） |
| `/api/auth/me` | GET | 会话状态 + `sitePublic` |

**请求头：**

```
Authorization: Bearer <token>
```

服务端优先 Cookie，其次 Bearer（`src/auth/session.ts`）。

**私站门禁：** `sitePublic === false` 时，未登录调用翻译相关 API 返回 `403 { error: "site is private" }`。扩展应强制登录，不支持匿名翻译。

**登录响应类型**（`shared-types/auth.ts`）：

```typescript
interface AuthSessionResponse {
  authenticated: boolean;
  user: AuthUser;
  token: string;  // 存 chrome.storage.local 等
}

interface AuthUser {
  id: string;
  email: string;
  role: string;
  /** 相对路径，如 /api/admin/profile/avatar?v=1710000000；无自定义头像时省略 */
  avatarUrl?: string;
}
```

## 用户头像

登录（`POST /api/auth/login`）与 `GET /api/auth/me` 在 `user.avatarUrl` 返回头像地址。无自定义头像时该字段省略，客户端用邮箱首字母做 fallback。

`avatarUrl` 为**相对路径**（带 cache-bust 参数 `v`），需拼上实例 `baseUrl`：

```
https://translate.example.com/api/admin/profile/avatar?v=1710000000
```

头像字节由受保护端点提供：

```
GET /api/admin/profile/avatar
Authorization: Bearer <token>
```

返回图片二进制（`image/jpeg` 等），非 JSON。

### Bearer 客户端加载头像

主站 SPA 靠 Cookie，可直接 `<img src="...">`。扩展用 Bearer 时，**`<img>` 不会自动带 `Authorization`**，须先 `fetch` 再转 Blob URL：

```typescript
function resolveAvatarUrl(baseUrl: string, avatarUrl?: string): string | undefined {
  if (!avatarUrl) return undefined;
  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    return avatarUrl;
  }
  return `${baseUrl.replace(/\/$/, "")}${avatarUrl}`;
}

/** 返回可用于 <img src> 的 blob: URL；调用方在卸载时 revokeObjectURL。 */
async function loadAvatarBlobUrl(
  baseUrl: string,
  token: string,
  avatarUrl?: string,
): Promise<string | undefined> {
  const url = resolveAvatarUrl(baseUrl, avatarUrl);
  if (!url) return undefined;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return undefined;

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

function initialsOf(email: string): string {
  const head = email.split("@")[0] ?? email;
  return head.slice(0, 2).toUpperCase();
}
```

React 示例：

```typescript
const [avatarSrc, setAvatarSrc] = useState<string>();

useEffect(() => {
  let objectUrl: string | undefined;
  void (async () => {
    objectUrl = await loadAvatarBlobUrl(baseUrl, token, user.avatarUrl);
    setAvatarSrc(objectUrl);
  })();
  return () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  };
}, [baseUrl, token, user.avatarUrl]);

// 有 avatarSrc 用图片，否则显示 initialsOf(user.email)
```

上传 / 删除头像走 Dashboard 同款 admin API（`PUT` / `DELETE /api/admin/profile/avatar`）；扩展 v1 通常只读展示即可。

## 翻译 API

### 列出模型

```
GET /api/translate/models
```

响应 `TranslateModelsResponse`：

```typescript
{
  models: Array<{
    providerId: string;
    model: string;
    modelLabel: string;
    providerName: string;
  }>;
  default: { providerId: string; model: string } | null;
}
```

- 登录用户：所有已启用供应商的模型。
- 匿名用户（仅公开站）：公开白名单内的模型 + `default`。
- 私站未登录：`{ models: [], default: null }`。

### 模型选择（客户端示例）

主站用 `providerId|model` 编码选中项（模型名不含 `|`）。扩展可复用同一约定：

```typescript
import type { TranslateModelOption, TranslateModelsResponse } from "@opentranslator/shared-types";

type ModelKey = string; // `${providerId}|${model}`

function encodeModelKey(o: TranslateModelOption): ModelKey {
  return `${o.providerId}|${o.model}`;
}

function decodeModelKey(key: ModelKey): { providerId: string; model: string } {
  const sep = key.indexOf("|");
  if (sep === -1) throw new Error("invalid model key");
  return { providerId: key.slice(0, sep), model: key.slice(sep + 1) };
}

/** Popup 挂载时拉取模型列表 */
async function fetchModels(apiFetch: typeof fetch): Promise<TranslateModelsResponse> {
  const res = await apiFetch("/api/translate/models");
  if (!res.ok) throw new Error(`models -> ${res.status}`);
  return res.json() as Promise<TranslateModelsResponse>;
}
```

下拉展示建议用 `providerName · modelLabel`（见主站 `TranslatorPage.tsx`）。

翻译时解析 `modelKey` 并传入请求体；**省略 `providerId` / `model`** 时服务端走账号默认供应商：

```typescript
async function translateWithModel(
  apiFetch: typeof fetch,
  text: string,
  sourceLang: string,
  targetLang: string,
  modelKey: ModelKey | null,
  signal?: AbortSignal,
) {
  let providerId: string | undefined;
  let model: string | undefined;
  if (modelKey) {
    ({ providerId, model } = decodeModelKey(modelKey));
  }

  const res = await apiFetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      sourceLang,
      targetLang,
      providerId,
      model,
      stream: true,
    }),
    signal,
  });
  // 接着按 SSE 解析（见下文 streamTranslate）
  return res;
}
```

用户偏好可存 `chrome.storage.local` 的 `modelKey`；`models` 为空时禁用选择器并提示「暂无可用模型」（503 场景）。

### 列出 AI 专家

```
GET /api/translate/experts
```

响应 `AiExpertsPublicResponse`：

```typescript
{
  experts: AiExpertMeta[];
  defaultExpertId: string | null;  // "general" 表示通用 prompt
}
```

需功能模块 `ai-experts` 开启且配置了 `enabledIds`。

### 翻译（流式，推荐）

```
POST /api/translate
Content-Type: application/json

{
  "text": "Hello",
  "sourceLang": "auto",
  "targetLang": "zh-CN",
  "stream": true,
  "expertId": "tech",       // 可选
  "providerId": "...",      // 可选，登录用户
  "model": "gpt-4o-mini"    // 可选，须在供应商 models 内
}
```

**SSE 事件**（每帧 `data: {...}\n\n`，类型 `TranslateStreamEvent`）：

| type | 字段 | 说明 |
|---|---|---|
| `progress` | `chunkIndex`, `chunkTotal` | 长文切块进度（0-based index）；短文不发 |
| `delta` | `text` | 译文增量，客户端拼接显示 |
| `done` | `translatedText`, `provider`, `usage?` | 最终结果，应用此字段覆盖拼接（与 delta 一致化） |
| `error` | `error` | 上游或解析错误 |

**客户端状态机：**

```
idle → streaming → done | error
```

- 使用 `AbortController` 中止 fetch。
- `streaming` 时禁用输入/重复提交；主按钮可变为「停止」。
- 收到 `done` 后用 `translatedText` 覆盖 UI，避免 delta 拼接误差。

**SSE 解析参考**（`web/src/lib/api-client.ts` 的 `streamTranslate`）：

```typescript
async function* parseSSE(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const data = block
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).replace(/^ /, ""))
        .join("\n");
      if (data) yield JSON.parse(data);
    }
  }
}
```

### 翻译（非流式）

同一端点，`stream: false` 或省略 `stream`，返回 JSON `TranslateResponse`：

```typescript
{
  translatedText: string;
  detectedSourceLang?: string;
  provider: string;
  usage?: { inputTokens: number; outputTokens: number };
}
```

## 写作 API（可选）

```
POST /api/write
```

请求/响应类型见 `shared-types/write.ts`，同样支持 SSE。扩展 v1 通常不需要。

## HTTP 错误码

| 状态 | 典型 `error` | 客户端处理 |
|---|---|---|
| 400 | `text and targetLang are required` | 表单校验 |
| 401 | 凭证无效 | 清 token，引导登录 |
| 403 | `site is private` | 引导登录 |
| 404 | `provider not available` / `model not available` | 刷新模型列表 |
| 429 | 限流 | 提示稍后重试 |
| 502 | 上游错误信息 | 展示 `error` 字段 |
| 503 | `no provider configured` | 实例未配置供应商 |

## 语言代码

与 `web/src/lib/languages.ts` 一致：

- 源语言默认 `auto`（仅作 source）
- 目标语言常用 `zh-CN`、`en`、`ja` 等
- 繁体：`zh-TW`、`zh-HK` 与 `zh-CN` 区分

## 扩展客户端存储建议

| 键 | 内容 |
|---|---|
| `baseUrl` | 实例根 URL（无尾斜杠） |
| `token` | JWT |
| `user` | `AuthUser` 快照（含 `avatarUrl`） |
| `sourceLang` / `targetLang` | 用户偏好 |
| `modelKey` | 可选，`providerId|model` |

## 与主站差异摘要

| | 主站 SPA | 外部客户端 |
|---|---|---|
| 鉴权 | Cookie `credentials: "include"` | `Authorization: Bearer` |
| 公开站匿名翻译 | 支持（白名单模型） | 扩展建议始终登录 |
| 模型选择 | `GET /api/translate/models` + 下拉 | 同一 API；`modelKey` 存 `chrome.storage` |
| 头像展示 | `<img src>` + Cookie | `fetch` + Blob URL + Bearer |
| AI 专家选择 | 完整 UI | 可选；见 `GET /api/translate/experts` |
| CORS | 同源 | 需配置 `ORIGINS` |

## TypeScript 类型引用

在 monorepo 内可直接：

```typescript
import type {
  TranslateRequest,
  TranslateStreamEvent,
  AuthSessionResponse,
} from "@opentranslator/shared-types";
```

独立扩展项目可复制 `shared-types/` 或发布为 npm 包（当前未单独发布）。

## 参考文件

| 内容 | 路径 |
|---|---|
| 主站 API 客户端 | `web/src/lib/api-client.ts` |
| 翻译 handler | `src/features/translate/handler.ts` |
| 鉴权 | `src/auth/session.ts`、`src/routes/auth.ts` |
| 头像 URL 拼接（主站） | `web/src/lib/avatar.ts` |
| 模型选择 UI（主站） | `web/src/routes/translator/TranslatorPage.tsx` |
| 共享类型 | `shared-types/translate.ts`、`shared-types/auth.ts` |
| Chrome 扩展计划 | [plan.md](./plan.md) |
| 视觉规范 | [design-guide.md](./design-guide.md) |
