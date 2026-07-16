# AI 专家插件开发

AI 专家（AI Expert）是按场景定制翻译策略的提示词插件，格式兼容 [沉浸式翻译](https://immersivetranslate.com/) 的 YAML 专家定义。运行时由 `resolveExpertPrompts` 解析为 system + user 消息，再交给 LLM 供应商执行。

## 架构

```
src/experts/plugins/*.yml
        ↓  pnpm bundle-experts
src/experts/bundled.ts（生成物，禁止手改）
        ↓
experts/registry.ts（按 id 查找）
        ↓
experts/prompt.ts → buildTranslationPrompt(req)
        ↓
providers/prompt.ts → adapter 发给上游 LLM
```

管理员在 Dashboard「AI 专家」模块中启用专家 id；用户翻译时通过 `expertId` 选用。

## 开发步骤清单

### 1. 新建 YAML

在 `src/experts/plugins/` 添加 `your-expert.yml`。`id` 全局唯一，建议小写 + 连字符。

最小可用示例（仅 systemPrompt，纯文本输出）：

```yaml
id: my-expert
version: 1.0.0
name: My Expert
description: Short description for the expert picker.
author: Your Name
i18n:
  zh-CN:
    name: 我的专家
    description: 中文描述，显示在专家选择器里。
env:
  imt_source_field: text
  imt_trans_field: text
systemPrompt: |-
  You are a professional {{to}} translator specializing in legal documents.
  Output ONLY the translation. Preserve formatting and defined terms.
```

### 2. 打包

```bash
pnpm bundle-experts
```

会重新生成 `src/experts/bundled.ts`。`pnpm typecheck:api` 也会自动执行此步骤。

### 3. 启用

1. Dashboard → 功能模块 → 开启「AI 专家」。
2. Dashboard → AI 专家 → 勾选新专家 id，可选设为默认。

### 4. 验证

翻译 API 带 `expertId` 测试：

```json
POST /api/translate
{
  "text": "Hello world",
  "sourceLang": "auto",
  "targetLang": "zh-CN",
  "expertId": "my-expert",
  "stream": true
}
```

## YAML 字段参考

### 元数据（必填 / 推荐）

| 字段 | 说明 |
|---|---|
| `id` | 唯一标识，对应 API 的 `expertId` |
| `version` | 语义版本字符串 |
| `name` | 英文默认名 |
| `description` | 英文默认描述 |
| `author` | 作者 |
| `homepage` | 链接 |
| `avatar` | 头像 URL（专家选择器展示） |
| `details` | 长说明（Dashboard 详情） |
| `i18n` | 按 locale 覆盖 `name` / `description` / `details` |

### 提示词字段

| 字段 | 用途 |
|---|---|
| `systemPrompt` | 系统提示词模板 |
| `multipleSystemPrompt` | 多段落模式的系统提示词 |
| `prompt` | 用户消息模板（常含 YAML 输入块） |
| `multiplePrompt` | 多段落用户模板 |
| `subtitlePrompt` | 字幕场景（OpenTranslator 单段翻译暂未暴露） |

**版本覆盖语法**（沉浸式翻译兼容）：

- `systemPrompt.add_v.[1.17.2]: |` — 取最高版本号的 `.add_v.[x.y.z]` 覆盖基础字段。
- `multiplePrompt.remove_v.[1.17.2]: ""` — 标记移除该字段。

打包脚本 `scripts/bundle-experts.mjs` 在构建时解析这些键。

### `env` 环境变量

定义模板占位符的默认值，常见键：

| 键 | 含义 |
|---|---|
| `imt_source_field` | YAML 输入块中的源文字段名（如 `text`、`source`） |
| `imt_trans_field` | 模型应填写的译文字段名（如 `text`、`step2`） |
| `imt_yaml_item` | 单条 YAML 项模板 |
| `normal_result_yaml_example` | 给模型的输出格式示例 |
| `subtitle_result_yaml_example` | 字幕格式示例 |

### `langOverrides`

按语言对覆盖提示词：

```yaml
langOverrides:
  - id: auto2zh-CN
    systemPrompt: |-
      针对简体中文的额外系统指令…
```

`id` 格式为 `{sourceLang}2{targetLang}`，与 `src/experts/lang.ts` 的 `langOverrideId` 一致。

## 模板变量

`resolveExpertPrompts`（`src/experts/resolve.ts`）在渲染前注入：

| 变量 | 来源 |
|---|---|
| `{{to}}` | 目标语言显示名（如 `Simplified Chinese`） |
| `{{from}}` | 源语言显示名；`auto` → `the detected source language` |
| `{{text}}` | 用户原文 |
| `{{yaml}}` | 根据 `env` 生成的单条 YAML 块 |
| `{{id}}` | 固定 `"1"` |
| `env` 中各键 | 先对 env 值做一轮 substitute，再并入 vars |

**暂不支持的占位符**（会被 stripping 为空）：

- `{{title_prompt}}`
- `{{summary_prompt}}`
- `{{terms_prompt}}`

语言显示名映射见 `src/experts/lang.ts` 的 `LANG_NAMES`。

## 输出模式

### 纯文本（推荐简单专家）

仅有 `systemPrompt`、无 `prompt` / `multiplePrompt` 时：

- `user` 消息 = 用户原文 `req.text`
- `usesYamlOutput = false`
- 支持真流式 SSE

### YAML 结构化输出

含 `prompt` 或 `multiplePrompt` 且模板引用 `{{yaml}}` 时：

- 模型被要求返回 YAML 数组
- `postProcess` 用 `extractExpertTranslation` 提取 `imt_trans_field` 字段
- **不支持真流式** — handler 等完整响应后提取，再合成单帧 SSE

两步意译类专家（如 `paraphrase`）使用 `source` → `step1` → `step2` 字段，提取时优先 `step2`。

### 新版 plain-text 专家

若 `systemPrompt` 含 `"Output only the translated content"` 且无 `prompt`，即使存在 `multiplePrompt` 也走纯文本路径（见 `resolve.ts` 的 `prefersPlainText` 判断）。

## 与翻译 API 的关系

| 请求字段 | 行为 |
|---|---|
| 省略 `expertId` 或 `"general"` | 内置通用翻译 prompt |
| `expertId: "tech"` | 须在 Dashboard 启用的 id 列表中 |
| 功能模块未开启 | `expertId` 被忽略，回退通用 prompt |
| DeepL 供应商 | 专家 prompt 不生效（DeepL 忽略自定义 prompt） |

公开接口 `GET /api/translate/experts` 返回当前用户可见的已启用专家列表。

## 从沉浸式翻译导入

1. 将 `.yml` 放入 `src/experts/plugins/`。
2. 检查 `id` 不与现有专家冲突（`src/experts/plugins/` 下列表现有 id）。
3. `matches`（URL 匹配规则）等浏览器扩展专用字段**会被打包脚本忽略**，不影响服务端。
4. 跑 `pnpm bundle-experts` 后 typecheck。

## 常见陷阱

1. **手改 `bundled.ts`** — 下次打包会覆盖；只改 YAML。
2. **忘记启用功能模块** — `ai-experts` 模块关闭时所有专家无效。
3. **id 未加入 enabledIds** — Dashboard 必须勾选。
4. **YAML 输出 + 期望流式** — 结构化专家只能伪流式；长文体验略差。
5. **`multiplePrompt::` 双冒号** — 沉浸式翻译历史 typo；打包脚本会尝试 `${base}:` 键兜底。

## 参考文件

| 内容 | 路径 |
|---|---|
| 示例（简单） | `src/experts/plugins/tech.yml` |
| 示例（YAML 两步） | `src/experts/plugins/paraphrase.yml` |
| 打包脚本 | `scripts/bundle-experts.mjs` |
| 解析逻辑 | `src/experts/resolve.ts` |
| 响应提取 | `src/experts/parse-response.ts` |
| 与 translate 集成 | `src/experts/prompt.ts` |
| 共享类型 | `shared-types/expert.ts` |
| Dashboard 管理 | `web/src/features/AiExpertsManager.tsx` |
