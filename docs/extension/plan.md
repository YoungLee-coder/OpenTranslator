# Chrome 扩展实施计划

将 OpenTranslator 接到浏览器侧的实施方案。视觉与交互对齐 [design-guide.md](./design-guide.md)；API 契约见 [api-reference.md](./api-reference.md)。

> 本仓库当前**不包含**扩展源码目录；本文为实施蓝图，可在独立 repo 或 `extension/` 目录落地。

## 目标（v1）

- Popup 内完成：登录 → 选语言 → **选模型** → 输入 → 流式翻译 → 复制
- Popup 顶栏展示**用户头像**（或邮箱首字母 fallback）
- Options 页：配置实例地址、测试连接、登录/登出
- 私站实例强制 Bearer 登录；不支持匿名翻译
- 复用主站 SSE 协议、语言 code、`providerId|model` 编码

## 非目标（v1）

- 划词翻译、全文网页翻译（沉浸式翻译能力）
- 离线模式
- 多实例切换
- 完整 Dashboard 功能

## 推荐目录结构

```
extension/
  manifest.json          # MV3
  package.json
  src/
    background.ts        # 可选：代理 fetch、统一鉴权头
    popup/
      Popup.tsx
      main.tsx
    options/
      Options.tsx
      main.tsx
    lib/
      api.ts             # Bearer + baseUrl 封装
      storage.ts         # chrome.storage.local 封装
      sse.ts             # 与 web/src/lib/api-client streamTranslate 同逻辑
      avatar.ts          # resolveAvatarUrl + loadAvatarBlobUrl（见 api-reference）
      models.ts          # encodeModelKey / decodeModelKey / fetchModels
    styles/
      tokens.css         # 从 web/src/index.css 复制 OKLCH 变量
  public/
    icon.svg             # docs/images/icon.svg
```

构建：Vite + React（与主站一致）或 Preact 减体积；输出到 `dist/` 供 `manifest.json` 引用。

## manifest.json 要点（MV3）

```json
{
  "manifest_version": 3,
  "name": "OpenTranslator",
  "version": "0.1.0",
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icon.svg"
  },
  "options_page": "options.html",
  "permissions": ["storage"],
  "host_permissions": ["<all_urls>"],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

`host_permissions` 用于向用户配置的任意实例发请求。若实例固定，可收窄为具体域名。

**CORS：** 用户实例 Worker 须在 `ORIGINS` 中加入扩展 origin，例如：

```
chrome-extension://<extension-id>
```

本地开发时 id 随加载变化，可临时用 `*` 或开发专用实例。

## 页面职责

### Options

| 区块 | 行为 |
|---|---|
| 实例地址 | `https://…` 输入，存 `baseUrl` |
| 测试连接 | `GET {baseUrl}/api/ping`；检查 `ok` 与 `bindings`；可提示 `needsMigration` / `!adminReady` |
| 登录 | `POST {baseUrl}/api/auth/login` → 存 `token`、`user`（含 `avatarUrl`） |
| 登出 | 清 storage |
| 状态 | `GET /api/auth/me` 显示邮箱、头像、`sitePublic`、`setupCompleted` |

未配置 `baseUrl` 或无效 token 时，Popup 应重定向到 Options（或内嵌登录表单）。

### Popup

布局见 design-guide §6.2（竖版堆叠）。核心流程：

1. 启动读 `storage`：`baseUrl`、`token`、`user`、`modelKey`；无 token → 提示去 Options。
2. **头像**：`loadAvatarBlobUrl(baseUrl, token, user.avatarUrl)` → 顶栏圆头像；无图则 `initialsOf(user.email)`。
3. **模型**：`GET /api/translate/models` 填充下拉；选项文案 `{providerName} · {modelLabel}`；选中项编码为 `providerId|model` 存 `modelKey`。
4. 语言选择：`auto` + 目标语（默认 `zh-CN`），存偏好。
5. 输入框 + `⌘/Ctrl+Enter` 触发翻译；请求体带 `decodeModelKey(modelKey)` 的 `providerId` / `model`。
6. `streamTranslate` + `AbortController`；按钮 idle/翻译中/停止。
7. 译文区 `font-serif`；底栏复制 + 字数。

宽度建议 `380px`；译文区内部滚动，避免 Popup 整体溢出。

#### 模型选择器（示例）

```typescript
// src/lib/models.ts — 完整版见 api-reference.md
const { models } = await apiGet<TranslateModelsResponse>("/api/translate/models");

<select
  value={modelKey ?? ""}
  onChange={(e) => saveModelKey(e.target.value || null)}
  disabled={models.length === 0 || streaming}
>
  {models.length === 0 ? (
    <option value="">暂无可用模型</option>
  ) : (
    models.map((o) => {
      const key = `${o.providerId}|${o.model}`;
      return (
        <option key={key} value={key}>
          {o.providerName} · {o.modelLabel}
        </option>
      );
    })
  )}
</select>
```

