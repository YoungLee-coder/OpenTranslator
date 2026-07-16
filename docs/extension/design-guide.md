# OpenTranslator 设计风格与范式指南

> 供 Chrome 扩展等客户端复用主站视觉与交互范式。主站是 **DeepL 风格的自托管 AI 翻译器**，气质是「编辑级期刊」——暖中性纸感、墨蓝强调、衬线标题、发丝线分隔，克制而不冷淡。

**文档导航：** [README.md](./README.md) · [plan.md](./plan.md)（扩展实施） · [api-reference.md](./api-reference.md)（API 契约）

---

## 1. 设计关键词

| 维度 | 主站取向 | 扩展应继承 |
|---|---|---|
| 气质 | 精装期刊 / 编辑排版 | 同样克制、可读优先 |
| 色彩 | 暖米灰底 + 墨蓝强调 | 同一套 token，不另起炉灶 |
| 字体 | 无衬线 UI + 衬线展示/译文 | Popup 译文区可用衬线 |
| 形状 | 小圆角、药丸导航、轻边框 | `rounded-lg` / `rounded-md` |
| 动效 | 轻 rise / fade，流式光标 | 流式翻译 + 细进度条 |
| 密度 | 留白充足，14px 正文 | Popup 可略紧凑，但不挤 |

**避免：** 高饱和渐变、重阴影、玻璃拟态泛滥、Inter/Roboto 默认 AI 风、过多 emoji。

---

## 2. 色彩系统（OKLCH）

主站定义在 `web/src/index.css`。扩展若不用 Tailwind，可直接复制 CSS 变量。

### 2.1 浅色模式 `:root`

```css
:root {
  --radius: 0.5rem;

  --background: oklch(0.985 0.003 80);      /* 暖米白 */
  --foreground: oklch(0.22 0.012 260);        /* 墨灰字 */
  --card: oklch(1 0.002 80);
  --primary: oklch(0.32 0.08 255);            /* 墨蓝强调 */
  --primary-foreground: oklch(0.985 0.003 80);
  --muted: oklch(0.96 0.003 80);
  --muted-foreground: oklch(0.5 0.012 260);
  --accent: oklch(0.94 0.025 255);
  --accent-foreground: oklch(0.32 0.08 255);
  --destructive: oklch(0.5 0.18 25);
  --success: oklch(0.5 0.12 160);
  --border: oklch(0.9 0.004 80);
  --input: oklch(0.9 0.004 80);
  --ring: oklch(0.32 0.08 255);
  --rule: oklch(0.86 0.004 80);               /* 发丝分隔线，比 border 更淡 */
}
```

### 2.2 深色模式 `.dark`

```css
.dark {
  --background: oklch(0.17 0.006 260);
  --foreground: oklch(0.96 0.003 80);
  --card: oklch(0.20 0.006 260);
  --primary: oklch(0.72 0.10 255);            /* 暗色下 primary 提亮 */
  --primary-foreground: oklch(0.17 0.006 260);
  --muted-foreground: oklch(0.68 0.01 260);
  --accent: oklch(0.28 0.04 255);
  --border: oklch(0.28 0.006 260);
  --rule: oklch(0.32 0.006 260);
}
```

### 2.3 用法约定

| Token | 用途 |
|---|---|
| `background` | 页面底 |
| `card` | 面板、Popup 主容器 |
| `primary` | 主按钮、流式光标、顶栏签名线 |
| `muted-foreground` | 占位符、次要说明、字数统计 |
| `rule` | 面板内分隔（`border-rule`） |
| `destructive` | 错误文案、危险操作 |
| `success` | 复制成功图标 |

**签名元素：** 主面板顶部 1px 渐变线 — `from-transparent via-primary/50 to-transparent`，像印刷记号。

**纸感：** 浅色 body 可有极淡径向渐变（墨蓝 4% 透明度），扩展 Popup 可选做或省略。

---

## 3. 字体

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
  "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
--font-serif: "Source Serif 4", "Iowan Old Style", "Source Serif Pro",
  "Georgia", "Songti SC", "Noto Serif SC", serif;
