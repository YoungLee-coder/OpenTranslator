import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Production build output goes into the API Worker's assets directory so a
  // single `wrangler deploy` ships both frontend and backend (same-origin, no
  // CORS, no VITE_API_BASE_URL needed). Local dev is unaffected — Vite serves
  // from memory and proxies /api to the local Worker.
  build: {
    outDir: "../api/dist",
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