`modelKey` 为 `null` 时不传 `providerId` / `model`，行为与主站「默认」一致。

#### 用户头像（示例）

```typescript
// src/lib/avatar.ts — 完整版见 api-reference.md「用户头像」
function UserBadge({ user, baseUrl, token }: Props) {
  const [src, setSrc] = useState<string>();

  useEffect(() => {
    let blobUrl: string | undefined;
    void loadAvatarBlobUrl(baseUrl, token, user.avatarUrl).then((u) => {
      blobUrl = u;
      setSrc(u);
    });
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [baseUrl, token, user.avatarUrl]);

  return src ? (
    <img src={src} alt={user.email} className="size-7 rounded-full" />
  ) : (
    <span className="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
      {initialsOf(user.email)}
    </span>
  );
}
```

**勿**直接把 `user.avatarUrl` 填进 `<img src>`（扩展无 Cookie，会 401）。

## API 层实现要点

`src/lib/api.ts` 伪代码：

```typescript
const storage = await chrome.storage.local.get(["baseUrl", "token"]);

async function apiFetch(path: string, init: RequestInit = {}) {
  const { baseUrl, token } = await getConfig();
  if (!baseUrl) throw new Error("未配置实例地址");
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");
  const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
  // 401 → 清 token，抛 ApiError
  return res;
}
```

SSE 逻辑直接从 `web/src/lib/api-client.ts` 的 `streamTranslate` 移植，仅改 `fetch` 封装（去掉 `credentials: "include"`）。

## Background Service Worker（可选）

v1 可在 Popup 内直接 `fetch`。若后续需要：

- 统一刷新 token
- 右键菜单划词翻译
- 跨页面共享进行中的翻译

再引入 `background.ts` 作消息中转。

## 状态与错误

| 场景 | 处理 |
|---|---|
| 401 | 清 token，Popup 显示「请重新登录」 |
| 403 site is private | 不应出现于已登录扩展 |
| 429 | Toast：稍后重试；可读 `retryAfterSeconds` |
| 400 text exceeds maximum | 提示缩短原文（上限 80 000 字符） |
| 503 | 无可用模型，检查 Dashboard 供应商 |
| 网络失败 | 检查 URL、`ORIGINS`、HTTPS |

## 开发调试

1. 本地起 OpenTranslator：`pnpm dev`（API `:8787`，Web `:5173`）。
2. 实例 `ORIGINS` 加入 `chrome-extension://<id>`。
3. Options 填 `http://localhost:5173` 或 `http://localhost:8787`（若直接打 API）。
4. Chrome → 扩展程序 → 加载已解压的扩展。

## 发布检查清单

**功能**

- [ ] Ping / 登录 / 登出 / 流式翻译 / 复制 / 中止
- [ ] 无 token 时不发翻译请求
- [ ] `done.translatedText` 覆盖 delta
- [ ] 可选：长文 `progress`（第 N / M 段）
- [ ] 模型列表加载与选择（`modelKey` 持久化）
- [ ] 用户头像 Bearer 加载（Blob URL + revoke）
- [ ] 429 展示限流提示（`retryAfterSeconds`）

**配置**

- [ ] 文档说明用户须在实例配置 `ORIGINS`
- [ ] 图标与 [design-guide.md](./design-guide.md) 品牌一致

**视觉**（见 design-guide §14）

- [ ] OKLCH token、签名线、译文衬线
- [ ] 错误 destructive 色、复制成功态

## 版本路线图（建议）

| 版本 | 内容 |
|---|---|
| v0.1 | Popup 翻译 + Options 登录 + 模型选择 + 用户头像 |
| v0.2 | AI 专家选择（`GET /api/translate/experts`） |
| v0.3 | AI Write（`POST /api/write`；过滤 `providerType === "deepl"`） |
| v0.4 | Content script 划词 / 双击翻译 |
| v0.5 | Background 代理、跨页共享翻译状态 |

## 参考文件

| 内容 | 路径 |
|---|---|
| 主站翻译页逻辑 | `web/src/routes/translator/TranslatorPage.tsx` |
| 主站头像组件 | `web/src/components/UserAvatar.tsx` |
| API 客户端 | `web/src/lib/api-client.ts` |
| 设计语言 | [design-guide.md](./design-guide.md) |
| API 契约 | [api-reference.md](./api-reference.md) |
| Logo | `docs/images/icon.svg` |
