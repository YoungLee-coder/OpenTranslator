import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // tsconfig paths 已配，但 Vite 运行时只认 alias；前端值导入 shared-types
      // 的运行时导出（如常量）时必须在此补上，否则 import-analysis 报错。
      "@opentranslator/shared-types": path.resolve(
        import.meta.dirname,
        "../shared-types/index.ts",
      ),
    },
  },
  // Production build output goes to the repo root ./dist so a single
  // `wrangler deploy` ships both frontend (as [assets]) and backend.
  // 路由级 lazy() 会自动拆出 page chunks；不再 manualChunks，避免把
  // @radix-ui 等误并入 react-vendor（pnpm 路径易误匹配）。
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // Dev: same-origin /api is proxied to the local Worker — no CORS needed.
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
