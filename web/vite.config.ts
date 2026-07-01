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
    },
  },
  // Production build output goes to the repo root ./dist so a single
  // `wrangler deploy` ships both frontend (as [assets]) and backend.
  build: {
    outDir: "../dist",
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