```

| 场景 | 字体 | 类名 |
|---|---|---|
| UI、按钮、标签 | `font-sans` | 默认 |
| 页面标题 | `font-serif` | `.font-display` |
| **译文正文** | `font-serif` | 主站翻译页刻意用衬线增强「阅读感」 |
| 输入原文 | `font-sans` | `text-base leading-relaxed` |
| 小标签 / 栏目标识 | `font-sans` | `.eyebrow`（0.7rem、字距 0.16em、大写） |

`.font-display`：`letter-spacing: -0.012em`，`font-weight: 600`，`tracking-tight`。

**正文：** 14px（`text-sm` 控件 / `text-base` 翻译区），行高 `leading-relaxed`（约 1.625）。

---

## 4. 圆角与间距

| Token | 值 | 典型用途 |
|---|---|---|
| `--radius` | `0.5rem` | 输入框、按钮 |
| `rounded-lg` | ~0.625rem | 翻译主面板 |
| `rounded-xl` | ~0.875rem | 登录卡片 |
| `rounded-full` | 999px | 品牌圆标、药丸导航 |

**间距习惯：**

- 面板内边距：`px-4 py-4`（移动）→ `sm:px-6 sm:py-5`（宽屏）
- 表单项间距：`gap-4`（登录表单 `flex-col gap-4`）
- 区块间距：标题下 `mb-5`
- Popup 宽度参考：DeepL 约 360–400px；OpenTranslator 扩展可用 `380px` 固定宽

---

## 5. 组件范式（shadcn new-york）

主站基于 **shadcn/ui（new-york）+ Radix + Tailwind 4 + lucide-react**。扩展可：

- 复用同一套 shadcn 组件 + `index.css` 变量；或
- 用纯 CSS 实现相同视觉（见下表）

### 5.1 Button

| Variant | 视觉 |
|---|---|
| `default` | `bg-primary text-primary-foreground`，hover `primary/90` |
| `outline` | 边框 `border-border`，hover `bg-accent` |
| `ghost` | 无底色，hover `bg-accent/60` |
| `destructive` | 错误/删除 |

尺寸：`h-9` 默认，`h-10` 主 CTA（登录提交），`size-9` 图标按钮。  
交互：`active:scale-[0.98]`，`focus-visible:ring-2 ring-ring`。

### 5.2 Input / Textarea

- 高度：`h-9`（Input）/ 翻译区 `min-h-[220px]` 无 border textarea
- 边框：`border-input`，focus `ring-2 ring-ring` + `border-primary/40`
- 占位符：`placeholder:text-muted-foreground` 或 `/50` 更淡

翻译输入区特殊：**无边框、透明底**，与面板融为一体：

```
border-0 bg-transparent resize-none outline-none focus:ring-0
```

### 5.3 Select（语言）

- Trigger：`h-9`，宽约 `160px`
- 与交换按钮 `ArrowLeftRight` 并排，`gap-2`

### 5.4 Card / 面板

登录页范式：

```
rounded-xl border border-rule bg-card p-7 shadow-md
```

翻译主面板：

```
rounded-lg border border-rule bg-card shadow-sm
+ 顶部 primary 渐变签名线
+ 内部 border-rule 分隔语言栏 / 双栏
```

### 5.5 Alert（错误）

```
variant="destructive" + AlertCircle 图标 + AlertDescription
```

扩展登录失败、连接失败沿用此模式。

---

## 6. 布局范式

### 6.1 翻译页（主站 `TranslatorPage`）

```
标题（font-display）
└─ 主面板 card
   ├─ 顶栏签名线（1px gradient）
   ├─ 语言栏：源语言 | 交换 | 目标语言 | [模型/专家] | [翻译/停止]
   └─ 双栏 grid
      ├─ 左：原文 textarea + 底栏（字数 | 快捷键提示）
      └─ 右：译文（serif）+ 底栏（错误/字数 | 复制）
