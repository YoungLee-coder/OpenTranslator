# OpenTranslator Landing

独立的营销落地页（Vite + React）。与主应用 `web/` 分开构建、分开部署。

Gallery 使用**展示层组件**（`src/components/product/`）+ **fixture 数据**（`src/fixtures/`），结构对齐主应用的翻译 / 写作 / 控制台界面，但不请求 API、不含鉴权。

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
| `src/components/product/` | AppChrome、各 Workbench、ProductWindow |
| `src/fixtures/` | 展示层 props 的示例数据 |
| `src/content.ts` | 落地页文案 |
| `src/styles/` | Kami 纸感样式 + product mock |
| `public/` | favicon、llms.txt、robots 等 |

## 与主仓库

根目录可选用：

```bash
pnpm --dir landing dev
pnpm --dir landing build
```
