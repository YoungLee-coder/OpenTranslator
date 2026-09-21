# OpenTranslator Landing

独立的营销落地页（Vite + React）。与主应用 `web/` 分开构建、分开部署。

Gallery 是一个**窗口内的可交互 mock 应用**（`src/components/product/`）+ **fixture 数据**：顶部导航（翻译 / 写作 / 控制台）与控制台的 6 个标签页都在窗口内真跳转，控件（语言 / 模型下拉、供应商增删改、模块开关、公开模型、专家启用、用户增删、主题切换）都能操作。它不请求 API、不含鉴权，数据全部来自 fixture。

页面下方那排标签（翻译 / 写作 / 用量 / 供应商）是窗口内路由的快捷入口；说明文字跟随窗口内当前位置。空闲时会在几个页面间自动巡览，**用户一旦点击或输入就永久停止**。

窗口是页面的主角，尺寸由 `src/styles/kami.css` 顶部的三个变量控制：`--stage-max`（展示台）、`--window-max`（窗口本身）、`--mock-zoom`（mock 内部等比放大，让它看起来像真实截图而不是缩小版）。正文阅读栏仍是 `--page-max`（880px），窗口通过 `.page-wide` 单独突破这一列。

## 开发

```bash
cd landing
pnpm install
pnpm dev          # http://localhost:4173
```

## 构建 / 预览

```bash
pnpm build        # 产物在 landing/dist
pnpm preview
```

静态托管 `dist/` 即可（Vercel / Netlify / Cloudflare Pages / 任意 CDN）。

## 目录

| 路径 | 说明 |
|---|---|
| `src/components/sections/` | Hero / Gallery / Features / … |
| `src/components/product/` | AppChrome、ProductWindow、demo-nav、mock-ui、翻译 / 写作 Workbench |
| `src/components/product/dashboard/` | 控制台 6 个面板（概览 / 供应商 / 设置 / 公开访问 / AI 专家 / 多用户管理） |
| `src/demo-content.ts` | mock 应用的双语文案与 fixture 数据 |
| `src/fixtures/` | 翻译 / 写作页的 props 类型 |
| `src/content.ts` | 落地页文案 |
| `src/styles/` | Apple 极简营销样式 + product mock |
| `public/` | favicon、llms.txt、robots 等 |

## 与主仓库

根目录可选用：

```bash
pnpm --dir landing dev
pnpm --dir landing build
```