```

**扩展 Popup 建议（竖版，对标 DeepL）：**

```
┌─────────────────────────────┐
│ [●] 翻译器            [⚙] │  ← 品牌圆标 + Languages 图标
├─────────────────────────────┤
│ [auto ▼]  ⇄  [zh-CN ▼]     │  ← 语言行
├─────────────────────────────┤
│ 输入区（sans, placeholder） │
├─────────────────────────────┤
│ ▓▓▓▓░░░░ 签名进度条         │  ← streaming 时 primary 色
│ 译文区（serif）             │
│                    [复制]   │
└─────────────────────────────┘
```

主站是左右双栏；扩展空间窄，改为 **上下堆叠**，语义与交互保持一致。

### 6.2 登录 / 初始化（扩展 Options）

对齐主站 `LoginPage`：

- 居中卡片 `max-w-sm`
- 标题 `font-display text-xl text-center`
- 表单：`Label` + `Input`，`gap-4`
- 主按钮全宽 `h-10 w-full`
- 次要链接：`text-xs text-muted-foreground hover:underline`

扩展 Options 额外增加：**实例地址**输入 +「测试连接」次要按钮（`variant="outline"`）。

### 6.3 导航（主站参考，扩展简化）

主站：居中悬浮药丸 header、`backdrop-blur-md`、`border-rule`、`shadow-md`。  
扩展 Popup **不需要**完整导航，仅保留：

- 品牌圆标（`size-7 rounded-full bg-primary` + `Languages` 图标 `size-3.5`）
- 设置齿轮 → Options

---

## 7. 动效与反馈

| 名称 | 用途 | 实现 |
|---|---|---|
| `animate-rise` | 页面/卡片入场 | 0.6s，`translateY(6px)→0`，ease 弹性曲线 |
| `animate-fade-in` | 译文首次出现 | 0.5s opacity |
| `animate-blink` | 流式光标 `▍` | 1s step-end，primary 色 |
| `animate-spin` | 加载 | 细边框圆环 `border-rule border-t-transparent` |

**流式翻译状态机**（主站范式，扩展应一致）：

```
idle → streaming → done | error
```

- `streaming`：清空译文、禁用输入/语言切换、显示「翻译中…」或光标
- 支持 `AbortController` 中止（主按钮变「停止」）
- `done`：用 `done.translatedText` 覆盖（确保与 delta 拼接一致）
- `error`：底栏 `text-destructive` 展示 `ApiError.message` 或 SSE `{ type: "error" }`

**复制反馈：** 图标 `Copy` → `Check`（`text-success`），2 秒后恢复；文案「已复制」。

**快捷键（主站）：** `⌘/Ctrl + Enter` 触发翻译；扩展可选保留。

---

## 8. 图标

- 库：**lucide-react**
- 尺寸：按钮内 `size-3.5` / `size-4`，品牌标 `size-3.5`
- 常用：`Languages`（品牌）、`ArrowLeftRight`（交换语言）、`Copy`/`Check`、`AlertCircle`、`Settings`、`LogOut`、`Moon`/`Sun`（若做主题）

---

## 9. 文案与 i18n

主站默认 **中文（zh-CN）**，键值结构见 `web/src/locales/zh-CN.ts`。

### 9.1 语气

- 简短、工具型，不营销
- 省略号用 `…`（Unicode）而非 `...`
- 错误信息直说原因：`invalid credentials`、`rate limited`

### 9.2 扩展建议复用的键（或原文）

| 场景 | 主站文案 |
|---|---|
| 输入占位 | `输入要翻译的文本…` |
| 输出占位 | `译文` |
| 翻译中 | `翻译中…` |
| 复制 | `复制` / `已复制` |
| 登录 | `登录` / `邮箱` / `密码` |
| 提交中 | `提交中…` |
| 加载 | `加载中…` |
| 字符数 | `{{count}} 字符` |

扩展可增加：

- `请输入 OpenTranslator 实例地址`
- `测试连接` / `连接成功` / `连接失败`
- `请先登录你的实例`
- `登录并绑定`

### 9.3 语言代码

与 API 一致，见 `web/src/lib/languages.ts`：

- 源语言默认 `auto`（仅作 source）
- 目标语言默认 `zh-CN`
- 繁体：`zh-TW`、`zh-HK` 与简体 `zh-CN` 区分

---

## 10. 交互与 API 范式

### 10.1 鉴权（扩展 vs 主站）

| | 主站 SPA | Chrome 扩展 |
|---|---|---|
| 凭证 | HttpOnly Cookie `ot_session` | `Authorization: Bearer <token>` |
| 登录响应 | Set-Cookie + `{ user, token }` | 存 `token` 到 `chrome.storage.local` |
| 会话校验 | `GET /api/auth/me` | 同上，带 Bearer |
| 私站 | 未登录跳转 `/login` | 未登录只显示 Options 引导 |

扩展 **不支持公开访问**：无 token 则不翻译。

### 10.2 API 客户端模式

主站 `web/src/lib/api-client.ts` 范式：

```typescript
// 统一错误类
class ApiError extends Error { status: number }

// JSON 请求
fetch(path, { credentials: "include", ... })

