import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    port: 4173,
    fs: {
      // Allow importing root package.json for site.version
      allow: [path.resolve(import.meta.dirname, "..")],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
