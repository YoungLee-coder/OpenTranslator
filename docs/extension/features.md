# 功能模块插件开发

功能模块（Feature Module）是可在 Dashboard 中开关的产品能力，通常包含：后端 manifest、可选业务逻辑、前端设置/管理页。启用后 Dashboard 动态显示导航入口。

现有模块：`public-access`（公开访问）、`ai-experts`（AI 专家）。

## 架构

```
src/features/<key>/manifest.ts     ← 后端静态 manifest
src/routes/admin-features.ts       ← manifests 数组注册
web/src/features/<Component>.tsx   ← Dashboard UI
web/src/features/registry.ts       ← featureComponents 映射
        ↓
GET /api/admin/features            ← manifest + DB feature_modules 表合并
PUT /api/admin/features/:key       ← 开关写入 DB
```

`feature_modules` 表持久化各模块的 `enabled` 状态；manifest 中的 `enabled` 仅作默认值（首次无 DB 记录时使用）。

## 开发步骤清单

以新增 `glossary`（术语库）为例。

### 1. 定义 manifest（后端）

`src/features/glossary/manifest.ts`：

```typescript
import type { FeatureManifest } from "@opentranslator/shared-types";

export const glossaryManifest: FeatureManifest = {
  key: "glossary",
  name: "术语库",
  description: "维护专有名词对照表，自动注入翻译提示词",
  enabled: false,                    // 默认关闭
  adminRoute: "/dashboard/glossary",   // Dashboard 路由（可选）
};
```

`FeatureManifest` 字段见 `shared-types/feature.ts`。

### 2. 注册到 admin-features

`src/routes/admin-features.ts`：

```typescript
import { glossaryManifest } from "../features/glossary/manifest";

const manifests: FeatureManifest[] = [
  publicAccessManifest,
  aiExpertsManifest,
  glossaryManifest,   // 新增
];
```

仅此一步即可让 `GET /api/admin/features` 返回新模块，Dashboard 功能列表出现开关。

### 3. 实现后端业务（按需）

常见结构：

```
src/features/glossary/
  manifest.ts      # manifest（必选）
  store.ts         # 读写 site_settings / D1
  handler.ts       # 若需独立 API 路由
```

在 `src/index.ts` 挂载 admin 路由（须在 `authMiddleware` **之后**）：

```typescript
import adminGlossaryRoute from "./routes/admin-glossary";
app.route("/api/admin/glossary", adminGlossaryRoute);
```

**与翻译集成：** 在 `buildTranslationPrompt` 或 `translate/handler.ts` 中读取模块是否启用，注入术语到 prompt。参考 `ai-experts` 的 `isAiExpertsFeatureEnabled` + `resolveExpertId` 模式。

**联动站点设置：** `public-access` 在 toggle 时同步写 `site_public`（见 `admin-features.ts` PUT handler）。若模块影响全局门禁，在此做类似联动。

### 4. 实现前端组件

`web/src/features/GlossaryManager.tsx` — Dashboard 内的管理 UI。

`web/src/features/registry.ts`：

```typescript
import { GlossaryManager } from "./GlossaryManager";

export const featureComponents: Record<string, ComponentType> = {
  "public-access": PublicAccessSettings,
  "ai-experts": AiExpertsManager,
  glossary: GlossaryManager,   // key 与 manifest.key 一致
};
```

### 5. 添加 Dashboard 路由

在 `web/src/App.tsx`（或路由配置）为 `adminRoute` 注册页面，并复用 Dashboard 布局。参考现有 `AiExpertsManager` 挂载方式。

Dashboard 根据 `/api/admin/features` 中 `enabled: true` 的项动态渲染侧栏；`featureComponents[key]` 提供对应组件。

### 6. 验证

```bash
pnpm typecheck
```

手动：Dashboard → 功能模块 → 开关新模块 → 确认导航出现 → 测试业务 API。

## manifest 字段说明

| 字段 | 必填 | 说明 |
|---|---|---|
| `key` | 是 | 唯一标识，与 `featureComponents` 键、DB `feature_modules.key` 一致 |
| `name` | 是 | Dashboard 显示名 |
| `description` | 否 | 功能说明 |
| `enabled` | 是 | 默认开关（无 DB 记录时的初始值） |
| `adminRoute` | 否 | Dashboard 子路由路径 |

## 运行时判断是否启用

```typescript
import { getFeatureModules } from "../db/queries";

const modules = await getFeatureModules(db);
const row = modules.get("glossary");
const enabled = row ? row.enabled === 1 : false;
```

各模块可封装 `isGlossaryFeatureEnabled(db)` 供 handler 调用，避免散落重复逻辑。

## 与「供应商」「AI 专家」的区别

| | 功能模块 | 供应商 | AI 专家 |
|---|---|---|---|
| 注册位置 | `admin-features.ts` manifests | `providers/index.ts` | `experts/plugins/*.yml` |
| 开关 | DB `feature_modules` | `providers.enabled` | 模块开关 + `enabledIds` |
| 典型用途 | 产品功能（公开访问、术语库） | 上游 API 接入 | 翻译 prompt 策略 |
| 前端 | `features/registry.ts` | `ProvidersSection` | `AiExpertsManager` |

## 常见陷阱

1. **key 不一致** — manifest、`registry.ts`、路由 param 必须同一字符串。
2. **忘记 authMiddleware** — admin API 必须挂在认证中间件之后。
3. **只加 manifest 不加组件** — 开关能切，但 Dashboard 点进去无 UI。
4. **默认值与 DB 冲突** — 已有 DB 记录时以 DB 为准，改 manifest 的 `enabled` 不影响已部署实例。

## 参考文件

| 内容 | 路径 |
|---|---|
| 公开访问 manifest | `src/features/public-access/manifest.ts` |
| AI 专家 manifest | `src/features/ai-experts/manifest.ts` |
| Admin features 路由 | `src/routes/admin-features.ts` |
| 前端注册 | `web/src/features/registry.ts` |
| 公开访问 UI | `web/src/features/PublicAccessSettings.tsx` |
| AI 专家 UI | `web/src/features/AiExpertsManager.tsx` |
| 共享类型 | `shared-types/feature.ts` |