// 流式翻译 — async generator 解析 SSE
for await (const ev of streamTranslate(req, signal)) {
  if (ev.type === "delta") append(ev.text)
  if (ev.type === "done") setFinal(ev.translatedText)
  if (ev.type === "error") showError(ev.error)
}
```

扩展 Background 复用同一 SSE 解析逻辑；`credentials` 改为 Bearer 头，不走 Cookie。

### 10.3 错误处理约定

| HTTP | 含义 | UI |
|---|---|---|
| 401 | 凭证无效 | 清 token，引导重新登录 |
| 403 | `site is private` | 不应出现于已登录扩展 |
| 429 | 限流 | 提示稍后重试 |
| 503 | 无 provider | 「暂无可用模型」 |
| 网络/CORS | fetch 失败 | 检查网址与 ORIGINS 配置 |

非关键接口（模型列表等）可**静默失败**；翻译、登录错误**必须展示**。

### 10.4 状态存储

| 数据 | 主站 | 扩展 |
|---|---|---|
| 主题 | `localStorage` `opentranslator-theme` | 可跟系统或 `chrome.storage` |
| 语言偏好 | i18n context | `chrome.storage` |
| 用户会话 | Cookie | `token` + `user` + `baseUrl` |

---

## 11. 架构范式（逻辑层）

与 UI 无关、扩展也应遵循的**产品逻辑**：

1. **配置驱动**：模型、供应商、功能模块由服务端 Dashboard 配置，客户端只消费 API。
2. **注册表扩展**：新供应商/功能走注册表，客户端不硬编码厂商逻辑。
3. **共享类型**：`shared-types/` 为 API 契约单一来源（`TranslateRequest`、`AuthSessionResponse` 等）。
4. **流式优先**：翻译默认 `stream: true`，逐字渲染。
5. **私站门禁**：未认证不暴露模型列表、不允许翻译。

扩展 v1 可省略模型/专家选择，使用账号默认模型——与主站「未选 modelKey」行为一致。

---

## 12. Popup 尺寸与约束

| 项 | 建议 |
|---|---|
| 宽度 | `380px`（Chrome popup 最大高度约 600px） |
| 输入区高度 | `min-h-[120px]`，可 `resize-none` |
| 输出区高度 | `min-h-[120px]`，`overflow-auto` |
| 字体 | 可略小于主站（`text-sm`），但译文仍建议 serif |
| 主题 | 首版可只做浅色；或读 `prefers-color-scheme` |

Chrome 扩展 Popup 不支持随意拉大窗口，**纵向滚动**要放在译文区内，避免整页溢出。

---

## 13. 品牌标识

```
圆标：size-7 rounded-full bg-primary text-primary-foreground
图标：Languages size-3.5 居中
字标：OpenTranslator — font-display font-semibold tracking-tight（Options 可用，Popup 可省略）
```

Logo 源文件：`docs/images/icon.svg`。

---

## 14. 扩展实施检查清单

**视觉**

- [ ] 使用同一套 OKLCH CSS 变量
- [ ] 面板 `border-rule` + 顶栏签名线
- [ ] 译文区衬线字体
- [ ] 主按钮墨蓝 `primary`，非渐变紫

**交互**

- [ ] 流式翻译 + 闪烁光标或进度条
- [ ] 复制带成功态
- [ ] 错误用 `destructive` 色
- [ ] 登录/连接有 loading 禁用态

**逻辑**

- [ ] Bearer 鉴权，私站必登录
- [ ] SSE 事件类型与主站一致
- [ ] 语言 code 与 API 一致
- [ ] 中文文案语气与 `zh-CN` 对齐

---

## 15. 参考文件索引

| 内容 | 路径 |
|---|---|
| 扩展文档总览 | `docs/extension/README.md` |
| 扩展实施计划 | `docs/extension/plan.md` |
| API 参考 | `docs/extension/api-reference.md` |
| 主题 token | `web/src/index.css` |
| 翻译页布局与流式逻辑 | `web/src/routes/translator/TranslatorPage.tsx` |
| 登录卡片 | `web/src/routes/login/LoginPage.tsx` |
| 导航与品牌 | `web/src/components/RootLayout.tsx` |
| 按钮 / 输入 | `web/src/components/ui/button.tsx`、`input.tsx` |
| API 与 SSE | `web/src/lib/api-client.ts` |
| 语言表 | `web/src/lib/languages.ts` |
| 中文文案 | `web/src/locales/zh-CN.ts` |
| 共享类型 | `shared-types/` |

---

*本文档随主站 UI 演进更新；扩展以「看起来像同一个产品」为目标，允许因 Popup 尺寸做布局简化，但不改变色彩、字体气质与核心交互范式。*
